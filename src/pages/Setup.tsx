import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfileStore } from '../store/profileStore'
import FormInput from '../components/common/FormInput'
import type { MaritalStatus, ProvinceCode } from '../types'
import { ageFromDOB } from '../utils/format'
import { oasResidenceFraction } from '../utils/gisCalc'
import { PROVINCE_LIST } from '../constants/provinces'
import { useT } from '../i18n'

const maritalOptions: { value: MaritalStatus; label: string }[] = [
  { value: 'single', label: 'Single' },
  { value: 'married', label: 'Married' },
  { value: 'divorced', label: 'Divorced' },
  { value: 'widowed', label: 'Widowed' },
]

export default function Setup() {
  const t = useT()
  const navigate = useNavigate()
  const createProfile = useProfileStore((s) => s.createProfile)

  const [step, setStep] = useState(1)

  const [name, setName] = useState('')
  const [dob, setDob] = useState('')
  const [city, setCity] = useState('Richmond, BC')
  const [province, setProvince] = useState<ProvinceCode>('BC')
  const [marital, setMarital] = useState<MaritalStatus>('married')
  const [arrivalYear, setArrivalYear] = useState('') // blank = born in Canada / full OAS

  const age = dob ? ageFromDOB(dob) : null
  const canProceed = name.trim() !== '' && dob !== '' && city.trim() !== ''
  const oasFraction = dob
    ? oasResidenceFraction(dob, arrivalYear ? Number(arrivalYear) : undefined)
    : 1

  // Save the basic profile, then either go straight to the app or the wizard.
  function createAndGo(destination: '/dashboard' | '/wizard') {
    createProfile({
      name: name.trim(),
      dateOfBirth: dob,
      city: city.trim(),
      province,
      maritalStatus: marital,
      canadaArrivalYear: arrivalYear ? Number(arrivalYear) : undefined,
    })
    navigate(destination)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-10">
      <div className="card w-full max-w-lg p-8">
        <div className="mb-6 flex items-center gap-2">
          {[1, 2].map((s) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= step ? 'bg-brand-600' : 'bg-slate-200'}`} />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">{t('Basic Info')}</h2>
              <p className="text-sm text-slate-400">Step 1 / 2</p>
            </div>
            <FormInput label="Name" value={name} onChange={setName} placeholder="e.g. John Smith" />
            <div>
              <FormInput label="Date of Birth" type="date" value={dob} onChange={setDob} />
              {age !== null && <p className="mt-1 text-xs text-slate-400">{t('Current age: {n}', { n: age })}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormInput label="City" value={city} onChange={setCity} />
              <div>
                <span className="label">{t('Province')}</span>
                <select className="input" value={province} onChange={(e) => setProvince(e.target.value as ProvinceCode)}>
                  {PROVINCE_LIST.map((p) => (
                    <option key={p.code} value={p.code}>{t(p.name)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <FormInput
                label="Year you immigrated to Canada (leave blank if born in Canada)"
                type="number"
                value={arrivalYear}
                onChange={setArrivalYear}
                placeholder="e.g. 1995"
              />
              {arrivalYear && dob && (
                <p className={`mt-1 text-xs ${oasFraction === 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                  {oasFraction === 0
                    ? t('Under 10 years of residence — not yet OAS-eligible at 65')
                    : t('OAS prorated by residence: {a}/40 years → {b}% of full amount', {
                        a: Math.round(oasFraction * 40),
                        b: (oasFraction * 100).toFixed(0),
                      })}
                </p>
              )}
            </div>
            <div>
              <span className="label">{t('Marital Status')}</span>
              <div className="grid grid-cols-4 gap-2">
                {maritalOptions.map((o) => (
                  <button
                    key={o.value}
                    className={`btn ${marital === o.value ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setMarital(o.value)}
                  >
                    {t(o.label)}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-slate-50 px-3 py-2 text-center text-xs text-slate-500">
              🔒 {t('Your information is saved only on this device and is never uploaded to any server.')}
            </div>

            <div className="flex justify-end pt-1">
              <button className="btn-primary" disabled={!canProceed} onClick={() => setStep(2)}>
                {t('Next')}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">{t('How would you like to start?')}</h2>
              <p className="text-sm text-slate-400">Step 2 / 2</p>
            </div>

            <button
              className="w-full rounded-xl border-2 border-brand-500 bg-brand-50 p-4 text-left transition hover:bg-brand-100"
              onClick={() => createAndGo('/wizard')}
            >
              <div className="font-semibold text-brand-700">📋 {t('Financial questionnaire')}</div>
              <div className="mt-1 text-sm text-slate-500">
                {t('~3 minutes: step through property, mortgage, income and investments')}
              </div>
            </button>

            <button
              className="w-full rounded-xl border-2 border-slate-200 p-4 text-left transition hover:border-brand-300"
              onClick={() => createAndGo('/dashboard')}
            >
              <div className="font-semibold text-slate-700">🚀 {t('Go straight to the app')}</div>
              <div className="mt-1 text-sm text-slate-500">
                {t('You can fill this in anytime later via "Questionnaire" in the sidebar')}
              </div>
            </button>

            <div className="flex justify-start pt-1">
              <button className="btn-ghost" onClick={() => setStep(1)}>{t('Back')}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
