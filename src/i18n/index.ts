// English-only app. `t()` is a passthrough that fills {param} placeholders in
// the English source string. (The former Chinese→English dictionary and the
// language toggle have been removed — the app is based on English.)
export type Lang = 'en'

function fill(key: string, params?: Record<string, string | number>): string {
  if (!params) return key
  let s = key
  for (const [k, v] of Object.entries(params)) s = s.split(`{${k}}`).join(String(v))
  return s
}

export function translate(_lang: Lang, key: string, params?: Record<string, string | number>): string {
  return fill(key, params)
}

// Hook form used across the app; returns a passthrough formatter.
export function useT() {
  return (key: string, params?: Record<string, string | number>) => fill(key, params)
}

// Legacy stub so remaining `useLangStore(s => s.lang)` selectors compile.
export function useLangStore<T>(selector: (s: { lang: Lang }) => T): T {
  return selector({ lang: 'en' })
}
