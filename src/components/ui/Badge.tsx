import type { ReactNode } from 'react'
import { Icon, type IconName } from './Icon'

export type Tone = 'neutral' | 'ai' | 'warn' | 'ok' | 'info' | 'err' | 'lime' | 'pink'

/** نشان‌های پاستلی؛ هر رنگ با متن تیرهٔ هم‌خانواده (کنتراست ≥ ۶ به ۱) */
const tones: Record<Tone, string> = {
  neutral: 'bg-sunken text-ink-soft',
  ai: 'bg-lav text-lav-ink',
  warn: 'bg-warn-soft text-warn',
  ok: 'bg-mint text-mint-ink',
  info: 'bg-sky text-sky-ink',
  err: 'bg-err-soft text-err',
  lime: 'bg-lime text-lime-ink',
  pink: 'bg-pink text-pink-ink',
}

const dots: Record<Tone, string> = {
  neutral: 'bg-ink-soft',
  ai: 'bg-lav-ink',
  warn: 'bg-warn',
  ok: 'bg-mint-ink',
  info: 'bg-sky-ink',
  err: 'bg-err',
  lime: 'bg-lime-ink',
  pink: 'bg-pink-ink',
}

/** برچسب وضعیت؛ با `dot` نقطهٔ رنگی کوچک جلوی متن می‌گذارد (وضعیت فقط با رنگ منتقل نمی‌شود: متن همیشه هست). */
export function Badge({
  tone = 'neutral',
  icon,
  dot,
  children,
  className = '',
}: {
  tone?: Tone
  icon?: IconName
  dot?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-px text-label whitespace-nowrap ${tones[tone]} ${className}`}>
      {dot ? <span className={`size-1.5 rounded-full ${dots[tone]}`} aria-hidden="true" /> : null}
      {icon ? <Icon name={icon} size={14} /> : null}
      {children}
    </span>
  )
}
