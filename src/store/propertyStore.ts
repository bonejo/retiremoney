import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Property } from '../types'
import { uid } from '../utils/format'
import { DEFAULT_ASSUMPTIONS } from '../constants/bcTaxRates2026'

export function emptyProperty(): Property {
  return {
    id: uid(),
    name: '',
    type: 'primary_residence',
    currentValue: 0,
    purchasePrice: 0,
    purchaseYear: new Date().getFullYear(),
    appreciationRate: DEFAULT_ASSUMPTIONS.inflationRates.property,
    province: 'BC',
    propertyTax: {
      annualAmount: 0,
      autoCalculate: true,
      assessedValueRatio: DEFAULT_ASSUMPTIONS.propertyTax.assessed_value_ratio,
      taxRatePerThousand: DEFAULT_ASSUMPTIONS.propertyTax.richmond_rate,
    },
    mortgage: null,
    loc: null,
    strataFee: null,
    insurance: null,
    rental: null,
  }
}

interface PropertyState {
  properties: Property[]
  addProperty: (p: Property) => void
  updateProperty: (id: string, p: Property) => void
  removeProperty: (id: string) => void
}

export const usePropertyStore = create<PropertyState>()(
  persist(
    (set) => ({
      properties: [],
      addProperty: (p) => set((s) => ({ properties: [...s.properties, p] })),
      updateProperty: (id, p) =>
        set((s) => ({
          properties: s.properties.map((x) => (x.id === id ? p : x)),
        })),
      removeProperty: (id) =>
        set((s) => ({ properties: s.properties.filter((x) => x.id !== id) })),
    }),
    { name: 'rp-properties' },
  ),
)
