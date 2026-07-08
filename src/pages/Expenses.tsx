import { useState } from 'react'
import { Page } from '../components/layout/Layout'
import Drawer from '../components/common/Drawer'
import Badge from '../components/common/Badge'
import FormInput from '../components/common/FormInput'
import { useExpenseStore, emptyExpense } from '../store/expenseStore'
import { usePropertyStore } from '../store/propertyStore'
import type { Expense, ExpenseCategory, ExpenseFrequency } from '../types'
import { formatCurrency } from '../utils/format'
import { monthlyAmount, totalMonthlyExpenses } from '../utils/expenseCalc'
import { computePropertyTax } from '../utils/propertyCalc'
import { EXPENSE_CATEGORY_LABELS } from '../constants/bcTaxRates2026'
import { useT } from '../i18n'

const categories: ExpenseCategory[] = [
  'utilities', 'vehicle', 'food_dining', 'healthcare', 'travel',
  'insurance', 'phone_internet', 'entertainment', 'clothing', 'gifts_charity', 'other',
]

const freqLabels: Record<ExpenseFrequency, string> = {
  monthly: '每月',
  quarterly: '每季',
  annual: '每年',
  one_time: '一次性',
}

export default function Expenses() {
  const t = useT()
  const { expenses, addExpense, updateExpense, removeExpense } = useExpenseStore()
  const properties = usePropertyStore((s) => s.properties)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [isNew, setIsNew] = useState(false)

  // Property-derived expenses are read-only (imported from the property module).
  const propertyExpenses = properties.flatMap((p) => {
    const rows: { label: string; monthly: number }[] = []
    if (p.mortgage?.hasMortgage) rows.push({ label: `${p.name} · ${t('月供')}`, monthly: p.mortgage.monthlyPayment })
    const tax = computePropertyTax(p)
    if (tax > 0) rows.push({ label: `${p.name} · ${t('地税(月均)')}`, monthly: tax / 12 })
    if (p.strataFee) rows.push({ label: `${p.name} · ${t('物业费')}`, monthly: p.strataFee })
    if (p.insurance) rows.push({ label: `${p.name} · ${t('保险(月均)')}`, monthly: p.insurance / 12 })
    return rows
  })

  const propertyMonthly = propertyExpenses.reduce((s, r) => s + r.monthly, 0)
  const manualMonthly = totalMonthlyExpenses(expenses)
  const grandTotal = propertyMonthly + manualMonthly

  function save(e: Expense) {
    if (isNew) addExpense(e)
    else updateExpense(e.id, e)
    setEditing(null)
  }

  return (
    <Page
      title="支出管理"
      action={<button className="btn-primary" onClick={() => { setEditing(emptyExpense()); setIsNew(true) }}>{t('+ 添加支出')}</button>}
    >
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <div className="card p-4">
          <div className="text-sm text-slate-500">{t('月总固定支出')}</div>
          <div className="text-2xl font-semibold">{formatCurrency(grandTotal)}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-slate-500">{t('房产相关(自动)')}</div>
          <div className="text-2xl font-semibold text-slate-700">{formatCurrency(propertyMonthly)}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-slate-500">{t('年总支出')}</div>
          <div className="text-2xl font-semibold">{formatCurrency(grandTotal * 12)}</div>
        </div>
      </div>

      {propertyExpenses.length > 0 && (
        <div className="card mb-4 p-5">
          <h3 className="mb-3 font-semibold">🏠 {t('房产相关（自动导入，不可编辑）')}</h3>
          <div className="divide-y divide-slate-100">
            {propertyExpenses.map((r, i) => (
              <div key={i} className="flex items-center justify-between py-2 text-sm">
                <span className="text-slate-600">{r.label}</span>
                <span className="font-medium">{formatCurrency(r.monthly)}{t('/月')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card p-5">
        <h3 className="mb-3 font-semibold">📝 {t('其他支出')}</h3>
        {expenses.length === 0 ? (
          <p className="py-6 text-center text-slate-400">{t('还没有手动添加的支出。')}</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {expenses.map((e) => (
              <div key={e.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{e.name}</span>
                    <Badge color="gray">{t(EXPENSE_CATEGORY_LABELS[e.category])}</Badge>
                    {e.inflationLinked && <Badge color="blue">{t('通胀调整')}</Badge>}
                  </div>
                  <div className="text-xs text-slate-400">
                    {formatCurrency(e.amount)} · {t(freqLabels[e.frequency])}
                    {e.frequency !== 'monthly' && e.frequency !== 'one_time' && ` (≈${formatCurrency(monthlyAmount(e))}${t('/月')})`}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium">{formatCurrency(monthlyAmount(e))}{t('/月')}</span>
                  <button className="text-sm text-brand-600" onClick={() => { setEditing(e); setIsNew(false) }}>{t('编辑')}</button>
                  <button className="text-sm text-rose-500" onClick={() => removeExpense(e.id)}>{t('删除')}</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Drawer open={editing !== null} onClose={() => setEditing(null)} title={isNew ? t('添加支出') : t('编辑支出')}>
        {editing && (
          <ExpenseForm
            initial={editing}
            categories={categories}
            properties={properties.map((p) => ({ id: p.id, name: p.name }))}
            onSave={save}
            onCancel={() => setEditing(null)}
          />
        )}
      </Drawer>
    </Page>
  )
}

function ExpenseForm({
  initial,
  categories,
  properties,
  onSave,
  onCancel,
}: {
  initial: Expense
  categories: ExpenseCategory[]
  properties: { id: string; name: string }[]
  onSave: (e: Expense) => void
  onCancel: () => void
}) {
  const t = useT()
  const [e, setE] = useState<Expense>(initial)
  const set = (patch: Partial<Expense>) => setE((prev) => ({ ...prev, ...patch }))
  const num = (v: string) => (v === '' ? 0 : Number(v))

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4">
        <FormInput label="支出名称" value={e.name} onChange={(v) => set({ name: v })} placeholder="食品杂货" />
        <div>
          <span className="label">{t('分类')}</span>
          <select className="input" value={e.category} onChange={(ev) => set({ category: ev.target.value as ExpenseCategory })}>
            {categories.map((c) => (
              <option key={c} value={c}>{t(EXPENSE_CATEGORY_LABELS[c])}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormInput label="金额" type="number" prefix="$" value={e.amount || ''} onChange={(v) => set({ amount: num(v) })} />
          <div>
            <span className="label">{t('频率')}</span>
            <select className="input" value={e.frequency} onChange={(ev) => set({ frequency: ev.target.value as ExpenseFrequency })}>
              {(Object.keys(freqLabels) as ExpenseFrequency[]).map((f) => (
                <option key={f} value={f}>{t(freqLabels[f])}</option>
              ))}
            </select>
          </div>
        </div>
        {properties.length > 0 && (
          <div>
            <span className="label">{t('归属房产（可选）')}</span>
            <select
              className="input"
              value={e.propertyId ?? ''}
              onChange={(ev) => set({ propertyId: ev.target.value || undefined })}
            >
              <option value="">{t('不归属任何房产')}</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-400">{t('归属后可在房产页看到该房产的年度收支平衡。')}</p>
          </div>
        )}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={e.inflationLinked} onChange={(ev) => set({ inflationLinked: ev.target.checked })} />
          {t('跟随通胀增长')}
        </label>
        <div className="grid grid-cols-2 gap-3">
          <FormInput label="开始年龄(可选)" type="number" value={e.startAge ?? ''} onChange={(v) => set({ startAge: v === '' ? undefined : num(v) })} />
          <FormInput label="结束年龄(可选)" type="number" value={e.endAge ?? ''} onChange={(v) => set({ endAge: v === '' ? undefined : num(v) })} />
        </div>
        <FormInput label="备注" value={e.notes ?? ''} onChange={(v) => set({ notes: v })} />
      </div>
      <div className="mt-4 flex justify-end gap-2 border-t border-slate-200 pt-4">
        <button className="btn-secondary" onClick={onCancel}>{t('取消')}</button>
        <button className="btn-primary" onClick={() => onSave(e)} disabled={!e.name.trim()}>{t('保存')}</button>
      </div>
    </div>
  )
}
