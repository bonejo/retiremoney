import { useMemo } from 'react'
import { usePropertyStore } from '../store/propertyStore'
import { useInvestmentStore } from '../store/investmentStore'
import { useExpenseStore } from '../store/expenseStore'
import { useAssumptionsStore } from '../store/assumptionsStore'
import { useProfileStore } from '../store/profileStore'
import { useDerivedIncome, type DerivedIncome } from './useDerivedIncome'
import { householdCashflow, type HouseholdCashflow } from '../utils/cashflowCalc'
import { computeIncomeTax, type TaxResult, type TaxInputs } from '../utils/taxCalc'
import { computeGIS, type GISResult } from '../utils/gisCalc'
import { planWithdrawals, type WithdrawalPlan } from '../utils/withdrawalCalc'

export interface HouseholdFinance {
  derived: DerivedIncome
  cashflow: HouseholdCashflow
  annualIncome: number // cash income excluding withdrawals (uses effective GIS)
  annualExpensesBeforeTax: number
  baseTax: TaxResult // tax on regular income only
  fullTax: TaxResult // tax including withdrawal-realized gains + RRSP income
  gis: GISResult // effective GIS — withdrawal income counted in the test
  plan: WithdrawalPlan // withdrawals needed to fund the shortfall incl. fullTax
  withdrawalTax: number // fullTax − baseTax: tax caused by withdrawal passive income
}

// Current-year household finance snapshot. Because withdrawals create taxable
// passive income (realized capital gains, RRSP income) which enlarges the very
// shortfall they fund, tax + withdrawals are solved together by fixed-point
// iteration (converges geometrically; 4 rounds is plenty).
export function useHouseholdFinance(): HouseholdFinance {
  const properties = usePropertyStore((s) => s.properties)
  const investments = useInvestmentStore((s) => s.investments)
  const expenses = useExpenseStore((s) => s.expenses)
  const assumptions = useAssumptionsStore((s) => s.assumptions)
  const province = useProfileStore((s) => s.profile?.province ?? 'BC')
  const maritalStatus = useProfileStore((s) => s.profile?.maritalStatus ?? 'single')
  const derived = useDerivedIncome()

  return useMemo(() => {
    const cashflow = householdCashflow(properties, investments, expenses, derived.currentAge)

    const incomeExGis =
      cashflow.rentalIncome +
      derived.oasAnnual +
      derived.cppAnnual +
      derived.eligibleDividends +
      derived.interest +
      cashflow.familyLoanRepayments
    const annualExpensesBeforeTax = cashflow.totalExpenses

    const baseInputs: TaxInputs = {
      ordinaryIncome: derived.netRentalAnnual + derived.interest + derived.cppAnnual,
      eligibleDividends: derived.eligibleDividends,
      capitalGains: 0,
      oas: derived.oasAnnual,
      deductions: derived.helocInterest,
    }
    const baseTax = computeIncomeTax(baseInputs, assumptions, province)

    // Fixed-point solve over tax AND GIS: withdrawal passive income raises the
    // bracket-based tax and lowers GIS, both of which enlarge the shortfall the
    // withdrawals must fund. Plan is drawn without internal flat-rate gross-up
    // (marginalRate = 0) since the loop accounts for the feedback itself.
    let gis = derived.gis
    let fullTax = baseTax
    let plan = planWithdrawals(0, investments, 0)
    for (let k = 0; k < 5; k++) {
      const income = incomeExGis + gis.gisAnnual
      const shortfall = Math.max(0, annualExpensesBeforeTax + fullTax.totalTax - income)
      plan = planWithdrawals(shortfall, investments, 0)
      gis = computeGIS(
        {
          rentalNet: derived.netRentalAnnual,
          eligibleDividends: derived.eligibleDividends,
          interest: derived.interest,
          capitalGains: plan.totalRealizedGain,
          helocInterest: derived.helocInterest,
          otherIncome: derived.cppAnnual + plan.totalOrdinaryIncome,
        },
        assumptions,
        maritalStatus,
      )
      fullTax = computeIncomeTax(
        {
          ...baseInputs,
          ordinaryIncome: baseInputs.ordinaryIncome + plan.totalOrdinaryIncome,
          capitalGains: plan.totalRealizedGain,
        },
        assumptions,
        province,
      )
    }

    return {
      derived,
      cashflow,
      annualIncome: incomeExGis + gis.gisAnnual,
      annualExpensesBeforeTax,
      baseTax,
      fullTax,
      gis,
      plan,
      withdrawalTax: Math.max(0, fullTax.totalTax - baseTax.totalTax),
    }
  }, [properties, investments, expenses, assumptions, derived, province, maritalStatus])
}
