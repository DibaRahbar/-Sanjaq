import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  FEEDBACK_STATUS,
  VERSION_STATUS,
  blockingOpen,
  feedbackOf,
  latestVersion,
  openFeedback,
} from '../domain/project'
import { OUTCOME_LABEL, roleName, type Feedback, type FeedbackStatus, type Project } from '../domain/types'
import { accessToken, fa, jalaliDateTime, ltr, newId, relativeTime } from '../lib/format'
import { Badge } from '../components/ui/Badge'
import { Banner } from '../components/ui/Banner'
import { Button, ButtonLink } from '../components/ui/Button'
import { Dialog } from '../components/ui/Dialog'
import { Icon } from '../components/ui/Icon'
import { Avatar, EmptyState } from '../components/ui/Misc'
import { ProjectHeader } from '../components/layout/ProjectHeader'
import { DecisionDialog, type DecisionPreset } from '../components/decisions/DecisionDialog'
import { AddVersionDialog } from '../components/review/AddVersionDialog'
import { PinDialog, type PinDraft } from '../components/review/PinDialog'
import { ChangeWarningDialog } from '../components/changes/ChangeWarningDialog'
import { InvitePanel } from '../components/review/InvitePanel'
import { PublishDialog } from '../components/review/PublishDialog'
import { SnapshotCanvas } from '../components/review/SnapshotCanvas'
import { canApproveRole } from '../state/reducer'
import { PageSkeleton } from '../components/ui/PageSkeleton'
import { useDocumentTitle, useSimulatedLoad } from '../lib/usePage'
import { nowIso, useStore } from '../state/store'

type StatusFilter = 'all' | 'open' | 'resolved'
type VisFilter = 'all' | 'internal' | 'client'

function FeedbackCard({
  f,
  project,
  selected,
  onSelect,
  onStatus,
  onComment,
  onDecision,
  decisionsHref,
}: {
  f: Feedback
  project: Project
  selected: boolean
  onSelect: () => void
  onStatus: (s: FeedbackStatus) => void
  onComment: (text: string) => void
  onDecision: () => void
  decisionsHref: string
}) {
  const [replying, setReplying] = useState(false)
  const [text, setText] = useState('')
  const linked = project.decisions.filter((d) => f.decisionIds.includes(d.id))
  const st = FEEDBACK_STATUS[f.status]

  return (
    <li
      id={`fb-${f.id}`}
      className={`rounded-card bg-surface p-3.5 transition-shadow ${selected ? 'ring-2 ring-ink' : ''} ${f.status === 'resolved' ? 'opacity-90' : ''}`}
    >
      <div className="flex items-start gap-2.5">
        <button
          type="button"
          onClick={onSelect}
          aria-label={`انتخاب بازخورد ${fa(f.seq)}`}
          className={`grid size-8 shrink-0 place-items-center rounded-full text-caption font-bold ${f.pin ? (f.blocking && f.status !== 'resolved' ? 'bg-err-solid text-white' : f.status === 'resolved' ? 'bg-ok-soft text-ok ring-1 ring-ok' : 'bg-ink text-on-ink') : 'bg-sunken text-muted ring-1 ring-line-strong'}`}
        >
          {f.pin ? fa(f.seq) : <Icon name="doc" size={14} />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-caption">
            <Avatar name={f.author} size={20} />
            <span className="font-semibold">{f.author}</span>
            <span className="text-muted">
              {roleName(f.authorRole)} · {relativeTime(f.createdAt)}
            </span>
          </div>
          <p className="mt-1 text-ui leading-7">{f.text}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Badge tone={st.tone}>{st.label}</Badge>
            <Badge tone={f.visibility === 'client' ? 'ai' : 'neutral'} icon={f.visibility === 'client' ? 'eye' : 'lock'}>
              {f.visibility === 'client' ? 'قابل رؤیت برای مشتری' : 'داخلی'}
            </Badge>
            {f.blocking ? <Badge tone="err" icon="alert">مسدودکننده</Badge> : null}
            {!f.pin ? <Badge tone="neutral">عمومی</Badge> : null}
          </div>
          {linked.length > 0 ? (
            <ul className="mt-2 flex flex-col gap-1">
              {linked.map((d) => (
                <li key={d.id}>
                  <Link to={`${decisionsHref}?decision=${d.id}`} className="inline-flex items-center gap-1.5 text-caption font-semibold text-ai underline-offset-2 hover:underline">
                    <Icon name="check" size={14} />
                    تصمیم ({d.status === 'draft' ? 'پیش‌نویس' : d.status === 'final' ? 'نهایی' : 'جایگزین‌شده'}): {d.summary} · {OUTCOME_LABEL[d.outcome]}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}

          {f.comments.length > 0 ? (
            <ul className="mt-2 flex flex-col gap-1.5 border-s-2 border-line ps-3" aria-label="گفت‌وگو">
              {f.comments.map((c) => (
                <li key={c.id} className="text-caption leading-6">
                  <span className="font-semibold">{c.author}</span>
                  <span className="text-muted"> · {relativeTime(c.createdAt)}</span>
                  <p>{c.text}</p>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor={`st-${f.id}`}>
              وضعیت بازخورد {fa(f.seq)}
            </label>
            <select
              id={`st-${f.id}`}
              value={f.status}
              onChange={(e) => onStatus(e.target.value as FeedbackStatus)}
              className="min-h-11 rounded-control border border-line-strong bg-surface px-2 text-caption"
            >
              {(Object.keys(FEEDBACK_STATUS) as FeedbackStatus[]).map((s) => (
                <option key={s} value={s}>
                  {FEEDBACK_STATUS[s].label}
                </option>
              ))}
            </select>
            <Button size="sm" variant="ghost" onClick={() => setReplying((v) => !v)} aria-expanded={replying}>
              پاسخ
            </Button>
            <Button size="sm" variant="secondary" onClick={onDecision}>
              ثبت تصمیم
            </Button>
          </div>
          {replying ? (
            <form
              className="mt-2 flex flex-col gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                if (!text.trim()) return
                onComment(text)
                setText('')
                setReplying(false)
              }}
            >
              <label className="sr-only" htmlFor={`rp-${f.id}`}>
                پاسخ به بازخورد {fa(f.seq)}
              </label>
              <textarea
                id={`rp-${f.id}`}
                rows={2}
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full rounded-control border border-line-strong bg-surface px-3 py-2 text-ui leading-7"
                placeholder="پاسخ یا توضیح…"
              />
              <div className="flex gap-2">
                <Button size="sm" variant="primary" type="submit" disabled={!text.trim()}>
                  ثبت پاسخ
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setReplying(false)}>
                  انصراف
                </Button>
              </div>
            </form>
          ) : null}
        </div>
      </div>
    </li>
  )
}

export default function DesignReview() {
  const { projectId, versionId } = useParams()
  const { getProject, dispatch, role } = useStore()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const project = getProject(projectId)
  const version = project?.versions.find((v) => v.id === versionId)

  const [selectedId, setSelectedId] = useState<string | null>(params.get('feedback'))
  const [addMode, setAddMode] = useState(false)
  const [pinDialog, setPinDialog] = useState<{ open: boolean; pin: { x: number; y: number } | null }>({ open: false, pin: null })
  /* فیلترهای بازخورد در نشانی می‌مانند */
  const statusParam = params.get('status')
  const statusFilter: StatusFilter = statusParam === 'open' || statusParam === 'resolved' ? statusParam : 'all'
  const visParam = params.get('vis')
  const visFilter: VisFilter = visParam === 'internal' || visParam === 'client' ? visParam : 'all'
  const patchFilters = (patch: { status?: StatusFilter; vis?: VisFilter }) =>
    setParams(
      (prev) => {
        const n = new URLSearchParams(prev)
        for (const [k, v] of Object.entries(patch)) {
          if (v === 'all') n.delete(k)
          else n.set(k, v)
        }
        return n
      },
      { replace: true },
    )
  const setStatusFilter = (v: StatusFilter) => patchFilters({ status: v })
  const setVisFilter = (v: VisFilter) => patchFilters({ vis: v })
  const resetFilters = () => patchFilters({ status: 'all', vis: 'all' })
  const [showResolved, setShowResolved] = useState(true)
  const [publishOpen, setPublishOpen] = useState(params.get('publish') === '1')
  const [addVersionOpen, setAddVersionOpen] = useState(false)
  const [warnOpen, setWarnOpen] = useState(false)
  const [revokeId, setRevokeId] = useState<string | null>(null)
  const [decisionOpen, setDecisionOpen] = useState<DecisionPreset | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const loading = useSimulatedLoad(`review:${projectId}`)
  useDocumentTitle(project ? `${project.name} · بازبینی طرح` : 'پروژه پیدا نشد')

  useEffect(() => {
    // انتخاب نسخهٔ دیگر Pinهای نسخهٔ قبلی را به نسخهٔ جدید منتقل نمی‌کند.
    setSelectedId(params.get('feedback'))
    setAddMode(false)
    setNotice(null)
  }, [versionId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedId) return
    document.getElementById(`fb-${selectedId}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selectedId])

  const all = useMemo(() => (project && version ? feedbackOf(project, version.id) : []), [project, version])
  const shown = all.filter(
    (f) =>
      (statusFilter === 'all' || (statusFilter === 'open' ? f.status !== 'resolved' : f.status === 'resolved')) &&
      (visFilter === 'all' || f.visibility === visFilter),
  )

  if (!project) {
    return (
      <div className="mx-auto max-w-xl pt-8">
        <EmptyState level={1} icon="lock" title="این پروژه پیدا نشد یا به آن دسترسی ندارید" actions={<ButtonLink to="/studio/projects" variant="primary">بازگشت به پروژه‌ها</ButtonLink>} />
      </div>
    )
  }
  if (loading) return <PageSkeleton />
  const base = `/studio/projects/${project.id}`

  if (!version) {
    return (
      <div className="fade-up">
        <ProjectHeader project={project} active="review" />
        <EmptyState
          icon="pin"
          title={project.versions.length === 0 ? 'هنوز نسخهٔ طرحی ثبت نشده است' : 'این نسخه پیدا نشد'}
          actions={
            <ButtonLink to={base} variant="primary">
              {project.versions.length === 0 ? 'رفتن به نمای کلی و افزودن نسخه' : 'بازگشت به نمای کلی'}
            </ButtonLink>
          }
        >
          {project.versions.length === 0 ? 'بازخورد همیشه به یک نسخهٔ مشخص وصل می‌شود؛ ابتدا نسخه را اضافه کنید.' : 'شناسهٔ نسخه در این پروژه وجود ندارد.'}
        </EmptyState>
      </div>
    )
  }

  const latest = latestVersion(project)
  const isLatest = latest?.id === version.id
  const canManage = canApproveRole(role)
  const superseded = version.status === 'superseded'
  const readOnly = superseded || version.status === 'approved'
  const published = version.status === 'client_review'
  const blocking = blockingOpen(project, version.id)
  const openCount = openFeedback(project, version.id).length
  const implemented = project.decisions.filter((d) => version.implementsDecisionIds.includes(d.id))
  const vs = VERSION_STATUS[version.status]

  const clientVisibleAllowed = canManage && !published
  const clientVisibleReason = !canManage
    ? 'طراح فقط بازخورد داخلی ثبت می‌کند؛ قابل‌رؤیت‌کردن برای مشتری با مدیر پروژه یا مدیر استودیو است.'
    : 'این نسخه برای مشتری منتشر شده و ثابت است؛ بازخورد تازه فقط داخلی ثبت می‌شود.'

  const closeParam = (key: string) => {
    if (!params.get(key)) return
    const n = new URLSearchParams(params)
    n.delete(key)
    setParams(n, { replace: true })
  }

  const savePin = (d: PinDraft) => {
    const id = newId('fb')
    dispatch({ type: 'addFeedback', projectId: project.id, feedbackId: id, versionId: version.id, text: d.text, pin: d.pin, visibility: d.visibility, blocking: d.blocking, now: nowIso() })
    setPinDialog({ open: false, pin: null })
    setAddMode(false)
    setSelectedId(id)
    resetFilters()
    setNotice('بازخورد ثبت شد و به همین نسخه وصل است.')
  }

  return (
    <div className="fade-up">
      <ProjectHeader project={project} active="review" />

      {/* نوار نسخه */}
      <section aria-label="نسخه‌ها" className="mb-4 flex flex-col gap-3 rounded-card bg-surface p-4 shadow-card lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-section">{version.artifactTitle}</h2>
            <Badge tone={vs.tone}>{vs.label}</Badge>
          </div>
          <p className="mt-0.5 text-caption text-muted">
            ثبت‌شده توسط {version.createdBy} · {jalaliDateTime(version.createdAt)}
          </p>
          {version.note ? <p className="mt-1 text-ui leading-7">تغییرات: {version.note}</p> : null}
          <details className="group mt-1">
            <summary className="inline-flex min-h-6 cursor-pointer list-none items-center gap-1 rounded-control text-label font-normal text-muted hover:text-ink [&::-webkit-details-marker]:hidden">
              <Icon name="back" size={14} className="transition-transform group-open:-rotate-90" />
              جزئیات فنی نسخه
            </summary>
            <dl className="mt-1.5 grid gap-x-3 gap-y-1 text-label font-normal text-muted sm:grid-cols-[auto_1fr]">
              <dt>شناسهٔ نسخه</dt>
              <dd>
                <bdi dir="ltr" translate="no" className="font-mono">{version.id}</bdi>
              </dd>
              <dt>Checksum (نمایشی)</dt>
              <dd className="min-w-0 break-all">
                <bdi dir="ltr" translate="no" className="font-mono">{version.checksum}</bdi>
              </dd>
            </dl>
          </details>
          {implemented.length > 0 ? (
            <p className="mt-1 text-caption">
              این نسخه تصمیم‌های زیر را اعمال می‌کند:{' '}
              {implemented.map((d) => (
                <Link key={d.id} to={`${base}/decisions?decision=${d.id}`} className="font-semibold text-ai underline underline-offset-2">
                  {d.summary}
                </Link>
              ))}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col items-start gap-2 lg:items-end">
          <div role="group" aria-label="انتخاب نسخه" className="flex flex-wrap gap-1.5">
            {project.versions.map((v) => (
              <Link
                key={v.id}
                to={`${base}/review/${v.id}`}
                aria-current={v.id === version.id ? 'page' : undefined}
                className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 text-caption font-semibold ${v.id === version.id ? 'border-ink bg-ink text-on-ink' : 'border-line-strong bg-surface hover:bg-sunken'}`}
              >
                <bdi dir="ltr" translate="no">{v.label}</bdi>
                <span className={`text-label font-normal ${v.id === version.id ? 'text-on-ink/75' : 'text-muted'}`}>{VERSION_STATUS[v.status].label}</span>
              </Link>
            ))}
            <Button size="sm" icon="plus" onClick={() => (latest?.status === 'approved' ? setWarnOpen(true) : setAddVersionOpen(true))}>
              نسخهٔ جدید
            </Button>
          </div>
        </div>
      </section>

      {superseded ? (
        <div className="mb-4">
          <Banner
            tone="neutral"
            icon="lock"
            title={`نسخهٔ ${ltr(version.label)} جایگزین شده است`}
            actions={latest ? <ButtonLink size="sm" to={`${base}/review/${latest.id}`}>رفتن به {ltr(latest.label)}</ButtonLink> : undefined}
          >
            بازخوردهای این نسخه برای ردیابی باقی مانده‌اند، اما بازخورد تازه باید روی آخرین نسخه ثبت شود.
          </Banner>
        </div>
      ) : null}
      {published ? (
        <div className="mb-4">
          <Banner tone="ai" icon="eye" title={`این نسخه برای مشتری منتشر شده است · ${version.publishedBy ?? ''}`}>
            Snapshot ثابت است. بازخورد تازه فقط داخلی ثبت می‌شود و مشتری آن را نمی‌بیند.
            {version.publishException ? ` استثنای ثبت‌شده: ${version.publishException}` : ''}
          </Banner>
        </div>
      ) : null}

      {version.status === 'approved' ? (
        <div className="mb-4">
          <Banner tone="ok" icon="lock" title={`مشتری نسخهٔ ${ltr(version.label)} را تأیید کرد`}>
            این نسخه قفل است و رسید تأیید ثبت شده. هر تغییر بعدی باید با درخواست تغییر انجام شود، نه با دستکاری این نسخه یا تأیید.
          </Banner>
        </div>
      ) : null}
      {version.status === 'changes_requested' ? (
        <div className="mb-4">
          <Banner tone="warn" title={`مشتری برای نسخهٔ ${ltr(version.label)} درخواست اصلاح داد`}>
            توضیح او به‌عنوان بازخورد مسدودکننده در فهرست بازخوردها ثبت شده است. اصلاح را در نسخهٔ جدید انجام دهید.
          </Banner>
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
        {/* بوم */}
        <section aria-label="Snapshot نسخه" className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Button
              variant={addMode ? 'primary' : 'secondary'}
              icon="plus"
              disabled={readOnly}
              aria-pressed={addMode}
              onClick={() => {
                setAddMode((v) => !v)
                setNotice(null)
              }}
            >
              {addMode ? 'لغو انتخاب نقطه' : 'افزودن بازخورد روی طرح'}
            </Button>
            <Button variant="ghost" disabled={readOnly} onClick={() => setPinDialog({ open: true, pin: null })}>
              بازخورد عمومی
            </Button>
            <label className="ms-auto flex min-h-11 cursor-pointer items-center gap-2 text-caption text-muted">
              <input type="checkbox" className="size-4 accent-[var(--color-ink)]" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} />
              نمایش Pinهای حل‌شده
            </label>
          </div>
          {addMode ? (
            <p className="mb-2 flex items-center gap-1.5 text-caption font-semibold text-ai" role="status">
              <Icon name="info" size={14} />
              روی نقطهٔ موردنظر در تصویر کلیک کنید. (برای صفحه‌کلید: Tab تا دکمهٔ روی تصویر، سپس Enter و تنظیم مختصات در پنجرهٔ بعد.)
            </p>
          ) : null}
          <SnapshotCanvas
            snapshot={version.snapshot}
            feedback={all}
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id)
              resetFilters()
            }}
            addMode={addMode && !readOnly}
            onAddPin={(pin) => setPinDialog({ open: true, pin })}
            showResolved={showResolved}
          />
          <p className="mt-2 text-label font-normal text-muted">تصویر نمونهٔ نمایشی است (Figma یا بارگذاری واقعی وجود ندارد). مختصات Pin نسبت به خود تصویر ذخیره می‌شود و با تغییر اندازه جابه‌جا نمی‌شود.</p>
          <p className="sr-only" role="status" aria-live="polite">
            {notice}
          </p>
          {notice ? (
            <p className="mt-2 flex items-center gap-1.5 text-caption font-semibold text-ok">
              <Icon name="check" size={14} />
              {notice}
            </p>
          ) : null}
        </section>

        {/* پنل بازخورد */}
        <aside aria-label="بازخوردها" className="min-w-0 xl:sticky xl:top-6 xl:max-h-[calc(100dvh-3rem)] xl:overflow-y-auto xl:pe-1">
          <div className="mb-3 rounded-card bg-surface p-4 shadow-card">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-section">بازخوردها</h2>
              <span className="text-caption text-muted">
                {fa(openCount)} باز · {fa(all.length)} کل
              </span>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5" role="radiogroup" aria-label="فیلتر وضعیت">
              {(
                [
                  ['all', 'همه'],
                  ['open', 'باز'],
                  ['resolved', 'حل‌شده'],
                ] as const
              ).map(([v, l]) => (
                <button key={v} type="button" role="radio" aria-checked={statusFilter === v} onClick={() => setStatusFilter(v)} className={`min-h-10 rounded-full border px-3 text-caption ${statusFilter === v ? 'border-ink bg-ink text-on-ink' : 'border-line-strong bg-surface hover:bg-sunken'}`}>
                  {l}
                </button>
              ))}
              <span className="mx-1 w-px bg-line" aria-hidden="true" />
              {(
                [
                  ['all', 'همهٔ رؤیت‌ها'],
                  ['internal', 'داخلی'],
                  ['client', 'قابل رؤیت برای مشتری'],
                ] as const
              ).map(([v, l]) => (
                <button key={v} type="button" role="radio" aria-checked={visFilter === v} onClick={() => setVisFilter(v)} className={`min-h-10 rounded-full border px-3 text-caption ${visFilter === v ? 'border-ink bg-ink text-on-ink' : 'border-line-strong bg-surface hover:bg-sunken'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {blocking.length > 0 ? (
            <div className="mb-3">
              <Banner tone="warn" live="off" title={`${fa(blocking.length)} بازخورد مسدودکننده باز است`}>
                قبل از انتشار برای مشتری باید رفع شود یا PM دلیل استثنا ثبت کند.
              </Banner>
            </div>
          ) : null}

          {all.length === 0 ? (
            <div className="rounded-card border-2 border-dashed border-line-strong p-5 text-center text-ui text-muted">
              هنوز بازخوردی روی نسخهٔ <bdi dir="ltr" translate="no">{version.label}</bdi> نیست. با «افزودن بازخورد روی طرح» اولین نقطه را مشخص کنید.
            </div>
          ) : shown.length === 0 ? (
            <div className="rounded-card border-2 border-dashed border-line-strong p-5 text-center text-ui text-muted">
              با این فیلتر بازخوردی نیست.{' '}
              <button type="button" className="underline underline-offset-2" onClick={resetFilters}>
                پاک‌کردن فیلتر
              </button>
            </div>
          ) : (
            <ul ref={listRef} className="flex flex-col gap-2.5">
              {shown.map((f) => (
                <FeedbackCard
                  key={f.id}
                  f={f}
                  project={project}
                  selected={f.id === selectedId}
                  onSelect={() => setSelectedId(f.id)}
                  onStatus={(s) => dispatch({ type: 'setFeedbackStatus', projectId: project.id, feedbackId: f.id, status: s, now: nowIso() })}
                  onComment={(text) => dispatch({ type: 'addComment', projectId: project.id, feedbackId: f.id, commentId: newId('cm'), text, now: nowIso() })}
                  onDecision={() => setDecisionOpen({ versionId: version.id, feedbackIds: [f.id] })}
                  decisionsHref={`${base}/decisions`}
                />
              ))}
            </ul>
          )}

          {/* انتشار */}
          <section aria-labelledby="pub" className="mt-4 rounded-card bg-lime p-4 [&_.text-muted]:text-ink-soft [&_.text-warn]:text-warn">
            <h2 id="pub" className="mb-1 text-body font-bold">
              آماده برای مشتری
            </h2>
            {published ? (
              <p className="text-ui text-muted">این نسخه منتشر شده است. لینک و وضعیت مشتری را در بخش «لینک مشتری» ببینید.</p>
            ) : (
              <>
                <p className="text-caption leading-6 text-muted">فقط مدیر پروژه یا مدیر استودیو می‌تواند نسخه را منتشر کند. قبل از انتشار، شرط‌ها نمایش داده می‌شود.</p>
                <Button
                  className="mt-3 w-full"
                  variant="primary"
                  icon="eye"
                  disabled={!canManage || !isLatest || version.status !== 'internal_review'}
                  aria-describedby="pub-why"
                  onClick={() => setPublishOpen(true)}
                >
                  آماده برای مشتری
                </Button>
                <p id="pub-why" className="mt-1.5 text-label font-normal text-warn">
                  {!canManage ? 'فقط مدیر پروژه یا مدیر استودیو.' : !isLatest ? 'فقط آخرین نسخه قابل انتشار است.' : ''}
                </p>
              </>
            )}
          </section>

          <InvitePanel
            project={project}
            version={version}
            canManage={canManage}
            onRevoke={(inviteId) => setRevokeId(inviteId)}
            onReissue={() => dispatch({ type: 'reissueInvite', projectId: project.id, versionId: version.id, accessId: accessToken(), now: nowIso() })}
            onExpire={(inviteId) => dispatch({ type: 'simulateExpiry', projectId: project.id, inviteId, now: nowIso() })}
          />
        </aside>
      </div>

      <PinDialog
        open={pinDialog.open}
        onClose={() => setPinDialog({ open: false, pin: null })}
        onSave={savePin}
        versionLabel={version.label}
        snapshot={version.snapshot}
        initialPin={pinDialog.pin}
        clientVisibleAllowed={clientVisibleAllowed}
        clientVisibleReason={clientVisibleReason}
      />

      <PublishDialog
        open={publishOpen}
        onClose={() => {
          setPublishOpen(false)
          closeParam('publish')
        }}
        project={project}
        version={version}
        onConfirm={(note) => {
          dispatch({ type: 'publishVersion', projectId: project.id, versionId: version.id, accessId: accessToken(), exceptionNote: note, now: nowIso() })
          setPublishOpen(false)
          closeParam('publish')
          setNotice(`نسخهٔ ${ltr(version.label)} برای مشتری منتشر شد (نمایشی).`)
        }}
      />

      <Dialog
        open={revokeId !== null}
        onClose={() => setRevokeId(null)}
        tone="warn"
        title="لینک مشتری باطل شود؟"
        description="مشتری دیگر با این لینک نمی‌تواند نسخه را ببیند یا تأیید کند. برای دسترسی دوباره باید لینک تازه بسازید."
        footer={
          <>
            <Button onClick={() => setRevokeId(null)}>انصراف</Button>
            <Button
              variant="danger"
              onClick={() => {
                if (revokeId) dispatch({ type: 'revokeInvite', projectId: project.id, inviteId: revokeId, now: nowIso() })
                setRevokeId(null)
              }}
            >
              ابطال لینک
            </Button>
          </>
        }
      >
        <p className="text-body text-ink-soft">ابطال لینک برگشت‌پذیر نیست؛ فقط لینک تازه جایگزین آن می‌شود.</p>
      </Dialog>

      <ChangeWarningDialog open={warnOpen} onClose={() => setWarnOpen(false)} project={project} attempt="افزودن نسخهٔ جدید یا ویرایش نسخهٔ تأییدشده" onCreate={() => navigate(`${base}/changes?new=1`)} />

      <AddVersionDialog
        open={addVersionOpen}
        onClose={() => setAddVersionOpen(false)}
        project={project}
        onSubmit={(v) => {
          const id = newId('av')
          dispatch({ type: 'addVersion', projectId: project.id, versionId: id, note: v.note, artifactTitle: v.artifactTitle, implementsDecisionIds: v.implementsDecisionIds, now: nowIso() })
          setAddVersionOpen(false)
          navigate(`${base}/review/${id}`)
        }}
      />

      <DecisionDialog
        open={decisionOpen !== null}
        onClose={() => setDecisionOpen(null)}
        project={project}
        role={role}
        preset={decisionOpen ?? {}}
        onSubmit={(v, finalize) => {
          const id = newId('dec')
          dispatch({ type: 'createDecision', projectId: project.id, decisionId: id, ...v, finalize, now: nowIso() })
          setDecisionOpen(null)
          setNotice(finalize && canManage ? 'تصمیم نهایی شد و بازخوردهای مرتبط حل شدند.' : 'پیش‌نویس تصمیم ذخیره شد.')
        }}
      />
    </div>
  )
}
