import { useState } from 'react'
import { useAssumptionsStore } from '../../store/assumptionsStore'
import { useProfileStore } from '../../store/profileStore'
import { computeGIS, type GISIncomeInputs } from '../../utils/gisCalc'
import { formatCurrency } from '../../utils/format'
import Badge from '../common/Badge'
import { useT } from '../../i18n'

interface GISCalculatorProps {
  base: GISIncomeInputs // auto-aggregated from properties + investments
}

// Interactive GIS calculator. Starts from auto-aggregated income and lets the
// user add a hypothetical capital-gains withdrawal to see the GIS impact.
export default function GISCalculator({ base }: GISCalculatorProps) {
  const t = useT()
  const assumptions = useAssumptionsStore((s) => s.assumptions)
  const maritalStatus = useProfileStore((s) => s.profile?.maritalStatus ?? 'single')
  const [capitalGains, setCapitalGains] = useState(0)

  const inputs: GISIncomeInputs = { ...base, capitalGains }
  const result = computeGIS(inputs, assumptions, maritalStatus)
  // Net income where GIS hits 0 (couple rate reduces $1 per $4 of income).
  const threshold =
    maritalStatus === 'married'
      ? (assumptions.governmentBenefits.gisMaxAnnualCouple ?? 7980) * 4
      : assumptions.governmentBenefits.gisMaxAnnual * 2
  const room = threshold - result.netIncome

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">{t('GIS 净收入测试')}</h3>
        {result.eligible ? <Badge color="green">{t('✅ 有资格')}</Badge> : <Badge color="red">{t('❌ 超出门槛')}</Badge>}
      </div>

      <div className="divide-y divide-slate-100">
        {result.breakdown.map((b) => (
          <div key={b.label} className="flex items-center justify-between py-2 text-sm">
            <span className="text-slate-600">{t(b.label)}</span>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400">{t(b.note)}</span>
              <span className={`w-24 text-right font-medium ${b.amount < 0 ? 'text-emerald-600' : 'text-slate-900'}`}>
                {b.amount < 0 ? '−' : ''}{formatCurrency(Math.abs(b.amount))}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-lg bg-slate-50 p-3">
        <label className="label">{t('模拟：本年取用资本利得')}</label>
        <input
          type="range"
          className="w-full accent-brand-600"
          min={0}
          max={40000}
          step={1000}
          value={capitalGains}
          onChange={(e) => setCapitalGains(Number(e.target.value))}
        />
        <div className="text-xs text-slate-500">{t('取用 {a} → 净收入 +{b}（50%计入）', { a: formatCurrency(capitalGains), b: formatCurrency(capitalGains * 0.5) })}</div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-slate-50 p-3">
          <div className="text-xs text-slate-500">{t('净收入合计')}</div>
          <div className="text-xl font-semibold">{formatCurrency(result.netIncome)}</div>
        </div>
        <div className={`rounded-lg p-3 ${result.eligible ? 'bg-emerald-50' : 'bg-rose-50'}`}>
          <div className="text-xs text-slate-500">{t('GIS 月额')}</div>
          <div className={`text-xl font-semibold ${result.eligible ? 'text-emerald-700' : 'text-rose-600'}`}>
            {formatCurrency(result.gisMonthly)}
          </div>
        </div>
      </div>

      {room > 0 ? (
        <p className="mt-3 text-sm text-slate-500">
          {t('💡 您当前净收入 {a}，距离 GIS 归零门槛还有 {b} 空间。', { a: formatCurrency(result.netIncome), b: formatCurrency(room) })}
        </p>
      ) : (
        <p className="mt-3 text-sm text-rose-600">
          {t('净收入已超出 GIS 门槛。建议：将合格股息 ETF 换为无股息成长 ETF 以降低净收入。')}
        </p>
      )}
    </div>
  )
}
