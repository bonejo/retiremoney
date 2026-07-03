import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/layout/Layout'
import FeedbackButton from './components/common/FeedbackButton'
import Welcome from './pages/Welcome'
import Setup from './pages/Setup'
import Dashboard from './pages/Dashboard'
import Properties from './pages/Properties'
import Investments from './pages/Investments'
import Expenses from './pages/Expenses'
import Income from './pages/Income'
import Projections from './pages/Projections'
import Settings from './pages/Settings'
import Tax from './pages/Tax'
import Estate from './pages/Estate'
import { useProfileStore } from './store/profileStore'
import { useDataFileStore } from './store/dataFileStore'

// Guard app routes behind an existing profile.
function RequireProfile({ children }: { children: React.ReactNode }) {
  const hasProfile = useProfileStore((s) => s.profile !== null)
  return hasProfile ? <>{children}</> : <Navigate to="/" replace />
}

// Banner asking to re-grant access to the connected data file (needs a gesture).
function DataFileBanner() {
  const status = useDataFileStore((s) => s.status)
  const fileName = useDataFileStore((s) => s.fileName)
  const error = useDataFileStore((s) => s.error)
  const reconnect = useDataFileStore((s) => s.reconnect)

  if (status === 'need-permission') {
    return (
      <div className="flex items-center justify-center gap-3 bg-amber-50 px-4 py-2 text-sm text-amber-800">
        <span>数据文件「{fileName}」需要重新授权才能继续自动保存。</span>
        <button className="btn-primary px-3 py-1 text-xs" onClick={reconnect}>恢复连接</button>
      </div>
    )
  }
  if (error) {
    return <div className="bg-rose-50 px-4 py-2 text-center text-sm text-rose-700">{error}</div>
  }
  return null
}

export default function App() {
  const init = useDataFileStore((s) => s.init)
  useEffect(() => { void init() }, [init])

  return (
    <>
      <DataFileBanner />
      <FeedbackButton />
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/setup" element={<Setup />} />
        <Route
          element={
            <RequireProfile>
              <Layout />
            </RequireProfile>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/properties" element={<Properties />} />
          <Route path="/investments" element={<Investments />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/income" element={<Income />} />
          <Route path="/tax" element={<Tax />} />
          <Route path="/projections" element={<Projections />} />
          <Route path="/estate" element={<Estate />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
