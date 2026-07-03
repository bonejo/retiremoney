import { useState } from 'react'
import type { Investment, InvestmentType, DividendType } from '../../types'
import FormInput from '../common/FormInput'
import SliderInput from '../common/SliderInput'
import { formatCurrency } from '../../utils/format'
import { currentInvestmentValue, isHistoricalOrigin, usdCadRate } from '../../utils/investmentCalc'

interface InvestmentFormProps {
  initial: Investment
  onSave: (i: Investment) => void
  onCancel: () => void
}

const typeOptions: { value: InvestmentType; label: string }[] = [
  { value: 'TFSA', label: 'TFSA' },
  { value: 'non_registered', label: '非注册' },
  { value: 'RRSP', label: 'RRSP' },
  { value: 'GIC', label: 'GIC' },
  { value: 'savings', label: '储蓄' },
  { value: 'other', label: '其他' },
]

const dividendOptions: { value: DividendType; label: string }[] = [
  { value: 'eligible', label: '合格股息' },
  { value: 'non_eligible', label: '非合格' },
  { value: 'none', label: '无股息' },
]

export default function InvestmentForm({ initial, onSave, onCancel }: InvestmentFormProps) {
  const [inv, setInv] = useState<Investment>(initial)
  const set = (patch: Partial<Investment>) => setInv((prev) => ({ ...prev, ...patch }))
  const num = (v: string) => (v === '' ? 0 : Number(v))

  const isFamilyLoan = !!inv.familyLoan?.isFamilyLoan
  const historical = isHistoricalOrigin(inv)

  const toggleFamilyLoan = (on: boolean) => {
    set({
      familyLoan: on
        ? inv.familyLoan ?? {
            isFamilyLoan: true,
            borrowerName: '',
            principalAmount: 0,
            isInterestFree: true,
            repaymentSchedule: [],
          }
        : undefined,
    })
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4">
        <div>
          <span className="label">账户类型</span>
          <div className="grid grid-cols-3 gap-2">
            {typeOptions.map((o) => (
              <button
                key={o.value}
                className={`btn ${inv.type === o.value ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => set({ type: o.value })}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormInput label="金融机构" value={inv.institutionName} onChange={(v) => set({ institutionName: v })} placeholder="TD Bank" />
          <FormInput label="账户昵称" value={inv.accountName} onChange={(v) => set({ accountName: v })} placeholder="成长ETF" />
        </div>

        <div>
          <span className="label">币种</span>
          <div className="grid grid-cols-2 gap-2">
            {(['CAD', 'USD'] as const).map((c) => (
              <button
                key={c}
                className={`btn ${(inv.currency ?? 'CAD') === c ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => set({ currency: c })}
              >
                {c === 'CAD' ? '加元 CAD' : '美元 USD'}
              </button>
            ))}
          </div>
          {inv.currency === 'USD' && (
            <p className="mt-1 text-xs text-slate-400">
              金额按美元填写，全局按 1 USD = {usdCadRate().toFixed(2)} CAD 折算（可在「全局设置」修改汇率）。
            </p>
          )}
        </div>

        {!historical && (
          <FormInput label={inv.currency === 'USD' ? '当前余额 (USD)' : '当前余额'} type="number" prefix={inv.currency === 'USD' ? 'US$' : '$'} value={inv.currentBalance || ''} onChange={(v) => set({ currentBalance: num(v) })} />
        )}
        <SliderInput label="预期年化总回报率" value={inv.annualReturnRate} onChange={(v) => set({ annualReturnRate: v })} max={0.12} />

        <div className="rounded-lg border border-slate-200 p-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={historical}
              onChange={(e) =>
                e.target.checked
                  ? set({ startDate: new Date().toISOString().slice(0, 7), startValue: inv.currentBalance || 0 })
                  : set({ startDate: undefined, startValue: undefined })
              }
            />
            从历史投资推算当前余额
          </label>
          {historical && (
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <FormInput label="开始投资月份" type="month" value={inv.startDate ?? ''} onChange={(v) => set({ startDate: v || undefined })} />
                <FormInput label="初始投入金额" type="number" prefix={inv.currency === 'USD' ? 'US$' : '$'} value={inv.startValue ?? ''} onChange={(v) => set({ startValue: num(v) })} />
              </div>
              <div className="rounded-lg bg-brand-50 p-3 text-sm text-brand-700">
                按年化 {(inv.annualReturnRate * 100).toFixed(2)}% 复利推算至今，当前余额约{' '}
                <span className="font-semibold">{formatCurrency(currentInvestmentValue(inv))}</span>
                {inv.currency === 'USD' && <span className="ml-1 text-xs text-brand-500">（已折算加元）</span>}
                <span className="ml-1 text-xs text-brand-500">（不含中途追加，追加请直接填当前余额）</span>
              </div>
            </div>
          )}
        </div>

        {inv.type === 'TFSA' && (
          <div className="space-y-3 rounded-lg bg-emerald-50 p-3">
            <p className="text-xs text-emerald-700">TFSA 收益完全免税，不计入 GIS 净收入测试。</p>
            <div className="grid grid-cols-2 gap-3">
              <FormInput label="剩余贡献额度" type="number" prefix="$" value={inv.tfsa?.contributionRoom ?? ''} onChange={(v) => set({ tfsa: { annualNewRoom: inv.tfsa?.annualNewRoom ?? 7000, contributionRoom: num(v) } })} />
              <FormInput label="每年新增额度" type="number" prefix="$" value={inv.tfsa?.annualNewRoom ?? 7000} onChange={(v) => set({ tfsa: { contributionRoom: inv.tfsa?.contributionRoom ?? 0, annualNewRoom: num(v) } })} />
            </div>
          </div>
        )}

        {inv.type === 'non_registered' && (
          <div className="space-y-3">
            <FormInput label="原始成本 (ACB)" type="number" prefix="$" value={inv.acb ?? ''} onChange={(v) => set({ acb: num(v) })} />
            <div className="rounded-lg bg-slate-50 p-3">
              <SliderInput
                label="其中股息/分红收益率"
                value={inv.dividendYield ?? 0}
                onChange={(v) => set({ dividendYield: Math.min(v, inv.annualReturnRate) })}
                max={inv.annualReturnRate}
                step={0.0025}
              />
              <p className="mt-2 text-xs text-slate-500">
                股息每年发放并计税；余下{' '}
                <span className="font-medium text-slate-700">
                  {((inv.annualReturnRate - (inv.dividendYield ?? 0)) * 100).toFixed(2)}%
                </span>{' '}
                为资本增值，卖出前不计税。
              </p>
            </div>
            <div>
              <span className="label">股息类型</span>
              <div className="grid grid-cols-3 gap-2">
                {dividendOptions.map((o) => (
                  <button key={o.value} className={`btn ${inv.dividendType === o.value ? 'btn-primary' : 'btn-secondary'}`} onClick={() => set({ dividendType: o.value })}>
                    {o.label}
                  </button>
                ))}
              </div>
              {inv.dividendType === 'eligible' && (
                <p className="mt-1 text-xs text-amber-600">合格股息将以 ×1.38 grossed-up 计入净收入，可能影响 GIS。</p>
              )}
              {inv.dividendType === 'none' && (
                <p className="mt-1 text-xs text-emerald-600">无股息（纯增值 ETF）最适合 GIS 优化策略。</p>
              )}
            </div>
          </div>
        )}

        {inv.type === 'GIC' && (
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="到期日" type="date" value={inv.gic?.maturityDate ?? ''} onChange={(v) => set({ gic: { interestRate: inv.gic?.interestRate ?? inv.annualReturnRate, isCompound: inv.gic?.isCompound ?? true, maturityDate: v } })} />
            <FormInput label="利率" type="number" step="0.001" value={inv.gic?.interestRate ?? inv.annualReturnRate} onChange={(v) => set({ gic: { maturityDate: inv.gic?.maturityDate ?? '', isCompound: inv.gic?.isCompound ?? true, interestRate: num(v) } })} />
          </div>
        )}

        {!isFamilyLoan && (
          <div>
            <span className="label">提取优先级（用于cover支出的取款顺序）</span>
            <select
              className="input"
              value={inv.withdrawalPriority ?? 0}
              onChange={(e) => set({ withdrawalPriority: Number(e.target.value) })}
            >
              <option value={0}>不用于提取</option>
              <option value={1}>1 — 最先取</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4 — 最后取</option>
            </select>
            <p className="mt-1 text-xs text-slate-400">
              当年现金收入不足以支付支出时，按此顺序从账户取款。非注册取款仅资本利得的50%计税，TFSA免税，RRSP全额计税。
            </p>
          </div>
        )}

        <div className="rounded-lg border border-slate-200 p-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isFamilyLoan} onChange={(e) => toggleFamilyLoan(e.target.checked)} />
            这是一笔家庭借款（借出去的钱）
          </label>
          {isFamilyLoan && inv.familyLoan && (
            <div className="mt-3 space-y-3">
              <FormInput label="借款人姓名" value={inv.familyLoan.borrowerName} onChange={(v) => set({ familyLoan: { ...inv.familyLoan!, borrowerName: v } })} />
              <FormInput label="借出金额" type="number" prefix="$" value={inv.familyLoan.principalAmount || ''} onChange={(v) => set({ familyLoan: { ...inv.familyLoan!, principalAmount: num(v) } })} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={inv.familyLoan.isInterestFree} onChange={(e) => set({ familyLoan: { ...inv.familyLoan!, isInterestFree: e.target.checked } })} />
                无息借款（本金返还不计入收入）
              </label>
              <RepaymentEditor inv={inv} set={set} num={num} />
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-2 border-t border-slate-200 pt-4">
        <button className="btn-secondary" onClick={onCancel}>取消</button>
        <button className="btn-primary" onClick={() => onSave(inv)}>保存</button>
      </div>
    </div>
  )
}

function RepaymentEditor({
  inv,
  set,
  num,
}: {
  inv: Investment
  set: (patch: Partial<Investment>) => void
  num: (v: string) => number
}) {
  const fl = inv.familyLoan!
  const addRow = () =>
    set({
      familyLoan: {
        ...fl,
        repaymentSchedule: [
          ...fl.repaymentSchedule,
          { year: new Date().getFullYear() + fl.repaymentSchedule.length, amount: 0 },
        ],
      },
    })
  const updateRow = (i: number, patch: Partial<{ year: number; amount: number }>) =>
    set({
      familyLoan: {
        ...fl,
        repaymentSchedule: fl.repaymentSchedule.map((r, idx) => (idx === i ? { ...r, ...patch } : r)),
      },
    })
  const removeRow = (i: number) =>
    set({ familyLoan: { ...fl, repaymentSchedule: fl.repaymentSchedule.filter((_, idx) => idx !== i) } })

  const totalScheduled = fl.repaymentSchedule.reduce((s, r) => s + r.amount, 0)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="label mb-0">还款计划</span>
        <button className="btn-ghost text-sm text-brand-600" onClick={addRow}>+ 添加年度</button>
      </div>
      {fl.repaymentSchedule.map((r, i) => (
        <div key={i} className="flex items-center gap-2">
          <input className="input" type="number" value={r.year} onChange={(e) => updateRow(i, { year: num(e.target.value) })} />
          <input className="input" type="number" placeholder="金额" value={r.amount || ''} onChange={(e) => updateRow(i, { amount: num(e.target.value) })} />
          <button className="text-rose-500" onClick={() => removeRow(i)}>✕</button>
        </div>
      ))}
      <div className="text-xs text-slate-400">计划还款总额：{formatCurrency(totalScheduled)}（本金 {formatCurrency(fl.principalAmount)}）</div>
    </div>
  )
}
