import { useState } from 'react'
import { useT } from '../../i18n'

const FEEDBACK_EMAIL = 'sales@grsequipment.com'

// Floating feedback widget. No backend: opens the user's mail client with the
// message prefilled (plus a copy-to-clipboard fallback).
export default function FeedbackButton() {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [copied, setCopied] = useState(false)

  function sendEmail() {
    const subject = encodeURIComponent('退休财务规划 Feedback')
    const body = encodeURIComponent(text + '\n\n---\n' + navigator.userAgent)
    window.location.href = `mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`
  }

  async function copy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <button
        className="fixed bottom-5 right-5 z-40 rounded-full bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg hover:bg-brand-700"
        onClick={() => setOpen(true)}
      >
        💬 {t('意见反馈')}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4" onClick={() => setOpen(false)}>
          <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold">💬 {t('意见反馈')}</h3>
            <p className="mt-1 text-sm text-slate-500">{t('告诉我们你的建议、发现的问题，或想要的新功能：')}</p>
            <textarea
              className="input mt-3 h-32 resize-none"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('写下你的反馈…')}
              autoFocus
            />
            <div className="mt-4 flex items-center justify-end gap-2">
              {copied && <span className="mr-auto text-xs text-emerald-600">✓ {t('已复制到剪贴板')}</span>}
              <button className="btn-ghost text-sm" onClick={() => setOpen(false)}>{t('取消')}</button>
              <button className="btn-secondary" disabled={!text.trim()} onClick={copy}>{t('复制内容')}</button>
              <button className="btn-primary" disabled={!text.trim()} onClick={sendEmail}>📧 {t('通过邮件发送')}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
