import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { CHANGE_STATUS, changeLabel, latestReceipt } from '../domain/changes'
import { fa, jalaliDate, newId } from '../lib/format'
import { PageSkeleton } from '../components/ui/PageSkeleton'
import { useDocumentTitle, useSimulatedLoad } from '../lib/usePage'
import { nowIso, useStore } from '../state/store'
import { Badge } from '../components/ui/Badge'
import { Banner } from '../components/ui/Banner'
import { Button, ButtonLink } from '../components/ui/Button'
import { EmptyState } from '../components/ui/Misc'
import { ProjectHeader } from '../components/layout/ProjectHeader'
import { ChangeDetail } from '../components/changes/ChangeDetail'
import { StatTile } from '../components/ui/StatTile'
import { isOpenChange } from '../domain/changes'
import { NewChangeDialog } from '../components/changes/NewChangeDialog'

export default function ChangeRequests() {
  const { projectId } = useParams()
  const { getProject, dispatch } = useStore()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const project = getProject(projectId)
  const [newOpen, setNewOpen] = useState(params.get('new') === '1')
  const loading = useSimulatedLoad(`changes:${projectId}`)
  useDocumentTitle(project ? `${project.name} · درخواست‌های تغییر` : 'پروژه پیدا نشد')

  if (!project) {
    return (
      <div className="mx-auto max-w-xl pt-8">
        <EmptyState level={1} icon="lock" title="این پروژه پیدا نشد یا به آن دسترسی ندارید" actions={<ButtonLink to="/studio/projects" variant="primary">بازگشت به پروژه‌ها</ButtonLink>} />
      </div>
    )
  }

  if (loading) return <PageSkeleton />
  const base = `/studio/projects/${project.id}`
  const receipt = latestReceipt(project)
  const sorted = [...project.changes].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const selected = project.changes.find((c) => c.id === params.get('change')) ?? sorted[0]

  const closeNew = () => {
    setNewOpen(false)
    if (params.get('new')) {
      const n = new URLSearchParams(params)
      n.delete('new')
      setParams(n, { replace: true })
    }
  }

  if (!project.baselines.length) {
    return (
      <div className="fade-up">
        <ProjectHeader project={project} active="changes" />
        <EmptyState icon="lock" title="درخواست تغییر بعد از تأیید محدوده و مشتری فعال می‌شود" actions={<ButtonLink to={`${base}/brief`} variant="primary">رفتن به بریف و محدوده</ButtonLink>} />
      </div>
    )
  }

  return (
    <div className="fade-up">
      <ProjectHeader project={project} active="changes" />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-heading">درخواست‌های تغییر</h2>
          <p className="text-ui text-muted">درخواست‌های بعد از تأیید مشتری، مستقل از تأیید و محدودهٔ قبلی.</p>
        </div>
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <Button variant="primary" icon="plus" disabled={!receipt} aria-describedby="why-no-cr" onClick={() => setNewOpen(true)}>
            ثبت درخواست تغییر
          </Button>
          {!receipt ? (
            <p id="why-no-cr" className="text-label font-normal text-warn">
              تا مشتری نسخه‌ای را تأیید نکند، درخواست تغییر ثبت نمی‌شود.
            </p>
          ) : null}
        </div>
      </div>

      {receipt && project.changes.length > 0 ? (
        <section aria-label="خلاصهٔ درخواست‌ها" className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile icon="change" tint="bg-pink text-pink-ink" label="همهٔ درخواست‌ها" value={fa(project.changes.length)} />
          <StatTile icon="bolt" tint="bg-org text-org-ink" label="منتظر بررسی" value={fa(project.changes.filter((c) => c.status === 'draft' || c.status === 'assessed').length)} />
          <StatTile icon="clock" tint="bg-lav text-lav-ink" label="منتظر مشتری" value={fa(project.changes.filter((c) => c.status === 'proposal_sent' || c.status === 'needs_clarification').length)} />
          <StatTile icon="check" tint="bg-mint text-mint-ink" label="بسته‌شده" value={fa(project.changes.filter((c) => !isOpenChange(c)).length)} />
        </section>
      ) : null}

      {!receipt ? (
        <Banner tone="info" icon="info" title="هنوز تأییدی وجود ندارد که تغییر بخورد">
          اصلاح یک نسخهٔ تأییدنشده «درخواست اصلاح» است و در صفحهٔ بازبینی طرح انجام می‌شود، نه اینجا. بعد از تأیید مشتری، هر درخواست تازه در این صفحه و جدا از تأیید قبلی ثبت می‌شود.
        </Banner>
      ) : project.changes.length === 0 ? (
        <EmptyState
          icon="doc"
          title="هنوز درخواست تغییری ثبت نشده است"
          actions={
            <Button variant="primary" icon="plus" onClick={() => setNewOpen(true)}>
              ثبت اولین درخواست
            </Button>
          }
        >
          مشتری می‌تواند از پورتال خودش درخواست بدهد، یا شما از طرف او (مثلاً بعد از تماس) ثبت کنید. تأیید فعلی (<bdi dir="ltr" translate="no" className="font-mono">{receipt.number}</bdi>) هر دو حالت دست‌نخورده می‌ماند.
        </EmptyState>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)] xl:items-start">
          <section aria-label="فهرست درخواست‌ها" className="min-w-0">
            <ul className="flex flex-col gap-2.5">
              {sorted.map((c) => {
                const st = CHANGE_STATUS[c.status]
                const active = selected?.id === c.id
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      aria-current={active ? 'true' : undefined}
                      onClick={() => {
                        const n = new URLSearchParams(params)
                        n.set('change', c.id)
                        setParams(n, { replace: true })
                      }}
                      className={`block w-full rounded-card bg-surface p-3.5 text-start transition-colors hover:bg-hover ${active ? 'ring-2 ring-ink' : ''}`}
                    >
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone="neutral">{changeLabel(c)}</Badge>
                        <Badge tone={st.tone}>{st.label}</Badge>
                      </div>
                      <p className="mt-1.5 text-body font-bold leading-7">{c.title}</p>
                      <p className="text-label font-normal text-muted">
                        {c.requestedBy} · {jalaliDate(c.createdAt)}
                        {c.proposals.length ? ` · ${fa(c.proposals.length)} نسخهٔ پیشنهاد` : ''}
                      </p>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
          <div className="min-w-0">{selected ? <ChangeDetail key={`${selected.id}-${selected.status}-${selected.events.length}`} project={project} change={selected} /> : null}</div>
        </div>
      )}

      <NewChangeDialog
        open={newOpen}
        onClose={closeNew}
        audience="studio"
        onSubmit={(v) => {
          const id = newId('chg')
          dispatch({ type: 'createChange', projectId: project.id, changeId: id, ...v, now: nowIso() })
          closeNew()
          navigate(`${base}/changes?change=${id}`)
        }}
      />
    </div>
  )
}
