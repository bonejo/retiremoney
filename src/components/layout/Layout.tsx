import { NavLink, Outlet } from 'react-router-dom'
import { useProfileStore } from '../../store/profileStore'
import { ageFromDOB } from '../../utils/format'
import { useT } from '../../i18n'
import LangToggle from '../common/LangToggle'

const nav = [
  { to: '/dashboard', label: '仪表板', icon: '📊' },
  { to: '/properties', label: '房产管理', icon: '🏠' },
  { to: '/investments', label: '投资账户', icon: '💰' },
  { to: '/expenses', label: '支出管理', icon: '🧾' },
  { to: '/income', label: '收入 / GIS', icon: '📥' },
  { to: '/tax', label: '税务摘要', icon: '📋' },
  { to: '/projections', label: '资产预测', icon: '📈' },
  { to: '/estate', label: '遗产规划', icon: '🕊️' },
  { to: '/settings', label: '全局设置', icon: '⚙️' },
]

export default function Layout() {
  const profile = useProfileStore((s) => s.profile)
  const age = profile ? ageFromDOB(profile.dateOfBirth) : null
  const t = useT()

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="px-5 py-5">
          <div className="text-lg font-semibold text-brand-700">{t('退休财务规划')}</div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-xs text-slate-400">{profile?.province ?? 'BC'}{t('省 · 2026')}</span>
            <LangToggle />
          </div>
        </div>
        {profile && (
          <div className="mx-3 mb-2 rounded-lg bg-slate-50 px-3 py-2">
            <div className="text-sm font-medium text-slate-700">{profile.name}</div>
            <div className="text-xs text-slate-400">
              {age}{t('岁')} · {profile.city}
            </div>
          </div>
        )}
        <nav className="flex-1 space-y-0.5 px-3 py-2">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                  isActive
                    ? 'bg-brand-50 font-medium text-brand-700'
                    : 'text-slate-600 hover:bg-slate-50'
                }`
              }
            >
              <span>{n.icon}</span>
              {t(n.label)}
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-4 text-[11px] leading-relaxed text-slate-400">
          {t('您的数据仅保存在本设备，清除浏览器数据会丢失。')}
        </div>
      </aside>
      <main className="flex flex-1 flex-col overflow-x-hidden">
        <div className="flex-1">
          <Outlet />
        </div>
        <footer className="px-6 py-4 text-center text-[11px] leading-relaxed text-slate-400">
          {t('本工具的税率、政府福利等参数为近似估算，仅供规划参考，不构成税务、法律或投资建议。重大财务决定请咨询持牌会计师或理财顾问。')}
        </footer>
      </main>
    </div>
  )
}

// Standard page wrapper with a title.
export function Page({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  const t = useT()
  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">{t(title)}</h1>
        {action}
      </div>
      {children}
    </div>
  )
}
