import type { Investment, Property } from '../types'
import { rentalSummary } from './propertyCalc'
import { currentInvestmentValue } from './investmentCalc'

// Annual dividend/interest income implied by investment accounts.
// Only the DIVIDEND YIELD portion of a non-registered account's return is
// received as income; capital growth stays unrealized until sold. GIC/savings
// return is entirely interest. TFSA income is excluded (tax-free, no GIS impact).
export function annualInvestmentIncome(investments: Investment[]): {
  eligibleDividends: number
  interest: number
} {
  let eligibleDividends = 0
  let interest = 0
  for (const inv of investments) {
    if (inv.familyLoan?.isFamilyLoan) continue // loan principal pays no dividends/interest here
    const balance = currentInvestmentValue(inv)
    if (inv.type === 'non_registered' && inv.dividendType && inv.dividendType !== 'none') {
      const income = balance * (inv.dividendYield ?? 0)
      if (inv.dividendType === 'eligible') eligibleDividends += income
      else interest += income // non-eligible dividends taxed like ordinary income here
    }
    if (inv.type === 'GIC' || inv.type === 'savings') {
      interest += balance * inv.annualReturnRate
    }
  }
  return { eligibleDividends, interest }
}

// Total annual net rental income across all properties.
export function totalNetRentalIncome(properties: Property[]): number {
  return properties.reduce((sum, p) => sum + rentalSummary(p).netAnnualRent, 0)
}

// Family-loan repayments scheduled for a given calendar year.
export function familyLoanIncomeForYear(
  investments: Investment[],
  year: number,
): number {
  let total = 0
  for (const inv of investments) {
    const fl = inv.familyLoan
    if (!fl?.isFamilyLoan) continue
    for (const r of fl.repaymentSchedule) {
      if (r.year === year) total += r.amount
    }
  }
  return total
}
