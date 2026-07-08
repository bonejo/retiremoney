import { useMemo } from 'react'
import { usePropertyStore } from '../store/propertyStore'
import { useInvestmentStore } from '../store/investmentStore'
import { useExpenseStore } from '../store/expenseStore'
import { useAssumptionsStore } from '../store/assumptionsStore'
import { useProfileStore } from '../store/profileStore'
import { buildProjection, type ProjectionPoint } from '../utils/projectionCalc'
import { oasResidenceFraction, cppMonthly } from '../utils/gisCalc'
import { ageFromDOB } from '../utils/format'

interface Overrides {
  years?: number
  propertyAppreciation?: number
  nonRegReturn?: number
  tfsaReturn?: number
}

// Shared projection builder used by Dashboard and Projections pages.
export function useProjection(overrides: Overrides = {}): {
  data: ProjectionPoint[]
  currentAge: number
} {
  const properties = usePropertyStore((s) => s.properties)
  const investments = useInvestmentStore((s) => s.investments)
  const expenses = useExpenseStore((s) => s.expenses)
  const assumptions = useAssumptionsStore((s) => s.assumptions)
  const profile = useProfileStore((s) => s.profile)

  const currentAge = profile ? ageFromDOB(profile.dateOfBirth) : 65

  const data = useMemo(() => {
    const years = overrides.years ?? Math.max(1, 90 - currentAge)
    const cppStartAge = profile?.cpp ? Math.min(70, Math.max(60, profile.cpp.startAge || 65)) : 65
    return buildProjection(properties, investments, expenses, assumptions, {
      currentAge,
      startYear: new Date().getFullYear(),
      years,
      propertyAppreciation: overrides.propertyAppreciation,
      nonRegReturn: overrides.nonRegReturn,
      tfsaReturn: overrides.tfsaReturn,
      province: profile?.province ?? 'BC',
      maritalStatus: profile?.maritalStatus ?? 'single',
      oasResidenceFraction: profile
        ? oasResidenceFraction(profile.dateOfBirth, profile.canadaArrivalYear, assumptions.governmentBenefits.oasAge)
        : 1,
      // cppMonthly at the start age itself gives the adjusted amount.
      cppMonthlyAdjusted: profile ? cppMonthly(profile, Math.max(currentAge, cppStartAge)) : 0,
      cppStartAge,
      employmentIncomeAnnual: profile?.employmentIncomeAnnual,
      retirementAge: profile?.retirementAge,
    })
  }, [
    properties,
    investments,
    expenses,
    assumptions,
    profile,
    currentAge,
    overrides.years,
    overrides.propertyAppreciation,
    overrides.nonRegReturn,
    overrides.tfsaReturn,
  ])

  return { data, currentAge }
}
