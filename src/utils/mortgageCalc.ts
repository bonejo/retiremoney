import type { Mortgage } from '../types'
import { monthsSince } from './format'

// Canadian mortgages compound semi-annually but are paid monthly.
// Convert the nominal (semi-annual) annual rate to an effective monthly rate.
export function monthlyRateFromNominal(annualNominalRate: number): number {
  // Semi-annual compounding: EAR = (1 + rate/2)^2 - 1, then monthly equivalent.
  const semiAnnual = 1 + annualNominalRate / 2
  const ear = semiAnnual * semiAnnual - 1
  return Math.pow(1 + ear, 1 / 12) - 1
}

export interface MortgageStats {
  monthsRemaining: number
  yearsRemaining: number
  totalRemainingInterest: number
  principalPortion: number // of next payment
  interestPortion: number // of next payment
  valid: boolean
}

// Number of months to pay off a balance given a fixed monthly payment.
export function monthsToPayoff(
  balance: number,
  monthlyPayment: number,
  monthlyRate: number,
): number {
  if (balance <= 0 || monthlyPayment <= 0) return 0
  if (monthlyRate <= 0) return balance / monthlyPayment
  // If payment doesn't cover interest, it never pays off.
  if (monthlyPayment <= balance * monthlyRate) return Infinity
  const n =
    -Math.log(1 - (balance * monthlyRate) / monthlyPayment) /
    Math.log(1 + monthlyRate)
  return n
}

export function mortgageStats(m: Mortgage): MortgageStats {
  const empty: MortgageStats = {
    monthsRemaining: 0,
    yearsRemaining: 0,
    totalRemainingInterest: 0,
    principalPortion: 0,
    interestPortion: 0,
    valid: false,
  }
  if (!m || !m.hasMortgage || m.balance <= 0 || m.monthlyPayment <= 0) return empty

  const monthlyRate = monthlyRateFromNominal(m.interestRate)
  const months = monthsToPayoff(m.balance, m.monthlyPayment, monthlyRate)
  if (!isFinite(months)) {
    return { ...empty, valid: false, monthsRemaining: Infinity }
  }
  const totalPaid = m.monthlyPayment * months
  const totalInterest = totalPaid - m.balance
  const interestPortion = m.balance * monthlyRate
  const principalPortion = Math.min(m.monthlyPayment - interestPortion, m.balance)

  return {
    monthsRemaining: months,
    yearsRemaining: months / 12,
    totalRemainingInterest: totalInterest,
    principalPortion,
    interestPortion,
    valid: true,
  }
}

// Advance a balance by N monthly payments.
export function amortizeMonths(
  balance: number,
  monthlyPayment: number,
  annualNominalRate: number,
  months: number,
): number {
  if (balance <= 0 || months <= 0) return Math.max(0, balance)
  const r = monthlyRateFromNominal(annualNominalRate)
  let b = balance
  for (let i = 0; i < months && b > 0; i++) {
    const interest = b * r
    const principal = monthlyPayment - interest
    if (principal <= 0) return b // never amortizes
    b = b - principal
  }
  return Math.max(0, b)
}

// Current balance today: if `balanceAsOf` is a past month, amortize the recorded
// balance forward to now; otherwise the stored balance is already current.
export function currentMortgageBalance(m: Mortgage): number {
  if (!m?.hasMortgage) return 0
  const months = monthsSince(m.balanceAsOf)
  if (months <= 0) return m.balance
  return amortizeMonths(m.balance, m.monthlyPayment, m.interestRate, months)
}

// Mortgage with its balance replaced by today's projected balance.
export function effectiveMortgage(m: Mortgage): Mortgage {
  return { ...m, balance: currentMortgageBalance(m) }
}

// Advance a mortgage balance by one year (12 monthly payments).
export function amortizeOneYear(
  balance: number,
  monthlyPayment: number,
  annualNominalRate: number,
): number {
  if (balance <= 0) return 0
  const r = monthlyRateFromNominal(annualNominalRate)
  let b = balance
  for (let i = 0; i < 12 && b > 0; i++) {
    const interest = b * r
    const principal = Math.min(monthlyPayment - interest, b)
    b = b - principal
    if (principal <= 0) return b // never amortizes
  }
  return Math.max(0, b)
}

// Age at which the mortgage is paid off, given the borrower's current age.
export function payoffAge(m: Mortgage, currentAge: number): number {
  const stats = mortgageStats(m)
  if (!stats.valid) return NaN
  return currentAge + stats.yearsRemaining
}
