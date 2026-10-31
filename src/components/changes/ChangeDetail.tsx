import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CHANGE_STATUS, SCOPE_CLASS_LABEL, assessmentComplete, changeLabel, matchExclusions } from '../../domain/changes'
import type { ChangeRequest, Project, ScopeClass } from '../../domain/types'
import { roleName } from '../../domain/types'
import { fa, faMoney, jalaliDateTime, newId } from '../../lib/format'
import { canApproveRole } from '../../state/reducer'
import { nowIso, useStore } from '../../state/store'
import { Badge } from '../ui/Badge'
import { Banner } from '../ui/Banner'
import { Button } from '../ui/Button'
import { NumField, TextArea } from '../ui/FormField'
import { Icon } from '../ui/Icon'

function Step({ n, title, state, children }: { n: number; title: string; state: 'done' | 'current' | 'todo'; children: ReactNode }) {
  return (
    <section aria-labelledby={`step-${n}`} className={`rounded-card border p-4 shadow-card sm:p-5 ${state === 'todo' ? 'border-line bg-canvas' : 'border-line bg-surface'}`}>
      <h3 id={`step-${n}`} className="mb-3 flex items-center gap-2 text-body font-bold">
        <span className={`grid size-6 place-items-center rounded-full text-label font-normal ${state === 'done' ? 'bg-ok-solid text-white' : state === 'current' ? 'bg-ink text-on-ink' : 'bg-sunken text-muted ring-1 ring-line-strong'}`}>
          {state === 'done' ? <Icon name="check" size={14} /> : fa(n)}
        </span>
        {title}
      </h3>
      {children}
    </section>
  )
}

export function ChangeDetail({ project, change: c }: { project: Project; change: ChangeRequest }) {
  const { dispatch, role } = useStore()
  const canManage = canApproveRole(role)
  const base = project.baselines.find((b) => b.id === c.baselineId)
  const receipt = project.receipts.find((r) => r.id === c.receiptId)
  const matches = base ? matchExclusions(c, base.snapshot.fields.exclusions.value) : []
  const resulting = project.baselines.find((b) => b.id === c.resultingBaselineId)
  const approvedInvite = project.invites.find((i) => i.status === 'approved')
  const st = CHANGE_STATUS[c.status]

  const [cls, setCls] = useState<ScopeClass | null>(c.classification)
  const [clsNote, setClsNote] = useState(c.classificationNote)
  const [msg, setMsg] = useState(c.clientMessage)
  const [editingCls, setEditingCls] = useState(false)
  const [clsErr, setClsErr] = useState<string | null>(null)

  const [hours, setHours] = useState<number | null>(c.assessment.internalHours)
  const [days, setDays] = useState<number | null>(c.assessment.scheduleDays)
  const [amount, setAmount] = useState<number | null>(c.assessment.amountToman)
  const [aNote, setANote] = useState(c.assessment.note)
  const [summary, setSummary] = useState(c.proposals.at(-1)?.summary ?? '')
  const [sumErr, setSumErr] = useState<string | null>(null)

  const classifiable = canManage && (c.status === 'draft' || c.status === 'assessed')
  const showAssessment = c.classification === 'out'
  const assessable = canManage && showAssessment && ['draft', 'assessed', 'proposal_sent'].includes(c.status)
  const sendable = canManage && showAssessment && assessmentComplete(c) && (c.status === 'assessed' || c.status === 'proposal_sent')
  const sentCurrent = c.proposals.find((p) => p.status === 'sent')
  const pendingChange =
    sentCurrent && (sentCurrent.amountToman !== c.assessment.amountToman || sentCurrent.scheduleDays !== c.assessment.scheduleDays)

  const saveCls = () => {
    if (!cls) return setClsErr('یکی از سه گزینه را انتخاب کنید.')
    if ((cls === 'within' || cls === 'unclear') && msg.trim() === '') return setClsErr(cls === 'within' ? 'برای مشتری بنویسید چرا داخل محدوده است.' : 'پرسش خود را برای مشتری بنویسید.')
    setClsErr(null)
    dispatch({ type: 'classifyChange', projectId: project.id, changeId: c.id, classification: cls, note: clsNote, clientMessage: msg, now: nowIso() })
    setEditingCls(false)
  }

  return (
    <article className="flex flex-col gap-4">
      <header className="rounded-card bg-surface ring-1 ring-line-strong p-5 shadow-card">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">{changeLabel(c)}</Badge>
          <Badge tone={st.tone}>{st.label}</Badge>
        </div>
        <h2 className="mt-2 text-heading leading-8">{c.title}</h2>
        <p className="text-ui leading-7">{c.description}</p>
        <p className="mt-1 text-label font-normal text-muted">
          درخواست‌دهنده: {c.requestedBy} ({roleName(c.requestedByRole)}) · {jalaliDateTime(c.createdAt)}
        </p>
        {c.clarificationAnswer ? <p className="mt-2 rounded-control bg-canvas p-2.5 text-caption leading-6 ring-1 ring-line">پاسخ مشتری به پرسش: «{c.clarificationAnswer}»</p> : null}
      </header>

      {/* ارتباط با تعهد قبلی */}
      <section aria-labelledby="commit" className="rounded-card border border-ok-line bg-ok-soft/40 p-4 sm:p-5">
        <h3 id="commit" className="mb-1 flex items-center gap-2 text-body font-bold">
          <Icon name="lock" size={16} className="text-ok" />
          تعهد قبلی که تغییر نمی‌کند
        </h3>
        <p className="text-caption leading-6">
          این درخواست بعد از <bdi dir="ltr" translate="no" className="font-mono">Baseline v{base?.version}</bdi> و رسید{' '}
          <bdi dir="ltr" translate="no" className="font-mono">{receipt?.number}</bdi> (نسخهٔ <bdi dir="ltr" translate="no">{receipt?.versionLabel}</bdi>) آمده است. هر دو دست‌نخورده می‌مانند.
        </p>
        {base ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-label font-bold text-muted">تحویل‌دادنی‌های توافق‌شده</p>
              <ul className="list-disc ps-5 text-caption leading-6">
                {base.snapshot.fields.deliverables.value.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-1 text-label font-bold text-muted">خارج از محدودهٔ توافق‌شده</p>
              <ul className="list-disc ps-5 text-caption leading-6">
                {base.snapshot.fields.exclusions.value.map((d, i) => (
                  <li key={i} className={matches.includes(d) ? 'rounded bg-warn-soft px-1 font-semibold text-warn' : ''}>
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
        {matches.length > 0 ? (
          <p className="mt-2 text-caption leading-6 text-warn">
            متن درخواست به «{matches.join('، ')}» اشاره دارد. این فقط راهنمایی بر اساس تطبیق متن است؛ تصمیم طبقه‌بندی با شماست.
          </p>
        ) : null}
        {base ? (
          <Link to={`/studio/projects/${project.id}/brief`} className="mt-2 inline-block text-caption font-semibold underline underline-offset-2">
            مشاهدهٔ Baseline کامل
          </Link>
        ) : null}
      </section>

      {!canManage ? (
        <Banner tone="info" live="off" icon="info">
          طبقه‌بندی، ارزیابی و ارسال پیشنهاد فقط با مدیر پروژه یا مدیر استودیو است؛ شما می‌توانید درخواست را ببینید.
        </Banner>
      ) : null}

      {/* ۱. طبقه‌بندی */}
      <Step n={1} title="طبقه‌بندی: داخل محدوده بود یا نه؟" state={c.classification ? 'done' : 'current'}>
        {c.classification && !editingCls ? (
          <div className="flex flex-col gap-2 text-ui leading-7">
            <p>
              <Badge tone={c.classification === 'out' ? 'warn' : c.classification === 'within' ? 'ok' : 'info'}>{SCOPE_CLASS_LABEL[c.classification]}</Badge>
            </p>
            {c.classificationNote ? (
              <p className="rounded-control bg-canvas p-2.5 text-caption ring-1 ring-line">
                <Badge tone="warn" icon="lock" className="me-2">فقط داخلی</Badge>
                {c.classificationNote}
              </p>
            ) : null}
            {c.clientMessage ? (
              <p className="rounded-control bg-ai-soft/50 p-2.5 text-caption ring-1 ring-ai-line">
                <Badge tone="ai" icon="eye" className="me-2">برای مشتری</Badge>
                {c.clientMessage}
              </p>
            ) : null}
            {classifiable ? (
              <Button size="sm" className="self-start" onClick={() => setEditingCls(true)}>
                تغییر طبقه‌بندی
              </Button>
            ) : null}
          </div>
        ) : (
          <fieldset disabled={!classifiable} className="flex flex-col gap-3 disabled:opacity-70">
            <legend className="sr-only">طبقه‌بندی درخواست</legend>
            {(['out', 'within', 'unclear'] as ScopeClass[]).map((v) => (
              <label key={v} className={`flex cursor-pointer items-start gap-2 rounded-control border p-2.5 text-ui ${cls === v ? 'border-ink bg-sunken' : 'border-line'}`}>
                <input type="radio" name={`cls-${c.id}`} className="mt-1.5 accent-[var(--color-ink)]" checked={cls === v} onChange={() => { setCls(v); setClsErr(null) }} />
                {SCOPE_CLASS_LABEL[v]}
              </label>
            ))}
            <TextArea label="یادداشت داخلی" rows={2} value={clsNote} onChange={(e) => setClsNote(e.target.value)} hint="فقط تیم استودیو می‌بیند؛ هرگز به مشتری نشان داده نمی‌شود." />
            {cls === 'within' || cls === 'unclear' ? (
              <TextArea
                label={cls === 'within' ? 'پیام برای مشتری' : 'پرسش برای مشتری'}
                required
                rows={2}
                value={msg}
                onChange={(e) => { setMsg(e.target.value); setClsErr(null) }}
                error={clsErr}
                hint="این متن در پورتال مشتری نمایش داده می‌شود."
              />
            ) : clsErr ? (
              <p className="text-caption font-semibold text-err">{clsErr}</p>
            ) : null}
            {classifiable ? (
              <div className="flex gap-2">
                <Button variant="primary" onClick={saveCls}>
                  {cls === 'unclear' ? 'ارسال پرسش به مشتری' : 'ثبت طبقه‌بندی'}
                </Button>
                {editingCls ? <Button variant="ghost" onClick={() => setEditingCls(false)}>انصراف</Button> : null}
              </div>
            ) : null}
          </fieldset>
        )}
      </Step>

      {/* ۲. ارزیابی دستی */}
      <Step n={2} title="ارزیابی دستی اثر" state={!showAssessment ? 'todo' : assessmentComplete(c) ? 'done' : 'current'}>
        {!showAssessment ? (
          <p className="text-caption text-muted">فقط برای درخواستی که «خارج از محدوده» طبقه‌بندی شده فعال می‌شود.</p>
        ) : (
          <fieldset disabled={!assessable} className="flex flex-col gap-4 disabled:opacity-70">
            <legend className="sr-only">ارزیابی دستی</legend>
            <Banner tone="warn" live="off" icon="alert" title="همهٔ اعداد را خودتان وارد می‌کنید">
              سیستم نرخ، سود یا هزینه محاسبه نمی‌کند و AI هم عددی نمی‌سازد. هر ستون برچسب دارد که چه کسی آن را می‌بیند.
            </Banner>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-control border border-warn-line bg-warn-soft/30 p-3">
                <Badge tone="warn" icon="lock" className="mb-2">فقط داخلی · تخمین دستی</Badge>
                <NumField label="ساعت کار داخلی" value={hours} onChange={setHours} max={100000} maxDigits={6} suffix="ساعت" />
                <div className="mt-3">
                  <TextArea label="یادداشت ارزیابی" rows={2} value={aNote} onChange={(e) => setANote(e.target.value)} />
                </div>
              </div>
              <div className="rounded-control border border-ai-line bg-ai-soft/30 p-3">
                <Badge tone="ai" icon="eye" className="mb-2">قابل نمایش به مشتری · تخمین دستی</Badge>
                <div className="flex flex-col gap-3">
                  <NumField label="اثر بر زمان تحویل" value={days} onChange={setDays} max={3650} maxDigits={4} suffix="روز" />
                  <NumField label="مبلغ پیشنهادی به مشتری" value={amount} onChange={setAmount} max={999999999999} maxDigits={12} grouped suffix="تومان" />
                </div>
              </div>
            </div>
            {assessable ? (
              <Button
                variant="secondary"
                className="self-start"
                onClick={() => dispatch({ type: 'saveAssessment', projectId: project.id, changeId: c.id, internalHours: hours, scheduleDays: days, amountToman: amount, note: aNote, now: nowIso() })}
              >
                ثبت ارزیابی
              </Button>
            ) : null}
            {c.assessment.updatedAt ? (
              <p className="text-label font-normal text-muted">
                آخرین ثبت: {c.assessment.updatedBy} · {jalaliDateTime(c.assessment.updatedAt)}
              </p>
            ) : null}
          </fieldset>
        )}
      </Step>

      {/* ۳. پیشنهاد */}
      <Step n={3} title="پیشنهاد برای مشتری" state={c.proposals.length ? 'done' : sendable ? 'current' : 'todo'}>
        {!showAssessment || !assessmentComplete(c) ? (
          <p className="text-caption text-muted">بعد از ثبت ارزیابی کامل (ساعت، زمان و مبلغ) فعال می‌شود.</p>
        ) : (
          <div className="flex flex-col gap-3">
            <TextArea
              label="متن پیشنهاد (آنچه مشتری می‌خواند)"
              rows={3}
              value={summary}
              onChange={(e) => { setSummary(e.target.value); setSumErr(null) }}
              error={sumErr}
              disabled={!sendable}
              hint="فقط همین متن، مبلغ و اثر زمان برای مشتری نمایش داده می‌شود؛ ساعت داخلی و یادداشت‌ها نه."
            />
            <div className="rounded-control border border-ai-line bg-ai-soft/30 p-3" aria-label="پیش‌نمایش مشتری">
              <p className="mb-1 text-label font-bold text-ai">پیش‌نمایش آنچه مشتری می‌بیند</p>
              <p className="text-ui leading-7">{summary.trim() || '—'}</p>
              <p className="mt-1 text-ui font-semibold">
                مبلغ پیشنهادی: {faMoney(c.assessment.amountToman ?? 0)} تومان · اثر بر زمان: {fa(c.assessment.scheduleDays ?? 0)} روز
              </p>
            </div>
            {pendingChange ? (
              <p className="text-caption text-warn">ارزیابی بعد از ارسال آخرین پیشنهاد تغییر کرده است؛ برای اعمال، نسخهٔ جدید پیشنهاد بفرستید. نسخهٔ قبلی تا آن موقع همان‌طور که ارسال شده می‌ماند.</p>
            ) : null}
            {sendable ? (
              <Button
                variant="primary"
                icon="eye"
                className="self-start"
                disabled={!!sentCurrent && !pendingChange && summary.trim() === sentCurrent.summary}
                onClick={() => {
                  if (!summary.trim()) return setSumErr('متن پیشنهاد را بنویسید.')
                  dispatch({ type: 'sendProposal', projectId: project.id, changeId: c.id, proposalId: newId('prp'), summary, now: nowIso() })
                }}
              >
                {c.proposals.length ? `ارسال نسخهٔ ${fa(c.proposals.length + 1)} پیشنهاد` : 'ارسال پیشنهاد به مشتری'}
              </Button>
            ) : null}
            {c.proposals.length > 0 ? (
              <ol className="flex flex-col gap-1.5" aria-label="نسخه‌های پیشنهاد">
                {[...c.proposals].reverse().map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-control bg-canvas p-2.5 text-caption ring-1 ring-line">
                    <span>
                      پیشنهاد {fa(p.number)} · {faMoney(p.amountToman)} تومان · {fa(p.scheduleDays)} روز
                      <span className="block text-muted">{p.sentBy} · {jalaliDateTime(p.createdAt)}</span>
                    </span>
                    <Badge tone={p.status === 'accepted' ? 'ok' : p.status === 'rejected' ? 'neutral' : p.status === 'sent' ? 'ai' : 'neutral'}>
                      {p.status === 'sent' ? 'ارسال‌شده' : p.status === 'accepted' ? 'پذیرفته شد' : p.status === 'rejected' ? 'رد شد' : 'جایگزین‌شده'}
                    </Badge>
                  </li>
                ))}
              </ol>
            ) : null}
          </div>
        )}
      </Step>

      {/* ۴. نتیجه */}
      <Step n={4} title="نتیجه" state={c.status === 'accepted' || c.status === 'rejected' || c.status === 'within_scope' ? 'done' : 'todo'}>
        {c.status === 'accepted' && resulting ? (
          <Banner tone="ok" live="off" title={`مشتری پیشنهاد را پذیرفت · Baseline v${resulting.version} ساخته شد`}>
            محدوده با تحویل‌دادنی تازه به‌روز شد. Baseline v{base?.version} به‌عنوان «جایگزین‌شده» در تاریخچه ماند و رسید {receipt?.number} تغییر نکرد.{' '}
            <Link to={`/studio/projects/${project.id}/brief`} className="font-semibold underline underline-offset-2">
              مشاهدهٔ Baseline
            </Link>
          </Banner>
        ) : c.status === 'rejected' ? (
          <Banner tone="neutral" live="off" title="مشتری پیشنهاد را رد کرد">
            هیچ تغییری در محدوده یا تأیید قبلی ایجاد نشد.
          </Banner>
        ) : c.status === 'within_scope' ? (
          <Banner tone="ok" live="off" title="داخل محدودهٔ فعلی است">
            بدون پیشنهاد و بدون Baseline جدید بسته شد؛ پیام استودیو در پورتال مشتری نمایش داده می‌شود.
          </Banner>
        ) : (
          <p className="text-caption text-muted">
            {c.status === 'proposal_sent' ? 'منتظر پاسخ مشتری.' : c.status === 'needs_clarification' ? 'منتظر توضیح مشتری.' : 'هنوز نتیجه‌ای ثبت نشده است.'}
            {approvedInvite && (c.status === 'proposal_sent' || c.status === 'needs_clarification') ? (
              <>
                {' '}
                <Link to={`/client/p/${approvedInvite.accessId}`} target="_blank" rel="noopener" className="font-semibold text-ink underline underline-offset-2">
                  باز کردن نمای مشتری (دمو)
                </Link>
              </>
            ) : null}
          </p>
        )}
      </Step>

      <section aria-labelledby="hist-c" className="rounded-card bg-surface p-4 shadow-card">
        <h3 id="hist-c" className="mb-2 text-ui font-bold">
          سابقه
        </h3>
        <ol className="flex flex-col">
          {[...c.events].reverse().map((e) => (
            <li key={e.id} className="flex gap-2 border-t border-line py-1.5 text-caption first:border-t-0">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-line-strong" aria-hidden="true" />
              <span>
                {e.text}
                <span className="block text-label font-normal text-muted">{e.actor} · {jalaliDateTime(e.at)}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>
    </article>
  )
}
