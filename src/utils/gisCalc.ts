import type { Assumptions, MaritalStatus, Profile } from '../types'

// Components that feed the GIS net-income test (Line 23600 logic per PRD).
export interface GISIncomeInputs {
  rentalNet: number // 100% counted
  eligibleDividends: number // grossed-up ×1.38
  interest: number // 100%
  capitalGains: number // 50% counted (taxable portion)
  helocInterest: number // Line 22100 deduction
  otherIncome?: number // pension, part-time, etc. (100%)
  // TFSA income is intentionally excluded ($0 for GIS).
}

export interface GISResult {
  netIncome: number
  gisMonthly: number
  gisAnnual: number
  eligible: boolean
  breakdown: { label: string; amount: number; note: string }[]
}

export function computeGIS(
  inputs: GISIncomeInputs,
  a: Assumptions,
  maritalStatus: MaritalStatus = 'single',
): GISResult {
  const grossUp = a.taxRates.dividendGrossUpFactor
  const dividendCounted = inputs.eligibleDividends * grossUp
  const capGainCounted = inputs.capitalGains * 0.5
  const other = inputs.otherIncome || 0

  const netIncome =
    inputs.rentalNet +
    dividendCounted +
    inputs.interest +
    capGainCounted +
    other -
    inputs.helocInterest

  // Single: max − income/2. Married (assumes both spouses receive OAS):
  // each spouse gets coupleMax − combinedIncome/4, so the household total is
  // 2 × (coupleMax − income/4).
  const coupleMax = a.governmentBenefits.gisMaxAnnualCouple ?? 7980
  const gisAnnual =
    maritalStatus === 'married'
      ? 2 * Math.max(0, coupleMax - netIncome / 4)
      : Math.max(0, a.governmentBenefits.gisMaxAnnual - netIncome / 2)
  const gisMonthly = gisAnnual / 12

  const breakdown = [
    { label: 'Net rental income', amount: inputs.rentalNet, note: '100% counted' },
    {
      label: 'Eligible dividends',
      amount: dividendCounted,
      note: `×${grossUp} grossed-up`,
    },
    { label: 'Interest income', amount: inputs.interest, note: '100% counted' },
    { label: 'Capital gains', amount: capGainCounted, note: '50% counted' },
    { label: 'Other income', amount: other, note: '100% counted' },
    { label: 'HELOC interest', amount: -inputs.helocInterest, note: 'Line 22100 deduction' },
    { label: 'TFSA income', amount: 0, note: 'tax-free, excluded' },
  ]

  return {
    netIncome,
    gisMonthly,
    gisAnnual,
    eligible: gisAnnual > 0,
    breakdown,
  }
}

// OAS monthly amount by age band, scaled by the residence fraction
// (fewer than 40 years in Canada after age 18 → partial OAS).
export function oasMonthly(age: number, a: Assumptions, residenceFraction = 1): number {
  if (age < a.governmentBenefits.oasAge) return 0
  const full = age >= 75
    ? a.governmentBenefits.oasMonthly75plus
    : a.governmentBenefits.oasMonthly6574
  return full * residenceFraction
}

// OAS residence fraction: years in Canada after age 18 up to OAS age, /40.
// Below the 10-year minimum → not eligible (0). No arrival year → full.
export function oasResidenceFraction(
  dateOfBirth: string,
  canadaArrivalYear?: number,
  oasAge = 65,
): number {
  if (!canadaArrivalYear) return 1
  const birthYear = Number(dateOfBirth.slice(0, 4))
  if (!birthYear) return 1
  const arrivalAge = canadaArrivalYear - birthYear
  const years = oasAge - Math.max(18, arrivalAge)
  if (years < 10) return 0
  return Math.min(1, years / 40)
}

// CPP monthly amount actually received at `age`, from the Service Canada
// estimate at 65. Standard actuarial adjustment: −0.6%/month before 65,
// +0.7%/month after 65 (start age clamped to 60–70).
export function cppMonthly(profile: Profile | null, age: number): number {
  if (!profile?.cpp || profile.cpp.monthlyAt65 <= 0) return 0
  const startAge = Math.min(70, Math.max(60, profile.cpp.startAge || 65))
  if (age < startAge) return 0
  const monthsFrom65 = (startAge - 65) * 12
  const factor = monthsFrom65 < 0 ? 1 + monthsFrom65 * 0.006 : 1 + monthsFrom65 * 0.007
  return profile.cpp.monthlyAt65 * factor
}
