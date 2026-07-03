import { Page } from '../components/layout/Layout'
import GISCalculator from '../components/gis/GISCalculator'
import { useDerivedIncome } from '../hooks/useDerivedIncome'
import { useInvestmentStore } from '../store/investmentStore'
import { useAssumptionsStore } from '../store/assumptionsStore'
import { familyLoanIncomeForYear } from '../utils/incomeCalc'
import { formatCurrency } from '../utils/format'

export default function Income() {
  const derived = useDerivedIncome()
  const investments = useInvestmentStore((s) => s.investments)
  const assumptions = useAssumptionsStore((s) => s.assumptions)
  const year = new Date().getFullYear()
  const familyRepayment = familyLoanIncomeForYear(investments, year)

  const oasAge = assumptions.governmentBenefits.oasAge
  const yearsToOas = Math.max(0, oasAge - derived.currentAge)

  const rows = [
    { label: '出租净收入(年)', value: derived.netRentalAnnual, note: '来自房产模块' },
    {
      label: 'OAS(年)',
      value: derived.oasAnnual,
      note:
        (derived.currentAge >= oasAge ? '正在领取' : `${yearsToOas}年后开始`) +
        (derived.oasResidenceFraction < 1
          ? ` · 按居住年限 ${(derived.oasResidenceFraction * 100).toFixed(0)}% 折算`
          : ''),
    },
    { label: 'CPP(年)', value: derived.cppAnnual, note: '按领取年龄调整后' },
    { label: 'GIS(年)', value: derived.gis.gisAnnual, note: '政府补贴' },
    { label: '合格股息(年)', value: derived.eligibleDividends, note: '投资账户' },
    { label: '利息收入(年)', value: derived.interest, note: '投资账户' },
    { label: `家庭借款还款(${year})`, value: familyRepayment, note: '本金返还' },
  ].filter((r) => r.value > 0)

  const totalAnnual = rows.reduce((s, r) => s + r.value, 0)

  return (
    <Page title="收入总览 & GIS/OAS">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">自动生成收入</h3>
              <span className="text-sm text-slate-400">年总计 {formatCurrency(totalAnnual)}</span>
            </div>
            {rows.length === 0 ? (
              <p className="py-6 text-center text-slate-400">暂无自动收入。添加房产或投资后自动显示。</p>
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
            <h3 className="mb-2 font-semibold">OAS 领取时间表</h3>
            <div className="text-sm text-slate-600">
              当前 {derived.currentAge} 岁
              {yearsToOas > 0
                ? ` · 距离 OAS 领取还有 ${yearsToOas} 年`
                : ' · 已达 OAS 领取年龄'}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs text-slate-400">65–74 岁 月额</div>
                <div className="font-semibold">{formatCurrency(assumptions.governmentBenefits.oasMonthly6574)}</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs text-slate-400">75 岁+ 月额</div>
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
