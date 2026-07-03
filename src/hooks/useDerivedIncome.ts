import { useMemo } from 'react'
import { usePropertyStore } from '../store/propertyStore'
import { useInvestmentStore } from '../store/investmentStore'
import { useAssumptionsStore } from '../store/assumptionsStore'
import { useProfileStore } from '../store/profileStore'
import {
  annualInvestmentIncome,
  totalNetRentalIncome,
} from '../utils/incomeCalc'
import {
  computeGIS,
  oasMonthly,
  oasResidenceFraction,
  cppMonthly,
  type GISResult,
} from '../utils/gisCalc'
import { ageFromDOB } from '../utils/format'

export interface DerivedIncome {
  netRentalAnnual: number
  eligibleDividends: number
  interest: number
  helocInterest: number
  oasMonthly: number
  oasAnnual: number
  oasResidenceFraction: number // 1 = full 40-year OAS; <1 = partial by immigration year
  cppMonthly: number
  cppAnnual: number
  gis: GISResult
  currentAge: number
}

// Aggregates income streams from properties + investments and runs the GIS test.
export function useDerivedIncome(): DerivedIncome {
  const properties = usePropertyStore((s) => s.properties)
  const investments = useInvestmentStore((s) => s.investments)
  const assumptions = useAssumptionsStore((s) => s.assumptions)
  const profile = useProfileStore((s) => s.profile)

  return useMemo(() => {
    const currentAge = profile ? ageFromDOB(profile.dateOfBirth) : 65
    const netRentalAnnual = totalNetRentalIncome(properties)
    const { eligibleDividends, interest } = annualInvestmentIncome(investments)

    // Deductible investment-purpose LOC/HELOC interest (Line 22100).
    const helocInterest = properties.reduce((sum, p) => {
      if (p.loc?.hasLOC && p.loc.purpose === 'investment') {
        return sum + p.loc.balance * p.loc.interestRate
      }
      return sum
    }, 0)

    // OAS scaled by residence years (immigration year); CPP from the profile.
    const fraction = profile
      ? oasResidenceFraction(profile.dateOfBirth, profile.canadaArrivalYear, assumptions.governmentBenefits.oasAge)
      : 1
    const oas = oasMonthly(currentAge, assumptions, fraction)
    const cpp = cppMonthly(profile, currentAge)

    // CPP counts 100% toward the GIS income test (OAS itself does not).
    const gis = computeGIS(
      {
        rentalNet: netRentalAnnual,
        eligibleDividends,
        interest,
        capitalGains: 0,
        helocInterest,
        otherIncome: cpp * 12,
      },
      assumptions,
      profile?.maritalStatus ?? 'single',
    )

    return {
      netRentalAnnual,
      eligibleDividends,
      interest,
      helocInterest,
      oasMonthly: oas,
      oasAnnual: oas * 12,
      oasResidenceFraction: fraction,
      cppMonthly: cpp,
      cppAnnual: cpp * 12,
      gis,
      currentAge,
    }
  }, [properties, investments, assumptions, profile])
}
