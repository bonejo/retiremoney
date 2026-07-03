import type { Expense, Property } from '../types'
import { currentMortgageBalance, effectiveMortgage, mortgageStats } from './mortgageCalc'
import { annualAmount } from './expenseCalc'

// Auto-calculated annual property tax:
//   market value × assessed ratio × (rate per $1000 / 1000)
export function computePropertyTax(p: Property): number {
  const t = p.propertyTax
  if (!t.autoCalculate) return t.annualAmount
  const assessed = p.currentValue * t.assessedValueRatio
  return (assessed * t.taxRatePerThousand) / 1000
}

export function propertyEquity(p: Property): number {
  const mortgageBalance = p.mortgage?.hasMortgage ? currentMortgageBalance(p.mortgage) : 0
  const locBalance = p.loc?.hasLOC ? p.loc.balance : 0
  return p.currentValue - mortgageBalance - locBalance
}

export interface RentalSummary {
  grossAnnualRent: number
  vacancyLoss: number
  deductibleExpenses: number
  netAnnualRent: number
}

// Net rental income (for T776 / income). Deductible expenses are apportioned
// by the rented area percentage for mixed-use properties.
export function rentalSummary(p: Property): RentalSummary {
  const empty: RentalSummary = {
    grossAnnualRent: 0,
    vacancyLoss: 0,
    deductibleExpenses: 0,
    netAnnualRent: 0,
  }
  if (!p.rental || (p.type !== 'rental' && p.type !== 'mixed')) return empty

  const r = p.rental
  const grossAnnualRent = r.units.reduce(
    (sum, u) => sum + u.monthlyRent * 12,
    0,
  )
  const vacancyLoss = grossAnnualRent * (r.vacancyRate || 0)
  const effectiveRent = grossAnnualRent - vacancyLoss

  // Apportion property-level costs to the rented share.
  const areaShare = p.type === 'mixed' ? (r.rentalAreaPercent || 0) / 100 : 1

  const mortgageInterest = p.mortgage?.hasMortgage
    ? mortgageStats(effectiveMortgage(p.mortgage)).interestPortion * 12
    : 0
  const propertyTax =
    (p.propertyTax.autoCalculate
      ? computePropertyTax(p)
      : p.propertyTax.annualAmount) || 0
  const strata = (p.strataFee || 0) * 12
  const insurance = p.insurance || 0

  const apportioned = (mortgageInterest + propertyTax + strata + insurance) * areaShare
  const managementFee = effectiveRent * ((r.managementFeePercent || 0) / 100)
  const deductibleExpenses = apportioned + managementFee

  return {
    grossAnnualRent,
    vacancyLoss,
    deductibleExpenses,
    netAnnualRent: effectiveRent - deductibleExpenses,
  }
}

export interface PropertyBalance {
  rentalIncome: number // effective rent (gross − vacancy)
  mortgagePayment: number
  locInterest: number // annual interest on LOC/HELOC balance
  propertyTax: number
  strata: number
  insurance: number
  managementFee: number
  assignedExpenses: number
  totalExpenses: number
  net: number // rentalIncome − totalExpenses (annual cash-flow balance)
}

// Annual income/expense balance for one property, including any manual expenses
// assigned to it. This is a cash-flow view (full mortgage payment), not the
// tax-deductible T776 net figure.
export function propertyAnnualBalance(p: Property, assigned: Expense[]): PropertyBalance {
  const r = p.rental && (p.type === 'rental' || p.type === 'mixed') ? rentalSummary(p) : null
  const rentalIncome = r ? r.grossAnnualRent - r.vacancyLoss : 0

  const mortgagePayment = p.mortgage?.hasMortgage ? p.mortgage.monthlyPayment * 12 : 0
  const locInterest = p.loc?.hasLOC ? p.loc.balance * p.loc.interestRate : 0
  const propertyTax = computePropertyTax(p)
  const strata = (p.strataFee || 0) * 12
  const insurance = p.insurance || 0
  const managementFee =
    p.rental && (p.type === 'rental' || p.type === 'mixed')
      ? rentalIncome * ((p.rental.managementFeePercent || 0) / 100)
      : 0
  const assignedExpenses = assigned.reduce((sum, e) => sum + annualAmount(e), 0)

  const totalExpenses =
    mortgagePayment + locInterest + propertyTax + strata + insurance + managementFee + assignedExpenses

  return {
    rentalIncome,
    mortgagePayment,
    locInterest,
    propertyTax,
    strata,
    insurance,
    managementFee,
    assignedExpenses,
    totalExpenses,
    net: rentalIncome - totalExpenses,
  }
}
