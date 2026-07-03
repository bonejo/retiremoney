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
    { label: t('租金收入 (T776)'), value: derived.netRentalAnnual },
    { label: t('CPP 养老金'), value: derived.cppAnnual },
    { label: t('合格股息 (×{n} grossed-up)', { n: grossUp }), value: tax.grossedUpDividends },
    { label: t('利息收入'), value: derived.interest },
    { label: t('OAS (已领取)'), value: derived.oasAnnual },
    { label: t('已实现资本利得（提取投资，50%计入）'), value: plan.totalRealizedGain * 0.5 },
    { label: t('RRSP 取款（全额计入）'), value: plan.totalOrdinaryIncome },
  ].filter((r) => r.value > 0)

  const totalIncome = incomeRows.reduce((s, r) => s + r.value, 0)
  const deductions = derived.helocInterest
  const annualPropertyTax = properties.reduce((s, p) => s + computePropertyTax(p), 0)

  return (
    <Page title="税务摘要">
      <p className="mb-4 text-sm text-slate-500">
        {t('联邦 + 省级分档累进税，含股息 grossed-up、DTC 抵免与资本利得 50% 计入。')}
        {t('已包含为补足月现金流缺口而提取投资所实现的被动收入')}
        {plan.totalWithdrawal > 0 && t('（本年预计提取 {n}）', { n: formatCurrency(plan.totalWithdrawal) })}。
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="mb-3 font-semibold">{t('收入汇总')}</h3>
          {incomeRows.map((r) => (
            <div key={r.label} className="flex justify-between py-1.5 text-sm">
              <span className="text-slate-600">{r.label}</span>
              <span className="font-medium">{formatCurrency(r.value)}</span>
            </div>
          ))}
          <div className="mt-2 flex justify-between border-t border-slate-100 pt-2 text-sm font-semibold">
            <span>{t('收入合计')}</span>
            <span>{formatCurrency(totalIncome)}</span>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="mb-3 font-semibold">{t('抵扣、税额与抵免')}</h3>
          <div className="flex justify-between py-1.5 text-sm">
            <span className="text-slate-600">{t('投资利息 (Line 22100)')}</span>
            <span className="font-medium text-emerald-600">−{formatCurrency(deductions)}</span>
          </div>
          <div className="flex justify-between py-1.5 text-sm">
            <span className="text-slate-600">{t('应税收入')}</span>
            <span className="font-medium">{formatCurrency(tax.taxableIncome)}</span>
          </div>
          <div className="flex justify-between py-1.5 text-sm">
            <span className="text-slate-600">{t('联邦税')}</span>
            <span className="font-medium">{formatCurrency(tax.federalTax)}</span>
          </div>
          <div className="flex justify-between py-1.5 text-sm">
            <span className="text-slate-600">{t('省税（{p}）', { p: province })}</span>
            <span className="font-medium">{formatCurrency(tax.provincialTax)}</span>
          </div>
          <div className="flex justify-between py-1.5 text-sm">
            <span className="text-slate-600">{t('股息税收抵免 (DTC)')}</span>
            <span className="font-medium text-emerald-600">−{formatCurrency(tax.dtcCredit)}</span>
          </div>
          <div className="mt-4 rounded-lg bg-slate-50 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">{t('净应缴所得税')}</span>
              <span className="text-xs text-slate-400">{t('有效税率 {n}', { n: formatPercent(tax.averageRate) })}</span>
            </div>
            <div className="text-2xl font-semibold">{formatCurrency(tax.totalTax)}</div>
          </div>
        </div>
      </div>

      <div className="card mt-6 p-5">
        <h3 className="mb-3 font-semibold">{t('地税汇总')}</h3>
        {properties.length === 0 ? (
          <p className="text-slate-400">{t('暂无房产。')}</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {properties.map((p) => (
              <div key={p.id} className="flex justify-between py-2 text-sm">
                <span className="text-slate-600">{p.name}</span>
                <span className="font-medium">{formatCurrency(computePropertyTax(p))}{t('/年')}</span>
              </div>
            ))}
            <div className="flex justify-between py-2 text-sm font-semibold">
              <span>{t('年地税合计')}</span>
              <span>{formatCurrency(annualPropertyTax)}</span>
            </div>
          </div>
        )}
      </div>
    </Page>
  )
}
