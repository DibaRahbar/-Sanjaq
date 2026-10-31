import { FIELD_META, isUnknownResolved, type Guard } from '../../domain/scope'
import type { Role, ScopeDoc } from '../../domain/types'
import { ROLE_LABEL } from '../../domain/types'
import { fa, ltr } from '../../lib/format'
import { Banner } from '../ui/Banner'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Icon } from '../ui/Icon'

export function Readiness({ guards, showProblems, onJump }: { guards: Guard[]; showProblems: boolean; onJump: (g: Guard) => void }) {
  const done = guards.filter((g) => g.ok).length
  return (
    <section aria-labelledby="ready-title" className="rounded-card bg-surface p-4 sm:p-5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 id="ready-title" className="text-body font-bold">
          آمادگی برای تأیید داخلی
        </h2>
        <span
          role="img"
          aria-label={`${fa(done)} از ${fa(guards.length)} شرط`}
          className="grid size-12 place-items-center rounded-full"
          style={{ background: `conic-gradient(var(--color-ink) 0 ${(done / guards.length) * 100}%, color-mix(in srgb, var(--color-ink) 12%, transparent) 0)` }}
        >
          <span className="grid size-9 place-items-center rounded-full bg-surface text-label">
            {fa(done)}/{fa(guards.length)}
          </span>
        </span>
      </div>
      <ul className="flex flex-col gap-1">
        {guards.map((g) => (
          <li key={g.id} className="flex items-start gap-2 text-ui leading-7">
            <span className={`mt-1.5 shrink-0 ${g.ok ? 'text-ok' : showProblems ? 'text-err' : 'text-muted'}`}>
              <Icon name={g.ok ? 'check' : 'circle'} size={16} />
            </span>
            <span className={g.ok ? 'text-ink/80' : 'text-ink'}>
              {g.ok ? g.label : showProblems ? g.problem : g.label}
              {!g.ok && showProblems ? (
                <button type="button" onClick={() => onJump(g)} className="ms-2 text-caption font-semibold text-ink underline underline-offset-2">
                  برو به این مورد
                </button>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function ApprovalDialog({
  open,
  onClose,
  onConfirm,
  doc,
  version,
  supersedes,
  role,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  doc: ScopeDoc
  version: number
  supersedes: number | null
  role: Role
}) {
  const f = doc.fields
  const clean = (a: string[]) => a.map((s) => s.trim()).filter(Boolean)
  const critical = doc.unknowns.filter((u) => u.severity === 'critical')
  const stillOpen = doc.unknowns.filter((u) => !isUnknownResolved(u))
  const assumptions = doc.unknowns.filter((u) => u.resolution.kind === 'assumption' && isUnknownResolved(u))

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`تأیید داخلی محدوده · ${ltr(`Baseline v${version}`)}`}
      description="خلاصهٔ آنچه قفل می‌شود را یک بار دیگر ببینید."
      footer={
        <>
          <Button variant="primary" icon="lock" onClick={onConfirm}>
            تأیید و ثبت {ltr(`Baseline v${version}`)}
          </Button>
          <Button onClick={onClose}>بازگشت به ویرایش</Button>
        </>
      }
    >
      <Banner tone="warn" live="off" icon="alert" title="این یک تأیید داخلی استودیو است">
        محدودهٔ توافق‌شدهٔ تیم را قفل می‌کند. <strong>تأیید مشتری نیست</strong> و جایگزین قرارداد حقوقی هم نمی‌شود. بعد از ثبت، هر تغییر فقط با Revision جدید ممکن است.
        {supersedes ? ` این نسخه جایگزین ${ltr(`Baseline v${supersedes}`)} می‌شود؛ نسخهٔ قبلی دست‌نخورده در تاریخچه می‌ماند.` : ''}
      </Banner>

      <div className="mt-4 flex flex-col gap-3 text-ui">
        <div>
          <p className="font-bold">{FIELD_META.goal.label}</p>
          <p className="leading-7 text-ink/90">{f.goal.value.trim()}</p>
        </div>
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(
            [
              ['تحویل‌دادنی', clean(f.deliverables.value).length],
              ['خارج از محدوده', clean(f.exclusions.value).length],
              ['دور بازبینی', f.reviewRounds.value ?? 0],
              ['معیار پذیرش', clean(f.acceptance.value).length],
            ] as const
          ).map(([l, n]) => (
            <div key={l} className="rounded-control bg-canvas p-2.5 ring-1 ring-line">
              <dt className="text-label font-normal text-muted">{l}</dt>
              <dd className="text-heading leading-7">{fa(n)}</dd>
            </div>
          ))}
        </dl>
        <div>
          <p className="font-bold">معیار پذیرش</p>
          <ul className="list-disc ps-5 leading-7 text-ink/90">
            {clean(f.acceptance.value).map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
        {critical.length > 0 ? (
          <div>
            <p className="font-bold">ابهام‌های حیاتی بررسی‌شده</p>
            <ul className="list-disc ps-5 leading-7 text-ink/90">
              {critical.map((u) => (
                <li key={u.id}>
                  {u.question} <span className="text-muted">— {u.resolution.kind === 'assumption' ? 'ثبت به‌عنوان فرض' : 'پاسخ داده شد'}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {stillOpen.length > 0 ? (
          <div>
            <p className="font-bold text-warn">ابهام‌های غیرحیاتی که باز می‌مانند ({fa(stillOpen.length)})</p>
            <p className="leading-7 text-ink/90">{stillOpen.map((u) => u.question).join(' · ')}</p>
          </div>
        ) : null}
        {assumptions.length > 0 ? <p className="text-caption text-muted">{fa(assumptions.length)} مورد به‌عنوان فرض در Baseline ثبت می‌شود.</p> : null}
        <p className="border-t border-line pt-3 text-caption text-muted">ثبت‌کننده: {ROLE_LABEL[role]} (نقش نمایشی دمو)</p>
      </div>
    </Dialog>
  )
}
