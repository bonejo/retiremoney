import { useState } from 'react'

// SHA-256 hashes of valid invite codes (codes themselves are not in the bundle).
// This is a lightweight trial gate, not a security boundary — all data stays local.
const CODE_HASHES = new Set([
  'e1bc25cd9d41e98e0eee04dfa3faeec67b824b76bd49e6e42759384d62e8d18c',
  '046c4334324ee09e5c8d777a5ed082116c8095a00ff8e64e7f749d6bf73533ee',
  'f24b4926573dfebf800cb47940e699c323dec4790d30222d3aa4e33497d3eb48',
  '3e05641d68c4206de308e05e2f63a8f198c1c4b2a5739cf0c7bae0b34bd45118',
  'a02e0c582f64e8ce7bc8fd3fd6f87715539b59c9dcfa665e57fae3d6eef27865',
])

const FLAG = 'rp-invite-ok'

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export default function InviteGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(() => localStorage.getItem(FLAG) === '1')
  const [code, setCode] = useState('')
  const [error, setError] = useState(false)

  if (unlocked) return <>{children}</>

  async function submit() {
    const hash = await sha256Hex(code.trim().toUpperCase())
    if (CODE_HASHES.has(hash)) {
      localStorage.setItem(FLAG, '1')
      setUnlocked(true)
    } else {
      setError(true)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-50 to-slate-50 px-6">
      <div className="card w-full max-w-sm p-8 text-center">
        <div className="mb-2 text-4xl">🔑</div>
        <h1 className="text-xl font-bold text-slate-900">退休财务规划</h1>
        <p className="mt-2 text-sm text-slate-500">当前为邀请试用阶段，请输入邀请码。</p>
        <input
          className="input mt-4 text-center uppercase tracking-widest"
          value={code}
          onChange={(e) => { setCode(e.target.value); setError(false) }}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="邀请码"
          autoFocus
        />
        {error && <p className="mt-2 text-xs text-rose-500">邀请码无效，请重试。</p>}
        <button className="btn-primary mt-4 w-full py-2.5" onClick={submit} disabled={!code.trim()}>
          进入
        </button>
        <p className="mt-6 text-xs text-slate-400">所有数据仅保存在您的设备上，不上传任何服务器。</p>
      </div>
    </div>
  )
}
