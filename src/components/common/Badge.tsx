interface BadgeProps {
  children: React.ReactNode
  color?: 'green' | 'red' | 'yellow' | 'blue' | 'gray'
}

const colors: Record<string, string> = {
  green: 'bg-emerald-100 text-emerald-700',
  red: 'bg-rose-100 text-rose-700',
  yellow: 'bg-amber-100 text-amber-700',
  blue: 'bg-brand-100 text-brand-700',
  gray: 'bg-slate-100 text-slate-600',
}

export default function Badge({ children, color = 'gray' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  )
}
