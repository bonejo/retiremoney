import { useState } from 'react'
import { Page } from '../components/layout/Layout'
import Drawer from '../components/common/Drawer'
import Badge from '../components/common/Badge'
import InvestmentForm from '../components/investment/InvestmentForm'
import { useInvestmentStore, emptyInvestment } from '../store/investmentStore'
import { useAssumptionsStore } from '../store/assumptionsStore'
import type { Investment } from '../types'
import { formatCurrency, formatPercent } from '../utils/format'
import { currentInvestmentValue, investmentACB, isHistoricalOrigin, nativeInvestmentValue } from '../utils/investmentCalc'
import { INVESTMENT_TYPE_LABELS } from '../constants/bcTaxRates2026'

const typeColor: Record<string, 'green' | 'blue' | 'yellow' | 'gray'> = {
  TFSA: 'green',
  non_registered: 'blue',
  GIC: 'yellow',
}

export default function Investments() {
  const { investments, addInvestment, updateInvestment, removeInvestment } = useInvestmentStore()
  const assumptions = useAssumptionsStore((s) => s.assumptions)
  const [editing, setEditing] = useState<Investment | null>(null)
  const [isNew, setIsNew] = useState(false)

  function openNew() {
    setEditing(emptyInvestment())
    setIsNew(true)
  }
  function save(i: Investment) {
    if (isNew) addInvestment(i)
    else updateInvestment(i.id, i)
    setEditing(null)
  }

  const total = investments
    .filter((i) => !i.familyLoan?.isFamilyLoan)
    .reduce((s, i) => s + currentInvestmentValue(i), 0)

  return (
    <Page
      title="投资账户"
      action={<button className="btn-primary" onClick={openNew}>+ 添加账户</button>}
    >
      {investments.length > 0 && (
        <div className="card mb-4 p-4">
          <span className="text-sm text-slate-500">投资账户总额</span>
          <div className="text-2xl font-semibold">{formatCurrency(total)}</div>
        </div>
      )}

      {investments.length === 0 ? (
        <div className="card p-10 text-center text-slate-400">还没有投资账户。</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {investments.map((i) => {
            const value = currentInvestmentValue(i)
            const acbCAD = investmentACB(i)
            const gain =
              i.type === 'non_registered' && acbCAD != null ? Math.max(0, value - acbCAD) : 0
            const gainTaxIfSold = gain * 0.5 * assumptions.taxRates.marginalTaxRate
            return (
            <div key={i.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge color={i.familyLoan?.isFamilyLoan ? 'yellow' : typeColor[i.type] ?? 'gray'}>
                      {i.familyLoan?.isFamilyLoan ? '家庭借款' : INVESTMENT_TYPE_LABELS[i.type]}
                    </Badge>
                    <h3 className="font-semibold">{i.accountName || i.institutionName || '未命名'}</h3>
                  </div>
                  <div className="mt-1 text-sm text-slate-400">
                    {i.familyLoan?.isFamilyLoan
                      ? `借给 ${i.familyLoan.borrowerName || '—'}`
                      : `${i.institutionName || '—'} · 回报 ${formatPercent(i.annualReturnRate)}`}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-semibold">
                    {formatCurrency(i.familyLoan?.isFamilyLoan ? i.familyLoan.principalAmount : value)}
                  </div>
                  {i.currency === 'USD' && (
                    <div className="text-xs text-slate-400">US${nativeInvestmentValue(i).toLocaleString('en-CA', { maximumFractionDigits: 0 })} 已按汇率折算</div>
                  )}
                  {isHistoricalOrigin(i) && <div className="text-xs text-slate-400">历史推算</div>}
                </div>
              </div>
              {i.type === 'non_registered' && acbCAD != null && (
                <div className="mt-3 rounded-lg border border-slate-200 p-3 text-xs text-slate-500">
                  <div className="flex justify-between py-0.5">
                    <span>原始成本 (ACB{i.currency === 'USD' ? '，已折算' : ''})</span>
                    <span>{formatCurrency(acbCAD)}</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span>未实现资本利得</span>
                    <span className="font-medium text-emerald-600">+{formatCurrency(gain)}</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span>若现在全部卖出预估税（50%×边际税率）</span>
                    <span className="font-medium text-rose-500">−{formatCurrency(gainTaxIfSold)}</span>
                  </div>
                  <p className="mt-1 text-slate-400">
                    利得仅在卖出时实现；分批取款可摊薄每年应税收入，详见「资产预测」。
                  </p>
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <button className="btn-secondary flex-1" onClick={() => { setEditing(i); setIsNew(false) }}>编辑</button>
                <button className="btn-ghost text-rose-500" onClick={() => confirm('确定删除该账户？') && removeInvestment(i.id)}>删除</button>
              </div>
            </div>
            )
          })}
        </div>
      )}

      <Drawer open={editing !== null} onClose={() => setEditing(null)} title={isNew ? '添加账户' : '编辑账户'}>
        {editing && <InvestmentForm initial={editing} onSave={save} onCancel={() => setEditing(null)} />}
      </Drawer>
    </Page>
  )
}
