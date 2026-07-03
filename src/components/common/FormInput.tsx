interface FormInputProps {
  label: string
  value: number | string
  onChange: (value: string) => void
  type?: 'text' | 'number' | 'date' | 'month'
  prefix?: string
  suffix?: string
  placeholder?: string
  step?: string
}

// Labeled input; renders an optional currency/percent affix.
export default function FormInput({
  label,
  value,
  onChange,
  type = 'text',
  prefix,
  suffix,
  placeholder,
  step,
}: FormInputProps) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
            {prefix}
          </span>
        )}
        <input
          className={`input ${prefix ? 'pl-7' : ''} ${suffix ? 'pr-10' : ''}`}
          type={type}
          value={value}
          step={step}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
            {suffix}
          </span>
        )}
      </div>
    </label>
  )
}
