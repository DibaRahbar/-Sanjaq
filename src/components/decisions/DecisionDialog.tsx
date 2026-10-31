import { useEffect, useState } from 'react'
import { latestVersion } from '../../domain/project'
import { OUTCOME_LABEL, type Decision, type DecisionOutcome, type Project, type Role } from '../../domain/types'
import { fa, ltr } from '../../lib/format'
import { Banner } from '../ui/Banner'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Select, TextArea, TextInput } from '../ui/FormField'

export interface DecisionPreset {
  versionId?: string
  feedbackIds?: string[]
  summary?: string
  supersedes?: Decision
}

export interface DecisionValues {
  summary: string
  outcome: DecisionOutcome
  reason: string
  versionId: string
  feedbackIds: string[]
  supersedesId?: string
}

export function DecisionDialog({
  open,
  onClose,
  project,
  role,
  preset,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  project: Project
  role: Role
  preset: DecisionPreset
  onSubmit: (v: DecisionValues, finalize: boolean) => void
}) {
  const canFinalize = role === 'pm' || role === 'founder'
  const [summary, setSummary] = useState('')
  const [outcome, setOutcome] = useState<DecisionOutcome>('adopt')
  const [reason, setReason] = useState('')
  const [versionId, setVersionId] = useState('')
  const [fbIds, setFbIds] = useState<string[]>([])
  const [errs, setErrs] = useState<{ summary?: string; reason?: string; version?: string }>({})

  useEffect(() => {
    if (!open) return
    const sup = preset.supersedes
    setSummary(preset.summary ?? '')
    setOutcome(sup ? (sup.outcome === 'adopt' ? 'reject' : 'adopt') : 'adopt')
    setReason('')
    setVersionId(preset.versionId ?? sup?.versionId ?? latestVersion(project)?.id ?? '')
    setFbIds(preset.feedbackIds ?? sup?.feedbackIds ?? [])
    setErrs({})
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const feedback = project.feedback.filter((f) => f.versionId === versionId && (f.status !== 'resolved' || fbIds.includes(f.id)))

  const submit = (finalize: boolean) => {
    const e: typeof errs = {}
    if (!summary.trim()) e.summary = 'خلاصهٔ تصمیم را بنویسید.'
    if (!reason.trim()) e.reason = 'دلیل تصمیم لازم است؛ همین چرایی بعداً به کار تیم می‌آید.'
    if (!versionId) e.version = 'نسخه را انتخاب کنید.'
    setErrs(e)
    if (Object.keys(e).length) return
    onSubmit({ summary, outcome, reason, versionId, feedbackIds: fbIds, supersedesId: preset.supersedes?.id }, finalize)
  }

  const sup = preset.supersedes
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={sup ? 'ثبت تصمیم جایگزین' : 'ثبت تصمیم'}
      description="چه تصمیمی گرفته شد، چرا، و به کدام نسخه و بازخورد مربوط است؟"
      footer={
        canFinalize ? (
          <>
            <Button variant="primary" icon="lock" onClick={() => submit(true)}>
              ثبت و نهایی‌سازی
            </Button>
            <Button onClick={() => submit(false)}>ذخیره به‌عنوان پیش‌نویس</Button>
            <Button variant="ghost" onClick={onClose}>
              انصراف
            </Button>
          </>
        ) : (
          <>
            <Button variant="primary" onClick={() => submit(false)}>
              ذخیرهٔ پیش‌نویس
            </Button>
            <Button onClick={onClose}>انصراف</Button>
          </>
        )
      }
    >
      <div className="flex flex-col gap-4">
        {sup ? (
          <Banner tone="warn" live="off" icon="info" title="تصمیم قبلی حذف یا ویرایش نمی‌شود">
            بعد از نهایی‌شدن این تصمیم، «{sup.summary}» با وضعیت «جایگزین‌شده» در تاریخچه می‌ماند.
          </Banner>
        ) : null}
        {!canFinalize ? (
          <Banner tone="info" live="off" icon="info">
            طراح فقط پیش‌نویس می‌سازد؛ نهایی‌سازی با مدیر پروژه یا مدیر استودیو است.
          </Banner>
        ) : null}
        <TextInput label="خلاصهٔ تصمیم" required value={summary} onChange={(e) => setSummary(e.target.value)} error={errs.summary} placeholder="مثلاً متن دکمهٔ پرداخت تغییر کند…" />
        <fieldset>
          <legend className="mb-1.5 text-ui font-semibold">نتیجه</legend>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(OUTCOME_LABEL) as DecisionOutcome[]).map((o) => (
              <label key={o} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-control border px-3 text-ui ${outcome === o ? 'border-ink bg-sunken font-semibold' : 'border-line-strong'}`}>
                <input type="radio" name="outcome" className="accent-[var(--color-ink)]" checked={outcome === o} onChange={() => setOutcome(o)} />
                {OUTCOME_LABEL[o]}
              </label>
            ))}
          </div>
        </fieldset>
        <TextArea label="دلیل تصمیم" required rows={3} value={reason} onChange={(e) => setReason(e.target.value)} error={errs.reason} hint="چرا این انتخاب؟ چه گزینه‌ای رد شد؟" />
        <Select
          label="نسخهٔ مربوط"
          required
          value={versionId}
          onChange={(e) => {
            setVersionId(e.target.value)
            setFbIds([])
          }}
          error={errs.version}
        >
          {project.versions.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label} · {v.artifactTitle}
            </option>
          ))}
        </Select>
        <fieldset>
          <legend className="mb-1.5 text-ui font-semibold">بازخوردهای مرتبط</legend>
          {feedback.length === 0 ? (
            <p className="text-caption text-muted">بازخورد بازی در این نسخه نیست. تصمیم می‌تواند بدون بازخورد مرتبط هم ثبت شود.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {feedback.map((f) => (
                <label key={f.id} className="flex cursor-pointer items-start gap-2 rounded-control border border-line p-2.5 text-ui">
                  <input
                    type="checkbox"
                    className="mt-1.5 size-4 accent-[var(--color-ink)]"
                    checked={fbIds.includes(f.id)}
                    onChange={(e) => setFbIds((p) => (e.target.checked ? [...p, f.id] : p.filter((x) => x !== f.id)))}
                  />
                  <span>
                    <span className="text-label font-normal text-muted">
                      بازخورد {fa(f.seq)} · {ltr(project.versions.find((v) => v.id === f.versionId)?.label ?? '')}
                    </span>
                    <span className="block">{f.text}</span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </fieldset>
      </div>
    </Dialog>
  )
}
