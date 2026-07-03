// Formatting + small shared helpers.

export function formatCurrency(value: number, fractionDigits = 0): string {
  if (!isFinite(value)) return '—'
  return value.toLocaleString('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })
}

// Compact "万元" style for chart axes / KPI (Chinese convention).
export function formatWan(value: number): string {
  const wan = value / 10000
  return `${wan.toFixed(wan >= 100 ? 0 : 1)}万`
}

export function formatPercent(value: number, fractionDigits = 1): string {
  return `${(value * 100).toFixed(fractionDigits)}%`
}

export function ageFromDOB(dateOfBirth: string, asOf: Date = new Date()): number {
  const dob = new Date(dateOfBirth)
  if (isNaN(dob.getTime())) return 0
  let age = asOf.getFullYear() - dob.getFullYear()
  const m = asOf.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && asOf.getDate() < dob.getDate())) age--
  return age
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

// Whole months elapsed from a YYYY-MM (or YYYY-MM-DD) string to `asOf`.
// Returns 0 for empty/invalid/future dates.
export function monthsSince(fromMonth: string | undefined, asOf: Date = new Date()): number {
  if (!fromMonth) return 0
  const parts = fromMonth.split('-')
  const y = Number(parts[0])
  const m = Number(parts[1] ?? 1)
  if (!y || !m) return 0
  const months = (asOf.getFullYear() - y) * 12 + (asOf.getMonth() + 1 - m)
  return Math.max(0, months)
}

// Fractional years elapsed since a YYYY-MM date (for compounding).
export function yearsSince(fromMonth: string | undefined, asOf: Date = new Date()): number {
  return monthsSince(fromMonth, asOf) / 12
}
