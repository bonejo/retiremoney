import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfileStore } from '../store/profileStore'
import FormInput from '../components/common/FormInput'
import type { MaritalStatus, ProvinceCode } from '../types'
import { ageFromDOB } from '../utils/format'
import { oasResidenceFraction } from '../utils/gisCalc'
import { PROVINCE_LIST } from '../constants/provinces'
import { useT } from '../i18n'
import LangToggle from '../components/common/LangToggle'

const maritalOptions: { value: MaritalStatus; label: string }[] = [
  { value: 'single', label: '单身' },
  { value: 'married', label: '已婚' },
  { value: 'divorced', label: '离异' },
  { value: 'widowed', label: '丧偶' },
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
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
          <span className="text-sm text-slate-400">🌐 语言 / Language</span>
          <LangToggle />
        </div>
        <div className="mb-6 flex items-center gap-2">
          {[1, 2].map((s) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= step ? 'bg-brand-600' : 'bg-slate-200'}`} />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">{t('基本信息')}</h2>
              <p className="text-sm text-slate-400">Step 1 / 2</p>
            </div>
            <FormInput label="姓名" value={name} onChange={setName} placeholder="张三" />
            <div>
              <FormInput label="出生日期" type="date" value={dob} onChange={setDob} />
              {age !== null && <p className="mt-1 text-xs text-slate-400">{t('当前年龄：{n} 岁', { n: age })}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormInput label="居住城市" value={city} onChange={setCity} />
              <div>
                <span className="label">{t('省份')}</span>
                <select className="input" value={province} onChange={(e) => setProvince(e.target.value as ProvinceCode)}>
                  {PROVINCE_LIST.map((p) => (
                    <option key={p.code} value={p.code}>{t(p.name)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <FormInput
                label="移民来加年份（出生在加拿大请留空）"
                type="number"
                value={arrivalYear}
                onChange={setArrivalYear}
                placeholder="如 1995"
              />
              {arrivalYear && dob && (
                <p className={`mt-1 text-xs ${oasFraction === 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                  {oasFraction === 0
                    ? t('居住不满10年，65岁时暂不符合OAS资格')
                    : t('OAS 按居住年限折算：{a}/40 年 → 全额的 {b}%', {
                        a: Math.round(oasFraction * 40),
                        b: (oasFraction * 100).toFixed(0),
                      })}
                </p>
              )}
            </div>
            <div>
              <span className="label">{t('婚姻状态')}</span>
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
              🔒 {t('您填写的信息只保存在本设备，不会上传到任何服务器。')}
            </div>

            <div className="flex justify-end pt-1">
              <button className="btn-primary" disabled={!canProceed} onClick={() => setStep(2)}>
                {t('下一步')}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">{t('如何开始？')}</h2>
              <p className="text-sm text-slate-400">Step 2 / 2</p>
            </div>

            <button
              className="w-full rounded-xl border-2 border-brand-500 bg-brand-50 p-4 text-left transition hover:bg-brand-100"
              onClick={() => createAndGo('/wizard')}
            >
              <div className="font-semibold text-brand-700">📋 {t('填写财务问卷')}</div>
              <div className="mt-1 text-sm text-slate-500">
                {t('约3分钟，逐步录入房产、房贷、收入、投资')}
              </div>
            </button>

            <button
              className="w-full rounded-xl border-2 border-slate-200 p-4 text-left transition hover:border-brand-300"
              onClick={() => createAndGo('/dashboard')}
            >
              <div className="font-semibold text-slate-700">🚀 {t('直接进入网站')}</div>
              <div className="mt-1 text-sm text-slate-500">
                {t('稍后可随时在导航栏「财务问卷」补充信息')}
              </div>
            </button>

            <div className="flex justify-start pt-1">
              <button className="btn-ghost" onClick={() => setStep(1)}>{t('上一步')}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
