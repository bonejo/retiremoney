import {
  Line,
  LineChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts'
import type { ProjectionPoint } from '../../utils/projectionCalc'
import { formatCurrency, formatWan } from '../../utils/format'
import { useT } from '../../i18n'

interface ProjectionChartProps {
  data: ProjectionPoint[]
  height?: number
  showDebt?: boolean
}

const series = [
  { key: 'netWorth', name: '总净资产', color: '#2563eb', width: 3 },
  { key: 'propertyEquity', name: '房产净值', color: '#f59e0b', width: 1.5 },
  { key: 'tfsa', name: 'TFSA', color: '#10b981', width: 1.5 },
  { key: 'nonRegistered', name: '非注册投资', color: '#8b5cf6', width: 1.5 },
] as const

export default function ProjectionChart({
  data,
  height = 360,
  showDebt = false,
}: ProjectionChartProps) {
  const t = useT()
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 10, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="age"
          tickFormatter={(a) => t('{age}岁', { age: a })}
          tick={{ fontSize: 12, fill: '#64748b' }}
        />
        <YAxis
          tickFormatter={formatWan}
          tick={{ fontSize: 12, fill: '#64748b' }}
          width={56}
        />
        <Tooltip
          formatter={(value: number) => formatCurrency(value)}
          labelFormatter={(age) => t('{age}岁', { age: String(age) })}
          contentStyle={{ fontSize: 13, borderRadius: 8 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={t(s.name)}
            stroke={s.color}
            strokeWidth={s.width}
            dot={false}
          />
        ))}
        {showDebt && (
          <Line
            type="monotone"
            dataKey="totalDebt"
            name={t('总负债')}
            stroke="#ef4444"
            strokeWidth={1.5}
            dot={false}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  )
}
