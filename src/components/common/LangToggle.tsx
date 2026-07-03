import { useLangStore } from '../../i18n'

// Prominent Chinese/English switch (persisted).
export default function LangToggle({ className = '' }: { className?: string }) {
  const lang = useLangStore((s) => s.lang)
  const setLang = useLangStore((s) => s.setLang)
  return (
    <div className={`inline-flex overflow-hidden rounded-lg border border-slate-200 text-xs ${className}`}>
      <button
        className={`px-2.5 py-1 ${lang === 'zh' ? 'bg-brand-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
        onClick={() => setLang('zh')}
      >
        中文
      </button>
      <button
        className={`px-2.5 py-1 ${lang === 'en' ? 'bg-brand-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
        onClick={() => setLang('en')}
      >
        EN
      </button>
    </div>
  )
}
