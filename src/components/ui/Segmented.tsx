import { fa } from '../../lib/format'

export interface SegOption<T extends string> {
  id: T
  label: string
  count?: number
}

/** فیلتر سریع به‌شکل قرص‌های گرد؛ قرص فعال مشکی */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: SegOption<T>[]
  value: T
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value === o.id
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.id)}
            className={`flex min-h-11 items-center gap-2 rounded-full px-4 text-caption font-bold transition-[background-color,color] duration-[var(--duration-fast)] ease-[var(--ease-out)] ${
              on ? 'bg-ink text-on-ink' : 'bg-surface text-ink hover:bg-hover'
            }`}
          >
            {o.label}
            {o.count !== undefined ? (
              <span className={`rounded-full px-1.5 text-label ${on ? 'bg-on-ink/20 text-on-ink' : 'bg-sunken text-ink-soft'}`}>{fa(o.count)}</span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
