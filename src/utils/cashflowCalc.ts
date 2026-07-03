import type { Expense, Investment, Property } from '../types'
import { propertyAnnualBalance, type PropertyBalance } from './propertyCalc'
import { annualAmount, isActiveAtAge } from './expenseCalc'

export interface HouseholdCashflow {
  // Per-property annual balances (cash basis: full mortgage payment)
  propertyRows: { property: Property; balance: PropertyBalance }[]
  rentalIncome: number // Σ effective rent across properties
  propertyExpenses: number // Σ carrying costs incl. property-assigned expenses
  personalExpenses: number // unassigned manual expenses active at current age
  familyLoanRepayments: number // scheduled repayments landing this calendar year
  totalExpenses: number
}

// Household annual cash flow on a cash basis (full mortgage payments, not the
// T776 deductible-net view used for tax/GIS). Property-assigned expenses are
// counted inside their property's balance; everything else is personal.
export function householdCashflow(
  properties: Property[],
  investments: Investment[],
  expenses: Expense[],
  currentAge: number,
  year: number = new Date().getFullYear(),
): HouseholdCashflow {
  const propertyRows = properties.map((p) => ({
    property: p,
    balance: propertyAnnualBalance(
      p,
      expenses.filter((e) => e.propertyId === p.id && isActiveAtAge(e, currentAge)),
    ),
  }))

  const rentalIncome = propertyRows.reduce((s, r) => s + r.balance.rentalIncome, 0)
  const propertyExpenses = propertyRows.reduce((s, r) => s + r.balance.totalExpenses, 0)

  const personalExpenses = expenses
    .filter((e) => !e.propertyId && isActiveAtAge(e, currentAge))
    .reduce((s, e) => s + annualAmount(e), 0)

  const familyLoanRepayments = investments.reduce((s, inv) => {
    if (!inv.familyLoan?.isFamilyLoan) return s
    return (
      s +
      inv.familyLoan.repaymentSchedule
        .filter((r) => r.year === year)
        .reduce((sum, r) => sum + r.amount, 0)
    )
  }, 0)

  return {
    propertyRows,
    rentalIncome,
    propertyExpenses,
    personalExpenses,
    familyLoanRepayments,
    totalExpenses: propertyExpenses + personalExpenses,
  }
}
