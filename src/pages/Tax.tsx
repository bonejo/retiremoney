import { Page } from '../components/layout/Layout'
import { useHouseholdFinance } from '../hooks/useHouseholdFinance'
import { usePropertyStore } from '../store/propertyStore'
import { useAssumptionsStore } from '../store/assumptionsStore'
import { useProfileStore } from '../store/profileStore'
import { computePropertyTax } from '../utils/propertyCalc'
import { formatCurrency, formatPercent } from '../utils/format'
import { useT } from '../i18n'

// Annual tax summary using progressive federal + provincial brackets, dividend
// gross-up + DTC and 50% capital-gains inclusion (utils/taxCalc). Includes the
// passive income realized by the withdrawals that fund the cash-flow shortfall.
export default function Tax() {
  const t = useT()
  const { derived, plan, fullTax: tax } = useHouseholdFinance()
  const properties = usePropertyStore((s) => s.properties)
  const assumptions = useAssumptionsStore((s) => s.assumptions)
  const province = useProfileStore((s) => s.profile?.province ?? 'BC')

  const grossUp = assumptions.taxRates.dividendGrossUpFactor
  const incomeRows = [
    { label: t('Rental income (T776)'), value: derived.netRentalAnnual },
    { label: t('CPP pension'), value: derived.cppAnnual },
    { label: t('Eligible dividends (×{n} grossed-up)', { n: grossUp }), value: tax.grossedUpDividends },
    { label: t('Interest income'), value: derived.interest },
    { label: t('OAS (received)'), value: derived.oasAnnual },
    { label: t('Realized capital gains (withdrawals, 50% counted)'), value: plan.totalRealizedGain * 0.5 },
    { label: t('RRSP withdrawals (100% counted)'), value: plan.totalOrdinaryIncome },
  ].filter((r) => r.value > 0)

  const totalIncome = incomeRows.reduce((s, r) => s + r.value, 0)
  const deductions = derived.helocInterest
  const annualPropertyTax = properties.reduce((s, p) => s + computePropertyTax(p), 0)

  return (
    <Page title="Tax Summary">
      <p className="mb-4 text-sm text-slate-500">
        {t('Federal + provincial progressive brackets, with dividend gross-up, DTC credit and 50% capital-gains inclusion.')}
        {t('Includes passive income realized by withdrawals that fund the monthly cash-flow gap')}
        {plan.totalWithdrawal > 0 && t(' (est. withdrawals this year: {n})', { n: formatCurrency(plan.totalWithdrawal) })}。
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="mb-3 font-semibold">{t('Income')}</h3>
          {incomeRows.map((r) => (
            <div key={r.label} className="flex justify-between py-1.5 text-sm">
              <span className="text-slate-600">{r.label}</span>
              <span className="font-medium">{formatCurrency(r.value)}</span>
            </div>
          ))}
          <div className="mt-2 flex justify-between border-t border-slate-100 pt-2 text-sm font-semibold">
            <span>{t('Total income')}</span>
            <span>{formatCurrency(totalIncome)}</span>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="mb-3 font-semibold">{t('Deductions, Tax & Credits')}</h3>
          <div className="flex justify-between py-1.5 text-sm">
            <span className="text-slate-600">{t('Investment interest (Line 22100)')}</span>
            <span className="font-medium text-emerald-600">−{formatCurrency(deductions)}</span>
          </div>
          <div className="flex justify-between py-1.5 text-sm">
            <span className="text-slate-600">{t('Taxable income')}</span>
            <span className="font-medium">{formatCurrency(tax.taxableIncome)}</span>
          </div>
          <div className="flex justify-between py-1.5 text-sm">
            <span className="text-slate-600">{t('Federal tax')}</span>
            <span className="font-medium">{formatCurrency(tax.federalTax)}</span>
          </div>
          <div className="flex justify-between py-1.5 text-sm">
            <span className="text-slate-600">{t('Provincial tax ({p})', { p: province })}</span>
            <span className="font-medium">{formatCurrency(tax.provincialTax)}</span>
          </div>
          <div className="flex justify-between py-1.5 text-sm">
            <span className="text-slate-600">{t('Dividend tax credit (DTC)')}</span>
            <span className="font-medium text-emerald-600">−{formatCurrency(tax.dtcCredit)}</span>
          </div>
          <div className="mt-4 rounded-lg bg-slate-50 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">{t('Net income tax payable')}</span>
              <span className="text-xs text-slate-400">{t('effective rate {n}', { n: formatPercent(tax.averageRate) })}</span>
            </div>
            <div className="text-2xl font-semibold">{formatCurrency(tax.totalTax)}</div>
          </div>
        </div>
      </div>

      <div className="card mt-6 p-5">
        <h3 className="mb-3 font-semibold">{t('Property Tax')}</h3>
        {properties.length === 0 ? (
          <p className="text-slate-400">{t('No properties yet.')}</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {properties.map((p) => (
              <div key={p.id} className="flex justify-between py-2 text-sm">
                <span className="text-slate-600">{p.name}</span>
                <span className="font-medium">{formatCurrency(computePropertyTax(p))}{t('/yr')}</span>
              </div>
            ))}
            <div className="flex justify-between py-2 text-sm font-semibold">
              <span>{t('Total property tax /yr')}</span>
              <span>{formatCurrency(annualPropertyTax)}</span>
            </div>
          </div>
        )}
      </div>
    </Page>
  )
}
