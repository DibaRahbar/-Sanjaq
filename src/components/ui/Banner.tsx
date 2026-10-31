import type { ReactNode } from 'react'
import { Icon, type IconName } from './Icon'
import type { Tone } from './Badge'

/** پیام‌های درون‌صفحه به‌شکل کاشی پاستلی (بدون مرز؛ متن و آیکون تیرهٔ هم‌خانواده) */
const wrap: Record<Tone, string> = {
  neutral: 'bg-sunken text-ink',
  ai: 'bg-lav text-ink',
  warn: 'bg-warn-soft text-ink',
  ok: 'bg-mint text-ink',
  info: 'bg-sky text-ink',
  err: 'bg-err-soft text-ink',
  lime: 'bg-lime text-ink',
  pink: 'bg-pink text-ink',
}
const iconTone: Record<Tone, string> = {
  neutral: 'bg-surface text-ink-soft',
  ai: 'bg-surface text-lav-ink',
  warn: 'bg-surface text-warn',
  ok: 'bg-surface text-mint-ink',
  info: 'bg-surface text-sky-ink',
  err: 'bg-surface text-err',
  lime: 'bg-surface text-lime-ink',
  pink: 'bg-surface text-pink-ink',
}
const defaultIcon: Record<Tone, IconName> = {
  neutral: 'info',
  ai: 'spark',
  warn: 'alert',
  ok: 'check',
  info: 'info',
  err: 'alert',
  lime: 'check',
  pink: 'info',
}

export function Banner({
  tone = 'neutral',
  icon,
  title,
  children,
  actions,
  live = 'polite',
  className = '',
}: {
  tone?: Tone
  icon?: IconName
  title?: ReactNode
  children?: ReactNode
  actions?: ReactNode
  live?: 'polite' | 'assertive' | 'off'
  className?: string
}) {
  return (
    <div
      role={live === 'assertive' ? 'alert' : live === 'polite' ? 'status' : undefined}
      className={`flex flex-col gap-3 rounded-card p-4 sm:flex-row sm:items-start ${wrap[tone]} ${className}`}
    >
      <span className={`grid size-9 shrink-0 place-items-center rounded-full ${iconTone[tone]}`}>
        <Icon name={icon ?? defaultIcon[tone]} size={18} duo />
      </span>
      <div className="min-w-0 flex-1">
        {title ? <p className="font-bold leading-7">{title}</p> : null}
        {children ? <div className="text-ui leading-7 text-ink-soft">{children}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}
