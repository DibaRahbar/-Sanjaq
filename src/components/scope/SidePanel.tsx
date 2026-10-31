import { useEffect, useRef, useState } from 'react'
import { FIELD_META, isUnknownResolved } from '../../domain/scope'
import type { Brief, Evidence, FieldKey, ScopeDoc, UnknownItem, UnknownResolution } from '../../domain/types'
import { fa } from '../../lib/format'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'

/* ---------- نمایش متن بریف با هایلایت شواهد ---------- */

export function segmentBrief(text: string, quotes: { id: string; quote: string }[]) {
  const hits: { start: number; end: number; id: string }[] = []
  for (const q of quotes) {
    const start = text.indexOf(q.quote)
    if (start >= 0) hits.push({ start, end: start + q.quote.length, id: q.id })
  }
  hits.sort((a, b) => a.start - b.start)
  const out: { text: string; id?: string }[] = []
  let cursor = 0
  for (const h of hits) {
    if (h.start < cursor) continue
    if (h.start > cursor) out.push({ text: text.slice(cursor, h.start) })
    out.push({ text: text.slice(h.start, h.end), id: h.id })
    cursor = h.end
  }
  if (cursor < text.length) out.push({ text: text.slice(cursor) })
  return out
}

function BriefViewer({ brief, quotes, focusId, forceOpen }: { brief: Brief | null; quotes: Evidence[]; focusId: string | null; forceOpen: number }) {
  const ref = useRef<HTMLDetailsElement>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (forceOpen > 0) setOpen(true)
  }, [forceOpen])

  useEffect(() => {
    if (open && focusId) {
      requestAnimationFrame(() => {
        ref.current?.querySelector(`[data-ev="${focusId}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      })
    }
  }, [open, focusId, forceOpen])

  if (!brief) return null
  const parts = segmentBrief(brief.text, quotes)
  return (
    <details
      ref={ref}
      open={open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
      className="rounded-card bg-surface shadow-card"
    >
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 px-4 py-2 font-bold marker:hidden [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2">
          <Icon name="doc" size={16} />
          متن اصلی بریف
        </span>
        <span className="text-label font-normal text-muted">{open ? 'بستن' : 'نمایش'}</span>
      </summary>
      <div className="max-h-[22rem] overflow-y-auto border-t border-line px-4 py-3">
        {brief.fileName ? (
          <p className="mb-2 text-label font-normal text-muted">
            فایل: <bdi dir="ltr" translate="no" className="font-mono">{brief.fileName}</bdi>
          </p>
        ) : null}
        <p className="whitespace-pre-wrap text-ui leading-8 text-ink/90">
          {parts.map((p, i) =>
            p.id ? (
              <mark
                key={i}
                data-ev={p.id}
                className={`rounded px-0.5 ${focusId === p.id ? 'bg-ai-line text-ink ring-1 ring-ai' : 'bg-ai-soft text-ink'}`}
              >
                {p.text}
              </mark>
            ) : (
              <span key={i}>{p.text}</span>
            ),
          )}
        </p>
      </div>
    </details>
  )
}

/* ---------- ابهام‌ها ---------- */

function UnknownCard({ u, editable, onResolve, onFocusField }: { u: UnknownItem; editable: boolean; onResolve: (r: UnknownResolution) => void; onFocusField: () => void }) {
  const resolved = isUnknownResolved(u)
  const [kind, setKind] = useState<'answered' | 'assumption'>('answered')
  const [note, setNote] = useState('')
  const [editing, setEditing] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const save = () => {
    if (note.trim() === '') {
      setErr(kind === 'answered' ? 'پاسخ دریافت‌شده را بنویسید.' : 'متن فرض و دلیل آن را بنویسید.')
      return
    }
    onResolve({ kind, note: note.trim() })
    setEditing(false)
    setErr(null)
  }

  return (
    <li className={`rounded-control border p-3 ${resolved ? 'border-line bg-canvas' : u.severity === 'critical' ? 'border-warn-line bg-warn-soft/60' : 'border-line-strong bg-surface'}`}>
      <div className="mb-1 flex flex-wrap items-center gap-1.5">
        <Badge tone={resolved ? 'ok' : u.severity === 'critical' ? 'warn' : 'neutral'} icon={resolved ? 'check' : 'alert'}>
          {resolved ? (u.resolution.kind === 'assumption' ? 'ثبت‌شده به‌عنوان فرض' : 'پاسخ داده شد') : u.severity === 'critical' ? 'ابهام حیاتی · باز' : 'ابهام · باز'}
        </Badge>
        <button type="button" onClick={onFocusField} className="rounded-control text-label font-normal text-muted underline-offset-2 hover:text-ink hover:underline">
          {FIELD_META[u.field].label}
        </button>
      </div>
      <p className="text-ui font-semibold leading-7">{u.question}</p>
      <p className="text-caption leading-6 text-muted">{u.why}</p>

      {resolved && !editing ? (
        <div className="mt-2 rounded-control bg-surface p-2.5 text-caption leading-6 ring-1 ring-line">
          <span className="font-semibold">{u.resolution.kind === 'assumption' ? 'فرض: ' : 'پاسخ: '}</span>
          {u.resolution.kind !== 'open' ? u.resolution.note : ''}
          {editable ? (
            <button
              type="button"
              onClick={() => {
                setEditing(true)
                if (u.resolution.kind !== 'open') {
                  setKind(u.resolution.kind)
                  setNote(u.resolution.note)
                }
              }}
              className="ms-2 text-ink underline underline-offset-2"
            >
              ویرایش
            </button>
          ) : null}
        </div>
      ) : editable ? (
        <div className="mt-2 flex flex-col gap-2">
          <div role="radiogroup" aria-label="نوع ثبت" className="flex flex-wrap gap-1.5">
            {(
              [
                ['answered', 'پاسخ دریافت شد'],
                ['assumption', 'ثبت به‌عنوان فرض'],
              ] as const
            ).map(([v, l]) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={kind === v}
                onClick={() => setKind(v)}
                className={`min-h-11 rounded-full border px-3 text-caption font-semibold ${kind === v ? 'border-ink bg-ink text-on-ink' : 'border-line-strong bg-surface hover:bg-sunken'}`}
              >
                {l}
              </button>
            ))}
          </div>
          <label className="sr-only" htmlFor={`unk-${u.id}`}>
            {kind === 'answered' ? 'پاسخ مشتری' : 'فرض و دلیل آن'}
          </label>
          <textarea
            id={`unk-${u.id}`}
            rows={2}
            value={note}
            onChange={(e) => {
              setNote(e.target.value)
              setErr(null)
            }}
            placeholder={kind === 'answered' ? 'پاسخ مشتری و منبع آن (مثلاً تماس یا پیام)…' : 'فرض شما چیست و چرا قابل‌قبول است؟'}
            aria-invalid={err ? true : undefined}
            className="w-full rounded-control border border-line-strong bg-surface px-3 py-2 text-ui leading-7"
          />
          {err ? <p className="text-caption font-semibold text-err">{err}</p> : null}
          <div className="flex gap-2">
            <Button size="sm" variant="primary" onClick={save}>
              ثبت
            </Button>
            {editing ? (
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                انصراف
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="mt-2 text-caption text-muted">در حالت قفل‌شده قابل تغییر نیست.</p>
      )}
    </li>
  )
}

/* ---------- پنل کناری ---------- */

export function SidePanel({
  brief,
  doc,
  activeField,
  editable,
  onResolve,
  onFocusField,
}: {
  brief: Brief | null
  doc: ScopeDoc
  activeField: FieldKey
  editable: boolean
  onResolve: (unknownId: string, r: UnknownResolution) => void
  onFocusField: (k: FieldKey) => void
}) {
  const field = doc.fields[activeField]
  const evidence = field.evidenceIds.map((id) => doc.evidence.find((e) => e.id === id)).filter((e): e is Evidence => Boolean(e))
  const fieldUnknowns = doc.unknowns.filter((u) => u.field === activeField)
  const [focusId, setFocusId] = useState<string | null>(null)
  const [openTick, setOpenTick] = useState(0)
  const openCount = doc.unknowns.filter((u) => !isUnknownResolved(u)).length

  useEffect(() => setFocusId(null), [activeField])

  return (
    <div className="flex flex-col gap-4">
      <section aria-labelledby="ev-title" className="rounded-card bg-surface p-4 shadow-card">
        <h2 id="ev-title" className="mb-1 flex items-center gap-2 text-body font-bold">
          <Icon name="quote" size={16} />
          شواهد برای «{FIELD_META[activeField].label}»
        </h2>
        {evidence.length > 0 ? (
          <ul className="mt-3 flex flex-col gap-2.5">
            {evidence.map((e) => (
              <li key={e.id} className="relative rounded-control bg-ai-soft/60 p-3 ps-10">
                <Icon name="quote" size={16} className="absolute start-3 top-3.5 text-ai" />
                <blockquote className="text-ui leading-7">«{e.quote}»</blockquote>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <Badge tone="neutral">{e.location}</Badge>
                  <button
                    type="button"
                    onClick={() => {
                      setFocusId(e.id)
                      setOpenTick((n) => n + 1)
                    }}
                    className="inline-flex min-h-10 items-center rounded-control px-2 text-caption font-semibold text-ai underline underline-offset-2"
                  >
                    نمایش در متن بریف
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-ui leading-7 text-muted">
            {fieldUnknowns.length > 0
              ? 'بریف دربارهٔ این مورد چیزی نگفته است؛ به همین دلیل AI پیشنهادی نساخته. ابهام مرتبط را در بخش پایین بررسی کنید.'
              : field.origin === 'human' || field.origin === 'edited'
                ? 'این مقدار را شما نوشته یا اصلاح کرده‌اید و شاهد خودکار ندارد.'
                : 'برای این مورد شاهدی از بریف ثبت نشده است.'}
          </p>
        )}
        {field.origin === 'edited' && field.aiValue !== undefined ? (
          <p className="mt-3 rounded-control bg-sunken p-2.5 text-caption leading-6 text-muted">
            شما پیشنهاد AI را تغییر داده‌اید. مقدار شما معتبر است و اجرای دوبارهٔ تحلیل آن را بازنویسی نمی‌کند.
          </p>
        ) : null}
      </section>

      <section aria-labelledby="unk-title" className="rounded-card bg-surface p-4 shadow-card">
        <h2 id="unk-title" className="mb-2 flex items-center justify-between gap-2 text-body font-bold">
          <span className="flex items-center gap-2">
            <Icon name="alert" size={16} className="text-warn" />
            ابهام‌ها و سؤال‌های باز
          </span>
          {doc.unknowns.length > 0 ? <Badge tone={openCount > 0 ? 'warn' : 'ok'}>{openCount > 0 ? `${fa(openCount)} مورد باز` : 'همه بررسی شد'}</Badge> : null}
        </h2>
        {doc.unknowns.length === 0 ? (
          <p className="text-ui leading-7 text-muted">ابهامی ثبت نشده است. این به معنی نبود ابهام در بریف نیست؛ فقط AI یا شما موردی علامت نزده‌اید.</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {doc.unknowns.map((u) => (
              <UnknownCard key={u.id} u={u} editable={editable} onResolve={(r) => onResolve(u.id, r)} onFocusField={() => onFocusField(u.field)} />
            ))}
          </ul>
        )}
      </section>

      <BriefViewer brief={brief} quotes={evidence} focusId={focusId} forceOpen={openTick} />
    </div>
  )
}
