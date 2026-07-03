interface SliderInputProps {
  label: string
  value: number // stored as a fraction, e.g. 0.0345
  onChange: (value: number) => void
  min?: number // fraction
  max?: number // fraction
  step?: number // fraction
}

// Percentage slider with an exact numeric input (2 decimal places, e.g. 3.45%).
// Displays as a percent, stores as a fraction.
export default function SliderInput({
  label,
  value,
  onChange,
  min = 0,
  max = 0.12,
  step = 0.005,
}: SliderInputProps) {
  return (
    <label className="block">
      <div className="flex items-center justify-between">
        <span className="label mb-0">{label}</span>
        <span className="flex items-center gap-1 text-sm font-medium text-brand-600">
          <input
            type="number"
            className="w-20 rounded border border-slate-200 px-1.5 py-0.5 text-right text-sm text-brand-600 focus:border-brand-500 focus:outline-none"
            min={min * 100}
            max={max * 100}
            step={0.01}
            value={Number((value * 100).toFixed(2))}
            onChange={(e) => {
              const v = Number(e.target.value)
              if (!Number.isNaN(v)) onChange(v / 100)
            }}
          />
          %
        </span>
      </div>
      <input
        type="range"
        className="mt-2 w-full accent-brand-600"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  )
}
