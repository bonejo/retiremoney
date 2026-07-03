import type { Assumptions } from '../types'

// Default global assumptions (2026 figures per PRD).
export const DEFAULT_ASSUMPTIONS: Assumptions = {
  inflationRates: {
    living: 0.025,
    property: 0.03,
    healthcare: 0.04,
    governmentBenefits: 0.02,
  },
  taxRates: {
    capitalGainsTaxRate: 0.27,
    marginalTaxRate: 0.28,
    dividendGrossUpFactor: 1.38,
    dtcRate: 0.25,
  },
  governmentBenefits: {
    oasAge: 65,
    oasMonthly6574: 742,
    oasMonthly75plus: 817,
    gisMaxAnnual: 13260,
    gisMaxAnnualCouple: 7980, // per-person, both spouses on OAS
    gisIncomeThreshold: 22448,
    tfsa_annual_room: 7000,
  },
  propertyTax: {
    richmond_rate: 1.761,
    assessed_value_ratio: 0.85,
  },
  probate: {
    bc_rate_above_50k: 0.014,
  },
  exchangeRates: {
    usdCad: 1.35,
  },
}

// Basic personal amounts (used in tax summary — Phase 2).
export const BASIC_PERSONAL_AMOUNT = {
  federal: 16129,
  bc: 11981,
}

// 2026 federal tax brackets (marginal). rate applies to income within the band.
export const FEDERAL_BRACKETS_2026 = [
  { upTo: 57375, rate: 0.15 },
  { upTo: 114750, rate: 0.205 },
  { upTo: 177882, rate: 0.26 },
  { upTo: 253414, rate: 0.29 },
  { upTo: Infinity, rate: 0.33 },
]

// 2026 BC provincial tax brackets (marginal).
export const BC_BRACKETS_2026 = [
  { upTo: 49279, rate: 0.0506 },
  { upTo: 98560, rate: 0.077 },
  { upTo: 113158, rate: 0.105 },
  { upTo: 137407, rate: 0.1229 },
  { upTo: 186306, rate: 0.147 },
  { upTo: 259829, rate: 0.168 },
  { upTo: Infinity, rate: 0.205 },
]

export const PROPERTY_TAX_RATES: Record<string, number> = {
  Richmond: 1.761,
  Vancouver: 1.6,
  Burnaby: 1.65,
  Surrey: 1.9,
}

export const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  utilities: '水电气',
  vehicle: '车辆',
  food_dining: '饮食',
  healthcare: '医疗',
  travel: '旅游',
  insurance: '保险',
  phone_internet: '电话网络',
  entertainment: '娱乐',
  clothing: '服装',
  gifts_charity: '礼品慈善',
  other: '其他',
}

export const INVESTMENT_TYPE_LABELS: Record<string, string> = {
  TFSA: 'TFSA',
  RRSP: 'RRSP',
  non_registered: '非注册',
  GIC: 'GIC',
  savings: '储蓄',
  other: '其他',
}

export const PROPERTY_TYPE_LABELS: Record<string, string> = {
  primary_residence: '自住',
  rental: '出租',
  mixed: '混合',
}
