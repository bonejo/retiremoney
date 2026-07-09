import { useNavigate } from 'react-router-dom'
import { useProfileStore } from '../store/profileStore'
import { useDataFileStore } from '../store/dataFileStore'
import { useT } from '../i18n'

export default function Welcome() {
  const navigate = useNavigate()
  const hasProfile = useProfileStore((s) => s.profile !== null)
  const openExisting = useDataFileStore((s) => s.openExisting)
  const fileSupported = useDataFileStore((s) => s.status !== 'unsupported')
  const t = useT()

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-50 to-slate-50 px-6">
      <div className="w-full max-w-md text-center">
        <div className="mb-2 text-5xl">🌇</div>
        <h1 className="text-3xl font-bold text-slate-900">{t('Retirement Planner')}</h1>
        <p className="mt-2 text-slate-500">
          {t('Property, investment, expense and government-benefit planning for Canadian retirees')}
        </p>

        <div className="mt-8 space-y-3">
          <button
            className="btn-primary w-full py-3 text-base"
            onClick={() => navigate('/setup')}
          >
            {t('Create My Financial Profile')}
          </button>
          {hasProfile && (
            <button
              className="btn-secondary w-full py-3 text-base"
              onClick={() => navigate('/dashboard')}
            >
              {t('Continue')}
            </button>
          )}
          {fileSupported && (
            <button
              className="btn-secondary w-full py-3 text-base"
              onClick={() => void openExisting()}
            >
              {t('Open From Data File')}
            </button>
          )}
        </div>

        <p className="mt-8 text-xs text-slate-400">
          {t('All data is stored locally on your device — nothing is uploaded to any server.')}
        </p>
      </div>
    </div>
  )
}
