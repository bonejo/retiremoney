import { useState } from 'react'
import type { Property, PropertyType, RentalUnit } from '../../types'
import FormInput from '../common/FormInput'
import SliderInput from '../common/SliderInput'
import { uid, formatCurrency } from '../../utils/format'
import { computePropertyTax, rentalSummary } from '../../utils/propertyCalc'
import { mortgageStats, effectiveMortgage, currentMortgageBalance } from '../../utils/mortgageCalc'
import { PROPERTY_TAX_RATES } from '../../constants/bcTaxRates2026'

interface PropertyFormProps {
  initial: Property
  onSave: (p: Property) => void
  onCancel: () => void
}

const tabs = [
  '基本信息',
  '地税',
  'Mortgage',
  'LOC',
  '物业费&保险',
  '出租信息',
  '遗产',
] as const

const typeOptions: { value: PropertyType; label: string }[] = [
  { value: 'primary_residence', label: '自住' },
  { value: 'rental', label: '出租' },
  { value: 'mixed', label: '混合' },
]

export default function PropertyForm({ initial, onSave, onCancel }: PropertyFormProps) {
  const [p, setP] = useState<Property>(initial)
  const [tab, setTab] = useState(0)

  const set = (patch: Partial<Property>) => setP((prev) => ({ ...prev, ...patch }))
  const num = (v: string) => (v === '' ? 0 : Number(v))

  const showRental = p.type === 'rental' || p.type === 'mixed'

  // Ensure nested objects exist when their toggle is switched on.
  const ensureMortgage = () =>
    p.mortgage ?? {
      hasMortgage: true,
      balance: 0,
      monthlyPayment: 0,
      interestRate: 0.0345,
      rateType: 'fixed' as const,
      maturityDate: '',
      originalAmortization: 25,
    }
  const ensureLOC = () =>
    p.loc ?? {
      hasLOC: true,
      balance: 0,
      limit: 0,
      interestRate: 0.06,
      purpose: 'personal' as const,
    }
  const ensureRental = () =>
    p.rental ?? {
      units: [] as RentalUnit[],
      rentalAreaPercent: p.type === 'mixed' ? 40 : 100,
      vacancyRate: 0.05,
      managementFeePercent: 0,
      annualRentIncrease: 0.03,
    }

  const taxPreview = computePropertyTax(p)
  const mStats = p.mortgage?.hasMortgage ? mortgageStats(effectiveMortgage(p.mortgage)) : null
  const projectedBalance = p.mortgage?.hasMortgage ? currentMortgageBalance(p.mortgage) : 0
  const rSummary = showRental ? rentalSummary(p) : null

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex flex-wrap gap-1 border-b border-slate-200">
        {tabs.map((t, i) => {
          if (t === '出租信息' && !showRental) return null
          return (
            <button
              key={t}
              className={`-mb-px border-b-2 px-3 py-2 text-sm ${
                tab === i
                  ? 'border-brand-600 font-medium text-brand-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
              onClick={() => setTab(i)}
            >
              {t}
            </button>
          )
        })}
      </div>

      <div className="flex-1 space-y-4">
        {tab === 0 && (
          <>
            <FormInput label="房产名称" value={p.name} onChange={(v) => set({ name: v })} placeholder="自住公寓" />
            <div>
              <span className="label">类型</span>
              <div className="grid grid-cols-3 gap-2">
                {typeOptions.map((o) => (
                  <button
                    key={o.value}
                    className={`btn ${p.type === o.value ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => set({ type: o.value })}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            <FormInput label="当前市值" type="number" prefix="$" value={p.currentValue || ''} onChange={(v) => set({ currentValue: num(v) })} />
            <div className="grid grid-cols-2 gap-3">
              <FormInput label="购买价格 (ACB)" type="number" prefix="$" value={p.purchasePrice || ''} onChange={(v) => set({ purchasePrice: num(v) })} />
              <FormInput label="购买年份" type="number" value={p.purchaseYear || ''} onChange={(v) => set({ purchaseYear: num(v) })} />
            </div>
            <SliderInput label="年均增值率" value={p.appreciationRate} onChange={(v) => set({ appreciationRate: v })} max={0.08} />
            <FormInput label="所在省市" value={p.province} onChange={(v) => set({ province: v })} />
          </>
        )}

        {tab === 1 && (
          <>
            <div className="flex gap-2">
              <button
                className={`btn ${p.propertyTax.autoCalculate ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => set({ propertyTax: { ...p.propertyTax, autoCalculate: true } })}
              >
                自动计算
              </button>
              <button
                className={`btn ${!p.propertyTax.autoCalculate ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => set({ propertyTax: { ...p.propertyTax, autoCalculate: false } })}
              >
                手动输入
              </button>
            </div>
            {p.propertyTax.autoCalculate ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <FormInput label="评估值倍数" type="number" step="0.01" value={p.propertyTax.assessedValueRatio} onChange={(v) => set({ propertyTax: { ...p.propertyTax, assessedValueRatio: num(v) } })} />
                  <FormInput label="税率 (每千元)" type="number" step="0.001" value={p.propertyTax.taxRatePerThousand} onChange={(v) => set({ propertyTax: { ...p.propertyTax, taxRatePerThousand: num(v) } })} />
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(PROPERTY_TAX_RATES).map(([city, rate]) => (
                    <button key={city} className="btn-ghost text-xs" onClick={() => set({ propertyTax: { ...p.propertyTax, taxRatePerThousand: rate } })}>
                      {city} {rate}
                    </button>
                  ))}
                </div>
                <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                  {formatCurrency(p.currentValue)} × {p.propertyTax.assessedValueRatio} × {p.propertyTax.taxRatePerThousand}/1000 ={' '}
                  <span className="font-semibold text-slate-900">{formatCurrency(taxPreview)}</span> / 年
                </div>
              </>
            ) : (
              <FormInput label="年地税金额" type="number" prefix="$" value={p.propertyTax.annualAmount || ''} onChange={(v) => set({ propertyTax: { ...p.propertyTax, annualAmount: num(v) } })} />
            )}
          </>
        )}

        {tab === 2 && (
          <>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!p.mortgage?.hasMortgage} onChange={(e) => set({ mortgage: e.target.checked ? ensureMortgage() : null })} />
              有 Mortgage
            </label>
            {p.mortgage?.hasMortgage && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <FormInput label="剩余余额" type="number" prefix="$" value={p.mortgage.balance || ''} onChange={(v) => set({ mortgage: { ...p.mortgage!, balance: num(v) } })} />
                  <FormInput label="余额记录月份" type="month" value={p.mortgage.balanceAsOf ?? ''} onChange={(v) => set({ mortgage: { ...p.mortgage!, balanceAsOf: v || undefined } })} />
                </div>
                <FormInput label="月供" type="number" prefix="$" value={p.mortgage.monthlyPayment || ''} onChange={(v) => set({ mortgage: { ...p.mortgage!, monthlyPayment: num(v) } })} />
                {p.mortgage.balanceAsOf && (
                  <div className="rounded-lg bg-brand-50 p-3 text-sm text-brand-700">
                    按月供摊销至今天，推算当前余额：
                    <span className="font-semibold">{formatCurrency(projectedBalance)}</span>
                    <span className="ml-1 text-xs text-brand-500">（输入历史某月余额，系统自动推算现值）</span>
                  </div>
                )}
                <SliderInput label="年利率" value={p.mortgage.interestRate} onChange={(v) => set({ mortgage: { ...p.mortgage!, interestRate: v } })} max={0.1} step={0.0001} />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="label">利率类型</span>
                    <div className="flex gap-2">
                      {(['fixed', 'variable'] as const).map((rt) => (
                        <button key={rt} className={`btn ${p.mortgage!.rateType === rt ? 'btn-primary' : 'btn-secondary'}`} onClick={() => set({ mortgage: { ...p.mortgage!, rateType: rt } })}>
                          {rt === 'fixed' ? '固定' : '浮动'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <FormInput label="到期日" type="month" value={p.mortgage.maturityDate} onChange={(v) => set({ mortgage: { ...p.mortgage!, maturityDate: v } })} />
                </div>
                {mStats?.valid && (
                  <div className="space-y-1 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                    <div>剩余年限：<span className="font-medium text-slate-900">{mStats.yearsRemaining.toFixed(1)} 年</span></div>
                    <div>剩余利息总额：<span className="font-medium text-slate-900">{formatCurrency(mStats.totalRemainingInterest)}</span></div>
                    <div>下期本金 / 利息：{formatCurrency(mStats.principalPortion)} / {formatCurrency(mStats.interestPortion)}</div>
                  </div>
                )}
                {p.mortgage.monthlyPayment > 0 && mStats && !mStats.valid && (
                  <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">月供不足以覆盖利息，贷款无法还清。</div>
                )}
              </>
            )}
          </>
        )}

        {tab === 3 && (
          <>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!p.loc?.hasLOC} onChange={(e) => set({ loc: e.target.checked ? ensureLOC() : null })} />
              有 LOC / HELOC
            </label>
            {p.loc?.hasLOC && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <FormInput label="已借余额" type="number" prefix="$" value={p.loc.balance || ''} onChange={(v) => set({ loc: { ...p.loc!, balance: num(v) } })} />
                  <FormInput label="额度上限" type="number" prefix="$" value={p.loc.limit || ''} onChange={(v) => set({ loc: { ...p.loc!, limit: num(v) } })} />
                </div>
                <SliderInput label="利率" value={p.loc.interestRate} onChange={(v) => set({ loc: { ...p.loc!, interestRate: v } })} max={0.12} step={0.0001} />
                <div>
                  <span className="label">用途</span>
                  <div className="flex gap-2">
                    {(['investment', 'personal'] as const).map((pu) => (
                      <button key={pu} className={`btn ${p.loc!.purpose === pu ? 'btn-primary' : 'btn-secondary'}`} onClick={() => set({ loc: { ...p.loc!, purpose: pu } })}>
                        {pu === 'investment' ? '投资' : '个人'}
                      </button>
                    ))}
                  </div>
                  {p.loc.purpose === 'investment' && (
                    <p className="mt-1 text-xs text-emerald-600">投资用途利息可 Line 22100 抵扣</p>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {tab === 4 && (
          <>
            <FormInput label="月物业管理费 (Strata)" type="number" prefix="$" value={p.strataFee ?? ''} onChange={(v) => set({ strataFee: v === '' ? null : num(v) })} />
            <FormInput label="年保险金额" type="number" prefix="$" value={p.insurance ?? ''} onChange={(v) => set({ insurance: v === '' ? null : num(v) })} />
          </>
        )}

        {tab === 5 && showRental && (
          <RentalTab p={p} set={set} ensureRental={ensureRental} rSummary={rSummary} num={num} />
        )}

        {tab === 6 && (
          <div className="space-y-3">
            {p.type === 'primary_residence' ? (
              <div className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-700">
                主要住所（Primary Residence）：资本利得完全免税，无论增值多少。
              </div>
            ) : (
              <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
                非主要住所，估算资本利得税（去世时）：<br />
                （{formatCurrency(p.currentValue)} − {formatCurrency(p.purchasePrice)}）× 50% × 27% ={' '}
                <span className="font-semibold text-slate-900">
                  {formatCurrency(Math.max(0, p.currentValue - p.purchasePrice) * 0.5 * 0.27)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 flex justify-end gap-2 border-t border-slate-200 pt-4">
        <button className="btn-secondary" onClick={onCancel}>取消</button>
        <button className="btn-primary" onClick={() => onSave(p)} disabled={!p.name.trim()}>保存</button>
      </div>
    </div>
  )
}

// --- Rental tab (multiple units) ---
function RentalTab({
  p,
  set,
  ensureRental,
  rSummary,
  num,
}: {
  p: Property
  set: (patch: Partial<Property>) => void
  ensureRental: () => NonNullable<Property['rental']>
  rSummary: ReturnType<typeof rentalSummary> | null
  num: (v: string) => number
}) {
  const r = p.rental ?? ensureRental()

  const updateUnit = (id: string, patch: Partial<RentalUnit>) =>
    set({ rental: { ...r, units: r.units.map((u) => (u.id === id ? { ...u, ...patch } : u)) } })
  const addUnit = () => {
    if (r.units.length >= 5) return
    set({ rental: { ...r, units: [...r.units, { id: uid(), name: `单元 ${r.units.length + 1}`, monthlyRent: 0, isOccupied: true, areaPercent: 0 }] } })
  }
  const removeUnit = (id: string) =>
    set({ rental: { ...r, units: r.units.filter((u) => u.id !== id) } })

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <FormInput label="空置率" type="number" step="0.01" suffix="" value={r.vacancyRate} onChange={(v) => set({ rental: { ...r, vacancyRate: num(v) } })} />
        {p.type === 'mixed' && (
          <FormInput label="出租面积占比 %" type="number" value={r.rentalAreaPercent} onChange={(v) => set({ rental: { ...r, rentalAreaPercent: num(v) } })} />
        )}
        <FormInput label="委托管理费率 %" type="number" value={r.managementFeePercent} onChange={(v) => set({ rental: { ...r, managementFeePercent: num(v) } })} />
        <div>
          <SliderInput
            label="租金年涨幅"
            value={r.annualRentIncrease ?? 0.03}
            onChange={(v) => set({ rental: { ...r, annualRentIncrease: v } })}
            max={0.08}
            step={0.0025}
          />
          <p className="mt-1 text-xs text-slate-400">
            资产预测中租金按此比例逐年增长。BC省对续租涨幅有官方上限（近年约2%–3.5%），换租户时可按市场价调整。
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="label mb-0">出租单元（1-5）</span>
          <button className="btn-ghost text-sm text-brand-600" onClick={addUnit}>+ 添加单元</button>
        </div>
        {r.units.map((u) => (
          <div key={u.id} className="rounded-lg border border-slate-200 p-3">
            <div className="grid grid-cols-2 gap-2">
              <FormInput label="名称" value={u.name} onChange={(v) => updateUnit(u.id, { name: v })} />
              <FormInput label="月租金" type="number" prefix="$" value={u.monthlyRent || ''} onChange={(v) => updateUnit(u.id, { monthlyRent: num(v) })} />
              <FormInput label="面积占比 %" type="number" value={u.areaPercent || ''} onChange={(v) => updateUnit(u.id, { areaPercent: num(v) })} />
              <label className="flex items-end gap-2 pb-2 text-sm">
                <input type="checkbox" checked={u.isOccupied} onChange={(e) => updateUnit(u.id, { isOccupied: e.target.checked })} />
                已出租
              </label>
            </div>
            <button className="mt-2 text-xs text-rose-500" onClick={() => removeUnit(u.id)}>删除单元</button>
          </div>
        ))}
      </div>

      {rSummary && (
        <div className="space-y-1 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
          <div>年毛租金：<span className="font-medium text-slate-900">{formatCurrency(rSummary.grossAnnualRent)}</span></div>
          <div>空置损失：−{formatCurrency(rSummary.vacancyLoss)}</div>
          <div>可抵扣费用：−{formatCurrency(rSummary.deductibleExpenses)}</div>
          <div className="pt-1 font-semibold text-emerald-700">年净租金收入（T776）：{formatCurrency(rSummary.netAnnualRent)}</div>
        </div>
      )}
    </div>
  )
}
