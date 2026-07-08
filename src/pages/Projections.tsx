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
    <Page title="资产预测">
      {depletion && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span>⚠️</span>
          <span>
            <span className="font-semibold">{t('{age}岁', { age: depletion.age })}</span>
            {t('时可提取投资耗尽，当年资金缺口约')}{' '}
            <span className="font-semibold">{formatCurrency(depletion.unfundedShortfall)}</span>。
            {t('此后图表假设缺口未被填补（净资产只剩房产等不可提取资产）——实际需要提前规划：出售房产、反向按揭 / HELOC，或削减支出。')}
          </span>
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">
              {last ? t('{age}岁 总净资产 {n}', { age: last.age, n: formatCurrency(last.netWorth) }) : t('资产曲线')}
            </h3>
            <div className="flex gap-1">
              {horizons.map((h) => (
                <button key={h} className={`btn px-3 py-1 text-sm ${horizon === h ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setHorizon(h)}>
                  {t('{n}年', { n: h })}
                </button>
              ))}
            </div>
          </div>
          <ProjectionChart data={data} showDebt height={380} />
        </div>

        <div className="card space-y-5 p-5">
          <h3 className="font-semibold">{t('参数调节')}</h3>
          <SliderInput label={t('房产年增值率')} value={propApp} onChange={setPropApp} max={0.08} />
          <SliderInput label={t('非注册 ETF 年回报')} value={nonReg} onChange={setNonReg} max={0.12} />
          <SliderInput label={t('TFSA 年回报')} value={tfsa} onChange={setTfsa} max={0.12} />
        </div>
      </div>

      <div className="card mt-6 p-5">
        <h3 className="mb-1 font-semibold">{t('数据表（每5年）')}</h3>
        <p className="mb-3 text-xs text-slate-400">
          {t('现金收入（含股息/利息/租金/OAS/CPP/GIS）先支付支出，缺口按提取优先级从投资账户取款。取款仅资本利得的50%计入应税收入（TFSA免税、RRSP全额）；所得税按次年支出计入，上一年提取产生的应税收入计入当年 GIS 测试。账户取空后剩余缺口列为「未补缺口」。')}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2 pr-4">{t('年龄')}</th>
                <th className="py-2 pr-4">{t('总资产')}</th>
                <th className="py-2 pr-4">TFSA</th>
                <th className="py-2 pr-4">RRSP</th>
                <th className="py-2 pr-4">{t('非注册')}</th>
                <th className="py-2 pr-4">{t('现金收入')}</th>
                <th className="py-2 pr-4">{t('支出')}</th>
                <th className="py-2 pr-4">{t('取款')}</th>
                <th className="py-2 pr-4">{t('资本利得')}</th>
                <th className="py-2 pr-4">{t('应税收入')}</th>
                <th className="py-2 pr-4">{t('所得税')}</th>
                <th className="py-2 pr-4">{t('未补缺口')}</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((r) => (
                <tr key={r.year} className="border-b border-slate-50">
                  <td className="py-2 pr-4 font-medium">{t('{age}岁', { age: r.age })}</td>
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
