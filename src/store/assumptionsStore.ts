import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Assumptions } from '../types'
import { DEFAULT_ASSUMPTIONS } from '../constants/bcTaxRates2026'

interface AssumptionsState {
  assumptions: Assumptions
  update: (patch: Partial<Assumptions>) => void
  reset: () => void
}

export const useAssumptionsStore = create<AssumptionsState>()(
  persist(
    (set) => ({
      assumptions: DEFAULT_ASSUMPTIONS,
      update: (patch) =>
        set((s) => ({ assumptions: { ...s.assumptions, ...patch } })),
      reset: () => set({ assumptions: DEFAULT_ASSUMPTIONS }),
    }),
    { name: 'rp-assumptions' },
  ),
)
