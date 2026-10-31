import { useEffect, useState } from 'react'
import { decisionsToImplement, latestVersion } from '../../domain/project'
import type { Project } from '../../domain/types'
import { DEFAULT_ARTIFACT_TITLE } from '../../domain/snapshots'
import { ltr } from '../../lib/format'
import { Banner } from '../ui/Banner'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { TextArea, TextInput } from '../ui/FormField'

export function AddVersionDialog({
  open,
  onClose,
  project,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  project: Project
  onSubmit: (v: { note: string; artifactTitle: string; implementsDecisionIds: string[] }) => void
}) {
  const last = latestVersion(project)
  const next = `v${project.versions.length + 1}`
  const pending = decisionsToImplement(project)
  const blocked = last?.status === 'client_review' || last?.status === 'approved'
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setTitle(last?.artifactTitle ?? DEFAULT_ARTIFACT_TITLE(project))
    setNote('')
    setErr(null)
    setPicked(decisionsToImplement(project).map((d) => d.id))
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const submit = () => {
    if (title.trim() === '') return setErr('عنوان تحویل‌دادنی را بنویسید.')
    if (last && note.trim() === '') return setErr('خلاصهٔ تغییرات نسبت به نسخهٔ قبل را بنویسید؛ مشتری و تیم همین را می‌بینند.')
    onSubmit({ note, artifactTitle: title, implementsDecisionIds: picked })
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={blocked ? 'افزودن نسخهٔ جدید فعلاً ممکن نیست' : `افزودن نسخهٔ ${ltr(next)}`}
      description={blocked ? undefined : 'هر نسخه یک Snapshot ثابت با شناسهٔ یکتا دارد.'}
      footer={
        blocked ? (
          <Button variant="primary" onClick={onClose}>
            متوجه شدم
          </Button>
        ) : (
          <>
            <Button variant="primary" onClick={submit}>
              ثبت نسخهٔ {ltr(next)}
            </Button>
            <Button onClick={onClose}>انصراف</Button>
          </>
        )
      }
    >
      {blocked ? (
        <Banner tone="warn" live="off" title={`نسخهٔ ${ltr(last!.label)} برای مشتری منتشر شده است`}>
          تا پاسخ مشتری، این نسخه ثابت می‌ماند و نسخهٔ تازه ساخته نمی‌شود. اگر مشتری درخواست اصلاح بدهد، می‌توانید نسخهٔ بعدی را ثبت کنید.
        </Banner>
      ) : (
        <div className="flex flex-col gap-4">
          <Banner tone="info" live="off" icon="info" title="Snapshot نمونهٔ نمایشی">
            در این نمونه، بارگذاری تصویر یا اتصال Figma وجود ندارد؛ یک Snapshot ثابت نمایشی به نسخه وصل می‌شود. در محصول واقعی تصویر و Checksum از فایل بارگذاری‌شده ساخته می‌شود.
          </Banner>
          <TextInput label="عنوان تحویل‌دادنی" required value={title} onChange={(e) => setTitle(e.target.value)} />
          <TextArea
            label="خلاصهٔ تغییرات"
            required={!!last}
            rows={3}
            value={note}
            onChange={(e) => {
              setNote(e.target.value)
              setErr(null)
            }}
            hint={last ? `نسبت به ${ltr(last.label)} چه چیزی تغییر کرده است؟` : 'اختیاری برای اولین نسخه.'}
            error={err}
          />
          {pending.length > 0 ? (
            <fieldset>
              <legend className="mb-1.5 text-ui font-semibold">این نسخه کدام تصمیم‌ها را اعمال می‌کند؟</legend>
              <div className="flex flex-col gap-1.5">
                {pending.map((d) => (
                  <label key={d.id} className="flex cursor-pointer items-start gap-2 rounded-control border border-line p-2.5 text-ui">
                    <input
                      type="checkbox"
                      className="mt-1.5 size-4 accent-[var(--color-ink)]"
                      checked={picked.includes(d.id)}
                      onChange={(e) => setPicked((p) => (e.target.checked ? [...p, d.id] : p.filter((x) => x !== d.id)))}
                    />
                    <span>
                      {d.summary}
                      <span className="block text-caption text-muted">تصمیم نهایی‌شده؛ هنوز در طرح اعمال نشده</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}
        </div>
      )}
    </Dialog>
  )
}
