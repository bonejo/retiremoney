import type { Expense } from '../types'

// Normalize any expense frequency to a monthly figure.
export function monthlyAmount(e: Expense): number {
  switch (e.frequency) {
    case 'monthly':
      return e.amount
    case 'quarterly':
      return e.amount / 3
    case 'annual':
      return e.amount / 12
    case 'one_time':
      return 0 // one-time costs are not part of the recurring monthly total
    default:
      return 0
  }
}

export function annualAmount(e: Expense): number {
  return monthlyAmount(e) * 12
}

// Whether an expense is active at a given age (respects start/end age bounds).
export function isActiveAtAge(e: Expense, age: number): boolean {
  if (e.startAge != null && age < e.startAge) return false
  if (e.endAge != null && age > e.endAge) return false
  return true
}

export function totalMonthlyExpenses(expenses: Expense[]): number {
  return expenses.reduce((sum, e) => sum + monthlyAmount(e), 0)
}
