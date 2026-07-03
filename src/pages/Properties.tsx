import { useState } from 'react'
import { Page } from '../components/layout/Layout'
import Drawer from '../components/common/Drawer'
import Badge from '../components/common/Badge'
import PropertyForm from '../components/property/PropertyForm'
import { usePropertyStore, emptyProperty } from '../store/propertyStore'
import { useExpenseStore } from '../store/expenseStore'
import type { Property } from '../types'
import { formatCurrency } from '../utils/format'
import { computePropertyTax, propertyEquity, rentalSummary, propertyAnnualBalance } from '../utils/propertyCalc'
import { PROPERTY_TYPE_LABELS } from '../constants/bcTaxRates2026'

export default function Properties() {
  const { properties, addProperty, updateProperty, removeProperty } = usePropertyStore()
  const expenses = useExpenseStore((s) => s.expenses)
  const [editing, setEditing] = useState<Property | null>(null)
  const [isNew, setIsNew] = useState(false)

  function openNew() {
    setEditing(emptyProperty())
    setIsNew(true)
  }
  function openEdit(p: Property) {
    setEditing(p)
    setIsNew(false)
  }
  function save(p: Property) {
    if (isNew) addProperty(p)
    else updateProperty(p.id, p)
    setEditing(null)
  }

  return (
    <Page
      title="房产管理"
      action={<button className="btn-primary" onClick={openNew}>+ 添加房产</button>}
    >
      {properties.length > 1 && (() => {
        const totals = properties.map((p) =>
          propertyAnnualBalance(p, expenses.filter((e) => e.propertyId === p.id)),
        )
        const income = totals.reduce((s, b) => s + b.rentalIncome, 0)
        const outgo = totals.reduce((s, b) => s + b.totalExpenses, 0)
        const net = income - outgo
        return (
          <div className="card mb-4 flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <span className="text-sm text-slate-500">全部房产年度收支合计</span>
              <div className={`text-2xl font-semibold ${net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {net < 0 ? '−' : '+'}{formatCurrency(Math.abs(net))}/年
              </div>
            </div>
            <div className="text-right text-sm text-slate-500">
              <div>租金收入 <span className="font-medium text-emerald-600">+{formatCurrency(income)}</span></div>
              <div>持有成本 <span className="font-medium text-rose-500">−{formatCurrency(outgo)}</span></div>
            </div>
          </div>
        )
      })()}

      {properties.length === 0 ? (
        <div className="card p-10 text-center text-slate-400">
          还没有房产。点击右上角「添加房产」开始。
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {properties.map((p) => {
            const rental = rentalSummary(p)
            const assigned = expenses.filter((e) => e.propertyId === p.id)
            const balance = propertyAnnualBalance(p, assigned)
            return (
              <div key={p.id} className="card p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">{p.name || '未命名'}</h3>
                      <Badge color={p.type === 'primary_residence' ? 'blue' : 'green'}>
                        {PROPERTY_TYPE_LABELS[p.type]}
                      </Badge>
                    </div>
                    <div className="mt-1 text-sm text-slate-400">
                      购于 {p.purchaseYear} · ACB {formatCurrency(p.purchasePrice)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-semibold">{formatCurrency(p.currentValue)}</div>
                    <div className="text-xs text-slate-400">净值 {formatCurrency(propertyEquity(p))}</div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <Stat label="年地税" value={formatCurrency(computePropertyTax(p))} />
                  {p.mortgage?.hasMortgage && (
                    <Stat label="月供" value={formatCurrency(p.mortgage.monthlyPayment)} />
                  )}
                  {rental.netAnnualRent > 0 && (
                    <Stat label="年净租金" value={formatCurrency(rental.netAnnualRent)} accent />
                  )}
                  {p.strataFee != null && (
                    <Stat label="月物业费" value={formatCurrency(p.strataFee)} />
                  )}
                </div>

                <div className="mt-4 rounded-lg border border-slate-200 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">年度收支平衡</span>
                    <span className={`text-sm font-semibold ${balance.net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {balance.net < 0 ? '−' : ''}{formatCurrency(Math.abs(balance.net))}/年
                    </span>
                  </div>
                  <div className="space-y-0.5 text-xs text-slate-500">
                    {balance.rentalIncome > 0 && <BalRow label="租金收入" value={balance.rentalIncome} />}
                    {balance.mortgagePayment > 0 && <BalRow label="Mortgage月供" value={-balance.mortgagePayment} />}
                    {balance.locInterest > 0 && <BalRow label="LOC利息" value={-balance.locInterest} />}
                    <BalRow label="地税" value={-balance.propertyTax} />
                    {balance.strata > 0 && <BalRow label="物业费" value={-balance.strata} />}
                    {balance.insurance > 0 && <BalRow label="保险" value={-balance.insurance} />}
                    {balance.managementFee > 0 && <BalRow label="管理费" value={-balance.managementFee} />}
                    {balance.assignedExpenses > 0 && (
                      <BalRow label={`归属支出 (${assigned.length}项)`} value={-balance.assignedExpenses} />
                    )}
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button className="btn-secondary flex-1" onClick={() => openEdit(p)}>编辑</button>
                  <button
                    className="btn-ghost text-rose-500"
                    onClick={() => confirm('确定删除该房产？') && removeProperty(p.id)}
                  >
                    删除
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Drawer
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={isNew ? '添加房产' : '编辑房产'}
      >
        {editing && (
          <PropertyForm initial={editing} onSave={save} onCancel={() => setEditing(null)} />
        )}
      </Drawer>
    </Page>
  )
}

function BalRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span className={value < 0 ? 'text-rose-500' : 'text-emerald-600'}>
        {value < 0 ? '−' : '+'}{formatCurrency(Math.abs(value))}
      </span>
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <div className="text-xs text-slate-400">{label}</div>
      <div className={`font-medium ${accent ? 'text-emerald-600' : 'text-slate-900'}`}>{value}</div>
    </div>
  )
}
