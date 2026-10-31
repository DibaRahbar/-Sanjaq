import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  VERSION_STATUS,
  blockingOpen,
  buildTimeline,
  chainState,
  decisionsToImplement,
  draftDecisions,
  finalDecisions,
  latestBaselineOf,
  latestVersion,
  nextAction,
  openFeedback,
  type CtaAction,
} from '../domain/project'
import { fa, jalaliDate, jalaliDateTime, ltr, newId } from '../lib/format'
import { Badge } from '../components/ui/Badge'
import { Button, ButtonLink } from '../components/ui/Button'
import { Icon, type IconName } from '../components/ui/Icon'
import { STAGE_STEPS } from '../components/ui/StageTrack'
import { Illus, type SceneName } from '../components/ui/Illus'
import { EmptyState } from '../components/ui/Misc'
import { ProjectHeader } from '../components/layout/ProjectHeader'
import { ChangeWarningDialog } from '../components/changes/ChangeWarningDialog'
import { CHANGE_STATUS, isOpenChange } from '../domain/changes'
import { AddVersionDialog } from '../components/review/AddVersionDialog'
import { PageSkeleton } from '../components/ui/PageSkeleton'
import { useDocumentTitle, useSimulatedLoad } from '../lib/usePage'
import { nowIso, useStore } from '../state/store'

const tonePanel = {
  ai: 'bg-lav',
  warn: 'bg-org',
  ok: 'bg-mint',
  info: 'bg-sky',
  neutral: 'bg-sunken',
} as const

function Card({ title, to, children, footer, tint = 'bg-surface', icon, illus }: { title: string; to?: string; children: React.ReactNode; footer?: React.ReactNode; tint?: string; icon?: IconName; illus?: SceneName }) {
  const head = (
    <h3 className="flex items-center justify-between gap-2 text-section">
      <span className="flex items-center gap-2.5">
        {icon ? (
          <span className="grid size-9 place-items-center rounded-full bg-surface/70 text-ink">
            <Icon name={icon} size={18} duo />
          </span>
        ) : null}
        {title}
        {to ? <Icon name="next" size={14} className="text-muted" /> : null}
      </span>
    </h3>
  )
  return (
    <section className={`grid grid-cols-[minmax(0,1fr)_auto] grid-rows-[auto_1fr_auto] gap-x-3 rounded-card p-4 ${tint} ${tint === 'bg-surface' ? '' : '[&_.text-muted]:text-ink-soft'}`}>
      {to ? (
        <Link to={to} className="-m-1 self-start rounded-control p-1 hover:bg-sunken/60">
          {head}
        </Link>
      ) : (
        <div>{head}</div>
      )}
      {illus ? <Illus name={illus} className="col-start-2 row-span-3 row-start-1 size-24 self-center justify-self-center min-[1400px]:size-28" /> : null}
      <div className="col-start-1 mt-3 text-body">{children}</div>
      {footer ? <div className="col-start-1 mt-3 flex flex-wrap gap-2">{footer}</div> : null}
    </section>
  )
}

export default function ProjectOverview() {
  const { projectId } = useParams()
  const { getProject, dispatch, role } = useStore()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const project = getProject(projectId)
  const [addOpen, setAddOpen] = useState(params.get('add') === '1')
  const [showAll, setShowAll] = useState(false)
  const [warnOpen, setWarnOpen] = useState(false)
  const loading = useSimulatedLoad(`overview:${projectId}`)
  useDocumentTitle(project ? `${project.name} · نمای کلی` : 'پروژه پیدا نشد')

  if (!project) {
    return (
      <div className="mx-auto max-w-xl pt-8">
        <EmptyState level={1} icon="lock" title="این پروژه پیدا نشد یا به آن دسترسی ندارید" actions={<ButtonLink to="/studio/projects" variant="primary">بازگشت به پروژه‌ها</ButtonLink>}>
          هیچ اطلاعات دیگری از پروژه نمایش داده نمی‌شود.
        </EmptyState>
      </div>
    )
  }

  if (loading) return <PageSkeleton />
  const base = `/studio/projects/${project.id}`
  const baseline = latestBaselineOf(project)
  const latest = latestVersion(project)
  const action = nextAction(project, role)
  const chain = chainState(project)
  const timeline = buildTimeline(project)
  const open = latest ? openFeedback(project, latest.id) : []
  const blocking = latest ? blockingOpen(project, latest.id) : []
  const drafts = draftDecisions(project)
  const finals = finalDecisions(project)
  const pending = decisionsToImplement(project)
  const receipt = latest ? project.receipts.find((r) => r.versionId === latest.id) : undefined

  if (!baseline) {
    return (
      <div className="fade-up">
        <ProjectHeader project={project} active="overview" />
        <EmptyState icon="lock" title="نمای کلی بعد از تأیید داخلی محدوده فعال می‌شود" actions={<ButtonLink to={`${base}/brief`} variant="primary">رفتن به بریف و محدوده</ButtonLink>}>
          نسخهٔ طرح، بازخورد و تصمیم همه به Baseline تأییدشده وصل‌اند.
        </EmptyState>
      </div>
    )
  }

  // نسخهٔ تأییدشده ثابت است؛ تلاش برای نسخهٔ تازه به S6 می‌رود.
  const openAdd = () => (latest?.status === 'approved' ? setWarnOpen(true) : setAddOpen(true))

  const run = (a: CtaAction) => {
    switch (a) {
      case 'addVersion':
        return openAdd()
      case 'openChanges':
        return navigate(`${base}/changes`)
      case 'openScope':
        return navigate(`${base}/brief`)
      case 'openReview':
        return latest && navigate(`${base}/review/${latest.id}`)
      case 'openDecisions':
        return navigate(`${base}/decisions`)
      case 'publish':
        return latest && navigate(`${base}/review/${latest.id}?publish=1`)
      default:
    }
  }

  const closeAdd = () => {
    setAddOpen(false)
    if (params.get('add')) {
      const n = new URLSearchParams(params)
      n.delete('add')
      setParams(n, { replace: true })
    }
  }

  return (
    <div className="fade-up">
      <ProjectHeader project={project} active="overview" />

      {/* اقدام بعدی: یک CTA واحد */}
      <section aria-labelledby="next-title" className={`mb-6 flex flex-col gap-4 rounded-card p-6 sm:flex-row sm:items-center sm:justify-between ${tonePanel[action.tone]}`}>
        <Illus name="laptop" className="hidden size-36 shrink-0 self-center md:block" />
        <div className="relative min-w-0 flex-1">
          <p className="mb-0.5 text-label text-ink-soft">اقدام بعدی</p>
          <h2 id="next-title" className="text-heading">
            {action.title}
          </h2>
          <p className="mt-0.5 text-body text-ink-soft">{action.body}</p>
          {action.blockedReason ? <p className="mt-1 text-caption text-warn">{action.blockedReason}</p> : null}
        </div>
        {action.cta ? (
          <Button variant="primary" className="relative shrink-0" onClick={() => run(action.cta!.action)}>
            {action.cta.label}
          </Button>
        ) : null}
      </section>

      {/* زنجیرهٔ پروژه */}
      <ol className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6" aria-label="مراحل پروژه">
        {chain.map((s, i) => (
          <li
            key={s.id}
            aria-current={s.state === 'current' ? 'step' : undefined}
            className={`flex items-center gap-2 rounded-full px-3 py-2 text-caption ${
              s.state === 'current' ? 'bg-ink font-bold text-on-ink' : s.state === 'done' ? 'bg-surface text-ink' : 'bg-surface/50 text-muted'
            }`}
          >
            <span className={`grid size-5 shrink-0 place-items-center rounded-full text-label font-bold ${s.state === 'done' ? 'bg-ok-solid text-white' : s.state === 'current' ? 'bg-lime text-ink' : 'bg-sunken ring-1 ring-line-strong'}`}>
              <Icon name={STAGE_STEPS[i]?.icon ?? 'circle'} size={14} duo />
            </span>
            {s.label}
          </li>
        ))}
      </ol>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card title="محدودهٔ تأییدشده" to={`${base}/brief`} tint="bg-mint" icon="shield" illus="doc">
          <p>
            <Badge tone="ok" icon="lock">{ltr(`Baseline v${baseline.version}`)}</Badge>
          </p>
          <p className="mt-1 text-caption text-muted">
            {baseline.approvedBy} · {jalaliDate(baseline.approvedAt)}
          </p>
          {project.revisionOpen ? <p className="mt-1 text-caption text-warn">یک Revision در حال ویرایش است.</p> : null}
        </Card>

        <Card
          tint="bg-sky"
          icon="version"
          illus="present"
          title="نسخه‌های طرح"
          to={latest ? `${base}/review/${latest.id}` : undefined}
          footer={
            <Button size="sm" icon="plus" onClick={openAdd}>
              افزودن نسخه
            </Button>
          }
        >
          {project.versions.length === 0 ? (
            <p className="text-muted">هنوز نسخه‌ای ثبت نشده است.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {[...project.versions].reverse().map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-2">
                  <Link to={`${base}/review/${v.id}`} className="font-semibold underline-offset-2 hover:underline">
                    <bdi dir="ltr" translate="no">{v.label}</bdi> <span className="font-normal text-muted">· {v.artifactTitle}</span>
                  </Link>
                  <Badge tone={VERSION_STATUS[v.status].tone}>{VERSION_STATUS[v.status].label}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card tint="bg-org" icon="feedback" illus="chat" title="بازخوردهای باز" to={latest ? `${base}/review/${latest.id}` : undefined}>
          {latest ? (
            <>
              <p className="text-heading leading-9">{fa(open.length)}</p>
              <p className="text-caption text-muted">
                روی نسخهٔ <bdi dir="ltr" translate="no">{latest.label}</bdi>
                {blocking.length ? <span className="font-semibold text-err"> · {fa(blocking.length)} مسدودکننده</span> : null}
              </p>
            </>
          ) : (
            <p className="text-muted">بعد از ثبت نسخه، بازخوردها اینجا شمرده می‌شوند.</p>
          )}
        </Card>

        <Card title="دفتر تصمیم‌ها" to={`${base}/decisions`} tint="bg-lav" icon="decision" illus="chart">
          <ul className="flex flex-col gap-0.5 text-ui">
            <li>
              پیش‌نویس: <strong>{fa(drafts.length)}</strong>
            </li>
            <li>
              نهایی: <strong>{fa(finals.length)}</strong>
            </li>
            <li className={pending.length ? 'text-warn' : 'text-muted'}>
              اعمال‌نشده در طرح: <strong>{fa(pending.length)}</strong>
            </li>
          </ul>
        </Card>

        <Card tint="bg-lime" icon="users" illus="deal" title="مشتری" to={latest ? `${base}/review/${latest.id}` : undefined}>
          {!latest || latest.status === 'internal_review' || latest.status === 'superseded' ? (
            <p className="text-muted">هنوز نسخه‌ای برای مشتری منتشر نشده است.</p>
          ) : (
            <>
              <p>
                {latest.status === 'approved' ? (
                  <Badge tone="ok" icon="check">نسخهٔ {ltr(latest.label)} تأیید شد</Badge>
                ) : latest.status === 'changes_requested' ? (
                  <Badge tone="warn">درخواست اصلاح برای {ltr(latest.label)}</Badge>
                ) : (
                  <Badge tone="ai">منتظر مشتری · {ltr(latest.label)}</Badge>
                )}
              </p>
              {receipt ? (
                <p className="mt-1 text-caption text-muted">
                  رسید <bdi dir="ltr" translate="no" className="font-mono">{receipt.number}</bdi> · {jalaliDateTime(receipt.approvedAt)}
                </p>
              ) : (
                <p className="mt-1 text-caption text-muted">
                  {latest.publishedBy} · {latest.publishedAt ? jalaliDateTime(latest.publishedAt) : ''}
                </p>
              )}
              {latest.publishException ? <p className="mt-1 text-caption text-warn">با استثنا منتشر شد: {latest.publishException}</p> : null}
            </>
          )}
        </Card>

        <Card title="تغییرات بعد از تأیید" to={`${base}/changes`} tint="bg-pink" icon="change" illus="gears">
          {project.changes.length === 0 ? (
            <p className="text-muted">{project.receipts.length ? 'درخواستی ثبت نشده است.' : 'بعد از تأیید مشتری، درخواست‌های تازه اینجا جدا از تأیید قبلی ثبت می‌شوند.'}</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {project.changes.slice(-3).reverse().map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2">
                  <span className="truncate">{c.title}</span>
                  <Badge tone={CHANGE_STATUS[c.status].tone}>{CHANGE_STATUS[c.status].label}</Badge>
                </li>
              ))}
              <li className="text-label font-normal text-muted">{fa(project.changes.filter(isOpenChange).length)} درخواست باز</li>
            </ul>
          )}
        </Card>
      </div>

      <section aria-labelledby="tl" className="mt-6 rounded-card bg-surface p-4 shadow-card sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="tl" className="text-section">
            فعالیت‌ها
          </h2>
          {timeline.length > 6 ? (
            <button type="button" onClick={() => setShowAll((v) => !v)} className="inline-flex min-h-11 items-center rounded-control px-2 text-caption font-semibold underline underline-offset-2">
              {showAll ? 'نمایش کمتر' : `نمایش همه (${fa(timeline.length)})`}
            </button>
          ) : null}
        </div>
        <ol className="flex flex-col">
          {(showAll ? timeline : timeline.slice(0, 6)).map((e) => (
            <li key={e.id} className="flex gap-3 border-t border-line py-2 first:border-t-0">
              <span className="mt-2.5 size-2 shrink-0 rounded-full bg-line-strong" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-ui leading-7">{e.text}</p>
                <p className="text-label font-normal text-muted">
                  {e.actor} · {jalaliDateTime(e.at)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <ChangeWarningDialog open={warnOpen} onClose={() => setWarnOpen(false)} project={project} attempt="افزودن نسخهٔ جدید به‌جای نسخهٔ تأییدشده" onCreate={() => navigate(`${base}/changes?new=1`)} />

      <AddVersionDialog
        open={addOpen}
        onClose={closeAdd}
        project={project}
        onSubmit={(v) => {
          const id = newId('av')
          dispatch({ type: 'addVersion', projectId: project.id, versionId: id, note: v.note, artifactTitle: v.artifactTitle, implementsDecisionIds: v.implementsDecisionIds, now: nowIso() })
          closeAdd()
          navigate(`${base}/review/${id}`)
        }}
      />
    </div>
  )
}
