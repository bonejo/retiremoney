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
        alert('导入失败：文件格式无效')
      }
    }
    reader.readAsText(file)
  }

  function clearAll() {
    if (!confirm('确定清除所有数据？此操作不可恢复。')) return
    for (const k of STORAGE_KEYS) localStorage.removeItem(k)
    location.href = '/'
  }

  return (
    <Page title="全局设置">
      <div className="grid gap-6 lg:grid-cols-2">
        {profile && (
          <Section title="个人与省份">
            <p className="-mt-2 mb-1 text-xs text-emerald-600">{t('✓ 更改即时自动保存')}</p>
            <div className="grid grid-cols-2 gap-3">
              <FormInput label="姓名" value={profile.name} onChange={(v) => updateProfile({ name: v })} />
              <FormInput label="出生日期" type="date" value={profile.dateOfBirth} onChange={(v) => updateProfile({ dateOfBirth: v })} />
            </div>
            <FormInput label="居住城市" value={profile.city} onChange={(v) => updateProfile({ city: v })} />
            <div>
              <span className="label">{t('婚姻状态')}</span>
              <select
                className="input"
                value={profile.maritalStatus}
                onChange={(e) => updateProfile({ maritalStatus: e.target.value as Profile['maritalStatus'] })}
              >
                <option value="single">{t('单身')}</option>
                <option value="married">{t('已婚')}</option>
                <option value="divorced">{t('离异')}</option>
                <option value="widowed">{t('丧偶')}</option>
              </select>
            </div>
            <div>
              <span className="label">{t('所在省份（影响省税与遗产认证费）')}</span>
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
              label="移民来加年份（出生在加拿大请留空）"
              type="number"
              value={profile.canadaArrivalYear ?? ''}
              onChange={(v) => updateProfile({ canadaArrivalYear: v ? Number(v) : undefined })}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormInput
                label="年工作收入"
                type="number"
                prefix="$"
                value={profile.employmentIncomeAnnual ?? ''}
                onChange={(v) => updateProfile({ employmentIncomeAnnual: v ? Number(v) : undefined })}
              />
              <FormInput
                label="计划退休年龄"
                type="number"
                value={profile.retirementAge ?? ''}
                onChange={(v) => updateProfile({ retirementAge: v ? Number(v) : undefined })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormInput
                label="CPP 65岁预估月额"
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
                label="CPP 开始年龄 (60-70)"
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

        <Section title="通胀设置">
          <PercentRow label="生活费通胀率" value={assumptions.inflationRates.living} onChange={(v) => setInflation('living', v)} />
          <PercentRow label="房产/地税通胀率" value={assumptions.inflationRates.property} onChange={(v) => setInflation('property', v)} />
          <PercentRow label="医疗费通胀率" value={assumptions.inflationRates.healthcare} onChange={(v) => setInflation('healthcare', v)} />
          <PercentRow label="政府福利增长率" value={assumptions.inflationRates.governmentBenefits} onChange={(v) => setInflation('governmentBenefits', v)} />
        </Section>

        <Section title="税率设置">
          <PercentRow label="边际税率" value={assumptions.taxRates.marginalTaxRate} onChange={(v) => setTax('marginalTaxRate', v)} />
          <PercentRow label="资本利得有效税率" value={assumptions.taxRates.capitalGainsTaxRate} onChange={(v) => setTax('capitalGainsTaxRate', v)} />
          <PercentRow label="DTC 抵免率" value={assumptions.taxRates.dtcRate} onChange={(v) => setTax('dtcRate', v)} />
        </Section>

        <Section title="汇率设置">
          <FormInput
            label="美元汇率（1 USD = ? CAD）"
            type="number"
            step="0.01"
            value={assumptions.exchangeRates?.usdCad ?? 1.35}
            onChange={(v) => update({ exchangeRates: { usdCad: num(v) } })}
          />
          <p className="text-xs text-slate-400">美元投资账户按此汇率折算成加元参与所有计算。</p>
        </Section>

        <Section title="政府福利参数 (2026)">
          <FormInput label="OAS 月额 (65-74岁)" type="number" prefix="$" value={assumptions.governmentBenefits.oasMonthly6574} onChange={(v) => setBenefit('oasMonthly6574', num(v))} />
          <FormInput label="OAS 月额 (75岁+)" type="number" prefix="$" value={assumptions.governmentBenefits.oasMonthly75plus} onChange={(v) => setBenefit('oasMonthly75plus', num(v))} />
          <FormInput label="GIS 年最高额 (单身)" type="number" prefix="$" value={assumptions.governmentBenefits.gisMaxAnnual} onChange={(v) => setBenefit('gisMaxAnnual', num(v))} />
          <FormInput label="TFSA 年度新增额度" type="number" prefix="$" value={assumptions.governmentBenefits.tfsa_annual_room} onChange={(v) => setBenefit('tfsa_annual_room', num(v))} />
        </Section>

        <Section title="数据文件（推荐）">
          <DataFileSection />
        </Section>

        <Section title="数据管理">
          <div className="space-y-3">
            <button className="btn-secondary w-full" onClick={exportData}>{t('导出数据 (JSON)')}</button>
            <label className="btn-secondary w-full cursor-pointer">
              {t('导入数据')}
              <input type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])} />
            </label>
            <button className="btn-secondary w-full" onClick={() => { reset(); }}>{t('恢复默认假设参数')}</button>
            <button className="btn w-full bg-rose-50 text-rose-600 hover:bg-rose-100" onClick={clearAll}>{t('清除所有数据')}</button>
            <button className="btn-ghost w-full" onClick={() => navigate('/dashboard')}>{t('返回仪表板')}</button>
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
        {t('当前浏览器不支持文件直连（需 Chrome/Edge）。请使用下方「导出数据」手动备份。')}
      </p>
    )
  }
  return (
    <div className="space-y-3">
      {status === 'connected' ? (
        <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-sm">
          <span className="text-emerald-700">{t('✓ 已连接：{name}（自动保存中）', { name: fileName ?? '' })}</span>
          <button className="btn-ghost text-xs text-slate-500" onClick={() => void disconnect()}>{t('断开')}</button>
        </div>
      ) : status === 'need-permission' ? (
        <button className="btn-primary w-full" onClick={() => void reconnect()}>
          {t('恢复连接「{name}」', { name: fileName ?? '' })}
        </button>
      ) : (
        <>
          <button className="btn-primary w-full" onClick={() => void createNew()}>{t('新建数据文件')}</button>
          <button className="btn-secondary w-full" onClick={() => void openExisting()}>{t('打开现有数据文件')}</button>
        </>
      )}
      <p className="text-xs text-slate-400">
        {t('所有数据保存在您选择的本地 JSON 文件中并自动同步，换电脑或浏览器时打开该文件即可继续。数据不上传任何服务器。')}
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
      suffix="(小数)"
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
      档案：{profile.name} · {propCount} 处房产 · {invCount} 个投资账户 · {expCount} 项支出。
      您的数据仅保存在本设备，清除浏览器数据会丢失。
    </p>
  )
}
