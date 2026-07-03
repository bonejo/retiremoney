import type { Assumptions, ProvinceCode } from '../types'
import { BASIC_PERSONAL_AMOUNT, FEDERAL_BRACKETS_2026 } from '../constants/bcTaxRates2026'
import { PROVINCES } from '../constants/provinces'

type Bracket = { upTo: number; rate: number }

// Progressive tax on an amount given marginal brackets.
export function bracketTax(income: number, brackets: Bracket[]): number {
  if (income <= 0) return 0
  let tax = 0
  let lower = 0
  for (const b of brackets) {
    if (income > lower) {
      tax += (Math.min(income, b.upTo) - lower) * b.rate
      lower = b.upTo
    } else break
  }
  return tax
}

export interface TaxInputs {
  ordinaryIncome: number // rental net, interest, RRSP withdrawals, pension, part-time, etc.
  eligibleDividends: number // actual dividends received (pre gross-up)
  capitalGains: number // realized gains (full amount; 50% is taxable)
  oas: number // OAS received (taxable)
  deductions: number // Line 22100 investment interest, etc.
}

export interface TaxResult {
  taxableIncome: number
  grossedUpDividends: number
  taxableCapitalGains: number
  federalTax: number
  provincialTax: number
  /** @deprecated alias of provincialTax (kept for older call sites) */
  bcTax: number
  dtcCredit: number
  totalTax: number
  averageRate: number
}

// Annual income tax: federal + provincial progressive brackets, basic-personal-
// amount credits, dividend gross-up + DTC, 50% capital-gains inclusion.
// Quebec gets the 16.5% federal abatement (its own return is simplified here).
export function computeIncomeTax(
  inputs: TaxInputs,
  a: Assumptions,
  province: ProvinceCode = 'BC',
): TaxResult {
  const prov = PROVINCES[province] ?? PROVINCES.BC
  const grossUp = a.taxRates.dividendGrossUpFactor
  const grossedUpDividends = inputs.eligibleDividends * grossUp
  const taxableCapitalGains = inputs.capitalGains * 0.5

  const taxableIncome = Math.max(
    0,
    inputs.ordinaryIncome +
      inputs.oas +
      grossedUpDividends +
      taxableCapitalGains -
      inputs.deductions,
  )

  // Basic personal amounts applied as non-refundable credits at the lowest rate.
  const fedCredit = BASIC_PERSONAL_AMOUNT.federal * FEDERAL_BRACKETS_2026[0].rate
  const provCredit = prov.basicPersonalAmount * prov.brackets[0].rate

  let federalTax = Math.max(0, bracketTax(taxableIncome, FEDERAL_BRACKETS_2026) - fedCredit)
  if (province === 'QC') federalTax *= 1 - 0.165 // Quebec federal abatement
  const provincialTax = Math.max(0, bracketTax(taxableIncome, prov.brackets) - provCredit)

  // Dividend tax credit (approximate; applied against combined tax).
  const dtcCredit = grossedUpDividends * a.taxRates.dtcRate

  const totalTax = Math.max(0, federalTax + provincialTax - dtcCredit)
  const grossIncome =
    inputs.ordinaryIncome + inputs.oas + inputs.eligibleDividends + inputs.capitalGains

  return {
    taxableIncome,
    grossedUpDividends,
    taxableCapitalGains,
    federalTax,
    provincialTax,
    bcTax: provincialTax,
    dtcCredit,
    totalTax,
    averageRate: grossIncome > 0 ? totalTax / grossIncome : 0,
  }
}
