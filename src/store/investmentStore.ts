import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Investment } from '../types'
import { uid } from '../utils/format'
import { DEFAULT_ASSUMPTIONS } from '../constants/bcTaxRates2026'

export function emptyInvestment(): Investment {
  return {
    id: uid(),
    type: 'TFSA',
    institutionName: '',
    accountName: '',
    currentBalance: 0,
    annualReturnRate: 0.085,
    dividendYield: 0,
    withdrawalPriority: 0,
    tfsa: {
      contributionRoom: 0,
      annualNewRoom: DEFAULT_ASSUMPTIONS.governmentBenefits.tfsa_annual_room,
    },
  }
}

interface InvestmentState {
  investments: Investment[]
  addInvestment: (i: Investment) => void
  updateInvestment: (id: string, i: Investment) => void
  removeInvestment: (id: string) => void
}

export const useInvestmentStore = create<InvestmentState>()(
  persist(
    (set) => ({
      investments: [],
      addInvestment: (i) => set((s) => ({ investments: [...s.investments, i] })),
      updateInvestment: (id, i) =>
        set((s) => ({
          investments: s.investments.map((x) => (x.id === id ? i : x)),
        })),
      removeInvestment: (id) =>
        set((s) => ({ investments: s.investments.filter((x) => x.id !== id) })),
    }),
    { name: 'rp-investments' },
  ),
)
