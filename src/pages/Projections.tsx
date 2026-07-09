import { useState } from 'react'
import { Page } from '../components/layout/Layout'
import ProjectionChart from '../components/charts/ProjectionChart'
import SliderInput from '../components/common/SliderInput'
import { useProjection } from '../hooks/useProjection'
import { formatCurrency } from '../utils/format'
import { useT } from '../i18n'

const horizons = [10, 20, 30] as const

export default function Projections() {
  const t = useT()
  const [horizon, setHorizon] = useState<(typeof horizons)[number]>(30)
  const [propApp, setPropApp] = useState(0.03)
  const [nonReg, setNonReg] = useState(0.06)
  const [tfsa, setTfsa] = useState(0.085)

  const { data } = useProjection({
    years: horizon,
    propertyAppreciation: propApp,
    nonRegReturn: nonReg,
    tfsaReturn: tfsa,
  })

  const last = data[data.length - 1]
  // Every-5-year rows for the data table.
  const tableRows = data.filter((_, i) => i % 5 === 0)
  // First year the designated accounts can no longer fund expenses.
  const depletion = data.find((p) => p.unfundedShortfall > 1)

  return (
    <Page title="Projections">
      {depletion && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span>⚠️</span>
          <span>
            <span className="font-semibold">{t('Age {age}', { age: depletion.age })}</span>
            {t(': withdrawable investments exhausted; gap that year ≈')}{' '}
            <span className="font-semibold">{formatCurrency(depletion.unfundedShortfall)}</span>。
            {t('Beyond this point the chart assumes the gap stays unfunded (net worth is only illiquid assets like property). Plan ahead: sell property, reverse mortgage / HELOC, or reduce spending.')}
          </span>
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">
              {last ? t('Net worth at {age}: {n}', { age: last.age, n: formatCurrency(last.netWorth) }) : t('Asset curves')}
            </h3>
            <div className="flex gap-1">
              {horizons.map((h) => (
                <button key={h} className={`btn px-3 py-1 text-sm ${horizon === h ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setHorizon(h)}>
                  {t('{n} yr', { n: h })}
                </button>
              ))}
            </div>
          </div>
          <ProjectionChart data={data} showDebt height={380} />
        </div>

        <div className="card space-y-5 p-5">
          <h3 className="font-semibold">{t('Adjust Assumptions')}</h3>
          <SliderInput label={t('Property appreciation /yr')} value={propApp} onChange={setPropApp} max={0.08} />
          <SliderInput label={t('Non-registered return /yr')} value={nonReg} onChange={setNonReg} max={0.12} />
          <SliderInput label={t('TFSA return /yr')} value={tfsa} onChange={setTfsa} max={0.12} />
        </div>
      </div>

      <div className="card mt-6 p-5">
        <h3 className="mb-1 font-semibold">{t('Data Table (every 5 yrs)')}</h3>
        <p className="mb-3 text-xs text-slate-400">
          {t('Cash income (dividends/interest/rent/OAS/CPP/GIS) pays expenses first; the gap is funded by withdrawals in priority order. Only 50% of realized gains are taxable (TFSA tax-free, RRSP 100%); tax is paid the following year, and last year’s withdrawal income feeds this year’s GIS test. Once accounts are empty the remainder shows as "Unfunded gap".')}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2 pr-4">{t('Age')}</th>
                <th className="py-2 pr-4">{t('Net worth')}</th>
                <th className="py-2 pr-4">TFSA</th>
                <th className="py-2 pr-4">RRSP</th>
                <th className="py-2 pr-4">{t('Non-registered')}</th>
                <th className="py-2 pr-4">{t('Cash income')}</th>
                <th className="py-2 pr-4">{t('Expenses')}</th>
                <th className="py-2 pr-4">{t('Withdrawals')}</th>
                <th className="py-2 pr-4">{t('Capital gains')}</th>
                <th className="py-2 pr-4">{t('Taxable income')}</th>
                <th className="py-2 pr-4">{t('Income tax')}</th>
                <th className="py-2 pr-4">{t('Unfunded gap')}</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((r) => (
                <tr key={r.year} className="border-b border-slate-50">
                  <td className="py-2 pr-4 font-medium">{t('Age {age}', { age: r.age })}</td>
                  <td className="py-2 pr-4">{formatCurrency(r.netWorth)}</td>
                  <td className="py-2 pr-4">{formatCurrency(r.tfsa)}</td>
                  <td className="py-2 pr-4">{formatCurrency(r.rrsp)}</td>
                  <td className="py-2 pr-4">{formatCurrency(r.nonRegistered)}</td>
                  <td className="py-2 pr-4 text-emerald-600">{formatCurrency(r.cashIncome)}</td>
                  <td className="py-2 pr-4">{formatCurrency(r.expenses)}</td>
                  <td className="py-2 pr-4 text-amber-600">{formatCurrency(r.withdrawals)}</td>
                  <td className="py-2 pr-4">{formatCurrency(r.realizedGains)}</td>
                  <td className="py-2 pr-4">{formatCurrency(r.taxableIncome)}</td>
                  <td className="py-2 pr-4 text-rose-600">{formatCurrency(r.incomeTax)}</td>
                  <td className={`py-2 pr-4 font-medium ${r.unfundedShortfall > 1 ? 'text-rose-600' : 'text-slate-300'}`}>
                    {r.unfundedShortfall > 1 ? formatCurrency(r.unfundedShortfall) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Page>
  )
}
