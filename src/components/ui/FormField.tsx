import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'

interface Common {
  label: string
  hint?: string
  error?: string | null
  required?: boolean
  /** برچسب انگلیسی کوچک کنار عنوان (اختیاری) */
  en?: string
  labelAside?: ReactNode
}

const control =
  'w-full rounded-control border bg-surface px-3 py-2 text-body text-ink placeholder:text-muted transition-colors disabled:bg-sunken disabled:text-muted read-only:bg-sunken/60'
const ring = (err?: string | null) => (err ? 'border-err' : 'border-line-strong hover:border-ink/40')

function Wrap({ id, label, hint, error, required, en, labelAside, children }: Common & { id: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-ui font-semibold">
          {label}
          {required ? (
            <span className="ms-1 text-err" aria-hidden="true">
              *
            </span>
          ) : null}
          {en ? (
            <span className="ltr ms-2 text-label font-normal text-muted" dir="ltr">
              {en}
            </span>
          ) : null}
        </label>
        {labelAside}
      </div>
      {children}
      {hint && !error ? (
        <p id={`${id}-hint`} className="text-caption text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-err`} className="flex items-center gap-1 text-caption font-semibold text-err">
          {error}
        </p>
      ) : null}
    </div>
  )
}

const describe = (id: string, hint?: string, error?: string | null) =>
  error ? `${id}-err` : hint ? `${id}-hint` : undefined

export function TextInput({ label, hint, error, required, en, labelAside, className = '', id: given, ...rest }: Common & InputHTMLAttributes<HTMLInputElement>) {
  const auto = useId()
  const id = given ?? auto
  return (
    <Wrap id={id} {...{ label, hint, error, required, en, labelAside }}>
      <input
        id={id}
        name={given}
        autoComplete="off"
        aria-invalid={error ? true : undefined}
        aria-required={required || undefined}
        aria-describedby={describe(id, hint, error)}
        className={`${control} ${ring(error)} min-h-11 ${className}`}
        {...rest}
      />
    </Wrap>
  )
}

export function TextArea({ label, hint, error, required, en, labelAside, className = '', id: given, ...rest }: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const auto = useId()
  const id = given ?? auto
  return (
    <Wrap id={id} {...{ label, hint, error, required, en, labelAside }}>
      <textarea
        id={id}
        name={given}
        autoComplete="off"
        aria-invalid={error ? true : undefined}
        aria-required={required || undefined}
        aria-describedby={describe(id, hint, error)}
        className={`${control} ${ring(error)} leading-7 ${className}`}
        {...rest}
      />
    </Wrap>
  )
}

export function Select({
  label,
  hint,
  error,
  required,
  en,
  labelAside,
  className = '',
  id: given,
  children,
  ...rest
}: Common & SelectHTMLAttributes<HTMLSelectElement>) {
  const auto = useId()
  const id = given ?? auto
  return (
    <Wrap id={id} {...{ label, hint, error, required, en, labelAside }}>
      <select
        id={id}
        name={given}
        aria-invalid={error ? true : undefined}
        aria-required={required || undefined}
        aria-describedby={describe(id, hint, error)}
        className={`${control} ${ring(error)} min-h-11 ${className}`}
        {...rest}
      >
        {children}
      </select>
    </Wrap>
  )
}

/** ورودی عددی با ارقام فارسی (درصد، تعداد). مقدار خالی = null */
export function NumField({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  suffix,
  id: given,
  maxDigits = 3,
  grouped = false,
  hint,
}: {
  maxDigits?: number
  grouped?: boolean
  hint?: string
  label: string
  value: number | null
  onChange: (v: number | null) => void
  min?: number
  max?: number
  suffix?: string
  id?: string
}) {
  const auto = useId()
  const id = given ?? auto
  const fa = new Intl.NumberFormat('fa-IR', { useGrouping: grouped })
  const latin = (s: string) => s.replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0)).replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-ui font-semibold">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          value={value === null ? '' : fa.format(value)}
          onChange={(e) => {
            const d = latin(e.target.value).replace(/[^0-9]/g, '').slice(0, maxDigits)
            onChange(d === '' ? null : Math.min(max, Math.max(min, Number(d))))
          }}
          className={`${control} ${ring(null)} min-h-11 ${grouped ? 'w-44' : 'w-24'} text-center`}
        />
        {suffix ? <span className="text-ui text-muted">{suffix}</span> : null}
      </div>
      {hint ? <p className="text-caption text-muted">{hint}</p> : null}
    </div>
  )
}
