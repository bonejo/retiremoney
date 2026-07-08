import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FormInput from '../components/common/FormInput'
import LangToggle from '../components/common/LangToggle'
import { useProfileStore } from '../store/profileStore'
import { usePropertyStore, emptyProperty } from '../store/propertyStore'
import { useInvestmentStore, emptyInvestment } from '../store/investmentStore'
import { useExpenseStore } from '../store/expenseStore'
import type { ExpenseCategory, InvestmentType } from '../types'
import { useT } from '../i18n'

const TOTAL = 5

// Guided financial questionnaire: property → mortgage → income → investments.
// Pre-fills from any existing data and updates in place, so it is safe to
// re-run from the nav bar without creating duplicates.
export default function Wizard() {
  const t = useT()
  const navigate = useNavigate()
  const properties = usePropertyStore((s) => s.properties)
  const { addProperty, updateProperty } = usePropertyStore()
  const investments = useInvestmentStore((s) => s.investments)
  const { addInvestment, updateInvestment } = useInvestmentStore()
  const expenses = useExpenseStore((s) => s.expenses)
  const { addExpense, updateExpense, removeExpense } = useExpenseStore()
  const profile = useProfileStore((s) => s.profile)
  const updateProfile = useProfileStore((s) => s.updateProfile)

  const home = properties.find((p) => p.type === 'primary_residence')
  const invByType = (ty: InvestmentType) =>
    investments.find((i) => i.type === ty && !i.familyLoan?.isFamilyLoan)

  const [step, setStep] = useState(1)

  // Property
  const [hasHome, setHasHome] = useState(!!home || properties.length === 0)
  const [homeName, setHomeName] = useState(home?.name ?? '')
  const [homeValue, setHomeValue] = useState(home ? String(home.currentValue || '') : '')
  const [purchasePrice, setPurchasePrice] = useState(home ? String(home.purchasePrice || '') : '')
  const [purchaseYear, setPurchaseYear] = useState(home ? String(home.purchaseYear || '') : '')

  // Mortgage
  const [hasMortgage, setHasMortgage] = useState(!!home?.mortgage?.hasMortgage)
  const [mortBalance, setMortBalance] = useState(home?.mortgage ? String(home.mortgage.balance || '') : '')
  const [mortAsOf, setMortAsOf] = useState(home?.mortgage?.balanceAsOf ?? '')
  const [mortPayment, setMortPayment] = useState(home?.mortgage ? String(home.mortgage.monthlyPayment || '') : '')
  const [mortRate, setMortRate] = useState(home?.mortgage ? String((home.mortgage.interestRate * 100).toFixed(2)) : '4.50')

  // Income
  const [workIncome, setWorkIncome] = useState(profile?.employmentIncomeAnnual ? String(profile.employmentIncomeAnnual) : '')
  const [retireAge, setRetireAge] = useState(profile?.retirementAge ? String(profile.retirementAge) : '65')
  const [cppAt65, setCppAt65] = useState(profile?.cpp ? String(profile.cpp.monthlyAt65) : '')
  const [cppStart, setCppStart] = useState(profile?.cpp ? String(profile.cpp.startAge) : '65')

  // Investments
  const [tfsa, setTfsa] = useState(() => { const i = invByType('TFSA'); return i ? String(i.currentBalance) : '' })
  const [rrsp, setRrsp] = useState(() => { const i = invByType('RRSP'); return i ? String(i.currentBalance) : '' })
  const [nonReg, setNonReg] = useState(() => { const i = invByType('non_registered'); return i ? String(i.currentBalance) : '' })
  const [nonRegAcb, setNonRegAcb] = useState(() => { const i = invByType('non_registered'); return i?.acb != null ? String(i.acb) : '' })

  // Expenses (wizard-owned, fixed ids so re-running updates in place)
  const [living, setLiving] = useState(() => { const e = expenses.find((x) => x.id === 'wiz-living'); return e ? String(e.amount) : '' })
  const [health, setHealth] = useState(() => { const e = expenses.find((x) => x.id === 'wiz-health'); return e ? String(e.amount) : '' })

  const priority: Record<string, number> = { non_registered: 1, TFSA: 2, RRSP: 3 }

  function upsertExpense(id: string, name: string, category: ExpenseCategory, amount: string) {
    const existing = expenses.find((x) => x.id === id)
    if (Number(amount) <= 0) {
      if (existing) removeExpense(id)
      return
    }
    const e = { id, name, category, amount: Number(amount), frequency: 'monthly' as const, inflationLinked: true }
    if (existing) updateExpense(id, e)
    else addExpense(e)
  }

  function upsertInvestment(type: InvestmentType, balance: string, acb?: string) {
    if (Number(balance) <= 0) return
    const existing = invByType(type)
    const inv = existing ? { ...existing } : emptyInvestment()
    inv.type = type
    inv.currentBalance = Number(balance)
    if (!inv.accountName) inv.accountName = type
    if (!inv.withdrawalPriority) inv.withdrawalPriority = priority[type] ?? 0
    if (type === 'non_registered') {
      inv.acb = Number(acb) || Number(balance)
      inv.dividendType = inv.dividendType ?? 'none'
    }
    if (existing) updateInvestment(existing.id, inv)
    else addInvestment(inv)
  }

  function finish() {
    // Property + mortgage
    if (hasHome && Number(homeValue) > 0) {
      const base = home ?? emptyProperty()
      const p = { ...base }
      p.name = homeName || t('自住房')
      p.type = 'primary_residence'
      p.currentValue = Number(homeValue)
      p.purchasePrice = Number(purchasePrice) || Number(homeValue)
      p.purchaseYear = Number(purchaseYear) || p.purchaseYear
      p.mortgage =
        hasMortgage && Number(mortBalance) > 0
          ? {
              hasMortgage: true,
              balance: Number(mortBalance),
              balanceAsOf: mortAsOf || undefined,
              monthlyPayment: Number(mortPayment) || 0,
              interestRate: (Number(mortRate) || 0) / 100,
              rateType: 'fixed',
              maturityDate: '',
              originalAmortization: 25,
            }
          : null
      if (home) updateProperty(home.id, p)
      else addProperty(p)
    }

    // Income → profile
    updateProfile({
      employmentIncomeAnnual: Number(workIncome) > 0 ? Number(workIncome) : undefined,
      retirementAge: Number(workIncome) > 0 ? Number(retireAge) || 65 : undefined,
      cpp: Number(cppAt65) > 0 ? { monthlyAt65: Number(cppAt65), startAge: Number(cppStart) || 65 } : undefined,
    })

    // Investments
    upsertInvestment('TFSA', tfsa)
    upsertInvestment('RRSP', rrsp)
    upsertInvestment('non_registered', nonReg, nonRegAcb)

    // Expenses
    upsertExpense('wiz-living', t('生活开支'), 'other', living)
    upsertExpense('wiz-health', t('医疗'), 'healthcare', health)

    navigate('/dashboard')
  }

  const stepTitle = [t('房产'), t('房贷'), t('收入'), t('投资'), t('支出')][step - 1]

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-10">
      <div className="card w-full max-w-lg p-8">
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
          <span className="text-sm font-medium text-slate-500">
            {t('财务问卷')} · {step}/{TOTAL} · {stepTitle}
          </span>
          <LangToggle />
        </div>
        <div className="mb-6 flex items-center gap-2">
          {Array.from({ length: TOTAL }, (_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full ${i < step ? 'bg-brand-600' : 'bg-slate-200'}`} />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">🏠 {t('房产')}</h2>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={hasHome} onChange={(e) => setHasHome(e.target.checked)} />
              {t('我拥有自住房')}
            </label>
            {hasHome && (
              <div className="space-y-3">
                <FormInput label="房产名称" value={homeName} onChange={setHomeName} placeholder="自住公寓" />
                <FormInput label="当前市值" type="number" prefix="$" value={homeValue} onChange={setHomeValue} placeholder="1200000" />
                <div className="grid grid-cols-2 gap-3">
                  <FormInput label="购买价格 (ACB)" type="number" prefix="$" value={purchasePrice} onChange={setPurchasePrice} />
                  <FormInput label="购买年份" type="number" value={purchaseYear} onChange={setPurchaseYear} placeholder="2015" />
                </div>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">🏦 {t('房贷')}</h2>
            {!hasHome ? (
              <p className="text-sm text-slate-400">{t('未填写房产，可跳过。')}</p>
            ) : (
              <>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={hasMortgage} onChange={(e) => setHasMortgage(e.target.checked)} />
                  {t('有房贷 (Mortgage)')}
                </label>
                {hasMortgage && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <FormInput label="剩余余额" type="number" prefix="$" value={mortBalance} onChange={setMortBalance} />
                      <FormInput label="余额记录月份" type="month" value={mortAsOf} onChange={setMortAsOf} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <FormInput label="月供" type="number" prefix="$" value={mortPayment} onChange={setMortPayment} />
                      <FormInput label="年利率 %" type="number" step="0.01" value={mortRate} onChange={setMortRate} />
                    </div>
                    <p className="text-xs text-slate-400">{t('填历史某月余额与月份，系统会自动推算到今天。')}</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">💵 {t('收入')}</h2>
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="mb-2 text-sm font-medium text-slate-700">{t('在职收入（可选）')}</div>
              <div className="grid grid-cols-2 gap-3">
                <FormInput label="年工作收入" type="number" prefix="$" value={workIncome} onChange={setWorkIncome} placeholder="80000" />
                <FormInput label="计划退休年龄" type="number" value={retireAge} onChange={setRetireAge} />
              </div>
              <p className="mt-1 text-xs text-slate-400">{t('退休前工作收入用于增长投资；到退休年龄后归零，转为从投资提取。')}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="mb-2 text-sm font-medium text-slate-700">{t('CPP 养老金（可选）')}</div>
              <div className="grid grid-cols-2 gap-3">
                <FormInput label="65岁预估月额" type="number" prefix="$" value={cppAt65} onChange={setCppAt65} placeholder="见My Service Canada" />
                <FormInput label="开始领取年龄 (60-70)" type="number" value={cppStart} onChange={setCppStart} />
              </div>
              <p className="mt-1 text-xs text-slate-400">{t('OAS 会根据年龄和居住年限自动计算。')}</p>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">📈 {t('投资')}</h2>
            <FormInput label="TFSA 余额" type="number" prefix="$" value={tfsa} onChange={setTfsa} placeholder="95000" />
            <FormInput label="RRSP 余额" type="number" prefix="$" value={rrsp} onChange={setRrsp} />
            <div className="grid grid-cols-2 gap-3">
              <FormInput label="非注册账户余额" type="number" prefix="$" value={nonReg} onChange={setNonReg} />
              <FormInput label="非注册原始成本 (ACB)" type="number" prefix="$" value={nonRegAcb} onChange={setNonRegAcb} />
            </div>
            <p className="text-xs text-slate-400">{t('可留空，之后在「投资账户」页添加更多账户（GIC、家庭借款等）。')}</p>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">🧾 {t('支出')}</h2>
            <FormInput label="每月生活开支" type="number" prefix="$" value={living} onChange={setLiving} placeholder="4000" />
            <FormInput label="每月医疗开支" type="number" prefix="$" value={health} onChange={setHealth} placeholder="300" />
            <p className="text-xs text-slate-400">{t('填每月大致金额即可；之后可在「支出管理」页细分（车辆、旅游、保险等）。')}</p>
          </div>
        )}

        <div className="mt-6 flex justify-between border-t border-slate-100 pt-4">
          <button
            className="btn-ghost"
            onClick={() => (step === 1 ? navigate('/dashboard') : setStep(step - 1))}
          >
            {step === 1 ? t('跳过') : t('上一步')}
          </button>
          {step < TOTAL ? (
            <button className="btn-primary" onClick={() => setStep(step + 1)}>{t('下一步')}</button>
          ) : (
            <button className="btn-primary" onClick={finish}>{t('完成')}</button>
          )}
        </div>
      </div>
    </div>
  )
}
