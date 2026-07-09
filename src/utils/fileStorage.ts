// Single-file local data storage via the File System Access API.
// All app data lives in one JSON file the user picks; the app reads it on
// connect and autosaves changes back. localStorage remains the working cache
// (zustand persist), so browsers without the API still work fully.

export const STORAGE_KEYS = [
  'rp-profile',
  'rp-properties',
  'rp-investments',
  'rp-expenses',
  'rp-assumptions',
] as const

const IDB_NAME = 'rp-file'
const IDB_STORE = 'handles'
const IDB_KEY = 'dataFile'

export function fileApiSupported(): boolean {
  return typeof window !== 'undefined' && 'showSaveFilePicker' in window
}

// --- snapshot / hydrate -----------------------------------------------------

export function snapshot(): string {
  const dump: Record<string, unknown> = { _app: 'retirement-planner', _savedAt: new Date().toISOString() }
  for (const k of STORAGE_KEYS) {
    const raw = localStorage.getItem(k)
    if (raw) dump[k] = JSON.parse(raw)
  }
  return JSON.stringify(dump, null, 2)
}

export function hydrate(json: string): void {
  const parsed = JSON.parse(json)
  for (const k of STORAGE_KEYS) {
    if (parsed[k]) localStorage.setItem(k, JSON.stringify(parsed[k]))
  }
}

// --- IndexedDB persistence of the file handle --------------------------------

function idb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function saveHandle(handle: FileSystemFileHandle): Promise<void> {
  const db = await idb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite')
    tx.objectStore(IDB_STORE).put(handle, IDB_KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function loadHandle(): Promise<FileSystemFileHandle | null> {
  try {
    const db = await idb()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly')
      const req = tx.objectStore(IDB_STORE).get(IDB_KEY)
      req.onsuccess = () => resolve(req.result ?? null)
      req.onerror = () => reject(req.error)
    })
  } catch {
    return null
  }
}

export async function clearHandle(): Promise<void> {
  const db = await idb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite')
    tx.objectStore(IDB_STORE).delete(IDB_KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// --- connect / read / write ---------------------------------------------------

// Must be called from a user gesture (button click).
export async function pickDataFile(createNew: boolean): Promise<FileSystemFileHandle> {
  const w = window as any
  const handle: FileSystemFileHandle = createNew
    ? await w.showSaveFilePicker({
        suggestedName: 'retirement-plan-data.json',
        types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
      })
    : (await w.showOpenFilePicker({
        types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
      }))[0]
  await saveHandle(handle)
  return handle
}

export async function ensurePermission(handle: FileSystemFileHandle): Promise<boolean> {
  const h = handle as any
  if ((await h.queryPermission({ mode: 'readwrite' })) === 'granted') return true
  return (await h.requestPermission({ mode: 'readwrite' })) === 'granted'
}

export async function readFileData(handle: FileSystemFileHandle): Promise<string> {
  const file = await handle.getFile()
  return file.text()
}

export async function writeFileData(handle: FileSystemFileHandle, content: string): Promise<void> {
  const h = handle as any
  const writable = await h.createWritable()
  await writable.write(content)
  await writable.close()
}

// --- autosave ------------------------------------------------------------------

let autosaveTimer: number | null = null
let lastSaved = ''

// Poll the localStorage snapshot and write to the connected file when changed.
export function startAutosave(handle: FileSystemFileHandle, onError?: (e: unknown) => void): () => void {
  lastSaved = snapshot()
  const tick = async () => {
    try {
      const now = snapshot()
      if (now !== lastSaved) {
        await writeFileData(handle, now)
        lastSaved = now
      }
    } catch (e) {
      onError?.(e)
    }
  }
  autosaveTimer = window.setInterval(tick, 2000)
  window.addEventListener('beforeunload', tick)
  return () => {
    if (autosaveTimer) window.clearInterval(autosaveTimer)
    window.removeEventListener('beforeunload', tick)
  }
}
