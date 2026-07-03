import type { Assumptions, Investment, Property, ProvinceCode } from '../types'
import { currentInvestmentValue, investmentACB } from './investmentCalc'
import { provincialProbate } from '../constants/provinces'

export interface EstateRow {
  label: string
  marketValue: number
  capitalGainsTax: number
  probate: number
  netToHeir: number
}

// BC probate fee (simplified per PRD): 1.4% on value above $50k.
export function bcProbate(value: number, rate: number): number {
  return Math.max(0, value - 50000) * rate
}

export function buildEstate(
  properties: Property[],
  investments: Investment[],
  a: Assumptions,
  province: ProvinceCode = 'BC',
): { rows: EstateRow[]; totals: EstateRow } {
  const cgRate = a.taxRates.capitalGainsTaxRate
  // BC keeps the user-adjustable rate from Settings; other provinces use their
  // own probate/estate-fee structure from the province table.
  const probate = (value: number) =>
    province === 'BC'
      ? bcProbate(value, a.probate.bc_rate_above_50k)
      : provincialProbate(province, value)
  const rows: EstateRow[] = []

  for (const p of properties) {
    const isPrimary = p.type === 'primary_residence'
    const gain = Math.max(0, p.currentValue - p.purchasePrice)
    const cgTax = isPrimary ? 0 : gain * 0.5 * cgRate
    const fee = probate(p.currentValue)
    rows.push({
      label: `${p.name}${isPrimary ? '（主要住所）' : ''}`,
      marketValue: p.currentValue,
      capitalGainsTax: cgTax,
      probate: fee,
      netToHeir: p.currentValue - cgTax - fee,
    })
  }

  for (const inv of investments) {
    if (inv.familyLoan?.isFamilyLoan) continue
    const value = currentInvestmentValue(inv)
    const isTFSA = inv.type === 'TFSA'
    const acb = investmentACB(inv)
    const gain = acb != null ? Math.max(0, value - acb) : 0
    const cgTax = isTFSA || inv.type === 'RRSP' ? 0 : gain * 0.5 * cgRate
    // TFSA with named beneficiary bypasses probate.
    const fee = isTFSA ? 0 : probate(value)
    rows.push({
      label: `${inv.accountName || inv.type}`,
      marketValue: value,
      capitalGainsTax: cgTax,
      probate: fee,
      netToHeir: value - cgTax - fee,
    })
  }

  const totals = rows.reduce<EstateRow>(
    (acc, r) => ({
      label: '合计',
      marketValue: acc.marketValue + r.marketValue,
      capitalGainsTax: acc.capitalGainsTax + r.capitalGainsTax,
      probate: acc.probate + r.probate,
      netToHeir: acc.netToHeir + r.netToHeir,
    }),
    { label: '合计', marketValue: 0, capitalGainsTax: 0, probate: 0, netToHeir: 0 },
  )

  return { rows, totals }
}
