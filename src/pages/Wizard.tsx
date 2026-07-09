import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FormInput from '../components/common/FormInput'
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
      p.name = homeName || t('Home')
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
    upsertExpense('wiz-living', t('Living expenses'), 'other', living)
    upsertExpense('wiz-health', t('Healthcare'), 'healthcare', health)

    navigate('/dashboard')
  }

  const stepTitle = [t('Property'), t('Mortgage'), t('Income'), t('Investment'), t('Expenses')][step - 1]

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-10">
      <div className="card w-full max-w-lg p-8">
        <div className="mb-4 border-b border-slate-100 pb-3">
          <span className="text-sm font-medium text-slate-500">
            {t('Questionnaire')} · {step}/{TOTAL} · {stepTitle}
          </span>
        </div>
        <div className="mb-6 flex items-center gap-2">
          {Array.from({ length: TOTAL }, (_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full ${i < step ? 'bg-brand-600' : 'bg-slate-200'}`} />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">🏠 {t('Property')}</h2>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={hasHome} onChange={(e) => setHasHome(e.target.checked)} />
              {t('I own my home')}
            </label>
            {hasHome && (
              <div className="space-y-3">
                <FormInput label="Property name" value={homeName} onChange={setHomeName} placeholder="e.g. Condo" />
                <FormInput label="Current market value" type="number" prefix="$" value={homeValue} onChange={setHomeValue} placeholder="1200000" />
                <div className="grid grid-cols-2 gap-3">
                  <FormInput label="Purchase price (ACB)" type="number" prefix="$" value={purchasePrice} onChange={setPurchasePrice} />
                  <FormInput label="Purchase year" type="number" value={purchaseYear} onChange={setPurchaseYear} placeholder="2015" />
                </div>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">🏦 {t('Mortgage')}</h2>
            {!hasHome ? (
              <p className="text-sm text-slate-400">{t('No property entered — you can skip this.')}</p>
            ) : (
              <>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={hasMortgage} onChange={(e) => setHasMortgage(e.target.checked)} />
                  {t('I have a mortgage')}
                </label>
                {hasMortgage && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <FormInput label="Remaining balance" type="number" prefix="$" value={mortBalance} onChange={setMortBalance} />
                      <FormInput label="Balance as-of month" type="month" value={mortAsOf} onChange={setMortAsOf} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <FormInput label="Mortgage /mo" type="number" prefix="$" value={mortPayment} onChange={setMortPayment} />
                      <FormInput label="Interest rate %" type="number" step="0.01" value={mortRate} onChange={setMortRate} />
                    </div>
                    <p className="text-xs text-slate-400">{t('Enter a past balance and its month; the app projects it forward to today.')}</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">💵 {t('Income')}</h2>
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="mb-2 text-sm font-medium text-slate-700">{t('Employment Income (optional)')}</div>
              <div className="grid grid-cols-2 gap-3">
                <FormInput label="Annual work income" type="number" prefix="$" value={workIncome} onChange={setWorkIncome} placeholder="80000" />
                <FormInput label="Planned retirement age" type="number" value={retireAge} onChange={setRetireAge} />
              </div>
              <p className="mt-1 text-xs text-slate-400">{t('Work income grows your investments before retirement; at the retirement age it drops to $0 and you draw from investments.')}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="mb-2 text-sm font-medium text-slate-700">{t('CPP Pension (optional)')}</div>
              <div className="grid grid-cols-2 gap-3">
                <FormInput label="Est. monthly at 65" type="number" prefix="$" value={cppAt65} onChange={setCppAt65} placeholder="See My Service Canada" />
                <FormInput label="Start age (60–70)" type="number" value={cppStart} onChange={setCppStart} />
              </div>
              <p className="mt-1 text-xs text-slate-400">{t('OAS is calculated automatically from age and years of residence.')}</p>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">📈 {t('Investment')}</h2>
            <FormInput label="TFSA Balance" type="number" prefix="$" value={tfsa} onChange={setTfsa} placeholder="95000" />
            <FormInput label="RRSP balance" type="number" prefix="$" value={rrsp} onChange={setRrsp} />
            <div className="grid grid-cols-2 gap-3">
              <FormInput label="Non-registered balance" type="number" prefix="$" value={nonReg} onChange={setNonReg} />
              <FormInput label="Non-registered cost basis (ACB)" type="number" prefix="$" value={nonRegAcb} onChange={setNonRegAcb} />
            </div>
            <p className="text-xs text-slate-400">{t('Optional — add more accounts (GIC, family loans, etc.) later on the Investments page.')}</p>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">🧾 {t('Expenses')}</h2>
            <FormInput label="Monthly living expenses" type="number" prefix="$" value={living} onChange={setLiving} placeholder="4000" />
            <FormInput label="Monthly healthcare" type="number" prefix="$" value={health} onChange={setHealth} placeholder="300" />
            <p className="text-xs text-slate-400">{t('Rough monthly amounts are fine; itemize later on the Expenses page (vehicle, travel, insurance, etc.).')}</p>
          </div>
        )}

        <div className="mt-6 flex justify-between border-t border-slate-100 pt-4">
          <button
            className="btn-ghost"
            onClick={() => (step === 1 ? navigate('/dashboard') : setStep(step - 1))}
          >
            {step === 1 ? t('Skip') : t('Back')}
          </button>
          {step < TOTAL ? (
            <button className="btn-primary" onClick={() => setStep(step + 1)}>{t('Next')}</button>
          ) : (
            <button className="btn-primary" onClick={finish}>{t('Finish')}</button>
          )}
        </div>
      </div>
    </div>
  )
}
