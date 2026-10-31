import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { mockAnalyze } from '../domain/fixtures'
import { FIELD_ORDER, canApprove, compactDoc, validateScope, type Guard } from '../domain/scope'
import type { FieldKey, Project, ScopeFields, UnknownResolution } from '../domain/types'
import { fa, jalaliDateTime, ltr, relativeTime } from '../lib/format'
import { Banner } from '../components/ui/Banner'
import { Badge } from '../components/ui/Badge'
import { Button, ButtonLink } from '../components/ui/Button'
import { Icon } from '../components/ui/Icon'
import { EmptyState } from '../components/ui/Misc'
import { ProjectHeader } from '../components/layout/ProjectHeader'
import { ChangeWarningDialog } from '../components/changes/ChangeWarningDialog'
import { ApprovalDialog, Readiness } from '../components/scope/Approval'
import { FieldCard } from '../components/scope/FieldCard'
import { SidePanel } from '../components/scope/SidePanel'
import { isEditable, isLocked, latestBaseline, canApproveRole } from '../state/reducer'
import { useDocumentTitle } from '../lib/usePage'
import { ANALYSIS_MS, nowIso, useStore } from '../state/store'

const STEPS = ['خواندن متن بریف', 'استخراج هدف، خروجی‌ها و محدودیت‌ها', 'یافتن شاهد برای هر مورد', 'علامت‌زدن ابهام‌ها']

function ProcessingPanel({ project, onManual }: { project: Project; onManual: () => void }) {
  const [elapsed, setElapsed] = useState(() => Date.now() - new Date(project.analysis.startedAt ?? Date.now()).getTime())
  useEffect(() => {
    const t = window.setInterval(() => setElapsed(Date.now() - new Date(project.analysis.startedAt ?? Date.now()).getTime()), 250)
    return () => window.clearInterval(t)
  }, [project.analysis.startedAt])
  const stepIdx = Math.min(STEPS.length - 1, Math.floor((elapsed / ANALYSIS_MS) * STEPS.length))
  const startedAgo = Math.max(0, ANALYSIS_MS - elapsed)

  return (
    <section aria-labelledby="proc-title" className="fade-up rounded-card bg-lav p-6 [&_.text-muted]:text-ink-soft sm:p-8">
      <div className="mx-auto max-w-xl">
        <div className="mb-1 flex items-center gap-2 text-ai">
          <Icon name="spark" size={20} />
          <span className="text-caption font-semibold">تحلیل نمایشی (Mock)</span>
        </div>
        <h2 id="proc-title" className="text-heading leading-8">
          در حال تحلیل بریف…
        </h2>
        <p className="mt-1 text-ui leading-7 text-muted">
          خروجی این مرحله فقط یک پیش‌نویس پیشنهادی است و تا وقتی شما بازبینی و تأیید نکنید، چیزی نهایی نمی‌شود.
        </p>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-sunken" role="progressbar" aria-label="پیشرفت تحلیل" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(99, Math.round((elapsed / ANALYSIS_MS) * 100))}>
          <div className="h-full origin-right rounded-full bg-ink" style={{ transform: `scaleX(${Math.min(1, Math.max(0.04, elapsed / ANALYSIS_MS))})`, transition: 'transform .25s linear' }} />
        </div>
        <ol className="mt-4 flex flex-col gap-1.5" aria-live="polite">
          {STEPS.map((s, i) => (
            <li key={s} className={`flex items-center gap-2 text-ui ${i < stepIdx ? 'text-ink/70' : i === stepIdx ? 'font-semibold text-ink' : 'text-muted'}`}>
              <span className={`grid size-5 place-items-center rounded-full ${i < stepIdx ? 'bg-ok-solid text-white' : i === stepIdx ? 'bg-ink text-on-ink' : 'bg-sunken'}`}>
                {i < stepIdx ? <Icon name="check" size={14} /> : i === stepIdx ? <span className="size-2 animate-pulse rounded-full bg-white" /> : null}
              </span>
              {s}
            </li>
          ))}
        </ol>
        <p className="mt-4 text-caption text-muted">حدود {fa(Math.max(1, Math.ceil(startedAgo / 1000)))} ثانیهٔ دیگر. می‌توانید از این صفحه بروید؛ تحلیل در پس‌زمینه ادامه پیدا می‌کند و وضعیت پروژه در فهرست به‌روز می‌شود.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={onManual}>
            ادامه با ویرایش دستی
          </Button>
          <ButtonLink to="/studio/projects" variant="ghost">
            بازگشت به پروژه‌ها
          </ButtonLink>
        </div>
      </div>
    </section>
  )
}

export default function BriefScope() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { getProject, dispatch, role } = useStore()
  const project = getProject(projectId)

  const [activeField, setActiveField] = useState<FieldKey>('goal')
  const [showEditorWhileProcessing, setShowEditorWhileProcessing] = useState(false)
  const [approvalOpen, setApprovalOpen] = useState(false)
  const [showProblems, setShowProblems] = useState(false)
  const [justApproved, setJustApproved] = useState<number | null>(null)
  const [warnOpen, setWarnOpen] = useState(false)

  useEffect(() => {
    setShowEditorWhileProcessing(false)
    setShowProblems(false)
    setJustApproved(null)
    setActiveField('goal')
  }, [projectId])

  const scope = project?.scope ?? null
  useDocumentTitle(project ? `${project.name} · بریف و محدوده` : 'پروژه پیدا نشد')
  const guards = useMemo(() => (scope ? validateScope(compactDoc(scope)) : []), [scope])

  if (!project) {
    return (
      <div className="fade-up mx-auto max-w-xl pt-8">
        <EmptyState level={1} icon="lock" title="این پروژه پیدا نشد یا به آن دسترسی ندارید" actions={<ButtonLink to="/studio/projects" variant="primary">بازگشت به پروژه‌ها</ButtonLink>}>
          ممکن است نشانی اشتباه باشد، پروژه حذف شده باشد یا دادهٔ نمونه بازنشانی شده باشد. هیچ اطلاعات دیگری از پروژه نمایش داده نمی‌شود.
        </EmptyState>
      </div>
    )
  }

  const now = () => nowIso()
  const locked = isLocked(project)
  const editable = isEditable(project)
  const base = latestBaseline(project)
  const status = project.analysis.status
  const processing = status === 'processing'
  const showEditor = scope !== null && !(processing && !showEditorWhileProcessing)
  const canApproveHere = canApproveRole(role)
  const sampleAvailable = project.brief ? mockAnalyze(project.brief) !== null : false
  const nextVersion = (base?.version ?? 0) + 1
  const flaggedFields = new Set<FieldKey>(showProblems ? guards.filter((g) => !g.ok).map((g) => g.field) : [])

  const jump = (key: FieldKey) => {
    setActiveField(key)
    const el = document.getElementById(`field-${key}`)
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    window.setTimeout(() => el?.querySelector<HTMLElement>('textarea, input, button[id]')?.focus({ preventScroll: true }), 250)
  }

  const onChange = <K extends FieldKey>(key: K, value: ScopeFields[K]['value']) =>
    dispatch({ type: 'editField', projectId: project.id, key, value: value as never, now: now() })

  const tryApprove = () => {
    if (!scope) return
    if (!canApprove(compactDoc(scope))) {
      setShowProblems(true)
      const first = guards.find((g) => !g.ok)
      if (first) jump(first.field)
      return
    }
    setShowProblems(false)
    setApprovalOpen(true)
  }

  const confirm = () => {
    setApprovalOpen(false)
    dispatch({ type: 'approveScope', projectId: project.id, now: now() })
    setJustApproved(nextVersion)
  }

  const onResolve = (unknownId: string, resolution: UnknownResolution) =>
    dispatch({ type: 'resolveUnknown', projectId: project.id, unknownId, resolution, now: now() })

  /* ---------- بنر وضعیت تحلیل ---------- */
  let analysisBanner = null
  if (!locked) {
    if (status === 'error') {
      analysisBanner = (
        <Banner
          tone="err"
          live="assertive"
          title="تحلیل بریف کامل نشد"
          actions={
            <>
              <Button variant="primary" size="sm" icon="retry" onClick={() => dispatch({ type: 'startAnalysis', projectId: project.id, now: now() })}>
                تلاش دوباره
              </Button>
              <Button size="sm" onClick={() => dispatch({ type: 'goManual', projectId: project.id, now: now() })}>
                ادامه با ویرایش دستی
              </Button>
            </>
          }
        >
          مشکلی در تحلیل پیش آمد. بریف، اطلاعات پروژه و هر چیزی که تاکنون نوشته‌اید دست‌نخورده است و چیزی از دست نرفته. می‌توانید دوباره تلاش کنید یا بدون AI ادامه دهید.
        </Banner>
      )
    } else if (status === 'ready') {
      analysisBanner = (
        <Banner tone="ai" title="پیشنهاد AI · قابل ویرایش · هنوز تأیید نشده">
          موارد برچسب «پیشنهاد AI» از متن بریف استخراج شده‌اند و هرکدام شاهدی دارند. آنچه بریف نگفته «نامشخص» علامت خورده و پیشنهادی برایش ساخته نشده. هر مورد را بخوانید، اصلاح کنید و بعد تأیید کنید.
        </Banner>
      )
    } else if (status === 'manual') {
      const reason = project.analysis.manualReason
      analysisBanner = (
        <Banner
          tone="info"
          title={reason === 'custom_brief' ? 'تحلیل خودکار برای این بریف در دسترس نیست' : reason === 'no_text' ? 'بریف متنی برای تحلیل وجود ندارد' : 'ادامهٔ دستی'}
          actions={
            sampleAvailable && editable ? (
              <Button size="sm" icon="spark" onClick={() => dispatch({ type: 'startAnalysis', projectId: project.id, now: now() })}>
                تحلیل با AI
              </Button>
            ) : undefined
          }
        >
          {reason === 'custom_brief'
            ? 'این نمونهٔ نمایشی فقط برای بریف نمونهٔ آرما تحلیل دارد و برای متن‌های دیگر خروجی جعلی نمی‌سازد. محدوده را دستی تکمیل کنید؛ متن بریف در کنار فرم در دسترس است.'
            : reason === 'no_text'
              ? 'فقط نام فایل ثبت شده است. محدوده را دستی تکمیل کنید یا متن بریف را اضافه کنید.'
              : 'محدوده را خودتان تکمیل می‌کنید؛ همهٔ مراحل بازبینی و تأیید همان است.'}
        </Banner>
      )
    } else if (processing && showEditorWhileProcessing) {
      analysisBanner = (
        <Banner tone="ai" title="تحلیل AI در حال انجام است">
          می‌توانید همین حالا فرم را دستی پر کنید. نتیجهٔ تحلیل فقط در فیلدهای خالی یا پیشنهادهای دست‌نخوردهٔ AI اعمال می‌شود؛ ویرایش‌های شما بازنویسی نمی‌شود.
        </Banner>
      )
    }
  }

  return (
    <div className="fade-up">
      <ProjectHeader project={project} active="brief" />

      {/* وضعیت محدوده */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {locked && base ? (
          <Badge tone="ok" icon="lock">
            {ltr(`Baseline v${base.version}`)} · قفل‌شده
          </Badge>
        ) : project.revisionOpen && base ? (
          <Badge tone="warn" icon="doc">
            {ltr(`Revision v${base.version + 1}`)} · پیش‌نویس
          </Badge>
        ) : (
          <Badge tone="neutral" icon="doc">
            پیش‌نویس
          </Badge>
        )}
        {scope && editable ? <span className="text-caption text-muted">ذخیرهٔ خودکار · {relativeTime(project.updatedAt)}</span> : null}
      </div>

      <div className="mb-5 flex flex-col gap-3">
        {locked && base ? (
          <Banner
            tone="ok"
            icon="lock"
            title={justApproved ? `${ltr(`Baseline v${base.version}`)} ثبت شد · تأیید داخلی انجام شد` : `${ltr(`Baseline v${base.version}`)} · تأیید داخلی شد`}
            actions={
              canApproveHere ? (
                <Button
                  size="sm"
                  icon="doc"
                  onClick={() => (project.receipts.length > 0 ? setWarnOpen(true) : dispatch({ type: 'createRevision', projectId: project.id, now: now() }))}
                >
                  {project.receipts.length > 0 ? 'درخواست تغییر محدوده' : 'ایجاد Revision جدید'}
                </Button>
              ) : undefined
            }
          >
            {base.origin === 'change_request' ? 'ساخته‌شده از پذیرش پیشنهاد تغییر · ' : ''}ثبت‌کننده: {base.approvedBy} · {jalaliDateTime(base.approvedAt)} · شناسه: <bdi dir="ltr" translate="no" className="font-mono text-label">{base.id}</bdi>
            <br />
            این <strong>تأیید داخلی</strong> استودیو است و با تأیید مشتری (Sign-off) فرق دارد. ویرایش مستقیم ممکن نیست؛ برای تغییر، Revision جدید بسازید و نسخهٔ فعلی دست‌نخورده می‌ماند.
            {!canApproveHere ? ' ساخت Revision فقط برای مدیر پروژه یا مدیر استودیو فعال است.' : ''}
          </Banner>
        ) : null}
        {project.revisionOpen && base ? (
          <Banner
            tone="warn"
            icon="doc"
            title={`${ltr(`Revision v${base.version + 1}`)} در حال ویرایش است`}
            actions={
              <Button size="sm" onClick={() => dispatch({ type: 'discardRevision', projectId: project.id, now: now() })}>
                انصراف از Revision
              </Button>
            }
          >
            {ltr(`Baseline v${base.version}`)} همچنان معتبر و دست‌نخورده است. فقط بعد از تأیید داخلی، این Revision جایگزین آن می‌شود.
          </Banner>
        ) : null}
        {analysisBanner}
      </div>

      {/* حالت بیکار: هنوز نه تحلیل شده نه دستی */}
      {!scope && !processing ? (
        <section className="rounded-card bg-surface p-6 shadow-card sm:p-8">
          <div className="mx-auto max-w-xl text-center">
            <span className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-ai-soft text-ai">
              <Icon name="spark" size={20} />
            </span>
            <h2 className="text-heading">تحلیل را آغاز کنید</h2>
            <p className="mt-1 text-ui leading-7 text-muted">
              بریف ثبت شده است. می‌توانید از AI بخواهید پیش‌نویس محدوده بسازد، یا بدون AI فرم را خودتان پر کنید. در هر دو حالت تأیید نهایی با شما است.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Button variant="primary" icon="spark" disabled={!project.brief?.text.trim()} onClick={() => dispatch({ type: 'startAnalysis', projectId: project.id, now: now() })}>
                شروع تحلیل با AI (نمایشی)
              </Button>
              <Button onClick={() => dispatch({ type: 'goManual', projectId: project.id, now: now() })}>ادامه بدون AI</Button>
            </div>
            {project.brief && !sampleAvailable ? (
              <p className="mt-3 text-caption text-muted">توجه: تحلیل نمایشی فقط برای بریف نمونهٔ آرما وجود دارد؛ برای این بریف فرم دستی باز می‌شود.</p>
            ) : null}
          </div>
        </section>
      ) : null}

      {processing && !showEditorWhileProcessing ? <ProcessingPanel project={project} onManual={() => setShowEditorWhileProcessing(true)} /> : null}

      {showEditor && scope ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] xl:items-start">
          <div className="flex min-w-0 flex-col gap-4">
            {FIELD_ORDER.map((k) => (
              <FieldCard
                key={k}
                k={k}
                doc={scope}
                unknowns={scope.unknowns.filter((u) => u.field === k)}
                active={activeField === k}
                readOnly={!editable}
                flagged={flaggedFields.has(k)}
                onActivate={() => setActiveField(k)}
                onChange={onChange}
              />
            ))}

            {editable ? (
              <>
                <Readiness guards={guards} showProblems={showProblems} onJump={(g: Guard) => jump(g.field)} />
                <div className="rounded-card bg-lime p-4 sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-ui leading-7 text-ink/85">
                      <strong>تأیید داخلی</strong> فقط محدودهٔ توافق‌شدهٔ استودیو را قفل می‌کند. تأیید مشتری بعداً و روی نسخهٔ طرح انجام می‌شود.
                    </p>
                    <Button variant="primary" icon="lock" disabled={!canApproveHere} aria-describedby={!canApproveHere ? 'why-no-approve' : undefined} onClick={tryApprove}>
                      تأیید داخلی محدوده
                    </Button>
                  </div>
                  {!canApproveHere ? (
                    <p id="why-no-approve" className="mt-2 text-caption text-warn">
                      فقط مدیر پروژه یا مدیر استودیو می‌تواند محدوده را تأیید کند. نقش «طراح» می‌تواند پیش‌نویس را ویرایش و پیشنهاد دهد.
                    </p>
                  ) : null}
                  {showProblems && guards.some((g) => !g.ok) ? (
                    <div className="mt-3">
                      <Banner tone="err" live="assertive" title="هنوز نمی‌شود تأیید کرد">
                        {fa(guards.filter((g) => !g.ok).length)} شرط برقرار نیست. موارد قرمز در فهرست «آمادگی برای تأیید» بالا نشان داده شده‌اند.
                      </Banner>
                    </div>
                  ) : null}
                </div>
              </>
            ) : null}

            {project.baselines.length > 0 ? (
              <section aria-labelledby="hist" className="rounded-card bg-surface p-4 shadow-card sm:p-5">
                <h2 id="hist" className="mb-2 text-body font-bold">
                  تاریخچهٔ Baseline
                </h2>
                <ol className="flex flex-col gap-2">
                  {[...project.baselines].reverse().map((b) => (
                    <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-control bg-canvas p-2.5 text-ui ring-1 ring-line">
                      <span className="flex items-center gap-2">
                        <Badge tone={b.status === 'approved' ? 'ok' : 'neutral'}>{ltr(`v${b.version}`)} · {b.status === 'approved' ? 'فعال' : 'جایگزین‌شده'}</Badge>
                        <span className="text-muted">{b.approvedBy}{b.origin === 'change_request' ? ' · از درخواست تغییر' : ''}</span>
                      </span>
                      <span className="text-caption text-muted">{jalaliDateTime(b.approvedAt)}</span>
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}

            {locked ? (
              <div className="flex flex-wrap items-center gap-3 rounded-card border-2 border-dashed border-line-strong p-4">
                <ButtonLink to={`/studio/projects/${project.id}`} variant="primary" icon="next">
                  رفتن به نمای کلی پروژه
                </ButtonLink>
                <ButtonLink to={`/studio/projects/${project.id}?add=1`} icon="plus">
                  افزودن نسخهٔ طرح
                </ButtonLink>
                <ButtonLink to="/studio/projects" variant="ghost">
                  بازگشت به پروژه‌ها
                </ButtonLink>
                <p className="text-caption text-muted">گام بعدی پروژه، افزودن نسخهٔ طرح برای بازبینی است.</p>
              </div>
            ) : null}
          </div>

          <aside aria-label="شواهد و ابهام‌ها" className="min-w-0 xl:sticky xl:top-6 xl:max-h-[calc(100dvh-3rem)] xl:overflow-y-auto xl:pb-2">
            <SidePanel
              brief={project.brief}
              doc={scope}
              activeField={activeField}
              editable={editable}
              onResolve={onResolve}
              onFocusField={jump}
            />
          </aside>
        </div>
      ) : null}

      <ChangeWarningDialog open={warnOpen} onClose={() => setWarnOpen(false)} project={project} attempt="ویرایش محدودهٔ تأییدشده" onCreate={() => navigate(`/studio/projects/${project.id}/changes?new=1`)} />

      {scope ? (
        <ApprovalDialog
          open={approvalOpen}
          onClose={() => setApprovalOpen(false)}
          onConfirm={confirm}
          doc={compactDoc(scope)}
          version={nextVersion}
          supersedes={base ? base.version : null}
          role={role}
        />
      ) : null}
    </div>
  )
}

