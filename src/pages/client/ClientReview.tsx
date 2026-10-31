import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { Feedback } from '../../domain/types'
import { fa, jalaliDate, newId } from '../../lib/format'
import { nowIso, useStore } from '../../state/store'
import { useClientAccess } from '../../state/useClientAccess'
import { InvalidAccess } from '../../components/client/InvalidAccess'
import { Receipt } from '../../components/client/Receipt'
import { SnapshotCanvas } from '../../components/review/SnapshotCanvas'
import { Badge } from '../../components/ui/Badge'
import { Banner } from '../../components/ui/Banner'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { TextArea } from '../../components/ui/FormField'
import { Icon } from '../../components/ui/Icon'
import { statementText } from '../../domain/project'
import { PageSkeleton } from '../../components/ui/PageSkeleton'
import { useDocumentTitle, useSimulatedLoad } from '../../lib/usePage'

export default function ClientReview() {
  const { accessId, versionId } = useParams()
  const { dispatch } = useStore()
  const { view } = useClientAccess(accessId)
  const loading = useSimulatedLoad(`cr:${accessId}`)
  useDocumentTitle(view ? `${view.version.title} · بازبینی` : 'لینک معتبر نیست')
  const [approveOpen, setApproveOpen] = useState(false)
  const [changesOpen, setChangesOpen] = useState(false)
  const [agree, setAgree] = useState(false)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [noteErr, setNoteErr] = useState<string | null>(null)
  const [fresh, setFresh] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)

  const feedback = useMemo<Feedback[]>(
    () =>
      (view?.feedback ?? []).map((f) => ({
        id: f.id, versionId: view?.version.id ?? '', seq: f.seq, author: '', authorRole: 'client' as const, text: f.text, createdAt: '',
        status: f.status, visibility: 'client' as const, blocking: false, pin: f.pin, comments: [], decisionIds: [],
      })),
    [view],
  )

  if (!view || view.version.id !== versionId) return <InvalidAccess reason="unknown" />
  if (view.state === 'expired' || view.state === 'revoked') return <InvalidAccess reason={view.state} />

  if (loading) return <PageSkeleton label="در حال بارگذاری نسخه" />
  const base = `/client/p/${accessId}`
  const v = view.version
  const active = view.state === 'active'
  const receipt = view.receipt
  const changesRequested = view.state === 'changes_requested'

  // بعد از تأیید: رسید پایدار جای صفحهٔ بررسی را می‌گیرد
  if (receipt) return <Receipt receipt={receipt} summaryHref={base} fresh={fresh} />

  const statement = statementText(view.projectName, v.title, v.label, v.id)

  const approve = () => {
    if (busy || !agree) return
    setBusy(true) // کلیک تکراری جلوگیری می‌شود؛ Reducer هم idempotent است
    dispatch({ type: 'clientApprove', accessId: accessId!, versionId: v.id, now: nowIso() })
    setFresh(true)
    setApproveOpen(false)
    setBusy(false)
  }

  const sendChanges = () => {
    if (note.trim() === '') return setNoteErr('بنویسید چه چیزی باید اصلاح شود.')
    dispatch({ type: 'clientRequestChanges', accessId: accessId!, versionId: v.id, note, feedbackId: newId('fb'), now: nowIso() })
    setChangesOpen(false)
  }

  return (
    <div className="fade-up">
      <Link to={base} className="mb-3 inline-flex min-h-11 items-center gap-1 text-ui text-muted hover:text-ink">
        <Icon name="back" size={16} />
        خلاصهٔ پروژه
      </Link>
      <p className="text-caption text-muted">{view.projectName}</p>
      <h1 className="mt-0.5 flex flex-wrap items-center gap-2 text-title leading-9">
        {v.title}
        <Badge tone="info">
          <bdi dir="ltr" translate="no">{v.label}</bdi>
        </Badge>
      </h1>
      <p className="mb-4 text-caption text-muted">
        شناسهٔ نسخه: <bdi dir="ltr" translate="no" className="font-mono text-label">{v.id}</bdi>
        {v.publishedAt ? ` · ارسال‌شده در ${jalaliDate(v.publishedAt)}` : ''}
      </p>

      {v.note ? <Banner tone="neutral" live="off" icon="info" title="چه چیزی تغییر کرده؟" className="mb-4">{v.note}</Banner> : null}

      <SnapshotCanvas snapshot={v.snapshot} feedback={feedback} selectedId={selected} onSelect={setSelected} addMode={false} onAddPin={() => undefined} showResolved />
      <p className="mt-2 text-label font-normal text-muted">تصویر ثابت همین نسخه است و تا پایان بررسی تغییر نمی‌کند. (نمونهٔ نمایشی)</p>

      {feedback.length > 0 ? (
        <section aria-labelledby="notes" className="mt-5">
          <h2 id="notes" className="mb-2 text-section">
            یادداشت‌های ثبت‌شده روی این نسخه
          </h2>
          <ul className="flex flex-col gap-2">
            {view.feedback.map((f) => (
              <li key={f.id} id={`note-${f.id}`} className={`rounded-card bg-surface p-3 text-ui leading-7 ${selected === f.id ? 'ring-2 ring-ink' : ''}`}>
                <button type="button" className="w-full text-start" onClick={() => setSelected(f.id)}>
                  <span className="me-2 inline-grid size-6 place-items-center rounded-full bg-ink text-label font-bold text-on-ink">{f.pin ? fa(f.seq) : '•'}</span>
                  {f.text}
                  {f.byClient ? <span className="ms-2 text-label font-normal text-muted">(از شما)</span> : null}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {changesRequested ? (
        <div className="mt-6">
          <Banner tone="info" title="درخواست اصلاح شما ارسال شد">
            این نسخه تأیید نشده است. استودیو نسخهٔ اصلاح‌شده را با لینک تازه برایتان می‌فرستد.
          </Banner>
        </div>
      ) : null}

      {/* اقدام‌ها */}
      {!changesRequested ? (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-[2px]">
          <div className="mx-auto max-w-[720px]">
            <div className="flex gap-2">
              <Button variant="primary" className="min-h-12 flex-1 px-2 text-body" icon="check" disabled={!active} aria-describedby="why-disabled" onClick={() => { setAgree(false); setApproveOpen(true) }}>
                تأیید این نسخه
              </Button>
              <Button className="min-h-12 flex-1 px-2 text-body" disabled={!active} onClick={() => { setNote(''); setNoteErr(null); setChangesOpen(true) }}>
                درخواست اصلاح
              </Button>
            </div>
            <p id="why-disabled" className="mt-1.5 text-center text-label font-normal text-muted">
              {active ? (
                <>
                  تأیید شما فقط برای نسخهٔ <bdi dir="ltr" translate="no">{v.label}</bdi> است.
                </>
              ) : (
                'این نسخه دیگر قابل تأیید نیست.'
              )}
            </p>
          </div>
        </div>
      ) : null}

      {/* S5: تأیید دومرحله‌ای */}
      <Dialog
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        title="تأیید نهایی این نسخه"
        description="لطفاً یک بار دیگر بررسی کنید دقیقاً چه چیزی را تأیید می‌کنید."
        footer={
          <>
            <Button variant="primary" icon="check" disabled={!agree || busy} loading={busy} onClick={approve}>
              تأیید و دریافت رسید
            </Button>
            <Button onClick={() => setApproveOpen(false)}>بازگشت</Button>
          </>
        }
      >
        <div className="rounded-control bg-canvas p-3 ring-1 ring-line">
          <p className="text-label font-normal text-muted">تحویل‌دادنی</p>
          <p className="text-section">{v.title}</p>
          <p className="mt-2 text-label font-normal text-muted">نسخه</p>
          <p className="text-heading">
            <bdi dir="ltr" translate="no">{v.label}</bdi>
          </p>
          <p className="break-all text-label font-normal text-muted">
            شناسه: <bdi dir="ltr" translate="no" className="font-mono">{v.id}</bdi>
          </p>
        </div>
        <p className="mt-3 text-ui leading-7">{statement}</p>
        <label className="mt-3 flex min-h-11 cursor-pointer items-start gap-2 rounded-control border border-line-strong p-3 text-ui">
          <input type="checkbox" className="mt-1.5 size-4 accent-[var(--color-ink)]" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          متن بالا را خوانده‌ام و برای همین نسخه تأیید می‌کنم.
        </label>
        <p className="mt-3 text-label font-normal leading-6 text-muted">این تأیید در سنجاق ثبت می‌شود و رسید دارد؛ امضای حقوقی یا جایگزین قرارداد نیست.</p>
      </Dialog>

      <Dialog
        open={changesOpen}
        onClose={() => setChangesOpen(false)}
        title="درخواست اصلاح"
        description="چیزی تأیید نمی‌شود؛ توضیح شما برای استودیو فرستاده می‌شود."
        footer={
          <>
            <Button variant="primary" onClick={sendChanges}>
              ارسال درخواست اصلاح
            </Button>
            <Button onClick={() => setChangesOpen(false)}>انصراف</Button>
          </>
        }
      >
        <TextArea
          label="چه چیزی باید اصلاح شود؟"
          required
          rows={4}
          value={note}
          onChange={(e) => {
            setNote(e.target.value)
            setNoteErr(null)
          }}
          error={noteErr}
          placeholder="مثلاً: متن دکمهٔ پرداخت هنوز مبهم است…"
        />
      </Dialog>
    </div>
  )
}
