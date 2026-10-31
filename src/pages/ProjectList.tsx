import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { GROUP_LABEL, ROSTER, STAGE_META } from '../domain/fixtures'
import { blockingOpen, chainState, latestVersion, nextAction, openFeedback, projectHome } from '../domain/project'
import type { Project } from '../domain/types'
import { fa, greetingFor, isolateVersions, jalaliDate, jalaliLong, normalizeFa, relativeTime } from '../lib/format'
import { useDocumentTitle } from '../lib/usePage'
import { useStore } from '../state/store'
import { Badge } from '../components/ui/Badge'
import { Button, ButtonLink } from '../components/ui/Button'
import { Icon } from '../components/ui/Icon'
import { StatTile } from '../components/ui/StatTile'
import { Avatar, EmptyState, Skeleton } from '../components/ui/Misc'
import { Segmented } from '../components/ui/Segmented'
import { StageTrack } from '../components/ui/StageTrack'

type Filter = 'all' | 'action' | 'client'

const needsAction = (p: Project) =>
  STAGE_META[p.stage].needsAction ||
  p.changes.some((c) => c.status === 'draft' || c.status === 'assessed') ||
  p.versions.at(-1)?.status === 'changes_requested'

const waitingClient = (p: Project) =>
  STAGE_META[p.stage].waitingClient || p.changes.some((c) => c.status === 'proposal_sent' || c.status === 'needs_clarification')

const matches = (p: Project, f: Filter) => (f === 'all' ? true : f === 'action' ? needsAction(p) : waitingClient(p))

// بارگذاری نمایشی فقط یک بار در هر نشست مرورگر
let simulatedLoadDone = false

const progress = (p: Project) => chainState(p).filter((s) => s.state === 'done').length

function Ring({ n, bg }: { n: number; bg: string }) {
  return (
    <div role="img" aria-label={`${fa(n)} از ${fa(6)} مرحله`} className="grid size-[60px] shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(var(--color-ink) 0 ${(n / 6) * 100}%, color-mix(in srgb, var(--color-ink) 12%, transparent) 0)` }}>
      <span className={`grid size-[44px] place-items-center rounded-full text-label ${bg}`}>
        {fa(n)}/{fa(6)}
      </span>
    </div>
  )
}

function RowSkeleton() {
  return (
    <li className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)_minmax(0,0.7fr)_auto] md:gap-6">
      <Skeleton className="h-9 w-3/4" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-28" />
      <span />
    </li>
  )
}

export default function ProjectList() {
  const { state, role, actor } = useStore()
  useDocumentTitle('پروژه‌ها')
  const [params, setParams] = useSearchParams()
  const [loading, setLoading] = useState(!simulatedLoadDone)
  const q = params.get('q') ?? ''
  const filter = (params.get('f') as Filter) || 'all'
  const canCreate = role !== 'designer'
  const nowIso = new Date().toISOString()

  useEffect(() => {
    if (!loading) return
    const t = window.setTimeout(() => {
      simulatedLoadDone = true
      setLoading(false)
    }, 450)
    return () => window.clearTimeout(t)
  }, [loading])

  const projects = state.projects
  const stats = useMemo(() => {
    const action = projects.filter(needsAction)
    const client = projects.filter(waitingClient)
    const blocking = projects.reduce((n, p) => n + (latestVersion(p) ? blockingOpen(p, latestVersion(p)!.id).length : 0), 0)
    const feedback = projects.reduce((n, p) => n + openFeedback(p).length, 0)
    const now = Date.now()
    const deadlines = projects
      .flatMap((p) => p.invites.filter((i) => (i.status === 'sent' || i.status === 'opened') && new Date(i.expiresAt).getTime() > now && new Date(i.expiresAt).getTime() - now < 90 * 86400000).map((i) => ({ p, i })))
      .sort((a, b) => a.i.expiresAt.localeCompare(b.i.expiresAt))
    return { action, client, blocking, feedback, deadlines }
  }, [projects])

  const counts = { all: projects.length, action: stats.action.length, client: stats.client.length }
  const visible = useMemo(() => {
    const needle = normalizeFa(q)
    return projects.filter((p) => matches(p, filter) && (needle === '' || normalizeFa(`${p.name} ${p.client} ${p.pm}`).includes(needle)))
  }, [projects, q, filter])

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value === '' || value === 'all') next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true })
  }

  const first = actor.split(' ')[0]
  const summary =
    counts.action + counts.client === 0
      ? 'اقدام معوقی نیست؛ همهٔ پروژه‌ها در جریان‌اند.'
      : [counts.action ? `${fa(counts.action)} پروژه به اقدام شما نیاز دارد` : '', counts.client ? `${fa(counts.client)} پروژه منتظر پاسخ مشتری است` : ''].filter(Boolean).join(' و ') + '.'
  const maxFb = Math.max(1, ...projects.map((p) => openFeedback(p).length))

  return (
    <div className="fade-up">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-5">
        <div className="flex min-w-0 flex-1 basis-72 items-center gap-4 md:gap-5">
          <span className="shrink-0 md:hidden">
            <Avatar name={actor} size={64} />
          </span>
          <span className="hidden shrink-0 md:block">
            <Avatar name={actor} size={96} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-caption text-muted">{jalaliLong(nowIso)}</p>
            <h1 className="text-title md:text-display">
              {greetingFor(nowIso)}، {first}!
            </h1>
            <p className="mt-1 max-w-xl text-body text-ink-soft" aria-live="polite">
              {loading ? 'در حال بارگذاری…' : projects.length === 0 ? 'هنوز پروژه‌ای ندارید؛ از بریف مشتری شروع کنید.' : summary}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-start gap-1 sm:items-end">
          {canCreate ? (
            <ButtonLink to="/studio/projects/new" variant="primary" icon="plus">
              پروژهٔ جدید
            </ButtonLink>
          ) : (
            <>
              <Button variant="primary" icon="plus" disabled aria-describedby="why-no-create">
                پروژهٔ جدید
              </Button>
              <p id="why-no-create" className="text-label font-normal text-ink-soft">
                ساخت پروژه فقط برای مدیر پروژه یا مدیر استودیو فعال است.
              </p>
            </>
          )}
        </div>
      </header>

      {projects.length === 0 && !loading ? (
        <EmptyState
          icon="folder"
          title="هنوز پروژه‌ای در این فضای کاری نیست"
          actions={
            canCreate ? (
              <ButtonLink to="/studio/projects/new" variant="primary" icon="plus">
                ایجاد اولین پروژه
              </ButtonLink>
            ) : undefined
          }
        >
          با ثبت نام پروژه و بریف مشتری شروع کنید. سنجاق از همان بریف یک پیش‌نویس محدوده می‌سازد که شما بازبینی و تأیید می‌کنید.
          {!canCreate ? ' برای ساخت پروژه با نقش مدیر پروژه یا مدیر استودیو وارد شوید.' : ''}
        </EmptyState>
      ) : (
        <>
          {/* آمار واقعی */}
          <section aria-label="خلاصهٔ وضعیت" className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile icon="folder" tint="bg-lav text-lav-ink" label="پروژه‌های فعال" value={loading ? '—' : fa(counts.all)} />
            <StatTile icon="bolt" tint="bg-lime text-lime-ink" label="نیازمند اقدام" value={loading ? '—' : fa(counts.action)} note={stats.blocking ? { text: `${fa(stats.blocking)} مسدودکننده`, tone: 'warn' } : undefined} />
            <StatTile icon="clock" tint="bg-pink text-pink-ink" label="منتظر مشتری" value={loading ? '—' : fa(counts.client)} note={stats.deadlines[0] ? { text: `تا ${jalaliDate(stats.deadlines[0].i.expiresAt)}`, tone: 'ai' } : undefined} />
            <StatTile icon="feedback" tint="bg-org text-org-ink" label="بازخورد باز" value={loading ? '—' : fa(stats.feedback)} />
          </section>

          {/* کاشی‌های نیازمند اقدام */}
          {!loading && stats.action.length > 0 ? (
            <section aria-labelledby="act-title" className="mb-8">
              <h2 id="act-title" className="mb-3 flex items-center gap-2 text-section">
                <span className="grid size-8 place-items-center rounded-full bg-lime text-lime-ink">
                  <Icon name="bolt" size={16} duo />
                </span>
                نیازمند اقدام <span className="text-muted">({fa(stats.action.length)})</span>
              </h2>
              <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {stats.action.map((p, idx) => {
                  const tint = idx === 0 ? 'bg-lime' : 'bg-surface'
                  const next = p.baselines.length ? nextAction(p, role).title : STAGE_META[p.stage].next
                  return (
                    <li key={p.id}>
                      <Link to={projectHome(p)} className={`group flex h-full flex-col gap-3 rounded-card p-4 transition-transform duration-[var(--duration-base)] ease-[var(--ease-out)] hover:-translate-y-0.5  ${tint}`}>
                        <p className={`relative text-caption ${idx === 0 ? 'text-lime-ink' : 'text-muted'}`}>{p.name}</p>
                        <div className="flex flex-1 items-start justify-between gap-3">
                          <p className="text-section">{isolateVersions(next)}</p>
                          <Ring n={progress(p)} bg={idx === 0 ? 'bg-lime' : 'bg-surface'} />
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-2">
                            <Avatar name={p.pm} size={28} />
                            <span className="text-caption font-bold">{p.pm}</span>
                          </span>
                          <span className={`rounded-full px-3 py-px text-label ${idx === 0 ? 'bg-surface/60' : 'bg-sunken'}`}>{relativeTime(p.updatedAt)}</span>
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </section>
          ) : null}

          {/* همهٔ پروژه‌ها: زنجیرهٔ تصمیم */}
          <section aria-labelledby="all-title">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 id="all-title" className="flex items-center gap-2 text-section">
                <span className="grid size-8 place-items-center rounded-full bg-lav text-lav-ink">
                  <Icon name="link" size={16} duo />
                </span>
                زنجیرهٔ تصمیم پروژه‌ها
              </h2>
              <div className="flex flex-wrap items-center gap-3">
                <Segmented<Filter>
                  label="فیلتر سریع"
                  value={filter}
                  onChange={(v) => setParam('f', v)}
                  options={[
                    { id: 'all', label: 'همه', count: loading ? undefined : counts.all },
                    { id: 'action', label: 'نیازمند اقدام', count: loading ? undefined : counts.action },
                    { id: 'client', label: 'منتظر مشتری', count: loading ? undefined : counts.client },
                  ]}
                />
                <div className="relative w-full sm:w-64">
                  <label htmlFor="project-search" className="sr-only">
                    جست‌وجوی پروژه
                  </label>
                  <Icon name="search" size={18} className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    id="project-search"
                    type="search"
                    value={q}
                    onChange={(e) => setParam('q', e.target.value)}
                    placeholder="جست‌وجوی پروژه یا مشتری…"
                    className="min-h-11 w-full rounded-full border bg-surface ps-11 pe-4 text-ui placeholder:text-muted"
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_250px] xl:items-start">
              <div className="min-w-0">
                {loading ? (
                  <div className="rounded-card bg-surface">
                    <ul className="divide-y divide-line" aria-busy="true" aria-label="در حال بارگذاری فهرست">
                      {[0, 1, 2, 3].map((i) => (
                        <RowSkeleton key={i} />
                      ))}
                    </ul>
                  </div>
                ) : visible.length === 0 ? (
                  <EmptyState icon="search" title="نتیجه‌ای پیدا نشد" actions={<Button onClick={() => setParams({}, { replace: true })}>پاک‌کردن جست‌وجو و فیلتر</Button>}>
                    هیچ پروژه‌ای با این جست‌وجو یا فیلتر مطابقت ندارد. پروژه‌ای حذف نشده است؛ فقط فهرست فیلتر شده است.
                  </EmptyState>
                ) : (
                  <div className="overflow-hidden rounded-card bg-surface">
                    <ul className="divide-y divide-line">
                      {visible.map((p) => {
                        const meta = STAGE_META[p.stage]
                        const action = needsAction(p)
                        const next = p.baselines.length ? nextAction(p, role).title : meta.next
                        const fb = openFeedback(p).length
                        return (
                          <li key={p.id}>
                            <Link
                              to={projectHome(p)}
                              className="group relative grid items-center gap-x-6 gap-y-3 px-5 py-4 transition-colors duration-[var(--duration-fast)] hover:bg-hover focus-visible:-outline-offset-2 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)_minmax(0,0.7fr)_auto]"
                            >
                              {action ? <span className="absolute inset-y-3 start-0 w-1 rounded-e-full bg-ink" aria-hidden="true" /> : null}
                              <div className="flex min-w-0 items-center gap-3">
                                <Avatar name={p.client} size={36} kind="org" />
                                <div className="min-w-0">
                                  <p className="truncate text-body font-bold leading-6 group-hover:underline group-hover:underline-offset-4">{p.name}</p>
                                  <p className="text-caption text-muted">
                                    {p.client}
                                    {fb ? ` · ${fa(fb)} بازخورد باز` : ''}
                                  </p>
                                </div>
                              </div>
                              <div className="flex min-w-0 flex-col gap-1.5">
                                <StageTrack project={p} tone={meta.tone} />
                                <p className="flex items-center gap-2 truncate">
                                  <Badge tone={meta.tone} dot>
                                    {meta.label}
                                  </Badge>
                                  <span className={`truncate text-caption ${action ? 'font-bold text-ink' : 'text-muted'}`}>{isolateVersions(next)}</span>
                                </p>
                              </div>
                              <div className="flex items-center gap-2.5">
                                <Avatar name={p.pm} size={28} />
                                <div className="min-w-0 leading-5">
                                  <p className="truncate text-caption font-bold">{p.pm}</p>
                                  <p className="text-label font-normal text-muted">{relativeTime(p.updatedAt)}</p>
                                </div>
                              </div>
                              <Icon name="next" size={18} className="hidden text-line-strong transition-[transform,color] duration-[var(--duration-base)] ease-[var(--ease-out)] group-hover:-translate-x-1 group-hover:text-ink md:block" />
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}
              </div>

              {!loading && projects.length > 0 ? (
                <aside aria-label="خلاصهٔ تکمیلی" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="rounded-card bg-lime p-4">
                    <h3 className="mb-3 text-caption font-bold text-lime-ink">بازخورد باز هر پروژه</h3>
                    <ul className="flex flex-col gap-2">
                      {projects.map((p) => {
                        const n = openFeedback(p).length
                        return (
                          <li key={p.id} className="flex items-center gap-2 text-label font-normal">
                            <span className="w-24 truncate text-ink-soft">{p.name.split(' ').slice(-2).join(' ')}</span>
                            <span className="h-3 flex-1 rounded-full bg-surface/50" aria-hidden="true">
                              <span className="block h-full rounded-full bg-ink" style={{ width: `${(n / maxFb) * 100}%`, minWidth: n ? 8 : 0 }} />
                            </span>
                            <b className="w-4 text-end">{fa(n)}</b>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                  <div className="rounded-card bg-pink p-4">
                    <h3 className="mb-2 text-caption font-bold text-pink-ink">مهلت‌های پیش رو</h3>
                    {stats.deadlines.length === 0 ? (
                      <p className="text-caption text-ink-soft">لینک مشتریِ فعالی با مهلت نزدیک نیست.</p>
                    ) : (
                      <ul className="flex flex-col gap-1.5 text-caption">
                        {stats.deadlines.slice(0, 3).map(({ p, i }) => (
                          <li key={i.id}>
                            <b>{p.client}</b> <span className="text-ink-soft">تا {jalaliDate(i.expiresAt)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="rounded-card bg-sky p-4 sm:col-span-2 xl:col-span-1">
                    <h3 className="mb-3 flex items-center justify-between text-caption font-bold text-sky-ink">
                      <span>تیم استودیو</span>
                      <span className="font-normal text-ink-soft">{fa(ROSTER.length)} نفر</span>
                    </h3>
                    <ul className="grid grid-cols-3 gap-x-2 gap-y-3 sm:grid-cols-5 xl:grid-cols-3">
                      {ROSTER.map((m) => (
                        <li key={m.name} className="flex flex-col items-center gap-1 text-center" title={`${m.name} · ${m.title}`}>
                          <Avatar name={m.name} size={48} plain />
                          <span className="w-full truncate text-label font-bold leading-5">{m.name.split(' ')[0]}</span>
                          <span className="-mt-1 w-full truncate text-label font-normal leading-4 text-ink-soft">{GROUP_LABEL[m.group]}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </aside>
              ) : null}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
