import type { Investment } from '../types'
import { yearsSince } from './format'
import { useAssumptionsStore } from '../store/assumptionsStore'

// CAD per 1 USD from global settings (fallback for data persisted before the field existed).
export function usdCadRate(): number {
  return useAssumptionsStore.getState().assumptions.exchangeRates?.usdCad ?? 1.35
}

function fxFactor(inv: Investment): number {
  return inv.currency === 'USD' ? usdCadRate() : 1
}

// Value today in the account's own currency. If a historical origin
// (startDate + startValue) is set, compound the initial amount forward at the
// total return rate; otherwise use the directly-entered current balance.
// (Ongoing contributions are not modeled — enter the current balance directly.)
export function nativeInvestmentValue(inv: Investment): number {
  if (inv.startDate && inv.startValue != null && inv.startValue > 0) {
    const years = yearsSince(inv.startDate)
    if (years > 0) return inv.startValue * Math.pow(1 + inv.annualReturnRate, years)
    return inv.startValue
  }
  return inv.currentBalance
}

// Value today in CAD — USD accounts are converted at the global exchange rate.
// All aggregation (net worth, income, GIS, projections, estate) uses this.
export function currentInvestmentValue(inv: Investment): number {
  return nativeInvestmentValue(inv) * fxFactor(inv)
}

// ACB in CAD (USD-account ACB is assumed to be entered in USD).
export function investmentACB(inv: Investment): number | undefined {
  return inv.acb != null ? inv.acb * fxFactor(inv) : undefined
}

// True when the account's value is derived from a historical origin.
export function isHistoricalOrigin(inv: Investment): boolean {
  return !!(inv.startDate && inv.startValue != null && inv.startValue > 0)
}
