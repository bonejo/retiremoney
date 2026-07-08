// ===== Domain types for the BC retirement planning app =====
// UI is in Chinese; code + comments in English per the PRD.

export type MaritalStatus = 'single' | 'married' | 'divorced' | 'widowed'

// Canadian provinces (territories omitted).
export type ProvinceCode = 'BC' | 'AB' | 'SK' | 'MB' | 'ON' | 'QC' | 'NB' | 'NS' | 'PE' | 'NL'

export interface Profile {
  id: string
  name: string
  dateOfBirth: string // YYYY-MM-DD
  city: string // e.g. "Richmond, BC"
  province: ProvinceCode
  maritalStatus: MaritalStatus
  // OAS residence: year the person became a Canadian resident.
  // Undefined = born in Canada / 40+ years residence (full OAS).
  canadaArrivalYear?: number
  // CPP from the Service Canada statement: expected monthly amount at 65 and
  // the age the person starts (60–70; ±0.6%/0.7% per month adjustment applied).
  cpp?: {
    monthlyAt65: number
    startAge: number
  }
  // Still working: annual employment income and the age it stops (retires).
  // Before retirement, income grows investments; from retirementAge it is $0.
  employmentIncomeAnnual?: number
  retirementAge?: number
  createdAt: string
  updatedAt: string
}

// ===== Property =====
export type PropertyType = 'primary_residence' | 'rental' | 'mixed'

export interface Mortgage {
  hasMortgage: boolean
  balance: number // balance as of `balanceAsOf` (or today if unset)
  balanceAsOf?: string // YYYY-MM — the month `balance` was recorded; amortized forward to today
  monthlyPayment: number
  interestRate: number // annual, e.g. 0.0345
  rateType: 'fixed' | 'variable'
  maturityDate: string // YYYY-MM
  originalAmortization: number // years
}

export interface LOC {
  hasLOC: boolean
  balance: number
  limit: number
  interestRate: number
  purpose: 'investment' | 'personal' // investment interest deductible on Line 22100
}

export interface PropertyTax {
  annualAmount: number
  autoCalculate: boolean
  assessedValueRatio: number // BC default 0.85
  taxRatePerThousand: number // Richmond default 1.761
}

export interface RentalUnit {
  id: string
  name: string
  monthlyRent: number
  isOccupied: boolean
  areaPercent: number
  tenantName?: string
  leaseEndDate?: string
}

export interface Rental {
  units: RentalUnit[]
  rentalAreaPercent: number
  vacancyRate: number
  managementFeePercent: number
  annualRentIncrease?: number // yearly rent increase in projections; falls back to property inflation
}

export interface Property {
  id: string
  name: string
  type: PropertyType
  currentValue: number
  purchasePrice: number // ACB
  purchaseYear: number
  appreciationRate: number // default 0.03
  province: string
  propertyTax: PropertyTax
  mortgage: Mortgage | null
  loc: LOC | null
  strataFee: number | null // monthly
  insurance: number | null // annual
  rental: Rental | null
}

// ===== Investment =====
export type InvestmentType =
  | 'TFSA'
  | 'RRSP'
  | 'non_registered'
  | 'GIC'
  | 'savings'
  | 'other'

export type DividendType = 'eligible' | 'non_eligible' | 'none'

export interface FamilyLoanRepayment {
  year: number
  amount: number
}

export interface FamilyLoan {
  isFamilyLoan: boolean
  borrowerName: string
  principalAmount: number
  isInterestFree: boolean
  interestRate?: number
  repaymentSchedule: FamilyLoanRepayment[]
}

export interface Investment {
  id: string
  type: InvestmentType
  institutionName: string
  accountName: string
  currency?: 'CAD' | 'USD' // account currency; USD amounts are converted to CAD at the global rate
  currentBalance: number // value today, or the projected-forward value of a startValue/startDate origin
  startDate?: string // YYYY-MM — when the money was first invested (historical origin)
  startValue?: number // initial invested amount at startDate; compounded to today at annualReturnRate
  annualReturnRate: number // TOTAL expected return (dividend yield + capital growth)
  dividendYield?: number // portion of return paid as dividends/distributions (taxed yearly)
  // capital growth = annualReturnRate - dividendYield (unrealized until sold/withdrawn)
  withdrawalPriority?: number // drawdown order to fund expense shortfall; 0/undefined = not used
  // non-registered only
  acb?: number
  dividendType?: DividendType
  // TFSA only
  tfsa?: {
    contributionRoom: number
    annualNewRoom: number // default 7000
  }
  // GIC only
  gic?: {
    maturityDate: string
    interestRate: number
    isCompound: boolean
  }
  familyLoan?: FamilyLoan
}

// ===== Expense =====
export type ExpenseCategory =
  | 'utilities'
  | 'vehicle'
  | 'food_dining'
  | 'healthcare'
  | 'travel'
  | 'insurance'
  | 'phone_internet'
  | 'entertainment'
  | 'clothing'
  | 'gifts_charity'
  | 'other'

export type ExpenseFrequency = 'monthly' | 'quarterly' | 'annual' | 'one_time'

export interface Expense {
  id: string
  name: string
  category: ExpenseCategory
  amount: number
  frequency: ExpenseFrequency
  inflationLinked: boolean
  propertyId?: string // optional link to a Property, for per-property income/expense balance
  startAge?: number
  endAge?: number
  notes?: string
}

// ===== Global assumptions =====
export interface Assumptions {
  inflationRates: {
    living: number
    property: number
    healthcare: number
    governmentBenefits: number
  }
  taxRates: {
    capitalGainsTaxRate: number
    marginalTaxRate: number
    dividendGrossUpFactor: number
    dtcRate: number
  }
  governmentBenefits: {
    oasAge: number
    oasMonthly6574: number
    oasMonthly75plus: number
    gisMaxAnnual: number // single rate
    gisMaxAnnualCouple?: number // per-person rate when both spouses receive OAS
    gisIncomeThreshold: number
    tfsa_annual_room: number
  }
  propertyTax: {
    richmond_rate: number
    assessed_value_ratio: number
  }
  probate: {
    bc_rate_above_50k: number
  }
  exchangeRates?: {
    usdCad: number // CAD per 1 USD; optional for backward compat with persisted data
  }
}
