import { create } from 'zustand'
import {
  clearHandle,
  ensurePermission,
  fileApiSupported,
  hydrate,
  loadHandle,
  pickDataFile,
  readFileData,
  snapshot,
  startAutosave,
  writeFileData,
} from '../utils/fileStorage'

type FileStatus = 'unsupported' | 'none' | 'need-permission' | 'connected'

interface DataFileState {
  status: FileStatus
  fileName: string | null
  error: string | null
  init: () => Promise<void>
  createNew: () => Promise<void>
  openExisting: () => Promise<void>
  reconnect: () => Promise<void>
  disconnect: () => Promise<void>
}

let stopAutosave: (() => void) | null = null
let currentHandle: FileSystemFileHandle | null = null

function beginAutosave(handle: FileSystemFileHandle, set: (p: Partial<DataFileState>) => void) {
  stopAutosave?.()
  currentHandle = handle
  stopAutosave = startAutosave(handle, () =>
    set({ error: '自动保存失败——请在设置中重新连接数据文件' }),
  )
}

// Connection to the single local data file (File System Access API).
// localStorage stays the live working copy; the file mirrors it via autosave.
export const useDataFileStore = create<DataFileState>()((set) => ({
  status: fileApiSupported() ? 'none' : 'unsupported',
  fileName: null,
  error: null,

  // On app start: resume autosave if the stored handle still has permission.
  init: async () => {
    if (!fileApiSupported()) return
    const handle = await loadHandle()
    if (!handle) return
    const perm = await (handle as any).queryPermission({ mode: 'readwrite' })
    if (perm === 'granted') {
      // New browser profile with an old handle: file is the source of truth.
      if (!localStorage.getItem('rp-profile')) {
        try {
          hydrate(await readFileData(handle))
        } catch { /* corrupt/empty file — keep local state */ }
      }
      beginAutosave(handle, set)
      set({ status: 'connected', fileName: handle.name })
    } else {
      set({ status: 'need-permission', fileName: handle.name })
    }
  },

  // Create a new data file seeded with the current data (user gesture).
  createNew: async () => {
    try {
      const handle = await pickDataFile(true)
      await writeFileData(handle, snapshot())
      beginAutosave(handle, set)
      set({ status: 'connected', fileName: handle.name, error: null })
    } catch { /* user cancelled the picker */ }
  },

  // Open an existing data file: its contents replace local data (user gesture).
  openExisting: async () => {
    try {
      const handle = await pickDataFile(false)
      if (!(await ensurePermission(handle))) return
      hydrate(await readFileData(handle))
      location.href = '/dashboard' // reload so all stores re-init from the file data
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') set({ error: '文件读取失败：格式无效' })
    }
  },

  // Re-grant permission for the remembered handle and resume autosave.
  reconnect: async () => {
    const handle = await loadHandle()
    if (!handle) return set({ status: 'none', fileName: null })
    if (!(await ensurePermission(handle))) return
    beginAutosave(handle, set)
    set({ status: 'connected', fileName: handle.name, error: null })
  },

  disconnect: async () => {
    stopAutosave?.()
    stopAutosave = null
    currentHandle = null
    await clearHandle()
    set({ status: 'none', fileName: null, error: null })
  },
}))

// Write-through for explicit saves (e.g. before sharing the file).
export async function flushToFile(): Promise<boolean> {
  if (!currentHandle) return false
  await writeFileData(currentHandle, snapshot())
  return true
}
