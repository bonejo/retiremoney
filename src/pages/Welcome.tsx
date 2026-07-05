import { useNavigate } from 'react-router-dom'
import { useProfileStore } from '../store/profileStore'
import { useDataFileStore } from '../store/dataFileStore'
import { useT } from '../i18n'
import LangToggle from '../components/common/LangToggle'

export default function Welcome() {
  const navigate = useNavigate()
  const hasProfile = useProfileStore((s) => s.profile !== null)
  const openExisting = useDataFileStore((s) => s.openExisting)
  const fileSupported = useDataFileStore((s) => s.status !== 'unsupported')
  const t = useT()

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-50 to-slate-50 px-6">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 flex items-center justify-center gap-2">
          <span className="text-sm text-slate-400">🌐</span>
          <LangToggle />
        </div>
        <div className="mb-2 text-5xl">🌇</div>
        <h1 className="text-3xl font-bold text-slate-900">{t('退休财务规划')}</h1>
        <p className="mt-2 text-slate-500">
          {t('为加拿大退休人士打造的房产、投资、支出与政府福利规划工具')}
        </p>

        <div className="mt-8 space-y-3">
          <button
            className="btn-primary w-full py-3 text-base"
            onClick={() => navigate('/setup')}
          >
            {t('新建我的财务档案')}
          </button>
          {hasProfile && (
            <button
              className="btn-secondary w-full py-3 text-base"
              onClick={() => navigate('/dashboard')}
            >
              {t('继续上次')}
            </button>
          )}
          {fileSupported && (
            <button
              className="btn-secondary w-full py-3 text-base"
              onClick={() => void openExisting()}
            >
              {t('从数据文件打开')}
            </button>
          )}
        </div>

        <p className="mt-8 text-xs text-slate-400">
          {t('所有数据保存在本地设备，不上传到任何服务器。')}
        </p>
      </div>
    </div>
  )
}
