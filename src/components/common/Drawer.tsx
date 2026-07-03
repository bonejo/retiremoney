import { useEffect } from 'react'
import { useT } from '../../i18n'

interface DrawerProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
}

// Right-side slide-over used for add/edit forms.
export default function Drawer({ open, onClose, title, children, footer }: DrawerProps) {
  const t = useT()
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-slate-900/40"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative flex h-full w-full max-w-xl flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold">{t(title)}</h2>
          <button className="btn-ghost" onClick={onClose} aria-label="关闭">
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
        {footer && (
          <div className="border-t border-slate-200 px-6 py-4">{footer}</div>
        )}
      </div>
    </div>
  )
}
