interface KPICardProps {
  label: string
  value: string
  sub?: string
  accent?: 'default' | 'positive' | 'negative' | 'brand'
}

const accentClasses: Record<string, string> = {
  default: 'text-slate-900',
  positive: 'text-emerald-600',
  negative: 'text-rose-600',
  brand: 'text-brand-600',
}

export default function KPICard({ label, value, sub, accent = 'default' }: KPICardProps) {
  return (
    <div className="card p-4">
      <div className="text-sm text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${accentClasses[accent]}`}>
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-slate-400">{sub}</div>}
    </div>
  )
}
