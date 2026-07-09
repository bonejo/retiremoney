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
  { value: 'non_registered', label: 'Non-registered' },
  { value: 'RRSP', label: 'RRSP' },
  { value: 'GIC', label: 'GIC' },
  { value: 'savings', label: 'Savings' },
  { value: 'other', label: 'Other' },
]

const dividendOptions: { value: DividendType; label: string }[] = [
  { value: 'eligible', label: 'Eligible dividends' },
  { value: 'non_eligible', label: 'Non-eligible' },
  { value: 'none', label: 'None' },
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
          <span className="label">Account type</span>
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
          <FormInput label="Institution" value={inv.institutionName} onChange={(v) => set({ institutionName: v })} placeholder="TD Bank" />
          <FormInput label="Account nickname" value={inv.accountName} onChange={(v) => set({ accountName: v })} placeholder="e.g. Growth ETF" />
        </div>

        <div>
          <span className="label">Currency</span>
          <div className="grid grid-cols-2 gap-2">
            {(['CAD', 'USD'] as const).map((c) => (
              <button
                key={c}
                className={`btn ${(inv.currency ?? 'CAD') === c ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => set({ currency: c })}
              >
                {c === 'CAD' ? 'CAD' : 'USD'}
              </button>
            ))}
          </div>
          {inv.currency === 'USD' && (
            <p className="mt-1 text-xs text-slate-400">
              Enter amounts in USD; converted at 1 USD = {usdCadRate().toFixed(2)} CAD (change the rate in Settings).
            </p>
          )}
        </div>

        {!historical && (
          <FormInput label={inv.currency === 'USD' ? 'Current balance (USD)' : 'Current balance'} type="number" prefix={inv.currency === 'USD' ? 'US$' : '$'} value={inv.currentBalance || ''} onChange={(v) => set({ currentBalance: num(v) })} />
        )}
        <SliderInput label="Expected total return /yr" value={inv.annualReturnRate} onChange={(v) => set({ annualReturnRate: v })} max={0.12} />

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
            Project current balance from a past investment
          </label>
          {historical && (
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <FormInput label="Investment start month" type="month" value={inv.startDate ?? ''} onChange={(v) => set({ startDate: v || undefined })} />
                <FormInput label="Initial amount" type="number" prefix={inv.currency === 'USD' ? 'US$' : '$'} value={inv.startValue ?? ''} onChange={(v) => set({ startValue: num(v) })} />
              </div>
              <div className="rounded-lg bg-brand-50 p-3 text-sm text-brand-700">
                Compounded at {(inv.annualReturnRate * 100).toFixed(2)}%/yr to today, current balance ≈{' '}
                <span className="font-semibold">{formatCurrency(currentInvestmentValue(inv))}</span>
                {inv.currency === 'USD' && <span className="ml-1 text-xs text-brand-500">(converted to CAD)</span>}
                <span className="ml-1 text-xs text-brand-500">(excludes later contributions — enter the current balance directly for those)</span>
              </div>
            </div>
          )}
        </div>

        {inv.type === 'TFSA' && (
          <div className="space-y-3 rounded-lg bg-emerald-50 p-3">
            <p className="text-xs text-emerald-700">TFSA growth is fully tax-free and excluded from the GIS income test.</p>
            <div className="grid grid-cols-2 gap-3">
              <FormInput label="Remaining room" type="number" prefix="$" value={inv.tfsa?.contributionRoom ?? ''} onChange={(v) => set({ tfsa: { annualNewRoom: inv.tfsa?.annualNewRoom ?? 7000, contributionRoom: num(v) } })} />
              <FormInput label="New room per year" type="number" prefix="$" value={inv.tfsa?.annualNewRoom ?? 7000} onChange={(v) => set({ tfsa: { contributionRoom: inv.tfsa?.contributionRoom ?? 0, annualNewRoom: num(v) } })} />
            </div>
          </div>
        )}

        {inv.type === 'non_registered' && (
          <div className="space-y-3">
            <FormInput label="Cost basis (ACB)" type="number" prefix="$" value={inv.acb ?? ''} onChange={(v) => set({ acb: num(v) })} />
            <div className="rounded-lg bg-slate-50 p-3">
              <SliderInput
                label="Of which dividend yield"
                value={inv.dividendYield ?? 0}
                onChange={(v) => set({ dividendYield: Math.min(v, inv.annualReturnRate) })}
                max={inv.annualReturnRate}
                step={0.0025}
              />
              <p className="mt-2 text-xs text-slate-500">
                Dividends are paid out and taxed each year; the remaining{' '}
                <span className="font-medium text-slate-700">
                  {((inv.annualReturnRate - (inv.dividendYield ?? 0)) * 100).toFixed(2)}%
                </span>{' '}
                is capital growth, untaxed until sold.
              </p>
            </div>
            <div>
              <span className="label">Dividend type</span>
              <div className="grid grid-cols-3 gap-2">
                {dividendOptions.map((o) => (
                  <button key={o.value} className={`btn ${inv.dividendType === o.value ? 'btn-primary' : 'btn-secondary'}`} onClick={() => set({ dividendType: o.value })}>
                    {o.label}
                  </button>
                ))}
              </div>
              {inv.dividendType === 'eligible' && (
                <p className="mt-1 text-xs text-amber-600">Eligible dividends are grossed-up ×1.38 into net income, which can affect GIS.</p>
              )}
              {inv.dividendType === 'none' && (
                <p className="mt-1 text-xs text-emerald-600">No dividends (pure growth ETF) is best for GIS optimization.</p>
              )}
            </div>
          </div>
        )}

        {inv.type === 'GIC' && (
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Maturity date" type="date" value={inv.gic?.maturityDate ?? ''} onChange={(v) => set({ gic: { interestRate: inv.gic?.interestRate ?? inv.annualReturnRate, isCompound: inv.gic?.isCompound ?? true, maturityDate: v } })} />
            <FormInput label="Interest rate" type="number" step="0.001" value={inv.gic?.interestRate ?? inv.annualReturnRate} onChange={(v) => set({ gic: { maturityDate: inv.gic?.maturityDate ?? '', isCompound: inv.gic?.isCompound ?? true, interestRate: num(v) } })} />
          </div>
        )}

        {!isFamilyLoan && (
          <div>
            <span className="label">Withdrawal priority (order used to fund expenses)</span>
            <select
              className="input"
              value={inv.withdrawalPriority ?? 0}
              onChange={(e) => set({ withdrawalPriority: Number(e.target.value) })}
            >
              <option value={0}>Not used for withdrawals</option>
              <option value={1}>1 — first</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4 — last</option>
            </select>
            <p className="mt-1 text-xs text-slate-400">
              When a year's cash income can't cover expenses, accounts are drawn in this order. Non-registered withdrawals tax only 50% of the capital gain; TFSA is tax-free; RRSP is fully taxable.
            </p>
          </div>
        )}

        <div className="rounded-lg border border-slate-200 p-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isFamilyLoan} onChange={(e) => toggleFamilyLoan(e.target.checked)} />
            This is a family loan (money lent out)
          </label>
          {isFamilyLoan && inv.familyLoan && (
            <div className="mt-3 space-y-3">
              <FormInput label="Borrower name" value={inv.familyLoan.borrowerName} onChange={(v) => set({ familyLoan: { ...inv.familyLoan!, borrowerName: v } })} />
              <FormInput label="Amount lent" type="number" prefix="$" value={inv.familyLoan.principalAmount || ''} onChange={(v) => set({ familyLoan: { ...inv.familyLoan!, principalAmount: num(v) } })} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={inv.familyLoan.isInterestFree} onChange={(e) => set({ familyLoan: { ...inv.familyLoan!, isInterestFree: e.target.checked } })} />
                Interest-free (principal repayment is not income)
              </label>
              <RepaymentEditor inv={inv} set={set} num={num} />
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-2 border-t border-slate-200 pt-4">
        <button className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn-primary" onClick={() => onSave(inv)}>Save</button>
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
        <span className="label mb-0">Repayment schedule</span>
        <button className="btn-ghost text-sm text-brand-600" onClick={addRow}>+ Add year</button>
      </div>
      {fl.repaymentSchedule.map((r, i) => (
        <div key={i} className="flex items-center gap-2">
          <input className="input" type="number" value={r.year} onChange={(e) => updateRow(i, { year: num(e.target.value) })} />
          <input className="input" type="number" placeholder="Amount" value={r.amount || ''} onChange={(e) => updateRow(i, { amount: num(e.target.value) })} />
          <button className="text-rose-500" onClick={() => removeRow(i)}>✕</button>
        </div>
      ))}
      <div className="text-xs text-slate-400">Total scheduled repayment: {formatCurrency(totalScheduled)} (principal {formatCurrency(fl.principalAmount)})</div>
    </div>
  )
}
