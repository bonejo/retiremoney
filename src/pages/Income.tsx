import { Page } from '../components/layout/Layout'
import GISCalculator from '../components/gis/GISCalculator'
import { useDerivedIncome } from '../hooks/useDerivedIncome'
import { useInvestmentStore } from '../store/investmentStore'
import { useAssumptionsStore } from '../store/assumptionsStore'
import { familyLoanIncomeForYear } from '../utils/incomeCalc'
import { formatCurrency } from '../utils/format'
import { useT } from '../i18n'

export default function Income() {
  const t = useT()
  const derived = useDerivedIncome()
  const investments = useInvestmentStore((s) => s.investments)
  const assumptions = useAssumptionsStore((s) => s.assumptions)
  const year = new Date().getFullYear()
  const familyRepayment = familyLoanIncomeForYear(investments, year)

  const oasAge = assumptions.governmentBenefits.oasAge
  const yearsToOas = Math.max(0, oasAge - derived.currentAge)

  const rows = [
    { label: t('Net rent (yr)'), value: derived.netRentalAnnual, note: t('from Properties') },
    {
      label: t('OAS (yr)'),
      value: derived.oasAnnual,
      note:
        (derived.currentAge >= oasAge ? t('receiving') : t('starts in {n} yrs', { n: yearsToOas })) +
        (derived.oasResidenceFraction < 1
          ? t(' · prorated to {n}% by residence', { n: (derived.oasResidenceFraction * 100).toFixed(0) })
          : ''),
    },
    { label: t('CPP (yr)'), value: derived.cppAnnual, note: t('adjusted for start age') },
    { label: t('GIS (yr)'), value: derived.gis.gisAnnual, note: t('government supplement') },
    { label: t('Eligible dividends (yr)'), value: derived.eligibleDividends, note: t('Investments') },
    { label: t('Interest (yr)'), value: derived.interest, note: t('Investments') },
    { label: t('Family loan repayment ({y})', { y: year }), value: familyRepayment, note: t('return of principal') },
  ].filter((r) => r.value > 0)

  const totalAnnual = rows.reduce((s, r) => s + r.value, 0)

  return (
    <Page title="Income & GIS/OAS">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">{t('Auto-Generated Income')}</h3>
              <span className="text-sm text-slate-400">{t('Annual total {n}', { n: formatCurrency(totalAnnual) })}</span>
            </div>
            {rows.length === 0 ? (
              <p className="py-6 text-center text-slate-400">{t('No auto income yet. Add properties or investments.')}</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <div key={r.label} className="flex items-center justify-between py-2 text-sm">
                    <div>
                      <div className="text-slate-700">{r.label}</div>
                      <div className="text-xs text-slate-400">{r.note}</div>
                    </div>
                    <span className="font-medium">{formatCurrency(r.value)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card p-5">
            <h3 className="mb-2 font-semibold">{t('OAS Timeline')}</h3>
            <div className="text-sm text-slate-600">
              {t('Age {n}', { n: derived.currentAge })}
              {yearsToOas > 0
                ? t(' · {n} years until OAS', { n: yearsToOas })
                : t(' · at OAS age')}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs text-slate-400">{t('Monthly, 65–74')}</div>
                <div className="font-semibold">{formatCurrency(assumptions.governmentBenefits.oasMonthly6574)}</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs text-slate-400">{t('Monthly, 75+')}</div>
                <div className="font-semibold">{formatCurrency(assumptions.governmentBenefits.oasMonthly75plus)}</div>
              </div>
            </div>
          </div>
        </div>

        <GISCalculator
          base={{
            rentalNet: derived.netRentalAnnual,
            eligibleDividends: derived.eligibleDividends,
            interest: derived.interest,
            capitalGains: 0,
            helocInterest: derived.helocInterest,
            otherIncome: derived.cppAnnual,
          }}
        />
      </div>
    </Page>
  )
}
