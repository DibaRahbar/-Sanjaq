import { fa, ltr } from '../lib/format'
import { isOpenChange } from './changes'
import { activeInvite } from './invites'
import type { ArtifactVersion, Decision, Feedback, Project, Role } from './types'

export const latestBaselineOf = (p: Project) => p.baselines[p.baselines.length - 1] ?? null
export const latestVersion = (p: Project): ArtifactVersion | null => p.versions[p.versions.length - 1] ?? null
export const versionById = (p: Project, id: string | undefined) => p.versions.find((v) => v.id === id)
export const feedbackOf = (p: Project, versionId: string): Feedback[] => p.feedback.filter((f) => f.versionId === versionId)
export const isOpen = (f: Feedback) => f.status !== 'resolved'
export const openFeedback = (p: Project, versionId?: string) => p.feedback.filter((f) => isOpen(f) && (!versionId || f.versionId === versionId))
export const blockingOpen = (p: Project, versionId: string) => feedbackOf(p, versionId).filter((f) => isOpen(f) && f.blocking)
export const draftDecisions = (p: Project) => p.decisions.filter((d) => d.status === 'draft')
export const finalDecisions = (p: Project) => p.decisions.filter((d) => d.status === 'final')

/** تصمیم‌های نهایی «اعمال شود» که هنوز در هیچ نسخه‌ای اعمال نشده‌اند */
export const decisionsToImplement = (p: Project): Decision[] =>
  p.decisions.filter((d) => d.status === 'final' && d.outcome === 'adopt' && !d.implementedInVersionId)

/** مقصد ورود به پروژه: تا پایان محدوده صفحهٔ ۰۳، بعد از آن نمای کلی */
export function projectHome(p: Project): string {
  const early = p.stage === 'brief_saved' || p.stage === 'analyzing' || p.stage === 'scope_draft'
  return early && p.baselines.length === 0 ? `/studio/projects/${p.id}/brief` : `/studio/projects/${p.id}`
}

export interface Gate {
  id: string
  label: string
  ok: boolean
  detail?: string
}

/** شرط‌های لازم پیش از انتشار نسخه برای مشتری */
export function publishGates(p: Project, v: ArtifactVersion): Gate[] {
  const base = latestBaselineOf(p)
  const blocking = blockingOpen(p, v.id)
  return [
    {
      id: 'baseline',
      label: 'Baseline داخلی تأیید و قفل شده است',
      ok: !!base && !p.revisionOpen,
      detail: p.revisionOpen ? 'یک Revision در حال ویرایش است؛ اول آن را تأیید یا لغو کنید.' : undefined,
    },
    { id: 'snapshot', label: 'Snapshot نسخه ثابت است', ok: !!v.checksum && v.status === 'internal_review' },
    { id: 'approver', label: 'تأییدکنندهٔ مجاز مشتری مشخص است', ok: true, detail: 'در دمو: نمایندهٔ فرضی ' + p.client },
    {
      id: 'blocking',
      label: 'بازخوردهای مسدودکننده رفع شده‌اند',
      ok: blocking.length === 0,
      detail: blocking.length ? `${fa(blocking.length)} مورد باز است؛ یا رفعشان کنید یا دلیل استثنا را بنویسید.` : undefined,
    },
    { id: 'statement', label: 'متن تأیید شامل عنوان تحویل‌دادنی و شناسهٔ نسخه است', ok: true },
  ]
}

/** متن تأییدی که مشتری می‌بیند و در رسید ثبت می‌شود؛ شامل عنوان تحویل‌دادنی و شناسهٔ نسخه */
export const statementText = (projectName: string, title: string, label: string, versionId: string) =>
  `تأیید می‌کنم که «${title}» در نسخهٔ ${ltr(label)} (شناسهٔ ${ltr(versionId)}) را بررسی کرده‌ام و آن را برای پروژهٔ «${projectName}» می‌پذیرم.`

export const signoffStatement = (p: Project, v: ArtifactVersion) => statementText(p.name, v.artifactTitle, v.label, v.id)

/* ---------------- اقدام بعدی (Action Banner) ---------------- */

export type CtaAction = 'addVersion' | 'publish' | 'finalizeDecisions' | 'openScope' | 'openReview' | 'openDecisions' | 'openChanges' | null

export interface NextAction {
  tone: 'ai' | 'warn' | 'ok' | 'info' | 'neutral'
  title: string
  body: string
  cta: { label: string; action: CtaAction } | null
  /** وقتی اقدام برای نقش فعلی مجاز نیست */
  blockedReason?: string
}

const canManage = (r: Role) => r === 'pm' || r === 'founder'

export function nextAction(p: Project, role: Role): NextAction {
  const base = latestBaselineOf(p)
  const latest = latestVersion(p)

  if (!base) {
    return {
      tone: 'warn',
      title: 'محدودهٔ پروژه هنوز تأیید داخلی نشده است',
      body: 'تا Baseline تأیید نشود، نسخهٔ طرح برای بازبینی ثبت نمی‌شود.',
      cta: { label: 'رفتن به بریف و محدوده', action: 'openScope' },
    }
  }
  if (!latest) {
    return {
      tone: 'ai',
      title: 'آمادهٔ دریافت نسخهٔ طرح',
      body: 'Baseline تأیید شده است. اولین نسخهٔ طرح را با Snapshot ثابت اضافه کنید تا بازخورد روی همان نسخه ثبت شود.',
      cta: { label: 'افزودن نسخهٔ طرح', action: 'addVersion' },
    }
  }
  if (latest.status === 'client_review' && !activeInvite(p, latest.id)) {
    return {
      tone: 'warn',
      title: `لینک مشتری برای ${ltr(latest.label)} فعال نیست`,
      body: 'لینک منقضی یا باطل شده است. مشتری با آن دیگر چیزی نمی‌بیند؛ لینک تازه برای همین نسخه صادر کنید.',
      cta: { label: 'رفتن به بازبینی طرح', action: 'openReview' },
    }
  }
  if (latest.status === 'changes_requested') {
    return {
      tone: 'warn',
      title: `مشتری برای ${ltr(latest.label)} درخواست اصلاح داد`,
      body: 'توضیح او به‌عنوان بازخورد مسدودکننده روی همان نسخه ثبت شده است. اصلاح را در نسخهٔ جدید انجام دهید.',
      cta: { label: 'افزودن نسخهٔ جدید', action: 'addVersion' },
    }
  }
  if (latest.status === 'client_review') {
    return {
      tone: 'info',
      title: `نسخهٔ ${ltr(latest.label)} منتظر تأیید مشتری است`,
      body: 'تا پاسخ مشتری، این نسخه ثابت است. هر اصلاح تازه باید در نسخهٔ جدید انجام شود.',
      cta: { label: 'مشاهدهٔ نسخه', action: 'openReview' },
    }
  }
  if (latest.status === 'approved') {
    const open = p.changes.filter(isOpenChange)
    const manage = canManage(role)
    const draft = open.filter((c) => c.status === 'draft')
    const assessed = open.filter((c) => c.status === 'assessed')
    if (draft.length) {
      return {
        tone: 'warn',
        title: `${fa(draft.length)} درخواست تغییر منتظر بررسی است`,
        body: 'درخواست بعد از تأیید مشتری ثبت شده؛ اول مشخص کنید داخل محدودهٔ تأییدشده هست یا نه. تأیید قبلی تغییر نمی‌کند.',
        cta: { label: 'رفتن به درخواست‌های تغییر', action: 'openChanges' },
        blockedReason: manage ? undefined : 'طبقه‌بندی و ارزیابی با مدیر پروژه یا مدیر استودیو است.',
      }
    }
    if (assessed.length) {
      return {
        tone: 'ai',
        title: `${fa(assessed.length)} پیشنهاد آمادهٔ ارسال به مشتری است`,
        body: 'ارزیابی دستی ثبت شده است. متن پیشنهاد را مرور و برای مشتری ارسال کنید.',
        cta: { label: 'رفتن به درخواست‌های تغییر', action: 'openChanges' },
        blockedReason: manage ? undefined : 'ارسال پیشنهاد با مدیر پروژه یا مدیر استودیو است.',
      }
    }
    if (open.some((c) => c.status === 'needs_clarification')) {
      return { tone: 'info', title: 'منتظر توضیح مشتری', body: 'برای یکی از درخواست‌های تغییر از مشتری توضیح خواسته شده است.', cta: { label: 'مشاهدهٔ درخواست‌ها', action: 'openChanges' } }
    }
    if (open.some((c) => c.status === 'proposal_sent')) {
      return { tone: 'info', title: 'پیشنهاد تغییر منتظر پاسخ مشتری است', body: 'تا پاسخ مشتری، تعهد فعلی و تأیید قبلی همان‌طور که هست می‌ماند.', cta: { label: 'مشاهدهٔ درخواست‌ها', action: 'openChanges' } }
    }
    return {
      tone: 'ok',
      title: `نسخهٔ ${ltr(latest.label)} تأیید مشتری شده است`,
      body: p.changes.length ? 'درخواست باز دیگری نیست. هر درخواست تازه، جدا از تأیید قبلی ثبت می‌شود.' : 'رسید تأیید ثبت شده است. درخواست‌های تازه از این پس Change Request‌اند و تأیید قبلی را تغییر نمی‌دهند.',
      cta: { label: 'مشاهدهٔ درخواست‌های تغییر', action: 'openChanges' },
    }
  }
  const blocking = blockingOpen(p, latest.id)
  if (blocking.length) {
    return {
      tone: 'warn',
      title: `${fa(blocking.length)} بازخورد مسدودکننده روی ${ltr(latest.label)} باز است`,
      body: 'قبل از انتشار برای مشتری، این موارد باید رفع شوند یا PM دلیل استثنا را ثبت کند.',
      cta: { label: 'رسیدگی در بازبینی طرح', action: 'openReview' },
    }
  }
  const pending = decisionsToImplement(p)
  if (pending.length) {
    return {
      tone: 'ai',
      title: `${fa(pending.length)} تصمیم نهایی هنوز در طرح اعمال نشده است`,
      body: `«${pending[0]!.summary}» تصمیم شده؛ نسخهٔ جدید بسازید و آن را به این تصمیم وصل کنید.`,
      cta: { label: 'افزودن نسخهٔ جدید', action: 'addVersion' },
    }
  }
  const drafts = draftDecisions(p)
  if (drafts.length) {
    return canManage(role)
      ? {
          tone: 'warn',
          title: `${fa(drafts.length)} تصمیم پیش‌نویس منتظر نهایی‌سازی است`,
          body: 'پیش‌نویس تصمیم، تا وقتی مدیر پروژه یا مدیر استودیو نهایی نکند، ثبت رسمی نیست.',
          cta: { label: 'رفتن به دفتر تصمیم‌ها', action: 'openDecisions' },
        }
      : {
          tone: 'info',
          title: `${fa(drafts.length)} تصمیم پیش‌نویس منتظر نهایی‌سازی است`,
          body: 'نهایی‌کردن تصمیم با مدیر پروژه یا مدیر استودیو است.',
          cta: { label: 'مشاهدهٔ تصمیم‌ها', action: 'openDecisions' },
        }
  }
  const open = openFeedback(p, latest.id)
  if (open.length) {
    return {
      tone: 'info',
      title: `${fa(open.length)} بازخورد باز روی ${ltr(latest.label)}`,
      body: 'بازخوردها را بررسی کنید؛ برای هر کدام وضعیت یا تصمیم ثبت کنید.',
      cta: { label: 'رفتن به بازبینی طرح', action: 'openReview' },
    }
  }
  return canManage(role)
    ? {
        tone: 'ok',
        title: `نسخهٔ ${ltr(latest.label)} آمادهٔ انتشار برای مشتری است`,
        body: 'بازخورد بازی نمانده است. شرط‌های انتشار را مرور و نسخه را برای مشتری آماده کنید.',
        cta: { label: 'آماده‌سازی برای مشتری', action: 'publish' },
      }
    : {
        tone: 'info',
        title: `نسخهٔ ${ltr(latest.label)} آمادهٔ انتشار است`,
        body: 'انتشار برای مشتری با مدیر پروژه یا مدیر استودیو است.',
        cta: { label: 'مشاهدهٔ نسخه', action: 'openReview' },
        blockedReason: 'انتشار فقط برای مدیر پروژه یا مدیر استودیو فعال است.',
      }
}

/* ---------------- زمان‌بندی مشتق از داده ---------------- */

export interface TimelineEvent {
  id: string
  at: string
  actor: string
  text: string
  kind: 'project' | 'scope' | 'version' | 'feedback' | 'decision' | 'publish' | 'client' | 'change'
}

export function buildTimeline(p: Project): TimelineEvent[] {
  const ev: TimelineEvent[] = [{ id: 'created', at: p.createdAt, actor: p.pm, text: 'پروژه و بریف ثبت شد', kind: 'project' }]
  for (const b of p.baselines) ev.push({ id: b.id, at: b.approvedAt, actor: b.approvedBy, text: `Baseline ${ltr(`v${b.version}`)} تأیید داخلی شد`, kind: 'scope' })
  for (const v of p.versions) {
    ev.push({ id: v.id, at: v.createdAt, actor: v.createdBy, text: `نسخهٔ ${ltr(v.label)} ثبت شد`, kind: 'version' })
    if (v.publishedAt) ev.push({ id: `${v.id}_pub`, at: v.publishedAt, actor: v.publishedBy ?? '', text: `نسخهٔ ${ltr(v.label)} برای مشتری منتشر شد`, kind: 'publish' })
  }
  for (const f of p.feedback) {
    const v = versionById(p, f.versionId)
    ev.push({ id: f.id, at: f.createdAt, actor: f.author, text: `بازخورد ${f.pin ? 'روی طرح' : 'عمومی'} روی ${ltr(v?.label ?? '')}`, kind: 'feedback' })
  }
  for (const d of p.decisions) {
    ev.push({ id: d.id, at: d.createdAt, actor: d.author, text: `پیش‌نویس تصمیم: «${d.summary}»`, kind: 'decision' })
    if (d.finalizedAt) ev.push({ id: `${d.id}_fin`, at: d.finalizedAt, actor: d.finalizedBy ?? '', text: `تصمیم نهایی شد: «${d.summary}»`, kind: 'decision' })
  }
  for (const i of p.invites) {
    const label = versionById(p, i.versionId)?.label ?? ''
    if (i.openedAt) ev.push({ id: `${i.id}_open`, at: i.openedAt, actor: i.approverName, text: `مشتری لینک نسخهٔ ${ltr(label)} را باز کرد`, kind: 'client' })
    if (i.status === 'changes_requested' && i.respondedAt) ev.push({ id: `${i.id}_chg`, at: i.respondedAt, actor: i.approverName, text: `مشتری برای نسخهٔ ${ltr(label)} درخواست اصلاح داد`, kind: 'client' })
    if (i.revokedAt) ev.push({ id: `${i.id}_rev`, at: i.revokedAt, actor: p.pm, text: `لینک مشتری برای ${ltr(label)} ابطال شد`, kind: 'client' })
  }
  for (const c of p.changes) for (const e of c.events) ev.push({ id: e.id, at: e.at, actor: e.actor, text: `CR-${c.seq}: ${e.text}`, kind: 'change' })
  for (const r of p.receipts) ev.push({ id: r.id, at: r.approvedAt, actor: r.approverName, text: `مشتری نسخهٔ ${ltr(r.versionLabel)} را تأیید کرد · رسید ${ltr(r.number)}`, kind: 'client' })
  return ev.sort((a, b) => b.at.localeCompare(a.at))
}

export const VERSION_STATUS: Record<ArtifactVersion['status'], { label: string; tone: 'neutral' | 'ai' | 'warn' | 'ok' | 'info' | 'err' }> = {
  internal_review: { label: 'بازبینی داخلی', tone: 'info' },
  client_review: { label: 'منتظر مشتری', tone: 'ai' },
  approved: { label: 'تأیید مشتری', tone: 'ok' },
  changes_requested: { label: 'اصلاح درخواست شد', tone: 'warn' },
  superseded: { label: 'جایگزین‌شده', tone: 'neutral' },
}

export const FEEDBACK_STATUS: Record<Feedback['status'], { label: string; tone: 'neutral' | 'ai' | 'warn' | 'ok' | 'info' | 'err' }> = {
  open: { label: 'باز', tone: 'warn' },
  in_progress: { label: 'در حال بررسی', tone: 'info' },
  resolved: { label: 'حل‌شده', tone: 'ok' },
}

export const DECISION_STATUS: Record<Decision['status'], { label: string; tone: 'neutral' | 'ai' | 'warn' | 'ok' | 'info' | 'err' }> = {
  draft: { label: 'پیش‌نویس', tone: 'warn' },
  final: { label: 'نهایی', tone: 'ok' },
  superseded: { label: 'جایگزین‌شده', tone: 'neutral' },
}

export type StepState = 'done' | 'current' | 'todo'

/** زنجیرهٔ ارزش پروژه برای نمای کلی */
export function chainState(p: Project): { id: string; label: string; state: StepState }[] {
  const base = latestBaselineOf(p)
  const latest = latestVersion(p)
  const published = latest?.status === 'client_review' || latest?.status === 'approved'
  return [
    { id: 'brief', label: 'بریف', state: 'done' },
    { id: 'scope', label: 'محدوده', state: base ? 'done' : 'current' },
    { id: 'version', label: 'نسخهٔ طرح', state: !base ? 'todo' : latest ? 'done' : 'current' },
    { id: 'review', label: 'بازخورد و تصمیم', state: !latest ? 'todo' : published ? 'done' : 'current' },
    { id: 'client', label: 'تأیید مشتری', state: latest?.status === 'approved' ? 'done' : latest?.status === 'client_review' ? 'current' : 'todo' },
    { id: 'change', label: 'تغییرات بعدی', state: latest?.status === 'approved' ? (p.changes.some(isOpenChange) || p.changes.length === 0 ? 'current' : 'done') : 'todo' },
  ]
}
