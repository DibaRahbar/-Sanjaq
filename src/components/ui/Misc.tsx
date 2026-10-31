import type { ReactNode } from 'react'
import { Icon, type IconName } from './Icon'
import { Illus, portraitFor, sceneForIcon } from './Illus'

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />
}

export function EmptyState({
  icon = 'folder',
  art,
  title,
  children,
  actions,
  level = 2,
}: {
  icon?: IconName
  art?: ReactNode
  title: string
  children?: ReactNode
  actions?: ReactNode
  /** سطح تیتر؛ برای صفحه‌هایی که فقط همین حالت را دارند (۴۰۴، پروژهٔ ناموجود) ۱ بدهید */
  level?: 1 | 2
}) {
  const Title = level === 1 ? 'h1' : 'h2'
  return (
    <div className="fade-up flex flex-col items-center rounded-card border-2 border-dashed border-line-strong px-6 py-14 text-center">
      {art ?? (sceneForIcon(icon) ? (
        <Illus name={sceneForIcon(icon)!} className="mb-2 w-52 max-w-full" />
      ) : (
        <span className="mb-4 grid size-12 place-items-center rounded-full bg-sunken text-muted">
          <Icon name={icon} size={20} />
        </span>
      ))}
      <Title className="mt-1 text-section">{title}</Title>
      {children ? <p className="mt-1.5 max-w-md text-body text-muted">{children}</p> : null}
      {actions ? <div className="mt-5 flex flex-wrap justify-center gap-2">{actions}</div> : null}
    </div>
  )
}

const AVATAR_TINTS = ['bg-lav text-lav-ink', 'bg-lime text-lime-ink', 'bg-pink text-pink-ink', 'bg-sky text-sky-ink', 'bg-org text-org-ink', 'bg-mint text-mint-ink']

/**
 * آواتار: برای آدم‌ها پرتره از پوشهٔ Genillu.com با تن پاستلی ثابت؛ برای سازمان‌ها (مشتری) حرف اول نام.
 * عکس واقعی نداریم و همه چیز ساختگی است.
 */
export function Avatar({ name, size = 28, kind = 'person', plain = false }: { name: string; size?: number; kind?: 'person' | 'org'; plain?: boolean }) {
  if (kind === 'person') {
    const { src, tint } = portraitFor(name)
    return (
      <span className={`inline-grid shrink-0 overflow-hidden rounded-full ${plain ? '' : `ring-2 ring-surface ${tint}`}`} style={{ width: size, height: size }} aria-hidden="true">
        <img src={src} alt="" width={256} height={256} loading="lazy" decoding="async" draggable={false} className="illus size-full object-cover" />
      </span>
    )
  }
  const initial = name.trim().charAt(0)
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return (
    <span
      className={`inline-grid shrink-0 place-items-center rounded-full font-bold ring-2 ring-surface ${AVATAR_TINTS[h % AVATAR_TINTS.length]}`}
      style={{ width: size, height: size, fontSize: size * 0.44 }}
      aria-hidden="true"
    >
      {initial}
    </span>
  )
}

/** ردیف آواتارهای هم‌پوشان برای نمایش تیم */
export function AvatarStack({ names, size = 26, max = 4 }: { names: string[]; size?: number; max?: number }) {
  const shown = names.slice(0, max)
  const rest = names.length - shown.length
  return (
    <span className="inline-flex items-center" aria-label={`${names.length} عضو تیم`} role="img">
      {shown.map((n, i) => (
        <span key={n} className={i ? '-ms-2' : ''}>
          <Avatar name={n} size={size} />
        </span>
      ))}
      {rest > 0 ? (
        <span className="-ms-2 inline-grid place-items-center rounded-full bg-sunken font-bold text-ink-soft ring-2 ring-surface" style={{ width: size, height: size, fontSize: size * 0.4 }}>
          +{new Intl.NumberFormat('fa-IR').format(rest)}
        </span>
      ) : null}
    </span>
  )
}

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex items-center gap-2 text-caption" aria-label="مراحل">
      {steps.map((s, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'todo'
        return (
          <li key={s} className="flex items-center gap-2" aria-current={state === 'current' ? 'step' : undefined}>
            <span
              className={`grid size-6 place-items-center rounded-full text-label ${
                state === 'current' ? 'bg-ink text-on-ink' : state === 'done' ? 'bg-ok-solid text-white' : 'bg-sunken text-muted ring-1 ring-line-strong'
              }`}
            >
              {state === 'done' ? <Icon name="check" size={14} /> : new Intl.NumberFormat('fa-IR').format(i + 1)}
            </span>
            <span className={state === 'current' ? 'font-semibold' : 'text-muted'}>{s}</span>
            {i < steps.length - 1 ? <span className="mx-1 hidden h-px w-6 bg-line-strong sm:block" aria-hidden="true" /> : null}
          </li>
        )
      })}
    </ol>
  )
}
