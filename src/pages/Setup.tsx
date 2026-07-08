import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfileStore } from '../store/profileStore'
import { usePropertyStore, emptyProperty } from '../store/propertyStore'
import { useInvestmentStore, emptyInvestment } from '../store/investmentStore'
import FormInput from '../components/common/FormInput'
import type { MaritalStatus, ProvinceCode } from '../types'
import { ageFromDOB, formatCurrency } from '../utils/format'
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
  const addProperty = usePropertyStore((s) => s.addProperty)
  const addInvestment = useInvestmentStore((s) => s.addInvestment)

  const [step, setStep] = useState(1)

  // Step 1
  const [name, setName] = useState('')
  const [dob, setDob] = useState('')
  const [city, setCity] = useState('Richmond, BC')
  const [province, setProvince] = useState<ProvinceCode>('BC')
  const [marital, setMarital] = useState<MaritalStatus>('married')
  const [arrivalYear, setArrivalYear] = useState('') // blank = born in Canada / full OAS

  // Step 2 (quick assets + government pension, all optional)
  const [homeValue, setHomeValue] = useState('')
  const [tfsaBalance, setTfsaBalance] = useState('')
  const [cppAt65, setCppAt65] = useState('')
  const [cppStartAge, setCppStartAge] = useState('65')
  const [workIncome, setWorkIncome] = useState('')
  const [retireAge, setRetireAge] = useState('65')

  const age = dob ? ageFromDOB(dob) : null
  const canProceed = name.trim() !== '' && dob !== '' && city.trim() !== ''
  const oasFraction = dob
    ? oasResidenceFraction(dob, arrivalYear ? Number(arrivalYear) : undefined)
    : 1

  function finish() {
    createProfile({
      name: name.trim(),
      dateOfBirth: dob,
      city: city.trim(),
      province,
      maritalStatus: marital,
      canadaArrivalYear: arrivalYear ? Number(arrivalYear) : undefined,
      cpp: Number(cppAt65) > 0
        ? { monthlyAt65: Number(cppAt65), startAge: Number(cppStartAge) || 65 }
        : undefined,
      employmentIncomeAnnual: Number(workIncome) > 0 ? Number(workIncome) : undefined,
      retirementAge: Number(workIncome) > 0 ? Number(retireAge) || 65 : undefined,
    })
    if (Number(homeValue) > 0) {
      const p = emptyProperty()
      p.name = t('自住房')
      p.type = 'primary_residence'
      p.currentValue = Number(homeValue)
      p.purchasePrice = Number(homeValue)
      addProperty(p)
    }
    if (Number(tfsaBalance) > 0) {
      const inv = emptyInvestment()
      inv.type = 'TFSA'
      inv.accountName = 'TFSA'
      inv.currentBalance = Number(tfsaBalance)
      addInvestment(inv)
    }
    navigate('/dashboard')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-10">
      <div className="card w-full max-w-lg p-8">
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
          <span className="text-sm text-slate-400">🌐 语言 / Language</span>
          <LangToggle />
        </div>
        <div className="mb-6 flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full ${
                s <= step ? 'bg-brand-600' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">{t('基本信息')}</h2>
              <p className="text-sm text-slate-400">Step 1 / 3</p>
            </div>
            <FormInput label="姓名" value={name} onChange={setName} placeholder="张三" />
            <div>
              <FormInput label="出生日期" type="date" value={dob} onChange={setDob} />
              {age !== null && (
                <p className="mt-1 text-xs text-slate-400">{t('当前年龄：{n} 岁', { n: age })}</p>
              )}
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
                    className={`btn ${
                      marital === o.value ? 'btn-primary' : 'btn-secondary'
                    }`}
                    onClick={() => setMarital(o.value)}
                  >
                    {t(o.label)}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                className="btn-primary"
                disabled={!canProceed}
                onClick={() => setStep(2)}
              >
                {t('下一步')}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">{t('快速添加主要资产')}</h2>
              <p className="text-sm text-slate-400">Step 2 / 3 · {t('可跳过，之后再补充')}</p>
            </div>
            <FormInput
              label="自住房当前市值"
              type="number"
              prefix="$"
              value={homeValue}
              onChange={setHomeValue}
              placeholder="1200000"
            />
            <FormInput
              label="TFSA 余额"
              type="number"
              prefix="$"
              value={tfsaBalance}
              onChange={setTfsaBalance}
              placeholder="95000"
            />
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
                <FormInput
                  label="65岁预估月额"
                  type="number"
                  prefix="$"
                  value={cppAt65}
                  onChange={setCppAt65}
                  placeholder="见My Service Canada"
                />
                <FormInput label="开始领取年龄 (60-70)" type="number" value={cppStartAge} onChange={setCppStartAge} />
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {t('提前领每月 −0.6%，延后领每月 +0.7%，自动换算。')}
              </p>
            </div>
            <div className="flex justify-between pt-2">
              <button className="btn-secondary" onClick={() => setStep(1)}>
                {t('上一步')}
              </button>
              <button className="btn-primary" onClick={() => setStep(3)}>
                {t('下一步')}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">{t('设置完成')}</h2>
              <p className="text-sm text-slate-400">Step 3 / 3</p>
            </div>
            <div className="space-y-2 rounded-lg bg-slate-50 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">{t('姓名')}</span>
                <span className="font-medium">{name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{t('年龄')}</span>
                <span className="font-medium">{age} {t('岁')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{t('城市')}</span>
                <span className="font-medium">{city}</span>
              </div>
              {Number(homeValue) > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">{t('自住房')}</span>
                  <span className="font-medium">{formatCurrency(Number(homeValue))}</span>
                </div>
              )}
              {Number(tfsaBalance) > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">TFSA</span>
                  <span className="font-medium">{formatCurrency(Number(tfsaBalance))}</span>
                </div>
              )}
            </div>
            <div className="flex justify-between pt-2">
              <button className="btn-secondary" onClick={() => setStep(2)}>
                {t('上一步')}
              </button>
              <button className="btn-primary" onClick={finish}>
                {t('开始使用')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
