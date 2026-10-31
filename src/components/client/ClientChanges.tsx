import { useState } from 'react'
import type { ClientChange, ClientView } from '../../domain/client'
import type { ChangeStatus } from '../../domain/types'
import { fa, faMoney, jalaliDate, newId } from '../../lib/format'
import { nowIso, useStore } from '../../state/store'
import { NewChangeDialog } from '../changes/NewChangeDialog'
import { Badge, type Tone } from '../ui/Badge'
import { Banner } from '../ui/Banner'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { TextArea } from '../ui/FormField'

const LABEL: Record<ChangeStatus, { text: string; tone: Tone }> = {
  draft: { text: 'در حال بررسی توسط استودیو', tone: 'info' },
  needs_clarification: { text: 'استودیو توضیح می‌خواهد', tone: 'warn' },
  assessed: { text: 'در حال آماده‌سازی پیشنهاد', tone: 'info' },
  proposal_sent: { text: 'پیشنهاد منتظر پاسخ شماست', tone: 'ai' },
  accepted: { text: 'پیشنهاد را پذیرفته‌اید', tone: 'ok' },
  rejected: { text: 'پیشنهاد را رد کرده‌اید', tone: 'neutral' },
  within_scope: { text: 'داخل محدودهٔ فعلی', tone: 'ok' },
}

function Card({ c, accessId, baseline }: { c: ClientChange; accessId: string; baseline: number | null }) {
  const { dispatch } = useStore()
  const [answer, setAnswer] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<'accept' | 'reject' | null>(null)
  const st = LABEL[c.status]
  const p = c.proposal

  return (
    <li className="rounded-card bg-surface p-4 shadow-card">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="neutral">
          <bdi dir="ltr" translate="no">{c.number}</bdi>
        </Badge>
        <Badge tone={st.tone}>{st.text}</Badge>
      </div>
      <h3 className="mt-1.5 text-section leading-7">{c.title}</h3>
      <p className="text-ui leading-7 text-ink/85">{c.description}</p>
      <p className="text-label font-normal text-muted">ثبت‌شده در {jalaliDate(c.createdAt)}</p>

      {c.message ? (
        <p className="mt-3 rounded-control bg-ai-soft/50 p-3 text-ui leading-7 ring-1 ring-ai-line">
          <span className="font-semibold">پیام استودیو: </span>
          {c.message}
        </p>
      ) : null}

      {c.status === 'needs_clarification' ? (
        <div className="mt-3 flex flex-col gap-2">
          <TextArea label="پاسخ شما" rows={3} value={answer} onChange={(e) => { setAnswer(e.target.value); setErr(null) }} error={err} />
          <Button
            variant="primary"
            className="self-start"
            onClick={() => {
              if (!answer.trim()) return setErr('پاسخ خود را بنویسید.')
              dispatch({ type: 'clientAnswerChange', accessId, changeId: c.id, answer, now: nowIso() })
            }}
          >
            ارسال پاسخ
          </Button>
        </div>
      ) : null}

      {p ? (
        <section aria-label={`پیشنهاد ${fa(p.number)}`} className="mt-3 rounded-control border border-ai-line bg-ai-soft/30 p-3">
          <p className="mb-1 text-label font-bold text-ai">پیشنهاد استودیو {p.number > 1 ? `(نسخهٔ ${fa(p.number)})` : ''}</p>
          <p className="text-ui leading-7">{p.summary}</p>
          <dl className="mt-2 grid grid-cols-2 gap-2 text-ui">
            <div className="rounded-control bg-surface p-2.5 ring-1 ring-line">
              <dt className="text-label font-normal text-muted">مبلغ پیشنهادی</dt>
              <dd className="text-section">{faMoney(p.amountToman)} <span className="text-caption font-semibold">تومان</span></dd>
            </div>
            <div className="rounded-control bg-surface p-2.5 ring-1 ring-line">
              <dt className="text-label font-normal text-muted">اثر بر زمان تحویل</dt>
              <dd className="text-section">{fa(p.scheduleDays)} <span className="text-caption font-semibold">روز</span></dd>
            </div>
          </dl>
          {p.status === 'sent' ? (
            <div className="mt-3 flex gap-2">
              <Button variant="primary" className="min-h-12 flex-1" onClick={() => setConfirm('accept')}>
                پذیرش پیشنهاد
              </Button>
              <Button className="min-h-12 flex-1" onClick={() => setConfirm('reject')}>
                رد پیشنهاد
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}

      {c.status === 'accepted' ? (
        <div className="mt-3">
          <Banner tone="ok" live="off" title={`محدودهٔ پروژه به‌روز شد${baseline ? ' · Baseline v' + c.resultingBaseline : ''}`}>
            تأیید قبلی شما و رسید آن همان‌طور که بود باقی است؛ این تغییر جدا و با پذیرش شما ثبت شد.
          </Banner>
        </div>
      ) : null}
      {c.status === 'rejected' ? (
        <div className="mt-3">
          <Banner tone="neutral" live="off" title="پیشنهاد رد شد">
            هیچ چیزی در محدوده یا تأیید قبلی شما تغییر نکرد.
          </Banner>
        </div>
      ) : null}

      <Dialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm === 'accept' ? 'پذیرش این پیشنهاد' : 'رد این پیشنهاد'}
        description={p ? `${faMoney(p.amountToman)} تومان · ${fa(p.scheduleDays)} روز` : undefined}
        footer={
          <>
            <Button
              variant="primary"
              onClick={() => {
                if (p && confirm) dispatch({ type: 'clientRespondProposal', accessId, changeId: c.id, proposalId: p.id, decision: confirm, now: nowIso() })
                setConfirm(null)
              }}
            >
              {confirm === 'accept' ? 'بله، می‌پذیرم' : 'بله، رد می‌کنم'}
            </Button>
            <Button onClick={() => setConfirm(null)}>بازگشت</Button>
          </>
        }
      >
        <p className="text-ui leading-7">
          {confirm === 'accept'
            ? 'با پذیرش، همین پیشنهاد مشخص برای محدودهٔ پروژه ثبت می‌شود و یک Baseline جدید ساخته می‌شود. تأیید قبلی شما و رسید آن تغییر نمی‌کند. این پذیرش امضای حقوقی یا جایگزین قرارداد نیست.'
            : 'با رد، هیچ تغییری در محدوده یا تأیید قبلی شما ایجاد نمی‌شود و درخواست بسته می‌شود.'}
        </p>
      </Dialog>
    </li>
  )
}

/** بخش «درخواست‌های شما»؛ فقط بعد از تأیید مشتری و فقط با داده‌های Projection */
export function ClientChanges({ view, accessId }: { view: ClientView; accessId: string }) {
  const { dispatch } = useStore()
  const [open, setOpen] = useState(false)
  return (
    <section aria-labelledby="chg" className="mt-5 rounded-card bg-surface p-5 shadow-card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 id="chg" className="text-section">
          درخواست‌های شما
        </h2>
        <Button size="sm" icon="plus" onClick={() => setOpen(true)}>
          درخواست جدید
        </Button>
      </div>
      {view.changes.length === 0 ? (
        <p className="text-ui leading-7 text-muted">اگر بعد از این تأیید چیز تازه‌ای لازم دارید، اینجا ثبت کنید. تأیید فعلی شما تغییر نمی‌کند و استودیو هزینه و زمان را جدا به شما پیشنهاد می‌دهد.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {[...view.changes].reverse().map((c) => (
            <Card key={`${c.id}-${c.status}-${c.proposal?.id ?? ''}`} c={c} accessId={accessId} baseline={view.baselineVersion} />
          ))}
        </ul>
      )}
      <NewChangeDialog
        open={open}
        onClose={() => setOpen(false)}
        audience="client"
        onSubmit={(v) => {
          dispatch({ type: 'clientCreateChange', accessId, changeId: newId('chg'), ...v, now: nowIso() })
          setOpen(false)
        }}
      />
    </section>
  )
}
