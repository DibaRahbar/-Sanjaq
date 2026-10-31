import { useDocumentTitle } from '../../lib/usePage'
import { Icon } from '../ui/Icon'

export type InvalidReason = 'unknown' | 'expired' | 'revoked'

const COPY: Record<InvalidReason, { title: string; body: string }> = {
  unknown: { title: 'این لینک معتبر نیست', body: 'نشانی را بررسی کنید یا از استودیو لینک تازه بخواهید.' },
  expired: { title: 'مهلت این لینک تمام شده است', body: 'برای ادامه، از استودیو بخواهید لینک تازه‌ای برایتان بفرستد.' },
  revoked: { title: 'این لینک دیگر فعال نیست', body: 'استودیو دسترسی با این لینک را متوقف کرده است. برای دریافت لینک تازه با استودیو تماس بگیرید.' },
}

/** حالت امن: هیچ نام پروژه، مشتری یا نسخه‌ای نشان داده نمی‌شود. */
export function InvalidAccess({ reason }: { reason: InvalidReason }) {
  useDocumentTitle(COPY[reason].title)
  const c = COPY[reason]
  return (
    <div className="fade-up mx-auto mt-10 flex max-w-md flex-col items-center rounded-card bg-surface px-6 py-12 text-center shadow-card" role="alert">
      <span className="mb-4 grid size-12 place-items-center rounded-full bg-sunken text-muted">
        <Icon name="lock" size={20} />
      </span>
      <h1 className="text-heading">{c.title}</h1>
      <p className="mt-2 text-ui leading-7 text-muted">{c.body}</p>
    </div>
  )
}
