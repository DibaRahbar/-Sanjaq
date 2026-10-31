import { useRef, type MouseEvent } from 'react'
import type { Feedback, SnapshotRef } from '../../domain/types'
import { fa } from '../../lib/format'

const W = 1000
const H = 640

const ink = '#171923'
const line = '#d9dde5'
const soft = '#f0f2f6'
const mute = '#8a92a0'

function ArmaCheckout({ variant }: { variant: number }) {
  const v2 = variant >= 2
  return (
    <g>
      <rect width={W} height={H} fill="#fff" />
      {/* هدر فروشگاه */}
      <rect width={W} height={64} fill="#fff" stroke={line} />
      <text x={960} y={40} textAnchor="end" fontSize={22} fontWeight={800} fill={ink}>فروشگاه آنلاین آرما</text>
      <rect x={40} y={22} width={44} height={22} rx={6} fill={soft} />
      {/* مراحل */}
      {['سبد خرید', 'اطلاعات ارسال', 'پرداخت', 'تأیید سفارش'].map((t, i) => {
        const cx = 880 - i * 190
        const active = i === 2
        return (
          <g key={t}>
            <circle cx={cx} cy={104} r={13} fill={active ? ink : i < 2 ? '#1d6b57' : '#fff'} stroke={active || i < 2 ? 'none' : line} />
            <text x={cx - 24} y={110} textAnchor="end" fontSize={16} fontWeight={active ? 700 : 400} fill={active ? ink : mute}>{t}</text>
          </g>
        )
      })}
      {/* خلاصهٔ سفارش (چپ) */}
      <rect x={40} y={150} width={360} height={380} rx={14} fill={soft} />
      <text x={376} y={192} textAnchor="end" fontSize={19} fontWeight={700} fill={ink}>خلاصهٔ سفارش</text>
      {[['کفش ورزشی', '۱٬۸۵۰٬۰۰۰'], ['کوله‌پشتی', '۹۸۰٬۰۰۰'], ['هزینهٔ ارسال', '۱۲۰٬۰۰۰']].map(([n, p], i) => (
        <g key={n}>
          <text x={376} y={240 + i * 52} textAnchor="end" fontSize={16} fill={ink}>{n}</text>
          <text x={64} y={240 + i * 52} fontSize={16} fill={mute}>{p} تومان</text>
          <line x1={64} x2={376} y1={254 + i * 52} y2={254 + i * 52} stroke={line} />
        </g>
      ))}
      <text x={376} y={440} textAnchor="end" fontSize={18} fontWeight={800} fill={ink}>جمع کل</text>
      <text x={64} y={440} fontSize={18} fontWeight={800} fill={ink}>۲٬۹۵۰٬۰۰۰ تومان</text>
      {/* روش پرداخت (راست) */}
      <text x={960} y={192} textAnchor="end" fontSize={19} fontWeight={700} fill={ink}>روش پرداخت</text>
      {[['پرداخت آنلاین با درگاه بانکی', true], ['پرداخت در محل', false]].map(([t, on], i) => (
        <g key={String(t)}>
          <rect x={440} y={212 + i * 76} width={520} height={60} rx={12} fill="#fff" stroke={on ? ink : line} strokeWidth={on ? 2 : 1} />
          <circle cx={930} cy={242 + i * 76} r={9} fill="#fff" stroke={on ? ink : mute} strokeWidth={2} />
          {on ? <circle cx={930} cy={242 + i * 76} r={4.5} fill={ink} /> : null}
          <text x={906} y={248 + i * 76} textAnchor="end" fontSize={16} fill={ink}>{String(t)}</text>
        </g>
      ))}
      <rect x={440} y={376} width={520} height={52} rx={10} fill="#fff" stroke={line} />
      <text x={940} y={408} textAnchor="end" fontSize={15} fill={mute}>کد تخفیف (اختیاری)</text>
      {/* دکمهٔ اصلی */}
      <rect x={440} y={470} width={520} height={64} rx={12} fill={v2 ? '#1d6b57' : '#6b7280'} />
      <text x={700} y={510} textAnchor="middle" fontSize={22} fontWeight={800} fill="#fff">{v2 ? 'پرداخت و ثبت سفارش' : 'پرداخت'}</text>
      {v2 ? <text x={700} y={560} textAnchor="middle" fontSize={14} fill={mute}>با پرداخت، شرایط خرید را می‌پذیرید</text> : null}
    </g>
  )
}

function Generic({ variant }: { variant: number }) {
  return (
    <g>
      <rect width={W} height={H} fill="#fff" />
      <rect width={W} height={64} fill="#fff" stroke={line} />
      <rect x={860} y={20} width={100} height={24} rx={6} fill={soft} />
      <rect x={40} y={22} width={44} height={20} rx={6} fill={soft} />
      <rect x={760} y={96} width={200} height={500} rx={12} fill={soft} />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={780} y={124 + i * 44} width={160} height={22} rx={6} fill="#fff" stroke={line} />
      ))}
      <rect x={40} y={96} width={690} height={56} rx={12} fill={soft} />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <g key={i}>
          <rect x={40} y={176 + i * 58} width={690} height={46} rx={10} fill="#fff" stroke={line} />
          <rect x={560} y={192 + i * 58} width={150} height={14} rx={4} fill={soft} />
          <rect x={300} y={192 + i * 58} width={120} height={14} rx={4} fill={soft} />
          <rect x={60} y={190 + i * 58} width={64} height={18} rx={9} fill={i % 3 === 0 ? '#fbf1df' : '#e6f3ef'} />
        </g>
      ))}
      <text x={500} y={626} textAnchor="middle" fontSize={13} fill={mute}>قاب عمومی نمونه · نسخهٔ {fa(variant)}</text>
    </g>
  )
}

export function Snapshot({ snapshot }: { snapshot: SnapshotRef }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full" style={{ direction: 'ltr' }} role="img" aria-label="تصویر ثابت نمونهٔ نسخهٔ طرح (نمایشی)" preserveAspectRatio="none">
      {snapshot.kind === 'arma-checkout' ? <ArmaCheckout variant={snapshot.variant} /> : <Generic variant={snapshot.variant} />}
    </svg>
  )
}

export function SnapshotCanvas({
  snapshot,
  feedback,
  selectedId,
  onSelect,
  addMode,
  onAddPin,
  showResolved,
}: {
  snapshot: SnapshotRef
  feedback: Feedback[]
  selectedId: string | null
  onSelect: (id: string) => void
  addMode: boolean
  onAddPin: (pin: { x: number; y: number }) => void
  showResolved: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)

  const onCanvasClick = (e: MouseEvent<HTMLButtonElement>) => {
    const r = ref.current?.getBoundingClientRect()
    // با صفحه‌کلید (detail = 0) نقطه را وسط قاب می‌گذاریم؛ در پنجرهٔ بعد دقیق‌تر تنظیم می‌شود.
    if (!r || e.detail === 0) return onAddPin({ x: 0.5, y: 0.5 })
    onAddPin({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height })
  }

  return (
    <div ref={ref} className="relative w-full select-none overflow-hidden rounded-card border border-line-strong bg-white shadow-card" style={{ aspectRatio: `${W} / ${H}` }}>
      <Snapshot snapshot={snapshot} />
      {feedback
        .filter((f) => f.pin && (showResolved || f.status !== 'resolved'))
        .map((f) => {
          const sel = f.id === selectedId
          const resolved = f.status === 'resolved'
          return (
            <button
              key={f.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onSelect(f.id)
              }}
              aria-label={`بازخورد ${fa(f.seq)}: ${f.text}`}
              aria-pressed={sel}
              style={{ left: `${f.pin!.x * 100}%`, top: `${f.pin!.y * 100}%` }}
              className={`absolute z-10 grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 text-caption font-bold shadow-card transition-transform hover:scale-110 ${
                resolved ? 'border-[#1b5a3c] bg-[#c4ead3] text-[#1b5a3c]' : f.blocking ? 'border-white bg-err-solid text-white' : 'border-white bg-[#101015] text-white'
              } ${f.visibility === 'internal' && !resolved ? 'ring-2 ring-warn-line' : ''} ${sel ? 'scale-125 ring-4 ring-ai/60' : ''}`}
            >
              {fa(f.seq)}
            </button>
          )
        })}
      {addMode ? (
        <button
          type="button"
          onClick={onCanvasClick}
          aria-label="افزودن بازخورد روی طرح. با ماوس نقطه را انتخاب کنید یا با Enter یک Pin در مرکز بسازید و مختصات را اصلاح کنید"
          className="absolute inset-0 z-20 cursor-crosshair bg-ai/5 outline-2 -outline-offset-2 outline-dashed outline-ai"
        />
      ) : null}
    </div>
  )
}
