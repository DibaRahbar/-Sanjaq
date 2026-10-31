import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { DECISION_STATUS } from '../domain/project'
import { OUTCOME_LABEL, ROLE_LABEL, type Decision, type DecisionStatus } from '../domain/types'
import { fa, jalaliDate, jalaliDateTime, ltr, newId, normalizeFa } from '../lib/format'
import { Badge } from '../components/ui/Badge'
import { Banner } from '../components/ui/Banner'
import { Button, ButtonLink } from '../components/ui/Button'
import { Icon } from '../components/ui/Icon'
import { Avatar, EmptyState } from '../components/ui/Misc'
import { StatTile } from '../components/ui/StatTile'
import { decisionsToImplement } from '../domain/project'
import { ProjectHeader } from '../components/layout/ProjectHeader'
import { DecisionDialog, type DecisionPreset } from '../components/decisions/DecisionDialog'
import { canApproveRole } from '../state/reducer'
import { PageSkeleton } from '../components/ui/PageSkeleton'
import { useDocumentTitle, useSimulatedLoad } from '../lib/usePage'
import { nowIso, useStore } from '../state/store'

type Filter = 'all' | DecisionStatus
const FILTERS: Filter[] = ['all', 'draft', 'final', 'superseded']

const outcomeTone = { adopt: 'ok', reject: 'err', defer: 'warn' } as const

export default function DecisionLedger() {
  const { projectId } = useParams()
  const { getProject, dispatch, role } = useStore()
  const [params, setParams] = useSearchParams()
  const project = getProject(projectId)

  /* فیلتر و جست‌وجو در نشانی می‌مانند (لینک‌پذیر، پایدار بعد از refresh) */
  const filterParam = params.get('filter')
  const filter: Filter = FILTERS.includes(filterParam as Filter) ? (filterParam as Filter) : 'all'
  const q = params.get('q') ?? ''
  const patchParams = (patch: Record<string, string>) =>
    setParams(
      (prev) => {
        const n = new URLSearchParams(prev)
        for (const [k, v] of Object.entries(patch)) {
          if (v === '' || v === 'all') n.delete(k)
          else n.set(k, v)
        }
        return n
      },
      { replace: true },
    )
  const setFilter = (v: Filter) => patchParams({ filter: v })
  const setQ = (v: string) => patchParams({ q: v })
  const [dialog, setDialog] = useState<DecisionPreset | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const loading = useSimulatedLoad(`decisions:${projectId}`)
  useDocumentTitle(project ? `${project.name} · دفتر تصمیم‌ها` : 'پروژه پیدا نشد')

  const sorted = useMemo(() => (project ? [...project.decisions].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : []), [project])
  const visible = useMemo(() => {
    const needle = normalizeFa(q)
    return sorted.filter((d) => (filter === 'all' || d.status === filter) && (needle === '' || normalizeFa(`${d.summary} ${d.reason} ${d.author}`).includes(needle)))
  }, [sorted, filter, q])

  if (!project) {
    return (
      <div className="mx-auto max-w-xl pt-8">
        <EmptyState level={1} icon="lock" title="این پروژه پیدا نشد یا به آن دسترسی ندارید" actions={<ButtonLink to="/studio/projects" variant="primary">بازگشت به پروژه‌ها</ButtonLink>} />
      </div>
    )
  }

  if (loading) return <PageSkeleton />
  const base = `/studio/projects/${project.id}`
  const canManage = canApproveRole(role)
  const versionLabel = (id: string) => project.versions.find((v) => v.id === id)?.label ?? '—'
  const selected: Decision | undefined = project.decisions.find((d) => d.id === params.get('decision')) ?? visible[0]
  const select = (id: string) => {
    const n = new URLSearchParams(params)
    n.set('decision', id)
    setParams(n, { replace: true })
  }

  const counts = {
    all: project.decisions.length,
    draft: project.decisions.filter((d) => d.status === 'draft').length,
    final: project.decisions.filter((d) => d.status === 'final').length,
    superseded: project.decisions.filter((d) => d.status === 'superseded').length,
  }

  return (
    <div className="fade-up">
      <ProjectHeader project={project} active="decisions" />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-heading">دفتر تصمیم‌ها</h2>
          <p className="text-ui text-muted">چه تصمیمی، چرا، توسط چه کسی و روی کدام نسخه؟</p>
        </div>
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <Button variant="primary" icon="plus" disabled={project.versions.length === 0} aria-describedby="why-no-dec" onClick={() => setDialog({})}>
            ثبت تصمیم
          </Button>
          {project.versions.length === 0 ? (
            <p id="why-no-dec" className="text-label font-normal text-warn">
              تصمیم به یک نسخه وصل می‌شود؛ ابتدا نسخهٔ طرح اضافه کنید.
            </p>
          ) : !canManage ? (
            <p id="why-no-dec" className="text-label font-normal text-muted">
              شما فقط پیش‌نویس می‌سازید؛ نهایی‌سازی با مدیر پروژه است.
            </p>
          ) : null}
        </div>
      </div>

      {project.decisions.length > 0 ? (
        <section aria-label="خلاصهٔ تصمیم‌ها" className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile icon="decision" tint="bg-lav text-lav-ink" label="همهٔ تصمیم‌ها" value={fa(counts.all)} />
          <StatTile icon="check" tint="bg-mint text-mint-ink" label="نهایی" value={fa(counts.final)} />
          <StatTile icon="doc" tint="bg-org text-org-ink" label="پیش‌نویس" value={fa(counts.draft)} />
          <StatTile icon="version" tint="bg-lime text-lime-ink" label="اعمال‌نشده در طرح" value={fa(decisionsToImplement(project).length)} />
        </section>
      ) : null}

      {notice ? (
        <div className="mb-4">
          <Banner tone="ok" title={notice} />
        </div>
      ) : null}

      {project.decisions.length === 0 ? (
        <EmptyState icon="doc" title="هنوز تصمیمی ثبت نشده است" actions={project.versions.length > 0 ? <Button variant="primary" icon="plus" onClick={() => setDialog({})}>ثبت اولین تصمیم</Button> : <ButtonLink to={base} variant="primary">رفتن به نمای کلی</ButtonLink>}>
          تصمیم‌ها معمولاً از یک بازخورد روی طرح شروع می‌شوند. می‌توانید از صفحهٔ بازبینی روی هر بازخورد «ثبت تصمیم» را بزنید.
        </EmptyState>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-start">
          <section aria-label="فهرست تصمیم‌ها" className="min-w-0">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div role="radiogroup" aria-label="فیلتر وضعیت" className="flex flex-wrap gap-1.5">
                {(
                  [
                    ['all', 'همه'],
                    ['draft', 'پیش‌نویس'],
                    ['final', 'نهایی'],
                    ['superseded', 'جایگزین‌شده'],
                  ] as const
                ).map(([v, l]) => (
                  <button key={v} type="button" role="radio" aria-checked={filter === v} onClick={() => setFilter(v)} className={`min-h-11 rounded-full border px-3.5 text-caption font-semibold ${filter === v ? 'border-ink bg-ink text-on-ink' : 'border-line-strong bg-surface hover:bg-sunken'}`}>
                    {l}
                    <span className={`ms-1.5 text-label font-normal ${filter === v ? 'text-on-ink/75' : 'text-muted'}`}>{fa(counts[v])}</span>
                  </button>
                ))}
              </div>
              <div className="relative sm:w-56">
                <label htmlFor="dec-q" className="sr-only">
                  جست‌وجو در تصمیم‌ها
                </label>
                <Icon name="search" size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted" />
                <input id="dec-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="جست‌وجوی تصمیم…" className="min-h-11 w-full rounded-control border border-line-strong bg-surface ps-9 pe-3 text-caption" />
              </div>
            </div>

            {visible.length === 0 ? (
              <div className="rounded-card border-2 border-dashed border-line-strong p-6 text-center text-ui text-muted">
                تصمیمی با این فیلتر یا جست‌وجو نیست.{' '}
                <button type="button" className="underline underline-offset-2" onClick={() => patchParams({ filter: 'all', q: '' })}>
                  پاک‌کردن
                </button>
              </div>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {visible.map((d) => {
                  const active = selected?.id === d.id
                  return (
                    <li key={d.id}>
                      <button
                        type="button"
                        onClick={() => select(d.id)}
                        aria-current={active ? 'true' : undefined}
                        className={`block w-full rounded-card bg-surface p-3.5 text-start transition-colors hover:bg-hover ${active ? 'ring-2 ring-ink' : ''} ${d.status === 'superseded' ? 'opacity-80' : ''}`}
                      >
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge tone={DECISION_STATUS[d.status].tone} icon={d.status === 'final' ? 'lock' : undefined}>{DECISION_STATUS[d.status].label}</Badge>
                          <Badge tone={outcomeTone[d.outcome]}>{OUTCOME_LABEL[d.outcome]}</Badge>
                          <Badge tone="neutral">
                            <bdi dir="ltr" translate="no">{versionLabel(d.versionId)}</bdi>
                          </Badge>
                          {d.implementedInVersionId ? <Badge tone="ok" icon="check">اعمال‌شده در {ltr(versionLabel(d.implementedInVersionId))}</Badge> : null}
                        </div>
                        <p className="mt-1.5 text-body font-bold leading-7">{d.summary}</p>
                        <p className="line-clamp-2 text-caption leading-6 text-muted">{d.reason}</p>
                        <p className="mt-1.5 flex flex-wrap items-center gap-x-3 text-label font-normal text-muted">
                          <span className="flex items-center gap-1.5">
                            <Avatar name={d.author} size={18} /> {d.author}
                          </span>
                          <span>{jalaliDate(d.createdAt)}</span>
                          <span>{fa(d.feedbackIds.length)} بازخورد مرتبط</span>
                        </p>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          {/* جزئیات */}
          <aside aria-label="جزئیات تصمیم" className="min-w-0 xl:sticky xl:top-6 xl:max-h-[calc(100dvh-3rem)] xl:overflow-y-auto">
            {selected ? (
              <article className="rounded-card bg-surface ring-1 ring-line-strong p-5 shadow-card">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge tone={DECISION_STATUS[selected.status].tone} icon={selected.status === 'final' ? 'lock' : undefined}>{DECISION_STATUS[selected.status].label}</Badge>
                  <Badge tone={outcomeTone[selected.outcome]}>{OUTCOME_LABEL[selected.outcome]}</Badge>
                </div>
                <h3 className="mt-2 text-heading leading-8">{selected.summary}</h3>

                <dl className="mt-3 flex flex-col gap-3 text-ui">
                  <div>
                    <dt className="text-label font-bold text-muted">چرا؟</dt>
                    <dd className="leading-7">{selected.reason}</dd>
                  </div>
                  <>
                    <div>
                      <dt className="text-label font-bold text-muted">ثبت‌کننده</dt>
                      <dd>
                        {selected.author}
                        <span className="block text-label font-normal text-muted">
                          {ROLE_LABEL[selected.authorRole]} · {jalaliDateTime(selected.createdAt)}
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-label font-bold text-muted">نهایی‌کننده</dt>
                      <dd>
                        {selected.finalizedBy ? (
                          <>
                            {selected.finalizedBy}
                            <span className="block text-label font-normal text-muted">{selected.finalizedAt ? jalaliDateTime(selected.finalizedAt) : ''}</span>
                          </>
                        ) : (
                          <span className="text-muted">هنوز نهایی نشده</span>
                        )}
                      </dd>
                    </div>
                  </>
                  <div>
                    <dt className="text-label font-bold text-muted">نسخهٔ مربوط</dt>
                    <dd>
                      <Link to={`${base}/review/${selected.versionId}`} className="font-semibold underline underline-offset-2">
                        نسخهٔ <bdi dir="ltr" translate="no">{versionLabel(selected.versionId)}</bdi>
                      </Link>
                      {selected.implementedInVersionId ? (
                        <span className="text-muted">
                          {' '}
                          · اعمال‌شده در{' '}
                          <Link to={`${base}/review/${selected.implementedInVersionId}`} className="font-semibold text-ink underline underline-offset-2">
                            <bdi dir="ltr" translate="no">{versionLabel(selected.implementedInVersionId)}</bdi>
                          </Link>
                        </span>
                      ) : selected.status === 'final' && selected.outcome === 'adopt' ? (
                        <span className="text-warn"> · هنوز در طرح اعمال نشده</span>
                      ) : null}
                    </dd>
                  </div>
                  <div>
                    <dt className="mb-1 text-label font-bold text-muted">بازخوردهای مرتبط</dt>
                    <dd>
                      {selected.feedbackIds.length === 0 ? (
                        <span className="text-muted">بدون بازخورد مرتبط</span>
                      ) : (
                        <ul className="flex flex-col gap-2">
                          {selected.feedbackIds.map((fid) => {
                            const f = project.feedback.find((x) => x.id === fid)
                            if (!f) return null
                            return (
                              <li key={fid} className="rounded-control border border-line bg-canvas p-2.5">
                                <p className="text-caption leading-6">
                                  <span className="text-muted">بازخورد {fa(f.seq)} · </span>
                                  {f.text}
                                </p>
                                <ButtonLink size="sm" variant="secondary" className="mt-1.5" to={`${base}/review/${f.versionId}?feedback=${f.id}`} icon="eye">
                                  مشاهده روی طرح
                                </ButtonLink>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </dd>
                  </div>
                  {selected.supersedesId ? (
                    <div>
                      <dt className="text-label font-bold text-muted">جایگزین کدام تصمیم؟</dt>
                      <dd>
                        <button type="button" className="text-start font-semibold underline underline-offset-2" onClick={() => select(selected.supersedesId!)}>
                          {project.decisions.find((d) => d.id === selected.supersedesId)?.summary}
                        </button>
                      </dd>
                    </div>
                  ) : null}
                  {selected.supersededById ? (
                    <div>
                      <dt className="text-label font-bold text-muted">جایگزین‌شده با</dt>
                      <dd>
                        <button type="button" className="text-start font-semibold underline underline-offset-2" onClick={() => select(selected.supersededById!)}>
                          {project.decisions.find((d) => d.id === selected.supersededById)?.summary}
                        </button>
                      </dd>
                    </div>
                  ) : null}
                </dl>

                <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
                  {selected.status === 'draft' ? (
                    <>
                      <Button
                        variant="primary"
                        icon="lock"
                        disabled={!canManage}
                        aria-describedby="why-no-fin"
                        onClick={() => {
                          dispatch({ type: 'finalizeDecision', projectId: project.id, decisionId: selected.id, now: nowIso() })
                          setNotice('تصمیم نهایی شد و بازخوردهای مرتبط حل شدند.')
                        }}
                      >
                        نهایی‌سازی
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => {
                          dispatch({ type: 'deleteDecisionDraft', projectId: project.id, decisionId: selected.id, now: nowIso() })
                          setNotice('پیش‌نویس حذف شد.')
                          const n = new URLSearchParams(params)
                          n.delete('decision')
                          setParams(n, { replace: true })
                        }}
                      >
                        حذف پیش‌نویس
                      </Button>
                      {!canManage ? (
                        <p id="why-no-fin" className="w-full text-label font-normal text-warn">
                          نهایی‌سازی فقط با مدیر پروژه یا مدیر استودیو است.
                        </p>
                      ) : null}
                    </>
                  ) : selected.status === 'final' ? (
                    <>
                      <Button onClick={() => setDialog({ supersedes: selected })}>ثبت تصمیم جایگزین</Button>
                      <p className="w-full text-label font-normal leading-5 text-muted">تصمیم نهایی ویرایش یا حذف نمی‌شود. برای تغییر، تصمیم جدیدی ثبت می‌شود که این را جایگزین می‌کند و سابقه می‌ماند.</p>
                    </>
                  ) : (
                    <p className="text-label font-normal text-muted">این تصمیم جایگزین شده و فقط برای ردیابی نگه داشته شده است.</p>
                  )}
                </div>
              </article>
            ) : null}
          </aside>
        </div>
      )}

      <DecisionDialog
        open={dialog !== null}
        onClose={() => setDialog(null)}
        project={project}
        role={role}
        preset={dialog ?? {}}
        onSubmit={(v, finalize) => {
          const id = newId('dec')
          dispatch({ type: 'createDecision', projectId: project.id, decisionId: id, ...v, finalize, now: nowIso() })
          setDialog(null)
          setNotice(finalize && canManage ? 'تصمیم نهایی شد.' : 'پیش‌نویس تصمیم ذخیره شد.')
          select(id)
        }}
      />
    </div>
  )
}
