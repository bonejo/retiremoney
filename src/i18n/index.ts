import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { EN } from './en'

// Lightweight i18n: Chinese strings ARE the keys; the EN dictionary maps them.
// Untranslated strings fall back to Chinese, so coverage can grow safely.
export type Lang = 'zh' | 'en'

interface LangState {
  lang: Lang
  setLang: (l: Lang) => void
}

// First-visit default: use Chinese only if the browser/system locale is Chinese,
// otherwise English. Once the user picks a language it is persisted and wins.
function detectInitialLang(): Lang {
  if (typeof navigator !== 'undefined') {
    // Only the PRIMARY locale decides — many English users list Chinese as a
    // secondary language and should still get English by default.
    const primary = (navigator.languages?.[0] || navigator.language || '').toLowerCase()
    if (primary.startsWith('zh')) return 'zh'
  }
  return 'en'
}

export const useLangStore = create<LangState>()(
  persist((set) => ({ lang: detectInitialLang(), setLang: (lang) => set({ lang }) }), { name: 'rp-lang' }),
)

export function translate(lang: Lang, key: string, params?: Record<string, string | number>): string {
  let s = lang === 'en' ? (EN[key] ?? key) : key
  if (params) {
    for (const [k, v] of Object.entries(params)) s = s.split(`{${k}}`).join(String(v))
  }
  return s
}

// Hook form for components.
export function useT() {
  const lang = useLangStore((s) => s.lang)
  return (key: string, params?: Record<string, string | number>) => translate(lang, key, params)
}
