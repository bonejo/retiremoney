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
    <Page title="主仪表板">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard label={t('总净资产')} value={formatCurrency(today?.netWorth ?? 0)} accent="brand" />
        <KPICard
          label={t('月净现金流')}
          value={formatCurrency(netCashFlow)}
          accent={netCashFlow >= 0 ? 'positive' : 'negative'}
          sub={
            supplementActive && plan.totalWithdrawal > 0
              ? t('缺口由投资提取补足 {n}/月', { n: formatCurrency(plan.totalWithdrawal / 12) })
              : t('收入 {a} − 支出 {b}（含所得税月摊）', {
                  a: formatCurrency(monthlyIncome),
                  b: formatCurrency(monthlyExpense),
                })
          }
        />
        <KPICard
          label={t('年度预估税费')}
          value={formatCurrency(annualTax)}
          sub={supplementActive && withdrawalTax > 0 ? t('所得税（含提取被动收入）+ 地税') : t('所得税 + 地税')}
        />
        <KPICard label={t('TFSA 余额')} value={formatCurrency(tfsaTotal)} accent="positive" />
      </div>

      <div className="card mt-6 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">{t('资产预测')}</h3>
          <div className="flex gap-1">
            {horizons.map((h) => (
              <button
                key={h}
                className={`btn px-3 py-1 text-sm ${horizon === h ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setHorizon(h)}
              >
                {t('{n}年', { n: h })}
              </button>
            ))}
          </div>
        </div>
        {properties.length === 0 && investments.length === 0 ? (
          <p className="py-10 text-center text-slate-400">{t('添加房产或投资账户后显示预测曲线。')}</p>
        ) : (
          <ProjectionChart data={data} showDebt />
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="mb-3 font-semibold">{t('本月收支摘要')}</h3>
          <Row label={t('租金收入（毛租金−空置）')} value={cashflow.rentalIncome / 12} positive />
          <Row label="OAS" value={derived.oasMonthly} positive />
          {derived.cppMonthly > 0 && <Row label="CPP" value={derived.cppMonthly} positive />}
          <Row
            label={gis.gisMonthly < derived.gis.gisMonthly ? t('GIS（已计提取收入影响）') : 'GIS'}
            value={gis.gisMonthly}
            positive
          />
          <Row label={t('投资股息/利息')} value={(derived.eligibleDividends + derived.interest) / 12} positive />
          {cashflow.familyLoanRepayments > 0 && (
            <Row label={t('家庭借款还款')} value={cashflow.familyLoanRepayments / 12} positive />
          )}
          <div className="my-2 border-t border-slate-100" />
          <Row label={t('房产支出（含归属支出）')} value={-cashflow.propertyExpenses / 12} />
          <Row label={t('个人支出')} value={-cashflow.personalExpenses / 12} />
          <Row label={t('所得税（月摊）')} value={-baseTax.totalTax / 12} />
          <div className="my-2 border-t border-slate-100" />
          <Row label={t('净现金流')} value={netCashFlow} bold positive={netCashFlow >= 0} />

          {annualShortfall > 0 && (
            <div className="mt-3 rounded-lg bg-slate-50 p-3">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input type="checkbox" checked={supplement} onChange={(e) => setSupplement(e.target.checked)} />
                {t('缺口由投资提取补足')}
              </label>
              {supplementActive && (
                <div className="mt-2 space-y-0.5 text-sm">
                  {plan.rows.map((r) => (
                    <Row
                      key={r.investment.id}
                      label={t('提取：{name}', { name: r.investment.accountName || r.investment.type })}
                      value={r.withdrawal / 12}
                      positive
                    />
                  ))}
                  {withdrawalTax > 0 && (
                    <Row label={t('提取被动收入增加的所得税（分档计算）')} value={-withdrawalTax / 12} />
                  )}
                  <div className="my-1 border-t border-slate-200" />
                  {plan.uncovered > 0.01 ? (
                    <Row label={t('补足后仍缺')} value={-plan.uncovered / 12} bold />
                  ) : plan.rows.length > 0 ? (
                    <Row label={t('补足后净现金流')} value={0} bold positive />
                  ) : (
                    <p className="pt-1 text-xs text-amber-600">
                      {t('没有可提取的账户——请在「投资账户」为账户设置「提取优先级」。')}
                    </p>
                  )}
                  {plan.rows.some((r) => r.realizedGain > 0 || r.ordinaryIncome > 0) && (
                    <p className="pt-1 text-xs text-slate-400">
                      {t('提取产生的应税收入已计入所得税与 GIS 净收入测试。')}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h3 className="mb-3 font-semibold">{t('关键提醒')}</h3>
          <div className="space-y-2 text-sm">
            {depletion && (
              <Reminder
                color="⚠️"
                text={t('预测 {age} 岁时可提取投资耗尽，当年资金缺口约 {n}——需提前规划（卖房、反向贷款或削减支出）', {
                  age: depletion.age,
                  n: formatCurrency(depletion.unfundedShortfall),
                })}
              />
            )}
            <Reminder color="🔴" text={t('年地税约 {n}（通常7月到期）', { n: formatCurrency(annualPropertyTax) })} />
            {mortgageReminder.map((m, i) => (
              <Reminder
                key={i}
                color="🟡"
                text={
                  m.stats.valid
                    ? t('{name} Mortgage 预计 {age} 岁还清', { name: m.name, age: m.age.toFixed(0) })
                    : t('{name} Mortgage 月供不足以覆盖利息', { name: m.name })
                }
              />
            ))}
            <Reminder
              color={gis.eligible ? '🟢' : '🔴'}
              text={
                gis.eligible
                  ? t('GIS 有资格（净收入 {a} < 门槛 {b}，含提取收入）', {
                      a: formatCurrency(gis.netIncome),
                      b: formatCurrency(gisThreshold),
                    })
                  : t('GIS 超出门槛（净收入 {a}，含提取收入）', { a: formatCurrency(gis.netIncome) })
              }
            />
            <Reminder
              color="🔵"
              text={t('TFSA 可存额度 {n}', {
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
            <h3 className="font-semibold">{t('年度收支总览')}</h3>
            <span
              className={`text-lg font-semibold ${netCashFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
            >
              {netCashFlow < 0 ? '−' : '+'}{formatCurrency(Math.abs(netCashFlow * 12))}{t('/年')}
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">{t('按房产')}</div>
              {cashflow.propertyRows.length === 0 ? (
                <p className="py-2 text-sm text-slate-400">{t('暂无房产。')}</p>
              ) : (
                cashflow.propertyRows.map(({ property, balance }) => (
                  <Row
                    key={property.id}
                    label={t('{name}（租金 − 全部持有成本）', { name: property.name || t('未命名') })}
                    value={balance.net}
                    positive={balance.net >= 0}
                  />
                ))
              )}
              <Row label={t('个人支出（未归属房产）')} value={-cashflow.personalExpenses} />
              <Row label={t('所得税')} value={-baseTax.totalTax} />
            </div>
            <div>
              <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">{t('其他收入')}</div>
              <Row label="OAS + CPP + GIS" value={(derived.oasMonthly + derived.cppMonthly + gis.gisMonthly) * 12} positive />
              <Row label={t('投资股息/利息')} value={derived.eligibleDividends + derived.interest} positive />
              {cashflow.familyLoanRepayments > 0 && (
                <Row label={t('家庭借款还款（今年）')} value={cashflow.familyLoanRepayments} positive />
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
