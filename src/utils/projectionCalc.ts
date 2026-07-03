import type { Assumptions, Expense, Investment, Property } from '../types'
import { amortizeOneYear, currentMortgageBalance } from './mortgageCalc'
import { currentInvestmentValue, investmentACB } from './investmentCalc'
import { rentalSummary } from './propertyCalc'
import { annualAmount, isActiveAtAge } from './expenseCalc'
import { computeGIS } from './gisCalc'
import { oasMonthly } from './gisCalc'
import { computeIncomeTax } from './taxCalc'

export interface ProjectionPoint {
  year: number
  age: number
  netWorth: number
  tfsa: number
  nonRegistered: number
  propertyEquity: number
  totalDebt: number
  familyLoanBalance: number
  // Cash-flow detail for the year
  cashIncome: number
  expenses: number
  withdrawals: number
  realizedGains: number
  taxableIncome: number
  incomeTax: number
  gisAnnual: number
  unfundedShortfall: number // expenses left uncovered after all designated accounts are empty
}

export interface ProjectionParams {
  currentAge: number
  startYear: number
  years: number
  // Optional total-return overrides (Projections page sliders).
  propertyAppreciation?: number
  nonRegReturn?: number
  tfsaReturn?: number
  // Profile-driven benefit parameters.
  province?: import('../types').ProvinceCode
  maritalStatus?: import('../types').MaritalStatus
  oasResidenceFraction?: number // partial OAS by immigration year
  cppMonthlyAdjusted?: number // CPP monthly at start age (already ±adjusted)
  cppStartAge?: number
}

// Mutable per-account working state during the simulation.
interface InvState {
  id: string
  type: Investment['type']
  balance: number
  acb: number
  dividendYield: number
  growthRate: number // capital-only growth (total return − dividend yield)
  totalRate: number
  dividendEligible: boolean
  withdrawalPriority: number
  familyLoan?: Investment['familyLoan']
  tfsaRoom: number
  annualNewRoom: number
}

// Withdraw `amount` from one account. Returns cash taken plus the taxable
// components: realized capital gain (non-reg) and ordinary income (RRSP).
function withdraw(s: InvState, amount: number): { taken: number; gain: number; ordinary: number } {
  const take = Math.min(amount, s.balance)
  if (take <= 0) return { taken: 0, gain: 0, ordinary: 0 }

  if (s.type === 'non_registered') {
    const gainFraction = s.balance > 0 ? Math.max(0, (s.balance - s.acb) / s.balance) : 0
    const gain = take * gainFraction
    s.acb = Math.max(0, s.acb - take * (1 - gainFraction)) // reduce ACB by return-of-capital
    s.balance -= take
    return { taken: take, gain, ordinary: 0 }
  }
  if (s.type === 'RRSP') {
    s.balance -= take
    return { taken: take, gain: 0, ordinary: take } // full amount is ordinary income
  }
  // TFSA (tax-free) and savings/GIC/other (principal not taxable — interest already taxed)
  s.balance -= take
  return { taken: take, gain: 0, ordinary: 0 }
}

// Year-by-year household projection. Income covers expenses first; any shortfall
// is funded by selling investments in the user's withdrawal-priority order, which
// realizes capital gains / RRSP income and drives that year's tax. Surplus cash is
// reinvested into TFSA (up to available room) then non-registered.
export function buildProjection(
  properties: Property[],
  investments: Investment[],
  expenses: Expense[],
  assumptions: Assumptions,
  params: ProjectionParams,
): ProjectionPoint[] {
  const points: ProjectionPoint[] = []
  const inf = assumptions.inflationRates

  const propState = properties.map((p) => ({
    property: p,
    value: p.currentValue,
    mortgageBalance: p.mortgage?.hasMortgage ? currentMortgageBalance(p.mortgage) : 0,
    monthlyPayment: p.mortgage?.monthlyPayment ?? 0,
    rate: p.mortgage?.interestRate ?? 0,
    locBalance: p.loc?.hasLOC ? p.loc.balance : 0,
    locRate: p.loc?.hasLOC ? p.loc.interestRate : 0,
    appreciation: params.propertyAppreciation ?? p.appreciationRate ?? 0.03,
    baseRentalNet: rentalSummary(p).netAnnualRent,
  }))

  const invState: InvState[] = investments.map((inv) => {
    const isReg = inv.type === 'TFSA' || inv.type === 'RRSP'
    const totalRate =
      inv.type === 'TFSA'
        ? params.tfsaReturn ?? inv.annualReturnRate
        : inv.type === 'non_registered'
          ? params.nonRegReturn ?? inv.annualReturnRate
          : inv.annualReturnRate
    const divYield = isReg ? 0 : inv.dividendYield ?? 0
    const balance = currentInvestmentValue(inv)
    return {
      id: inv.id,
      type: inv.type,
      balance,
      acb: investmentACB(inv) ?? balance,
      dividendYield: divYield,
      growthRate: Math.max(0, totalRate - divYield),
      totalRate,
      dividendEligible: inv.dividendType === 'eligible',
      withdrawalPriority: inv.withdrawalPriority ?? 0,
      familyLoan: inv.familyLoan,
      tfsaRoom: inv.tfsa?.contributionRoom ?? 0,
      annualNewRoom: inv.tfsa?.annualNewRoom ?? assumptions.governmentBenefits.tfsa_annual_room,
    }
  })

  let priorYearTax = 0
  // GIS is assessed on the PREVIOUS year's income, so last year's withdrawal
  // income (realized gains, RRSP amounts) reduces this year's GIS.
  let priorRealizedGains = 0
  let priorOrdinaryWithdrawals = 0

  for (let i = 0; i <= params.years; i++) {
    const year = params.startYear + i
    const age = params.currentAge + i

    let cashIncome = 0
    let expenseTotal = 0
    let withdrawalsTotal = 0
    let realizedGains = 0
    let ordinaryFromWithdrawals = 0
    let eligibleDividends = 0
    let ordinaryDividends = 0
    let interestIncome = 0
    let rentalNet = 0
    let gisAnnual = 0
    let taxableIncome = 0
    let incomeTax = 0
    let unfundedShortfall = 0

    if (i > 0) {
      // --- 1. Grow property values & amortize mortgages ---
      for (const s of propState) {
        s.value *= 1 + s.appreciation
        if (s.mortgageBalance > 0) {
          s.mortgageBalance = amortizeOneYear(s.mortgageBalance, s.monthlyPayment, s.rate)
        }
      }

      // --- 2. Investment income (dividends/interest paid out as cash) + growth ---
      for (const s of invState) {
        if (s.familyLoan?.isFamilyLoan) continue // loan principal doesn't compound or pay dividends
        if (s.type === 'non_registered') {
          const div = s.balance * s.dividendYield
          if (s.dividendEligible) eligibleDividends += div
          else ordinaryDividends += div
          s.balance *= 1 + s.growthRate // capital growth only; dividends taken as cash
        } else if (s.type === 'GIC' || s.type === 'savings') {
          interestIncome += s.balance * s.totalRate // whole return is interest
          // principal held flat (interest paid out as cash)
        } else {
          s.balance *= 1 + s.totalRate // TFSA / RRSP: dividends reinvested internally
        }
        s.tfsaRoom += s.type === 'TFSA' ? s.annualNewRoom : 0
      }

      // --- 3. Rental + government benefits ---
      for (const s of propState) {
        // Per-property annual rent increase; falls back to property inflation.
        const rentIncrease = s.property.rental?.annualRentIncrease ?? inf.property
        rentalNet += s.baseRentalNet * Math.pow(1 + rentIncrease, i)
      }
      const oasAnnual =
        oasMonthly(age, assumptions, params.oasResidenceFraction ?? 1) *
        12 *
        Math.pow(1 + inf.governmentBenefits, i)
      const cppAnnual =
        params.cppMonthlyAdjusted && age >= (params.cppStartAge ?? 65)
          ? params.cppMonthlyAdjusted * 12 * Math.pow(1 + inf.governmentBenefits, i)
          : 0

      // --- 4. Family-loan repayments (return of principal → cash) ---
      let loanRepay = 0
      for (const s of invState) {
        if (s.familyLoan?.isFamilyLoan) {
          const repay = s.familyLoan.repaymentSchedule
            .filter((r) => r.year === year)
            .reduce((sum, r) => sum + r.amount, 0)
          const take = Math.min(repay, s.balance)
          s.balance -= take
          loanRepay += take
        }
      }

      // --- 5. GIS test: based on last year's income, INCLUDING last year's
      // withdrawal income (realized gains ×50%, RRSP 100%). CPP counts 100%;
      // OAS itself does not count. ---
      const gis = computeGIS(
        {
          rentalNet,
          eligibleDividends,
          interest: interestIncome + ordinaryDividends,
          capitalGains: priorRealizedGains,
          helocInterest: helocDeduction(properties),
          otherIncome: cppAnnual + priorOrdinaryWithdrawals,
        },
        assumptions,
        params.maritalStatus ?? 'single',
      )
      gisAnnual = gis.gisAnnual

      cashIncome = rentalNet + oasAnnual + cppAnnual + gisAnnual + eligibleDividends + ordinaryDividends + interestIncome + loanRepay

      // --- 6. Expenses (inflation-adjusted) + prior-year income tax ---
      const manualExpenses = expenses
        .filter((e) => isActiveAtAge(e, age))
        .reduce((sum, e) => {
          const base = annualAmount(e)
          // Healthcare tracks its own (higher) inflation rate per the PRD.
          const rate = e.category === 'healthcare' ? inf.healthcare : inf.living
          return sum + (e.inflationLinked ? base * Math.pow(1 + rate, i) : base)
        }, 0)
      // Property-linked costs (tax, strata, insurance) scale with the home's
      // actual projected value, not a generic inflation rate.
      const propertyCarry = propState.reduce((sum, s) => {
        const valueRatio = s.property.currentValue > 0 ? s.value / s.property.currentValue : 1
        let c = 0
        if (s.mortgageBalance > 0) c += s.monthlyPayment * 12
        if (s.locBalance > 0) c += s.locBalance * s.locRate // LOC interest is a real cash cost
        c += s.property.propertyTax.autoCalculate
          ? (s.value * s.property.propertyTax.assessedValueRatio * s.property.propertyTax.taxRatePerThousand) / 1000
          : s.property.propertyTax.annualAmount * valueRatio
        if (s.property.strataFee) c += s.property.strataFee * 12 * valueRatio
        if (s.property.insurance) c += s.property.insurance * valueRatio
        return sum + c
      }, 0)
      expenseTotal = manualExpenses + propertyCarry + priorYearTax

      // --- 7. Fund shortfall via withdrawals, or reinvest surplus ---
      let shortfall = expenseTotal - cashIncome
      if (shortfall > 0) {
        const order = invState
          .filter((s) => s.withdrawalPriority > 0 && s.balance > 0)
          .sort((a, b) => a.withdrawalPriority - b.withdrawalPriority)
        for (const s of order) {
          if (shortfall <= 0) break
          const r = withdraw(s, shortfall)
          withdrawalsTotal += r.taken
          realizedGains += r.gain
          ordinaryFromWithdrawals += r.ordinary
          shortfall -= r.taken
        }
        // Whatever remains could NOT be funded — the designated accounts are
        // empty. Surface it instead of silently assuming money appears.
        unfundedShortfall = Math.max(0, shortfall)
      } else if (shortfall < 0) {
        reinvestSurplus(invState, -shortfall)
      }

      // --- 8. Income tax on this year's realized income (paid next year) ---
      const tax = computeIncomeTax(
        {
          ordinaryIncome:
            rentalNet + interestIncome + ordinaryDividends + ordinaryFromWithdrawals + cppAnnual,
          eligibleDividends,
          capitalGains: realizedGains,
          oas: oasAnnual,
          deductions: helocDeduction(properties),
        },
        assumptions,
        params.province ?? 'BC',
      )
      taxableIncome = tax.taxableIncome
      incomeTax = tax.totalTax
      priorYearTax = incomeTax
      priorRealizedGains = realizedGains
      priorOrdinaryWithdrawals = ordinaryFromWithdrawals
    }

    // --- Record end-of-year balance sheet ---
    const tfsa = invState.filter((s) => s.type === 'TFSA').reduce((sum, s) => sum + s.balance, 0)
    const nonRegistered = invState
      .filter((s) => !s.familyLoan?.isFamilyLoan && s.type !== 'TFSA')
      .reduce((sum, s) => sum + s.balance, 0)
    const familyLoanBalance = invState
      .filter((s) => s.familyLoan?.isFamilyLoan)
      .reduce((sum, s) => sum + s.balance, 0)
    const propertyEquity = propState.reduce((sum, s) => sum + (s.value - s.mortgageBalance - s.locBalance), 0)
    const totalDebt = propState.reduce((sum, s) => sum + s.mortgageBalance + s.locBalance, 0)

    points.push({
      year,
      age,
      netWorth: tfsa + nonRegistered + familyLoanBalance + propertyEquity,
      tfsa,
      nonRegistered,
      propertyEquity,
      totalDebt,
      familyLoanBalance,
      cashIncome,
      expenses: expenseTotal,
      withdrawals: withdrawalsTotal,
      realizedGains,
      taxableIncome,
      incomeTax,
      gisAnnual,
      unfundedShortfall,
    })
  }

  return points
}

// Total deductible investment-purpose LOC/HELOC interest (Line 22100).
function helocDeduction(properties: Property[]): number {
  return properties.reduce((sum, p) => {
    if (p.loc?.hasLOC && p.loc.purpose === 'investment') return sum + p.loc.balance * p.loc.interestRate
    return sum
  }, 0)
}

// Reinvest surplus cash: fill TFSA room first, remainder into non-registered.
function reinvestSurplus(invState: InvState[], surplus: number): void {
  let remaining = surplus
  for (const s of invState) {
    if (remaining <= 0) break
    if (s.type === 'TFSA' && s.tfsaRoom > 0) {
      const deposit = Math.min(remaining, s.tfsaRoom)
      s.balance += deposit
      s.tfsaRoom -= deposit
      remaining -= deposit
    }
  }
  if (remaining > 0) {
    const nonReg = invState.find((s) => s.type === 'non_registered' && !s.familyLoan?.isFamilyLoan)
    if (nonReg) {
      nonReg.balance += remaining
      nonReg.acb += remaining // new contributions raise ACB
    } else {
      const tfsa = invState.find((s) => s.type === 'TFSA')
      if (tfsa) tfsa.balance += remaining // fallback: over-contribute rather than lose the cash
    }
  }
}
