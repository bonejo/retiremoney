import type { Investment } from '../types'
import { currentInvestmentValue, investmentACB } from './investmentCalc'

export interface WithdrawalPlanRow {
  investment: Investment
  withdrawal: number // annual gross withdrawal (CAD)
  realizedGain: number // capital gain realized by this withdrawal (non-registered)
  ordinaryIncome: number // fully-taxable income from this withdrawal (RRSP)
  extraTax: number // tax triggered by this withdrawal (flat marginal estimate)
}

export interface WithdrawalPlan {
  rows: WithdrawalPlanRow[]
  totalWithdrawal: number
  totalRealizedGain: number
  totalOrdinaryIncome: number
  totalExtraTax: number
  uncovered: number // shortfall left after exhausting all designated accounts
}

// Tax cost per gross dollar withdrawn from an account.
// Non-registered: only the gain fraction is realized, 50% taxable.
// RRSP: fully taxable as ordinary income. TFSA/savings/GIC/other: none.
function taxPerDollar(inv: Investment, marginalRate: number): { t: number; g: number } {
  if (inv.type === 'RRSP') return { t: marginalRate, g: 0 }
  if (inv.type === 'non_registered') {
    const value = currentInvestmentValue(inv)
    const acb = investmentACB(inv) ?? value
    const g = value > 0 ? Math.max(0, (value - acb) / value) : 0
    return { t: g * 0.5 * marginalRate, g }
  }
  return { t: 0, g: 0 }
}

// Plan annual withdrawals to cover a cash shortfall, walking accounts in the
// user's withdrawalPriority order. The tax each withdrawal triggers is itself
// part of the shortfall, so the gross amount is solved as W = need / (1 − t).
export function planWithdrawals(
  annualShortfall: number,
  investments: Investment[],
  marginalRate: number,
): WithdrawalPlan {
  const rows: WithdrawalPlanRow[] = []
  let remaining = Math.max(0, annualShortfall)

  const order = investments
    .filter((i) => (i.withdrawalPriority ?? 0) > 0 && !i.familyLoan?.isFamilyLoan)
    .sort((a, b) => (a.withdrawalPriority ?? 0) - (b.withdrawalPriority ?? 0))

  for (const inv of order) {
    if (remaining <= 0.005) break
    const available = currentInvestmentValue(inv)
    if (available <= 0) continue

    const { t, g } = taxPerDollar(inv, marginalRate)
    const grossNeeded = t < 1 ? remaining / (1 - t) : remaining
    const withdrawal = Math.min(grossNeeded, available)
    const extraTax = withdrawal * t

    rows.push({
      investment: inv,
      withdrawal,
      realizedGain: withdrawal * g,
      ordinaryIncome: inv.type === 'RRSP' ? withdrawal : 0,
      extraTax,
    })
    remaining -= withdrawal - extraTax // net spendable after its own tax
  }

  return {
    rows,
    totalWithdrawal: rows.reduce((s, r) => s + r.withdrawal, 0),
    totalRealizedGain: rows.reduce((s, r) => s + r.realizedGain, 0),
    totalOrdinaryIncome: rows.reduce((s, r) => s + r.ordinaryIncome, 0),
    totalExtraTax: rows.reduce((s, r) => s + r.extraTax, 0),
    uncovered: Math.max(0, remaining),
  }
}
