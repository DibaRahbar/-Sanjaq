import { STAGE_META } from '../../domain/fixtures'
import { chainState } from '../../domain/project'
import type { Project } from '../../domain/types'
import type { Tone } from './Badge'

const PILL: Record<Tone, string> = {
  neutral: 'bg-sunken text-ink-soft',
  ai: 'bg-lav text-lav-ink',
  warn: 'bg-org text-org-ink',
  ok: 'bg-mint text-mint-ink',
  info: 'bg-sky text-sky-ink',
  err: 'bg-coral text-coral-ink',
  lime: 'bg-lime text-lime-ink',
  pink: 'bg-pink text-pink-ink',
}

import type { IconName } from './Icon'

export const STAGE_STEPS: { label: string; icon: IconName }[] = [
  { label: 'بریف', icon: 'brief' },
  { label: 'محدوده', icon: 'scope' },
  { label: 'نسخه', icon: 'version' },
  { label: 'بازخورد', icon: 'feedback' },
  { label: 'تأیید', icon: 'approval' },
  { label: 'تغییر', icon: 'change' },
]

/**
 * زنجیرهٔ تصمیم به‌شکل ردیف زمان‌بندی: شش ستون؛ مراحل انجام‌شده علامت تیک، مرحلهٔ فعلی یک قرص پاستلی با نام وضعیت.
 * برای صفحه‌خوان یک توضیح متنی کوتاه دارد.
 */
export function StageTrack({ project, tone }: { project: Project; tone: Tone }) {
  const steps = chainState(project)
  const curIdx = Math.max(0, steps.findIndex((s) => s.state === 'current'))
  const label = STAGE_META[project.stage].label
  return (
    <div role="img" aria-label={`مرحلهٔ فعلی: ${steps[curIdx]!.label} (${label})`} className="grid grid-cols-6 gap-1.5">
      {steps.map((s) => {
        const hint = `${s.label} · ${s.state === 'done' ? 'انجام شد' : s.state === 'current' ? 'مرحلهٔ فعلی' : 'هنوز نرسیده'}`
        if (s.state === 'current')
          return (
            <span key={s.id} title={hint} className={`flex h-8 items-center justify-center rounded-control ${PILL[tone]}`}>
              <span className="size-2 rounded-full bg-current" aria-hidden="true" />
            </span>
          )
        return (
          <span key={s.id} title={hint} className={`flex h-8 items-center justify-center rounded-control ${s.state === 'done' ? 'bg-hover text-ink-soft' : 'bg-hover/60'}`} aria-hidden="true">
            {s.state === 'done' ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5 10 17.5 19 7" /></svg> : null}
          </span>
        )
      })}
    </div>
  )
}
