import { useEffect, useRef, useState } from 'react'
import { FIELD_META, ORIGIN_LABEL } from '../../domain/scope'
import type { FieldKey, ScopeDoc, ScopeFields, UnknownItem } from '../../domain/types'
import { fa } from '../../lib/format'
import { Badge } from '../ui/Badge'
import { Icon } from '../ui/Icon'

const toLatinDigits = (s: string) =>
  s.replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0)).replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))

const input =
  'w-full rounded-control border border-line-strong bg-surface px-3 py-2 text-body leading-7 hover:border-ink/40 placeholder:text-muted'

function ListEditor({
  id,
  label,
  items,
  onChange,
  addLabel,
}: {
  id: string
  label: string
  items: string[]
  onChange: (next: string[]) => void
  addLabel: string
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const [focusIdx, setFocusIdx] = useState<number | null>(null)
  useEffect(() => {
    if (focusIdx !== null) {
      refs.current[focusIdx]?.focus()
      setFocusIdx(null)
    }
  }, [focusIdx, items.length])

  return (
    <div>
      <ul className="flex flex-col gap-2" aria-label={label}>
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-2">
            <input
              ref={(el) => {
                refs.current[i] = el
              }}
              id={i === 0 ? id : undefined}
              value={it}
              aria-label={`${label}، مورد ${fa(i + 1)}`}
              onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  if (it.trim() === '') return
                  onChange([...items.slice(0, i + 1), '', ...items.slice(i + 1)])
                  setFocusIdx(i + 1)
                }
              }}
              className={`${input} min-h-11`}
            />
            <button
              type="button"
              aria-label={`حذف مورد ${fa(i + 1)}`}
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="grid size-10 shrink-0 place-items-center rounded-control text-muted hover:bg-sunken hover:text-err"
            >
              <Icon name="trash" size={16} />
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        id={items.length === 0 ? id : undefined}
        onClick={() => {
          onChange([...items, ''])
          setFocusIdx(items.length)
        }}
        className="mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-control px-2 text-ui font-semibold text-ink hover:bg-sunken"
      >
        <Icon name="plus" size={16} />
        {addLabel}
      </button>
    </div>
  )
}

function ReadOnlyValue({ k, doc }: { k: FieldKey; doc: ScopeDoc }) {
  const v = doc.fields[k].value
  if (Array.isArray(v)) {
    return v.length === 0 ? (
      <p className="text-ui text-muted">موردی ثبت نشده است.</p>
    ) : (
      <ul className="list-disc ps-5 text-body leading-7">
        {v.map((x, i) => (
          <li key={i}>{x}</li>
        ))}
      </ul>
    )
  }
  if (k === 'reviewRounds') return <p className="text-body">{v === null ? '—' : `${fa(v as number)} دور`}</p>
  return <p className="whitespace-pre-wrap text-body leading-7">{(v as string) || '—'}</p>
}

export function FieldCard({
  k,
  doc,
  unknowns,
  active,
  readOnly,
  flagged,
  onActivate,
  onChange,
}: {
  k: FieldKey
  doc: ScopeDoc
  unknowns: UnknownItem[]
  active: boolean
  readOnly: boolean
  /** true وقتی تلاش برای تأیید به این فیلد گیر کرده است */
  flagged: boolean
  onActivate: () => void
  onChange: <K extends FieldKey>(key: K, value: ScopeFields[K]['value']) => void
}) {
  const meta = FIELD_META[k]
  const f = doc.fields[k]
  const id = `field-${k}`
  const openUnknown = unknowns.some((u) => u.resolution.kind === 'open')
  const evidenceCount = f.evidenceIds.length

  let originBadge
  if (f.origin === 'empty') {
    originBadge = unknowns.length > 0
      ? <Badge tone="warn" icon="alert">{openUnknown ? 'نامشخص در بریف' : 'ابهام بررسی شد'}</Badge>
      : <Badge tone="neutral">{ORIGIN_LABEL.empty}</Badge>
  } else if (f.origin === 'ai') {
    originBadge = <Badge tone="ai" icon="spark">{ORIGIN_LABEL.ai}</Badge>
  } else if (f.origin === 'edited') {
    originBadge = <Badge tone="info" icon="user">{ORIGIN_LABEL.edited}</Badge>
  } else {
    originBadge = <Badge tone="neutral" icon="user">{ORIGIN_LABEL.human}</Badge>
  }

  return (
    <section
      id={id}
      aria-labelledby={`${id}-label`}
      onFocusCapture={onActivate}
      onClick={onActivate}
      className={`rounded-card p-4 transition-shadow sm:p-5 ${f.origin === 'ai' || f.origin === 'edited' ? 'bg-lav/45' : 'bg-surface'} ${
        flagged ? 'ring-2 ring-coral-ink' : active ? 'ring-2 ring-ink' : ''
      }`}
    >
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <h2 id={`${id}-label`} className="text-body font-bold">
          {meta.label}
          {meta.required ? (
            <span className="ms-1 text-err" aria-label="الزامی">
              *
            </span>
          ) : null}
          <span className="ltr ms-2 text-label font-normal text-muted" dir="ltr">
            {meta.en}
          </span>
        </h2>
        <div className="flex flex-wrap items-center gap-1.5">
          {originBadge}
          {evidenceCount > 0 ? (
            <button
              type="button"
              onClick={onActivate}
              className="inline-flex min-h-7 items-center gap-1 rounded-full border border-line-strong px-2.5 text-label font-semibold text-ink/80 hover:bg-sunken"
            >
              <Icon name="quote" size={14} />
              {fa(evidenceCount)} شاهد
            </button>
          ) : null}
          {readOnly ? <Icon name="lock" size={14} className="text-muted" /> : null}
        </div>
      </div>

      {readOnly ? (
        <ReadOnlyValue k={k} doc={doc} />
      ) : meta.kind === 'text' ? (
        <textarea
          id={`${id}-input`}
          aria-label={meta.label}
          aria-describedby={`${id}-hint`}
          rows={3}
          value={f.value as string}
          onChange={(e) => onChange(k, e.target.value as never)}
          className={input}
        />
      ) : meta.kind === 'number' ? (
        <div className="flex items-center gap-3">
          <input
            id={`${id}-input`}
            aria-label={meta.label}
            aria-describedby={`${id}-hint`}
            inputMode="numeric"
            autoComplete="off"
            value={f.value === null ? '' : fa(f.value as number)}
            onChange={(e) => {
              const digits = toLatinDigits(e.target.value).replace(/\D/g, '').slice(0, 2)
              onChange(k, (digits === '' ? null : Number(digits)) as never)
            }}
            className={`${input} min-h-11 w-24 text-center`}
          />
          <span className="text-ui text-muted">دور بازبینی</span>
        </div>
      ) : (
        <ListEditor
          id={`${id}-input`}
          label={meta.label}
          items={f.value as string[]}
          onChange={(next) => onChange(k, next as never)}
          addLabel="افزودن مورد"
        />
      )}
      <p id={`${id}-hint`} className="mt-2 text-caption text-muted">
        {meta.hint}
      </p>
      {flagged ? (
        <p className="mt-1 text-caption font-semibold text-err" role="alert">
          این مورد مانع تأیید است.
        </p>
      ) : null}
    </section>
  )
}
