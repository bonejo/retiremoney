import type { ProvinceCode } from '../types'

// Per-province tax parameters (2025/2026 approximations — editable assumptions,
// not tax advice). Ontario surtax and Quebec's separate return are simplified;
// QC gets the 16.5% federal abatement applied in taxCalc.
export interface ProvinceInfo {
  code: ProvinceCode
  name: string // Chinese display name
  brackets: { upTo: number; rate: number }[]
  basicPersonalAmount: number
  // Probate / estate administration tax as a simple estimator:
  // flat-ish regimes use `flatMax`, rate regimes use `rate` above `exempt`.
  probate: { rate: number; exempt: number; flatMax?: number }
}

export const PROVINCES: Record<ProvinceCode, ProvinceInfo> = {
  BC: {
    code: 'BC',
    name: 'British Columbia (BC)',
    brackets: [
      { upTo: 49279, rate: 0.0506 },
      { upTo: 98560, rate: 0.077 },
      { upTo: 113158, rate: 0.105 },
      { upTo: 137407, rate: 0.1229 },
      { upTo: 186306, rate: 0.147 },
      { upTo: 259829, rate: 0.168 },
      { upTo: Infinity, rate: 0.205 },
    ],
    basicPersonalAmount: 11981,
    probate: { rate: 0.014, exempt: 50000 },
  },
  AB: {
    code: 'AB',
    name: 'Alberta (AB)',
    brackets: [
      { upTo: 60000, rate: 0.08 },
      { upTo: 151234, rate: 0.1 },
      { upTo: 181481, rate: 0.12 },
      { upTo: 241974, rate: 0.13 },
      { upTo: 362961, rate: 0.14 },
      { upTo: Infinity, rate: 0.15 },
    ],
    basicPersonalAmount: 21885,
    probate: { rate: 0, exempt: 0, flatMax: 525 }, // flat court fees, capped
  },
  SK: {
    code: 'SK',
    name: 'Saskatchewan (SK)',
    brackets: [
      { upTo: 53463, rate: 0.105 },
      { upTo: 152750, rate: 0.125 },
      { upTo: Infinity, rate: 0.145 },
    ],
    basicPersonalAmount: 18491,
    probate: { rate: 0.007, exempt: 0 },
  },
  MB: {
    code: 'MB',
    name: 'Manitoba (MB)',
    brackets: [
      { upTo: 47000, rate: 0.108 },
      { upTo: 100000, rate: 0.1275 },
      { upTo: Infinity, rate: 0.174 },
    ],
    basicPersonalAmount: 15780,
    probate: { rate: 0, exempt: 0, flatMax: 0 }, // MB abolished probate fees (2020)
  },
  ON: {
    code: 'ON',
    name: 'Ontario (ON)',
    brackets: [
      { upTo: 52886, rate: 0.0505 },
      { upTo: 105775, rate: 0.0915 },
      { upTo: 150000, rate: 0.1116 },
      { upTo: 220000, rate: 0.1216 },
      { upTo: Infinity, rate: 0.1316 },
    ],
    basicPersonalAmount: 12747,
    probate: { rate: 0.015, exempt: 50000 }, // Estate Administration Tax
  },
  QC: {
    code: 'QC',
    name: 'Quebec (QC)',
    brackets: [
      { upTo: 53255, rate: 0.14 },
      { upTo: 106495, rate: 0.19 },
      { upTo: 129590, rate: 0.24 },
      { upTo: Infinity, rate: 0.2575 },
    ],
    basicPersonalAmount: 18571,
    probate: { rate: 0, exempt: 0, flatMax: 200 }, // notarial wills bypass probate
  },
  NB: {
    code: 'NB',
    name: 'New Brunswick (NB)',
    brackets: [
      { upTo: 51306, rate: 0.094 },
      { upTo: 102614, rate: 0.14 },
      { upTo: 190060, rate: 0.16 },
      { upTo: Infinity, rate: 0.195 },
    ],
    basicPersonalAmount: 13396,
    probate: { rate: 0.005, exempt: 0 },
  },
  NS: {
    code: 'NS',
    name: 'Nova Scotia (NS)',
    brackets: [
      { upTo: 30507, rate: 0.0879 },
      { upTo: 61015, rate: 0.1495 },
      { upTo: 95883, rate: 0.1667 },
      { upTo: 154650, rate: 0.175 },
      { upTo: Infinity, rate: 0.21 },
    ],
    basicPersonalAmount: 11744,
    probate: { rate: 0.01695, exempt: 100000 },
  },
  PE: {
    code: 'PE',
    name: 'Prince Edward Island (PE)',
    brackets: [
      { upTo: 33328, rate: 0.095 },
      { upTo: 64656, rate: 0.1347 },
      { upTo: 105000, rate: 0.166 },
      { upTo: 140000, rate: 0.1762 },
      { upTo: Infinity, rate: 0.19 },
    ],
    basicPersonalAmount: 14250,
    probate: { rate: 0.004, exempt: 0 },
  },
  NL: {
    code: 'NL',
    name: 'Newfoundland & Labrador (NL)',
    brackets: [
      { upTo: 44192, rate: 0.087 },
      { upTo: 88382, rate: 0.145 },
      { upTo: 157792, rate: 0.158 },
      { upTo: 220910, rate: 0.178 },
      { upTo: 282214, rate: 0.198 },
      { upTo: Infinity, rate: 0.208 },
    ],
    basicPersonalAmount: 10818,
    probate: { rate: 0.006, exempt: 1000 },
  },
}

export const PROVINCE_LIST = Object.values(PROVINCES)

// Simple probate estimator for a given estate value in the province.
export function provincialProbate(province: ProvinceCode, value: number): number {
  const p = PROVINCES[province].probate
  if (p.flatMax != null) return Math.min(p.flatMax, value > 0 ? p.flatMax : 0)
  return Math.max(0, value - p.exempt) * p.rate
}
