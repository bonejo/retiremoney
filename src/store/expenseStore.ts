import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Expense } from '../types'
import { uid } from '../utils/format'

export function emptyExpense(): Expense {
  return {
    id: uid(),
    name: '',
    category: 'other',
    amount: 0,
    frequency: 'monthly',
    inflationLinked: true,
  }
}

interface ExpenseState {
  expenses: Expense[]
  addExpense: (e: Expense) => void
  updateExpense: (id: string, e: Expense) => void
  removeExpense: (id: string) => void
}

export const useExpenseStore = create<ExpenseState>()(
  persist(
    (set) => ({
      expenses: [],
      addExpense: (e) => set((s) => ({ expenses: [...s.expenses, e] })),
      updateExpense: (id, e) =>
        set((s) => ({ expenses: s.expenses.map((x) => (x.id === id ? e : x)) })),
      removeExpense: (id) =>
        set((s) => ({ expenses: s.expenses.filter((x) => x.id !== id) })),
    }),
    { name: 'rp-expenses' },
  ),
)
