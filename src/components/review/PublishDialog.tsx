import { useEffect, useState } from 'react'
import { blockingOpen, publishGates, signoffStatement } from '../../domain/project'
import type { ArtifactVersion, Project } from '../../domain/types'
import { fa, ltr } from '../../lib/format'
import { Banner } from '../ui/Banner'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Icon } from '../ui/Icon'
import { TextArea } from '../ui/FormField'

export function PublishDialog({
  open,
  onClose,
  project,
  version,
  onConfirm,
}: {
  open: boolean
  onClose: () => void
  project: Project
  version: ArtifactVersion
  onConfirm: (exceptionNote?: string) => void
}) {
  const gates = publishGates(project, version)
  const blocking = blockingOpen(project, version.id)
  const [note, setNote] = useState('')
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => {
    if (open) {
      setNote('')
      setErr(null)
    }
  }, [open])

  const hardFail = gates.filter((g) => g.id !== 'blocking' && !g.ok)

  const confirm = () => {
    if (blocking.length > 0 && note.trim() === '') return setErr('برای انتشار با بازخورد مسدودکنندهٔ باز، دلیل استثنا لازم است.')
    onConfirm(note)
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`آماده‌سازی نسخهٔ ${ltr(version.label)} برای مشتری`}
      description="پیش از انتشار، این شرط‌ها بررسی می‌شوند."
      footer={
        <>
          <Button variant="primary" icon="eye" disabled={hardFail.length > 0} onClick={confirm}>
            انتشار برای مشتری (نمایشی)
          </Button>
          <Button onClick={onClose}>انصراف</Button>
        </>
      }
    >
      <ul className="mb-4 flex flex-col gap-1.5">
        {gates.map((g) => (
          <li key={g.id} className="flex items-start gap-2 text-ui leading-7">
            <span className={`mt-1.5 shrink-0 ${g.ok ? 'text-ok' : g.id === 'blocking' ? 'text-warn' : 'text-err'}`}>
              <Icon name={g.ok ? 'check' : 'alert'} size={16} />
            </span>
            <span>
              {g.label}
              {g.detail ? <span className="block text-caption text-muted">{g.detail}</span> : null}
            </span>
          </li>
        ))}
      </ul>

      {blocking.length > 0 ? (
        <div className="mb-4">
          <Banner tone="warn" live="off" title={`${fa(blocking.length)} بازخورد مسدودکننده باز است`}>
            می‌توانید با ثبت دلیل، به‌صورت استثنا منتشر کنید. این دلیل همراه نسخه در سابقه می‌ماند.
          </Banner>
          <div className="mt-3">
            <TextArea label="دلیل استثنا" required rows={2} value={note} onChange={(e) => { setNote(e.target.value); setErr(null) }} error={err} />
          </div>
        </div>
      ) : null}

      <div className="rounded-control bg-canvas p-3 ring-1 ring-line">
        <p className="mb-1 text-caption font-bold">متنی که مشتری هنگام تأیید می‌بیند</p>
        <p className="text-ui leading-7 text-ink/90">{signoffStatement(project, version)}</p>
      </div>
      <p className="mt-3 text-caption text-muted">با انتشار، یک لینک محدود و قابل ابطال برای همین نسخه ساخته می‌شود (نمایشی؛ ایمیل یا پیام واقعی ارسال نمی‌شود) و نسخه ثابت می‌ماند.</p>
    </Dialog>
  )
}
