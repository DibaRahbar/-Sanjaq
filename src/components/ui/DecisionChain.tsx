import { chainState, type StepState } from '../../domain/project'
import type { Project } from '../../domain/types'
import { fa } from '../../lib/format'

/**
 * امضای بصری سنجاق: «زنجیرهٔ تصمیم» از بریف تا تغییرات بعدی.
 * گره پر = انجام‌شده، گره با حلقه = مرحلهٔ فعلی، گره توخالی = هنوز نرسیده. (راست‌به‌چپ: بریف در سمت راست)
 */
export function DecisionChain({ project, steps: given, labels = false }: { project?: Project; steps?: { id: string; label: string; state: StepState }[]; labels?: boolean }) {
  const steps = given ?? chainState(project!)
  const idx = steps.findIndex((s) => s.state === 'current')
  const cur = idx >= 0 ? steps[idx]! : steps[steps.length - 1]!
  const desc = `مرحلهٔ فعلی: ${cur.label}، ${fa((idx >= 0 ? idx : steps.length - 1) + 1)} از ${fa(steps.length)}`
  return (
    <div role="img" aria-label={desc} title={steps.map((s) => s.label).join(' ← ')} className="w-full max-w-[210px]">
      <div className="flex items-center" aria-hidden="true">
        {steps.map((s, i) => (
          <div key={s.id} className={`flex items-center ${i < steps.length - 1 ? 'flex-1' : ''}`}>
            <span
              className={`size-2.5 shrink-0 rounded-full border-2 transition-colors ${
                s.state === 'done'
                  ? 'border-ink bg-ink'
                  : s.state === 'current'
                    ? 'node-current border-ink bg-surface'
                    : 'border-line-strong bg-transparent'
              }`}
            />
            {i < steps.length - 1 ? <span className={`h-px flex-1 ${s.state === 'done' ? 'bg-ink' : 'bg-line-strong'}`} /> : null}
          </div>
        ))}
      </div>
      {labels ? (
        <p className="mt-1 text-label text-muted">
          {cur.label} · {fa((idx >= 0 ? idx : steps.length - 1) + 1)} از {fa(steps.length)}
        </p>
      ) : null}
    </div>
  )
}
