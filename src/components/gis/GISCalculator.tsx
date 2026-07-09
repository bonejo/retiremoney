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
        <h3 className="font-semibold">{t('GIS Income Test')}</h3>
        {result.eligible ? <Badge color="green">{t('✅ Eligible')}</Badge> : <Badge color="red">{t('❌ Over threshold')}</Badge>}
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
        <label className="label">{t('Simulate: capital gains realized this year')}</label>
        <input
          type="range"
          className="w-full accent-brand-600"
          min={0}
          max={40000}
          step={1000}
          value={capitalGains}
          onChange={(e) => setCapitalGains(Number(e.target.value))}
        />
        <div className="text-xs text-slate-500">{t('Realize {a} → net income +{b} (50% counted)', { a: formatCurrency(capitalGains), b: formatCurrency(capitalGains * 0.5) })}</div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-slate-50 p-3">
          <div className="text-xs text-slate-500">{t('Total net income')}</div>
          <div className="text-xl font-semibold">{formatCurrency(result.netIncome)}</div>
        </div>
        <div className={`rounded-lg p-3 ${result.eligible ? 'bg-emerald-50' : 'bg-rose-50'}`}>
          <div className="text-xs text-slate-500">{t('GIS monthly')}</div>
          <div className={`text-xl font-semibold ${result.eligible ? 'text-emerald-700' : 'text-rose-600'}`}>
            {formatCurrency(result.gisMonthly)}
          </div>
        </div>
      </div>

      {room > 0 ? (
        <p className="mt-3 text-sm text-slate-500">
          {t('💡 Net income {a}; {b} of room before GIS reaches zero.', { a: formatCurrency(result.netIncome), b: formatCurrency(room) })}
        </p>
      ) : (
        <p className="mt-3 text-sm text-rose-600">
          {t('Net income exceeds the GIS threshold. Consider switching dividend ETFs to non-dividend growth ETFs.')}
        </p>
      )}
    </div>
  )
}
