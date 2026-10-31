import { useEffect, useState } from 'react'
import { Snapshot } from './SnapshotCanvas'
import type { SnapshotRef, Visibility } from '../../domain/types'
import { Banner } from '../ui/Banner'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { NumField, TextArea } from '../ui/FormField'
import { ltr } from '../../lib/format'

export interface PinDraft {
  text: string
  pin: { x: number; y: number } | null
  visibility: Visibility
  blocking: boolean
}

/** S4: افزودن بازخورد روی نقطه‌ای از Snapshot (یا بازخورد عمومی بدون Pin) */
export function PinDialog({
  open,
  onClose,
  onSave,
  versionLabel,
  snapshot,
  initialPin,
  clientVisibleAllowed,
  clientVisibleReason,
}: {
  open: boolean
  onClose: () => void
  onSave: (d: PinDraft) => void
  versionLabel: string
  snapshot: SnapshotRef
  initialPin: { x: number; y: number } | null
  clientVisibleAllowed: boolean
  clientVisibleReason: string
}) {
  const [text, setText] = useState('')
  const [hasPin, setHasPin] = useState(true)
  const [x, setX] = useState<number | null>(50)
  const [y, setY] = useState<number | null>(50)
  const [visibility, setVisibility] = useState<Visibility>('internal')
  const [blocking, setBlocking] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setText('')
    setErr(null)
    setBlocking(false)
    setVisibility('internal')
    setHasPin(initialPin !== null)
    setX(Math.round((initialPin?.x ?? 0.5) * 100))
    setY(Math.round((initialPin?.y ?? 0.5) * 100))
  }, [open, initialPin])

  const px = Math.min(100, Math.max(0, x ?? 50)) / 100
  const py = Math.min(100, Math.max(0, y ?? 50)) / 100

  const save = () => {
    if (text.trim() === '') {
      setErr('متن بازخورد را بنویسید.')
      return
    }
    onSave({ text: text.trim(), pin: hasPin ? { x: px, y: py } : null, visibility: clientVisibleAllowed ? visibility : 'internal', blocking })
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={hasPin ? `بازخورد روی نسخهٔ ${ltr(versionLabel)}` : `بازخورد عمومی روی نسخهٔ ${ltr(versionLabel)}`}
      description="بازخورد فقط به همین نسخه تعلق می‌گیرد و با نسخهٔ بعدی جابه‌جا نمی‌شود."
      footer={
        <>
          <Button variant="primary" onClick={save}>
            ثبت بازخورد
          </Button>
          <Button onClick={onClose}>انصراف</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {hasPin ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="relative w-full shrink-0 overflow-hidden rounded-control border border-line-strong sm:w-56" style={{ aspectRatio: '1000 / 640' }}>
              <Snapshot snapshot={snapshot} />
              <span
                aria-hidden="true"
                style={{ left: `${px * 100}%`, top: `${py * 100}%` }}
                className="absolute z-10 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-ai shadow-card ring-4 ring-ai/30"
              />
            </div>
            <div className="flex gap-3">
              <NumField label="مختصات افقی (از چپ)" value={x} onChange={setX} suffix="٪" />
              <NumField label="مختصات عمودی (از بالا)" value={y} onChange={setY} suffix="٪" />
            </div>
          </div>
        ) : null}
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-ui">
          <input type="checkbox" className="size-4 accent-[var(--color-ink)]" checked={!hasPin} onChange={(e) => setHasPin(!e.target.checked)} />
          بازخورد عمومی (بدون Pin روی طرح)
        </label>
        <TextArea
          label="متن بازخورد"
          required
          rows={3}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setErr(null)
          }}
          error={err}
          placeholder="مثلاً دکمه روی موبایل کوچک است و دیده نمی‌شود…"
        />
        <fieldset>
          <legend className="mb-1.5 text-ui font-semibold">چه کسی می‌بیند؟</legend>
          <div className="flex flex-col gap-1.5">
            {(
              [
                ['internal', 'فقط داخلی', 'یادداشت داخلی است و هرگز در پورتال مشتری نمایش داده نمی‌شود.'],
                ['client', 'قابل رؤیت برای مشتری', 'بعد از انتشار نسخه، مشتری این بازخورد را در همین نسخه می‌بیند.'],
              ] as const
            ).map(([v, l, d]) => (
              <label key={v} className={`flex items-start gap-2 rounded-control border p-2.5 text-ui ${visibility === v ? 'border-ink' : 'border-line'} ${v === 'client' && !clientVisibleAllowed ? 'opacity-60' : 'cursor-pointer'}`}>
                <input
                  type="radio"
                  name="vis"
                  className="mt-1.5 accent-[var(--color-ink)]"
                  checked={visibility === v}
                  disabled={v === 'client' && !clientVisibleAllowed}
                  onChange={() => setVisibility(v)}
                />
                <span>
                  <span className="font-semibold">{l}</span>
                  <span className="block text-caption text-muted">{d}</span>
                </span>
              </label>
            ))}
          </div>
          {!clientVisibleAllowed ? <p className="mt-1.5 text-caption text-warn">{clientVisibleReason}</p> : null}
        </fieldset>
        <label className="flex cursor-pointer items-start gap-2 text-ui">
          <input type="checkbox" className="mt-1.5 size-4 accent-[var(--color-ink)]" checked={blocking} onChange={(e) => setBlocking(e.target.checked)} />
          <span>
            مسدودکنندهٔ انتشار
            <span className="block text-caption text-muted">تا رفع نشود یا PM دلیل استثنا ثبت نکند، نسخه برای مشتری آماده نمی‌شود.</span>
          </span>
        </label>
        {text.trim() === '' && err ? null : <Banner tone="neutral" live="off" icon="info">ثبت‌کننده و زمان به‌صورت خودکار ثبت می‌شود.</Banner>}
      </div>
    </Dialog>
  )
}
