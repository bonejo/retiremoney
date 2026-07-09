import { Page } from '../components/layout/Layout'
import FormInput from '../components/common/FormInput'
import { useAssumptionsStore } from '../store/assumptionsStore'
import { useProfileStore } from '../store/profileStore'
import { usePropertyStore } from '../store/propertyStore'
import { useInvestmentStore } from '../store/investmentStore'
import { useExpenseStore } from '../store/expenseStore'
import { useNavigate } from 'react-router-dom'
import type { Profile, ProvinceCode } from '../types'
import { PROVINCE_LIST } from '../constants/provinces'
import { useDataFileStore } from '../store/dataFileStore'
import { useT } from '../i18n'

// Keys used by the persist middleware; exported/cleared together.
const STORAGE_KEYS = ['rp-profile', 'rp-properties', 'rp-investments', 'rp-expenses', 'rp-assumptions']

export default function Settings() {
  const t = useT()
  const navigate = useNavigate()
  const { assumptions, update, reset } = useAssumptionsStore()
  const profile = useProfileStore((s) => s.profile)
  const updateProfile = useProfileStore((s) => s.updateProfile)

  const setInflation = (k: keyof typeof assumptions.inflationRates, v: number) =>
    update({ inflationRates: { ...assumptions.inflationRates, [k]: v } })
  const setTax = (k: keyof typeof assumptions.taxRates, v: number) =>
    update({ taxRates: { ...assumptions.taxRates, [k]: v } })
  const setBenefit = (k: keyof typeof assumptions.governmentBenefits, v: number) =>
    update({ governmentBenefits: { ...assumptions.governmentBenefits, [k]: v } })

  const num = (v: string) => (v === '' ? 0 : Number(v))

  function exportData() {
    const dump: Record<string, unknown> = {}
    for (const k of STORAGE_KEYS) {
      const raw = localStorage.getItem(k)
      if (raw) dump[k] = JSON.parse(raw)
    }
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `retirement-plan-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function importData(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result))
        for (const k of STORAGE_KEYS) {
          if (parsed[k]) localStorage.setItem(k, JSON.stringify(parsed[k]))
        }
        location.reload()
      } catch {
        alert('Import failed: invalid file format')
      }
    }
    reader.readAsText(file)
  }

  function clearAll() {
    if (!confirm('Clear all data? This cannot be undone.')) return
    for (const k of STORAGE_KEYS) localStorage.removeItem(k)
    location.href = '/'
  }

  return (
    <Page title="Settings">
      <div className="grid gap-6 lg:grid-cols-2">
        {profile && (
          <Section title="Profile & Province">
            <p className="-mt-2 mb-1 text-xs text-emerald-600">{t('✓ Changes save automatically')}</p>
            <div className="grid grid-cols-2 gap-3">
              <FormInput label="Name" value={profile.name} onChange={(v) => updateProfile({ name: v })} />
              <FormInput label="Date of Birth" type="date" value={profile.dateOfBirth} onChange={(v) => updateProfile({ dateOfBirth: v })} />
            </div>
            <FormInput label="City" value={profile.city} onChange={(v) => updateProfile({ city: v })} />
            <div>
              <span className="label">{t('Marital Status')}</span>
              <select
                className="input"
                value={profile.maritalStatus}
                onChange={(e) => updateProfile({ maritalStatus: e.target.value as Profile['maritalStatus'] })}
              >
                <option value="single">{t('Single')}</option>
                <option value="married">{t('Married')}</option>
                <option value="divorced">{t('Divorced')}</option>
                <option value="widowed">{t('Widowed')}</option>
              </select>
            </div>
            <div>
              <span className="label">{t('Province (affects provincial tax & probate)')}</span>
              <select
                className="input"
                value={profile.province}
                onChange={(e) => updateProfile({ province: e.target.value as ProvinceCode })}
              >
                {PROVINCE_LIST.map((p) => (
                  <option key={p.code} value={p.code}>{t(p.name)}</option>
                ))}
              </select>
            </div>
            <FormInput
              label="Year you immigrated to Canada (leave blank if born in Canada)"
              type="number"
              value={profile.canadaArrivalYear ?? ''}
              onChange={(v) => updateProfile({ canadaArrivalYear: v ? Number(v) : undefined })}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormInput
                label="Annual work income"
                type="number"
                prefix="$"
                value={profile.employmentIncomeAnnual ?? ''}
                onChange={(v) => updateProfile({ employmentIncomeAnnual: v ? Number(v) : undefined })}
              />
              <FormInput
                label="Planned retirement age"
                type="number"
                value={profile.retirementAge ?? ''}
                onChange={(v) => updateProfile({ retirementAge: v ? Number(v) : undefined })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormInput
                label="CPP est. monthly at 65"
                type="number"
                prefix="$"
                value={profile.cpp?.monthlyAt65 ?? ''}
                onChange={(v) =>
                  updateProfile({
                    cpp: Number(v) > 0
                      ? { monthlyAt65: Number(v), startAge: profile.cpp?.startAge ?? 65 }
                      : undefined,
                  })
                }
              />
              <FormInput
                label="CPP start age (60–70)"
                type="number"
                value={profile.cpp?.startAge ?? 65}
                onChange={(v) =>
                  profile.cpp &&
                  updateProfile({ cpp: { ...profile.cpp, startAge: Number(v) || 65 } })
                }
              />
            </div>
          </Section>
        )}

        <Section title="Inflation">
          <PercentRow label="Living-cost inflation" value={assumptions.inflationRates.living} onChange={(v) => setInflation('living', v)} />
          <PercentRow label="Property/tax inflation" value={assumptions.inflationRates.property} onChange={(v) => setInflation('property', v)} />
          <PercentRow label="Healthcare inflation" value={assumptions.inflationRates.healthcare} onChange={(v) => setInflation('healthcare', v)} />
          <PercentRow label="Benefit growth rate" value={assumptions.inflationRates.governmentBenefits} onChange={(v) => setInflation('governmentBenefits', v)} />
        </Section>

        <Section title="Tax Rates">
          <PercentRow label="Marginal tax rate" value={assumptions.taxRates.marginalTaxRate} onChange={(v) => setTax('marginalTaxRate', v)} />
          <PercentRow label="Capital-gains effective rate" value={assumptions.taxRates.capitalGainsTaxRate} onChange={(v) => setTax('capitalGainsTaxRate', v)} />
          <PercentRow label="DTC credit rate" value={assumptions.taxRates.dtcRate} onChange={(v) => setTax('dtcRate', v)} />
        </Section>

        <Section title="Exchange Rate">
          <FormInput
            label="USD rate (1 USD = ? CAD)"
            type="number"
            step="0.01"
            value={assumptions.exchangeRates?.usdCad ?? 1.35}
            onChange={(v) => update({ exchangeRates: { usdCad: num(v) } })}
          />
          <p className="text-xs text-slate-400">USD accounts are converted to CAD at this rate in all calculations.</p>
        </Section>

        <Section title="Government Benefits (2026)">
          <FormInput label="OAS monthly (65–74)" type="number" prefix="$" value={assumptions.governmentBenefits.oasMonthly6574} onChange={(v) => setBenefit('oasMonthly6574', num(v))} />
          <FormInput label="OAS monthly (75+)" type="number" prefix="$" value={assumptions.governmentBenefits.oasMonthly75plus} onChange={(v) => setBenefit('oasMonthly75plus', num(v))} />
          <FormInput label="GIS max annual (single)" type="number" prefix="$" value={assumptions.governmentBenefits.gisMaxAnnual} onChange={(v) => setBenefit('gisMaxAnnual', num(v))} />
          <FormInput label="TFSA new room per year" type="number" prefix="$" value={assumptions.governmentBenefits.tfsa_annual_room} onChange={(v) => setBenefit('tfsa_annual_room', num(v))} />
        </Section>

        <Section title="Data File (recommended)">
          <DataFileSection />
        </Section>

        <Section title="Data Management">
          <div className="space-y-3">
            <button className="btn-secondary w-full" onClick={exportData}>{t('Export Data (JSON)')}</button>
            <label className="btn-secondary w-full cursor-pointer">
              {t('Import Data')}
              <input type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])} />
            </label>
            <button className="btn-secondary w-full" onClick={() => { reset(); }}>{t('Reset Default Assumptions')}</button>
            <button className="btn w-full bg-rose-50 text-rose-600 hover:bg-rose-100" onClick={clearAll}>{t('Clear All Data')}</button>
            <button className="btn-ghost w-full" onClick={() => navigate('/dashboard')}>{t('Back to Dashboard')}</button>
          </div>
        </Section>
      </div>
      <ProfileNote />
    </Page>
  )
}

// Single-file local storage: connect a JSON file that mirrors all app data.
function DataFileSection() {
  const t = useT()
  const { status, fileName, createNew, openExisting, reconnect, disconnect } = useDataFileStore()

  if (status === 'unsupported') {
    return (
      <p className="text-sm text-slate-400">
        {t('This browser does not support direct file access (Chrome/Edge required). Use "Export data" below instead.')}
      </p>
    )
  }
  return (
    <div className="space-y-3">
      {status === 'connected' ? (
        <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-sm">
          <span className="text-emerald-700">{t('✓ Connected: {name} (autosaving)', { name: fileName ?? '' })}</span>
          <button className="btn-ghost text-xs text-slate-500" onClick={() => void disconnect()}>{t('Disconnect')}</button>
        </div>
      ) : status === 'need-permission' ? (
        <button className="btn-primary w-full" onClick={() => void reconnect()}>
          {t('Reconnect "{name}"', { name: fileName ?? '' })}
        </button>
      ) : (
        <>
          <button className="btn-primary w-full" onClick={() => void createNew()}>{t('Create Data File')}</button>
          <button className="btn-secondary w-full" onClick={() => void openExisting()}>{t('Open Existing Data File')}</button>
        </>
      )}
      <p className="text-xs text-slate-400">
        {t('All data lives in a local JSON file of your choice and syncs automatically. Open the same file on another computer or browser to continue. Nothing is uploaded.')}
      </p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const t = useT()
  return (
    <div className="card p-5">
      <h3 className="mb-4 font-semibold">{t(title)}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function PercentRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <FormInput
      label={label}
      type="number"
      step="0.001"
      suffix="(decimal)"
      value={value}
      onChange={(v) => onChange(v === '' ? 0 : Number(v))}
    />
  )
}

function ProfileNote() {
  const profile = useProfileStore((s) => s.profile)
  const propCount = usePropertyStore((s) => s.properties.length)
  const invCount = useInvestmentStore((s) => s.investments.length)
  const expCount = useExpenseStore((s) => s.expenses.length)
  if (!profile) return null
  return (
    <p className="mt-6 text-xs text-slate-400">
      Profile: {profile.name} · {propCount} properties · {invCount} investments · {expCount} expenses.{' '}
      Your data stays on this device only. Clearing browser data will erase it.
    </p>
  )
}
