import { useState } from 'react'
import { Page } from '../components/layout/Layout'
import KPICard from '../components/common/KPICard'
import ProjectionChart from '../components/charts/ProjectionChart'
import { useProjection } from '../hooks/useProjection'
import { useHouseholdFinance } from '../hooks/useHouseholdFinance'
import { usePropertyStore } from '../store/propertyStore'
import { useInvestmentStore } from '../store/investmentStore'
import { useExpenseStore } from '../store/expenseStore'
import { useAssumptionsStore } from '../store/assumptionsStore'
import { useProfileStore } from '../store/profileStore'
import { formatCurrency } from '../utils/format'
import { computePropertyTax } from '../utils/propertyCalc'
import { mortgageStats, payoffAge, effectiveMortgage } from '../utils/mortgageCalc'
import { currentInvestmentValue } from '../utils/investmentCalc'
import { useT } from '../i18n'

const horizons = [10, 20, 30] as const

export default function Dashboard() {
  const t = useT()
  const [horizon, setHorizon] = useState<(typeof horizons)[number]>(30)
  const [supplement, setSupplement] = useState(true) // fund cash shortfall via investment withdrawals
  const { data, currentAge } = useProjection({ years: horizon })

  const properties = usePropertyStore((s) => s.properties)
  const investments = useInvestmentStore((s) => s.investments)
  const expenses = useExpenseStore((s) => s.expenses)
  const assumptions = useAssumptionsStore((s) => s.assumptions)

  const today = data[0]
  const tfsaTotal = investments.filter((i) => i.type === 'TFSA').reduce((s, i) => s + currentInvestmentValue(i), 0)

  // Household finance snapshot: cash flow, bracket-based tax, and the withdrawal
  // plan solved together (withdrawal passive income feeds back into the tax).
  const fin = useHouseholdFinance()
  const { derived, cashflow, baseTax, fullTax, gis, plan, withdrawalTax } = fin
  // First projected year where designated accounts run dry.
  const depletion = data.find((p) => p.unfundedShortfall > 1)
  const monthlyIncome = fin.annualIncome / 12
  const monthlyExpense = (fin.annualExpensesBeforeTax + baseTax.totalTax) / 12
  const netCashFlow = monthlyIncome - monthlyExpense
  const annualShortfall = Math.max(0, -netCashFlow * 12)
  const supplementActive = supplement && annualShortfall > 0

  // Annual tax: property tax + income tax (incl. withdrawal passive income when
  // the supplement plan is active).
  const annualPropertyTax = properties.reduce((s, p) => s + computePropertyTax(p), 0)
  const annualTax = annualPropertyTax + (supplementActive ? fullTax.totalTax : baseTax.totalTax)

  // Reminders
  const mortgageReminder = properties
    .filter((p) => p.mortgage?.hasMortgage)
    .map((p) => {
      const em = effectiveMortgage(p.mortgage!)
      return { name: p.name, age: payoffAge(em, currentAge), stats: mortgageStats(em) }
    })

  const maritalStatus = useProfileStore((s) => s.profile?.maritalStatus ?? 'single')
  const gisThreshold =
    maritalStatus === 'married'
      ? (assumptions.governmentBenefits.gisMaxAnnualCouple ?? 7980) * 4
      : assumptions.governmentBenefits.gisMaxAnnual * 2

  return (
    <Page title="Dashboard">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard label={t('Total Net Worth')} value={formatCurrency(today?.netWorth ?? 0)} accent="brand" />
        <KPICard
          label={t('Monthly Net Cash Flow')}
          value={formatCurrency(netCashFlow)}
          accent={netCashFlow >= 0 ? 'positive' : 'negative'}
          sub={
            supplementActive && plan.totalWithdrawal > 0
              ? t('Gap funded by withdrawals: {n}/mo', { n: formatCurrency(plan.totalWithdrawal / 12) })
              : t('Income {a} − expenses {b} (incl. monthly income tax)', {
                  a: formatCurrency(monthlyIncome),
                  b: formatCurrency(monthlyExpense),
                })
          }
        />
        <KPICard
          label={t('Est. Annual Taxes')}
          value={formatCurrency(annualTax)}
          sub={supplementActive && withdrawalTax > 0 ? t('Income tax (incl. withdrawal income) + property tax') : t('Income tax + property tax')}
        />
        <KPICard label={t('TFSA Balance')} value={formatCurrency(tfsaTotal)} accent="positive" />
      </div>

      <div className="card mt-6 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">{t('Projections')}</h3>
          <div className="flex gap-1">
            {horizons.map((h) => (
              <button
                key={h}
                className={`btn px-3 py-1 text-sm ${horizon === h ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setHorizon(h)}
              >
                {t('{n} yr', { n: h })}
              </button>
            ))}
          </div>
        </div>
        {properties.length === 0 && investments.length === 0 ? (
          <p className="py-10 text-center text-slate-400">{t('Add a property or investment account to see projections.')}</p>
        ) : (
          <ProjectionChart data={data} showDebt />
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="mb-3 font-semibold">{t('This Month at a Glance')}</h3>
          <Row label={t('Rent (gross − vacancy)')} value={cashflow.rentalIncome / 12} positive />
          <Row label="OAS" value={derived.oasMonthly} positive />
          {derived.cppMonthly > 0 && <Row label="CPP" value={derived.cppMonthly} positive />}
          <Row
            label={gis.gisMonthly < derived.gis.gisMonthly ? t('GIS (reflects withdrawal income)') : 'GIS'}
            value={gis.gisMonthly}
            positive
          />
          <Row label={t('Dividends / interest')} value={(derived.eligibleDividends + derived.interest) / 12} positive />
          {cashflow.familyLoanRepayments > 0 && (
            <Row label={t('Family loan repayment')} value={cashflow.familyLoanRepayments / 12} positive />
          )}
          <div className="my-2 border-t border-slate-100" />
          <Row label={t('Property costs (incl. assigned)')} value={-cashflow.propertyExpenses / 12} />
          <Row label={t('Personal expenses')} value={-cashflow.personalExpenses / 12} />
          <Row label={t('Income tax (monthly)')} value={-baseTax.totalTax / 12} />
          <div className="my-2 border-t border-slate-100" />
          <Row label={t('Net cash flow')} value={netCashFlow} bold positive={netCashFlow >= 0} />

          {annualShortfall > 0 && (
            <div className="mt-3 rounded-lg bg-slate-50 p-3">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input type="checkbox" checked={supplement} onChange={(e) => setSupplement(e.target.checked)} />
                {t('Fund gap from investments')}
              </label>
              {supplementActive && (
                <div className="mt-2 space-y-0.5 text-sm">
                  {plan.rows.map((r) => (
                    <Row
                      key={r.investment.id}
                      label={t('Withdraw: {name}', { name: r.investment.accountName || r.investment.type })}
                      value={r.withdrawal / 12}
                      positive
                    />
                  ))}
                  {withdrawalTax > 0 && (
                    <Row label={t('Extra income tax from withdrawal income (bracketed)')} value={-withdrawalTax / 12} />
                  )}
                  <div className="my-1 border-t border-slate-200" />
                  {plan.uncovered > 0.01 ? (
                    <Row label={t('Still short after withdrawals')} value={-plan.uncovered / 12} bold />
                  ) : plan.rows.length > 0 ? (
                    <Row label={t('Net cash flow after withdrawals')} value={0} bold positive />
                  ) : (
                    <p className="pt-1 text-xs text-amber-600">
                      {t('No account to draw from — set a withdrawal priority in Investments.')}
                    </p>
                  )}
                  {plan.rows.some((r) => r.realizedGain > 0 || r.ordinaryIncome > 0) && (
                    <p className="pt-1 text-xs text-slate-400">
                      {t('Taxable income from withdrawals is included in income tax and the GIS income test.')}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h3 className="mb-3 font-semibold">{t('Key Reminders')}</h3>
          <div className="space-y-2 text-sm">
            {depletion && (
              <Reminder
                color="⚠️"
                text={t('Projected to exhaust withdrawable investments at age {age}; gap that year ≈ {n}. Plan ahead: sell property, reverse mortgage, or cut spending.', {
                  age: depletion.age,
                  n: formatCurrency(depletion.unfundedShortfall),
                })}
              />
            )}
            <Reminder color="🔴" text={t('Annual property tax ≈ {n} (usually due in July)', { n: formatCurrency(annualPropertyTax) })} />
            {mortgageReminder.map((m, i) => (
              <Reminder
                key={i}
                color="🟡"
                text={
                  m.stats.valid
                    ? t('{name}: mortgage paid off around age {age}', { name: m.name, age: m.age.toFixed(0) })
                    : t('{name}: mortgage payment does not cover interest', { name: m.name })
                }
              />
            ))}
            <Reminder
              color={gis.eligible ? '🟢' : '🔴'}
              text={
                gis.eligible
                  ? t('GIS eligible (net income {a} < threshold {b}, incl. withdrawal income)', {
                      a: formatCurrency(gis.netIncome),
                      b: formatCurrency(gisThreshold),
                    })
                  : t('Over GIS threshold (net income {a}, incl. withdrawal income)', { a: formatCurrency(gis.netIncome) })
              }
            />
            <Reminder
              color="🔵"
              text={t('TFSA contribution room {n}', {
                n: formatCurrency(
                  investments.filter((i) => i.type === 'TFSA').reduce((s, i) => s + (i.tfsa?.contributionRoom ?? 0), 0),
                ),
              })}
            />
          </div>
        </div>
      </div>

      {(properties.length > 0 || expenses.length > 0) && (
        <div className="card mt-6 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">{t('Annual Cash Flow Overview')}</h3>
            <span
              className={`text-lg font-semibold ${netCashFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
            >
              {netCashFlow < 0 ? '−' : '+'}{formatCurrency(Math.abs(netCashFlow * 12))}{t('/yr')}
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">{t('By property')}</div>
              {cashflow.propertyRows.length === 0 ? (
                <p className="py-2 text-sm text-slate-400">{t('No properties yet.')}</p>
              ) : (
                cashflow.propertyRows.map(({ property, balance }) => (
                  <Row
                    key={property.id}
                    label={t('{name} (rent − all carrying costs)', { name: property.name || t('Unnamed') })}
                    value={balance.net}
                    positive={balance.net >= 0}
                  />
                ))
              )}
              <Row label={t('Personal expenses (unassigned)')} value={-cashflow.personalExpenses} />
              <Row label={t('Income tax')} value={-baseTax.totalTax} />
            </div>
            <div>
              <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">{t('Other income')}</div>
              <Row label="OAS + CPP + GIS" value={(derived.oasMonthly + derived.cppMonthly + gis.gisMonthly) * 12} positive />
              <Row label={t('Dividends / interest')} value={derived.eligibleDividends + derived.interest} positive />
              {cashflow.familyLoanRepayments > 0 && (
                <Row label={t('Family loan repayment (this year)')} value={cashflow.familyLoanRepayments} positive />
              )}
            </div>
          </div>
        </div>
      )}
    </Page>
  )
}

function Row({ label, value, positive, bold }: { label: string; value: number; positive?: boolean; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-1.5 text-sm ${bold ? 'font-semibold' : ''}`}>
      <span className="text-slate-600">{label}</span>
      <span className={value >= 0 ? (positive ? 'text-emerald-600' : 'text-slate-900') : 'text-rose-600'}>
        {value < 0 ? '−' : ''}{formatCurrency(Math.abs(value))}
      </span>
    </div>
  )
}

function Reminder({ color, text }: { color: string; text: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2">
      <span>{color}</span>
      <span className="text-slate-600">{text}</span>
    </div>
  )
}
