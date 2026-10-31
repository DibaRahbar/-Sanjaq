import { emptyScope, applyAiResult, type AiResult } from './scope'
import { mockChecksum } from './snapshots'
import type { AppState, ArtifactVersion, Baseline, Brief, Decision, Evidence, Feedback, Project, Role, ScopeDoc, ScopeField, StageId, UnknownItem } from './types'

export const STUDIO_NAME = 'رایا دیزاین'
export const STUDIO_SIZE = 9

export const TEAM = {
  pmA: 'نازنین رضایی',
  pmB: 'مانی کریمی',
  designer: 'کیان احمدی',
}
export const PM_OPTIONS = [TEAM.pmA, TEAM.pmB]

export type TeamGroup = 'lead' | 'pm' | 'design' | 'research' | 'dev'
/** `role` سطح دسترسی در برنامه؛ هر عضو یک حساب نمایشی دارد */
export type TeamMember = { name: string; title: string; group: TeamGroup; role: Role; /** یک خط درباره‌ی کار این نقش (صفحهٔ ورود) */ blurb: string }

/** اعضای ساختگی استودیو؛ تعدادشان با STUDIO_SIZE برابر است */
export const ROSTER: TeamMember[] = [
  { name: 'سارا نوری', title: 'بنیان‌گذار و مدیر خلاقیت', group: 'lead', role: 'founder', blurb: 'نمای همهٔ پروژه‌ها و تأیید نهایی' },
  { name: TEAM.pmA, title: 'مدیر ارشد پروژه', group: 'pm', role: 'pm', blurb: 'مدیریت پروژه‌ها و ارتباط با مشتری' },
  { name: TEAM.pmB, title: 'مدیر پروژه', group: 'pm', role: 'pm', blurb: 'بریف، محدوده و ارتباط با مشتری' },
  { name: TEAM.designer, title: 'طراح ارشد محصول', group: 'design', role: 'designer', blurb: 'نسخه‌ها، بازخورد و تصمیم‌ها' },
  { name: 'ملیکا صادقی', title: 'طراح تجربهٔ کاربری', group: 'design', role: 'designer', blurb: 'جریان‌های کاربر و بازبینی طراحی' },
  { name: 'آرمان حسینی', title: 'طراح رابط و سیستم طراحی', group: 'design', role: 'designer', blurb: 'رابط و سیستم طراحی' },
  { name: 'یاسمن فرهادی', title: 'طراح برند و موشن', group: 'design', role: 'designer', blurb: 'هویت برند و موشن' },
  { name: 'پویا عباسی', title: 'پژوهشگر کاربر', group: 'research', role: 'designer', blurb: 'پژوهش کاربر و شاهدهای بریف' },
  { name: 'دانیال مرادی', title: 'مهندس تحویل به توسعه', group: 'dev', role: 'designer', blurb: 'تحویل طرح به توسعه' },
]

export const GROUP_LABEL: Record<TeamGroup, string> = {
  lead: 'مدیریت',
  pm: 'مدیر پروژه',
  design: 'طراح',
  research: 'پژوهش',
  dev: 'توسعه',
}

const PROJECT_TEAM: Record<string, string[]> = {
  prj_nilo_transfer: [TEAM.pmB, TEAM.designer, 'ملیکا صادقی', 'پویا عباسی', 'دانیال مرادی'],
  prj_parcel_dash: [TEAM.pmA, TEAM.designer, 'آرمان حسینی', 'دانیال مرادی'],
  prj_vajeh_web: [TEAM.pmA, 'یاسمن فرهادی', 'آرمان حسینی', 'ملیکا صادقی'],
  prj_sepid_panel: [TEAM.pmB, 'ملیکا صادقی', 'پویا عباسی'],
}

/** اعضای تیم یک پروژه؛ برای پروژهٔ جدید فقط مدیر پروژه */
export function teamOf(projectId: string, pm: string): string[] {
  const t = PROJECT_TEAM[projectId]
  return t ? (t.includes(pm) ? t : [pm, ...t]) : [pm]
}

export function titleOf(name: string): string | undefined {
  return ROSTER.find((m) => m.name === name)?.title
}

/** نام کاربر دمو برای هر نقش؛ در Baseline به‌عنوان Actor ثبت می‌شود */
export const DEMO_ACTOR_NAME = {
  founder: 'سارا نوری',
  pm: TEAM.pmA,
  designer: TEAM.designer,
} as const

/** نام ثبت‌کنندهٔ اقدام‌ها: نام واردشده یا عضو نمونهٔ نقش */
export const actorOf = (s: { role: keyof typeof DEMO_ACTOR_NAME; actor?: string }): string => s.actor?.trim() || DEMO_ACTOR_NAME[s.role]

export const ARMA_PROJECT_NAME = 'بازطراحی تجربهٔ پرداخت فروشگاه آنلاین آرما'
export const ARMA_CLIENT = 'آرما'
export const ARMA_DESCRIPTION = 'یک جریان پرداخت برای دسکتاپ و موبایل، به‌همراه پروتوتایپ قابل کلیک و دو دور بازبینی.'

/** بریف نمونهٔ ساختگی؛ تنها متنی که تحلیل نمایشی برایش وجود دارد */
export const ARMA_BRIEF = `سلام تیم رایا دیزاین،

فروشگاه آنلاین آرما این فصل می‌خواهد مسیر پرداخت را بازطراحی کند. خریدارها در مرحلهٔ پرداخت دچار تردید می‌شوند و می‌خواهیم این مسیر ساده‌تر و قابل‌اعتمادتر شود.

۱) هدف: مسیر پرداخت طوری طراحی شود که خریدار بدون سردرگمی سفارشش را نهایی کند.

۲) کاربران: خریداران فروشگاه آرما، چه مشتری جدید و چه بازگشتی، که از موبایل و دسکتاپ خرید می‌کنند.

۳) خروجی موردانتظار: یک جریان کامل پرداخت (سبد خرید، اطلاعات ارسال، پرداخت و تأیید سفارش) برای دسکتاپ و موبایل، همراه با یک پروتوتایپ قابل کلیک برای بازبینی.

۴) خارج از محدوده: پرداخت اشتراکی فعلاً در برنامهٔ ما نیست. پنل مدیریت فروشگاه و اتصال درگاه پرداخت هم بخشی از این پروژه نیست.

۵) بازبینی: دو دور بازبینی در نظر گرفته‌ایم.

۶) ملاحظات: رنگ و فونت باید با راهنمای برند آرما هماهنگ باشد و پیاده‌سازی را تیم فنی خودمان انجام می‌دهد. دوست داریم کار را همین فصل شروع کنیم، اما تاریخ دقیق تحویل را هنوز نهایی نکرده‌ایم.

ممنون،
تیم محصول آرما`

const ARMA_EVIDENCE: Evidence[] = [
  { id: 'ev_goal', location: 'بند ۱', quote: 'مسیر پرداخت طوری طراحی شود که خریدار بدون سردرگمی سفارشش را نهایی کند' },
  {
    id: 'ev_audience',
    location: 'بند ۲',
    quote: 'خریداران فروشگاه آرما، چه مشتری جدید و چه بازگشتی، که از موبایل و دسکتاپ خرید می‌کنند',
  },
  {
    id: 'ev_deliv_flow',
    location: 'بند ۳',
    quote: 'یک جریان کامل پرداخت (سبد خرید، اطلاعات ارسال، پرداخت و تأیید سفارش) برای دسکتاپ و موبایل',
  },
  { id: 'ev_deliv_proto', location: 'بند ۳', quote: 'یک پروتوتایپ قابل کلیک برای بازبینی' },
  { id: 'ev_excl_sub', location: 'بند ۴', quote: 'پرداخت اشتراکی فعلاً در برنامهٔ ما نیست' },
  {
    id: 'ev_excl_admin',
    location: 'بند ۴',
    quote: 'پنل مدیریت فروشگاه و اتصال درگاه پرداخت هم بخشی از این پروژه نیست',
  },
  { id: 'ev_rounds', location: 'بند ۵', quote: 'دو دور بازبینی در نظر گرفته‌ایم' },
  { id: 'ev_con_brand', location: 'بند ۶', quote: 'رنگ و فونت باید با راهنمای برند آرما هماهنگ باشد' },
  { id: 'ev_con_dev', location: 'بند ۶', quote: 'پیاده‌سازی را تیم فنی خودمان انجام می‌دهد' },
]

const open = { kind: 'open' } as const

const ARMA_UNKNOWNS: UnknownItem[] = [
  {
    id: 'unk_acceptance',
    field: 'acceptance',
    severity: 'critical',
    question: 'معیار پذیرش این پروژه چیست؟',
    why: 'در بریف هیچ معیار قابل‌بررسی یا چک‌لیست پذیرشی نیامده است.',
    resolution: open,
  },
  {
    id: 'unk_deadline',
    field: 'constraints',
    severity: 'critical',
    question: 'تاریخ دقیق تحویل چیست؟',
    why: 'بریف فقط می‌گوید کار «همین فصل» شروع شود و تاریخ تحویل را نهایی نکرده است.',
    resolution: open,
  },
  {
    id: 'unk_devices',
    field: 'deliverables',
    severity: 'normal',
    question: 'حداقل نسخهٔ مرورگر و سیستم‌عامل موبایل هدف کدام است؟',
    why: 'بریف دسکتاپ و موبایل را نام برده، اما دستگاه‌ها و نسخه‌های هدف را مشخص نکرده است.',
    resolution: open,
  },
]

const ARMA_AI: AiResult = {
  fields: {
    goal: {
      value: 'طراحی مسیر پرداختی که خریدار بدون سردرگمی بتواند سفارش خود را نهایی کند.',
      evidenceIds: ['ev_goal'],
    },
    audience: {
      value: 'خریداران فروشگاه آرما (جدید و بازگشتی) که از موبایل و دسکتاپ خرید می‌کنند.',
      evidenceIds: ['ev_audience'],
    },
    deliverables: {
      value: [
        'جریان کامل پرداخت (سبد خرید، اطلاعات ارسال، پرداخت، تأیید سفارش) برای دسکتاپ و موبایل',
        'پروتوتایپ قابل کلیک برای بازبینی',
      ],
      evidenceIds: ['ev_deliv_flow', 'ev_deliv_proto'],
    },
    exclusions: {
      value: ['پرداخت اشتراکی', 'پنل مدیریت فروشگاه', 'اتصال درگاه پرداخت'],
      evidenceIds: ['ev_excl_sub', 'ev_excl_admin'],
    },
    reviewRounds: { value: 2, evidenceIds: ['ev_rounds'] },
    constraints: {
      value: ['رنگ و فونت هماهنگ با راهنمای برند آرما', 'پیاده‌سازی را تیم فنی آرما انجام می‌دهد'],
      evidenceIds: ['ev_con_brand', 'ev_con_dev'],
    },
    // معیار پذیرش در بریف نیامده: عمداً پیشنهادی ساخته نمی‌شود.
  },
  evidence: ARMA_EVIDENCE,
  unknowns: ARMA_UNKNOWNS,
}

/** تحلیل نمایشی فقط برای بریف نمونه وجود دارد؛ برای متن دلخواه هرگز خروجی جعلی ساخته نمی‌شود. */
export function mockAnalyze(brief: Brief): AiResult | null {
  if (brief.source !== 'sample' || brief.text.trim() !== ARMA_BRIEF.trim()) return null
  return structuredClone(ARMA_AI)
}

export function classifyBriefSource(text: string): Brief['source'] {
  return text.trim() === ARMA_BRIEF.trim() ? 'sample' : 'custom'
}

/* ---------------- پروژه‌های نمونهٔ فهرست ---------------- */

const iso = (day: number, h = 10, m = 0) =>
  new Date(Date.UTC(2026, 9, day, h, m)).toISOString()

function humanDoc(input: {
  goal: string
  audience: string
  deliverables: string[]
  exclusions: string[]
  rounds: number
  constraints: string[]
  acceptance: string[]
}): ScopeDoc {
  const h = <V,>(value: V): ScopeField<V> => ({ value, origin: 'human', evidenceIds: [] })
  const doc = emptyScope()
  doc.fields = {
    goal: h(input.goal),
    audience: h(input.audience),
    deliverables: h(input.deliverables),
    exclusions: h(input.exclusions),
    reviewRounds: h<number | null>(input.rounds),
    constraints: h(input.constraints),
    acceptance: h(input.acceptance),
  }
  return doc
}

function baselineFor(projectId: string, doc: ScopeDoc, by: string, at: string): Baseline {
  return {
    id: `bl_${projectId}_v1`,
    projectId,
    version: 1,
    status: 'approved',
    approvedBy: by,
    approvedRole: 'pm',
    approvedAt: at,
    supersedes: null,
    snapshot: doc,
  }
}

const NILO_BRIEF: Brief = {
  text: 'بانک نیلو (فرضی) می‌خواهد بخش انتقال وجه در اپلیکیشن موبایلش را بازطراحی کند. خروجی: جریان انتقال وجه و صفحهٔ رسید. دو دور بازبینی. ورود و ثبت‌نام جزو پروژه نیست.',
  fileName: null,
  source: 'custom',
  savedAt: iso(2),
}

const PARCEL_BRIEF: Brief = {
  text: 'پارسل‌یار (فرضی) یک داشبورد برای پایش وضعیت مرسوله‌ها در انبار می‌خواهد. خروجی: صفحهٔ فهرست مرسوله‌ها و صفحهٔ جزئیات. سه دور بازبینی. نسخهٔ موبایل خارج از محدوده است.',
  fileName: null,
  source: 'custom',
  savedAt: iso(5),
}

const VAJEH_BRIEF: Brief = {
  text: 'مجلهٔ آنلاین واژه می‌خواهد وب‌سایتش را بازطراحی کند تا خواندن مقاله‌های بلند راحت‌تر شود. مخاطب اصلی ما خوانندگان فارسی‌زبانی هستند که بیشتر از موبایل مطالعه می‌کنند. انتظار داریم یک سیستم طراحی سبک و قالب صفحهٔ مقاله و صفحهٔ اصلی تحویل بگیریم. بازطراحی لوگو و ساخت اپلیکیشن در این پروژه نیست. یک دور بازبینی کافی است.',
  fileName: null,
  source: 'custom',
  savedAt: iso(24),
}

const VAJEH_AI: AiResult = {
  fields: {
    goal: {
      value: 'بازطراحی وب‌سایت مجله تا خواندن مقاله‌های بلند راحت‌تر شود.',
      evidenceIds: ['v_goal'],
    },
    audience: {
      value: 'خوانندگان فارسی‌زبان که بیشتر از موبایل مطالعه می‌کنند.',
      evidenceIds: ['v_aud'],
    },
    deliverables: {
      value: ['سیستم طراحی سبک', 'قالب صفحهٔ مقاله', 'قالب صفحهٔ اصلی'],
      evidenceIds: ['v_deliv'],
    },
    exclusions: { value: ['بازطراحی لوگو', 'ساخت اپلیکیشن'], evidenceIds: ['v_excl'] },
    reviewRounds: { value: 1, evidenceIds: ['v_rounds'] },
  },
  evidence: [
    { id: 'v_goal', location: 'جملهٔ اول', quote: 'بازطراحی کند تا خواندن مقاله‌های بلند راحت‌تر شود' },
    { id: 'v_aud', location: 'جملهٔ دوم', quote: 'خوانندگان فارسی‌زبانی هستند که بیشتر از موبایل مطالعه می‌کنند' },
    { id: 'v_deliv', location: 'جملهٔ سوم', quote: 'یک سیستم طراحی سبک و قالب صفحهٔ مقاله و صفحهٔ اصلی' },
    { id: 'v_excl', location: 'جملهٔ چهارم', quote: 'بازطراحی لوگو و ساخت اپلیکیشن در این پروژه نیست' },
    { id: 'v_rounds', location: 'جملهٔ پنجم', quote: 'یک دور بازبینی کافی است' },
  ],
  unknowns: [
    {
      id: 'v_unk_acceptance',
      field: 'acceptance',
      severity: 'critical',
      question: 'معیار پذیرش چیست؟',
      why: 'در بریف معیاری برای قبول‌شدن قالب‌ها نیامده است.',
      resolution: { kind: 'open' },
    },
  ],
}

const SEPID_BRIEF: Brief = {
  text: 'کلینیک سپید (فرضی) پنل نوبت‌دهی خود را برای منشی‌ها ساده‌تر می‌خواهد. هنوز دربارهٔ تعداد صفحه‌ها و مهلت تصمیم قطعی نگرفته‌ایم.',
  fileName: null,
  source: 'custom',
  savedAt: iso(27, 14),
}

function seedProject(p: Partial<Project> & Pick<Project, 'id' | 'name' | 'client' | 'pm' | 'stage'>): Project {
  return {
    description: '',
    createdAt: iso(1),
    updatedAt: iso(26),
    lastActivity: '',
    brief: null,
    analysis: { status: 'idle' },
    scope: null,
    baselines: [],
    revisionOpen: false,
    versions: [],
    feedback: [],
    decisions: [],
    invites: [],
    receipts: [],
    changes: [],
    ...p,
  }
}

/** داده‌های ذخیره‌شدهٔ نسخه‌های قبلی (W1) فیلدهای جدید ندارند */
export function normalizeProject(p: Project): Project {
  const next: Project = {
    ...p,
    versions: p.versions ?? [],
    feedback: p.feedback ?? [],
    decisions: p.decisions ?? [],
    invites: p.invites ?? [],
    receipts: p.receipts ?? [],
    changes: p.changes ?? [],
  }
  // نسخه‌ای که در W2 منتشر شده، دعوت مشتری نداشت؛ یکی برایش ساخته می‌شود.
  for (const v of next.versions) {
    if (v.status === 'client_review' && !next.invites.some((i) => i.versionId === v.id)) {
      const at = v.publishedAt ?? v.createdAt
      next.invites = [
        ...next.invites,
        {
          id: `inv_${v.id}`,
          accessId: `acc_${v.id}`,
          versionId: v.id,
          approverName: 'کیوان محمدی',
          createdAt: at,
          createdBy: v.publishedBy ?? next.pm,
          expiresAt: new Date(new Date(at).getTime() + 7 * 86400000).toISOString(),
          status: 'sent',
        },
      ]
    }
  }
  return next
}

function mkVersion(projectId: string, seq: number, over: Partial<ArtifactVersion>): ArtifactVersion {
  const label = `v${seq}`
  return {
    id: `av_${projectId}_${label}`,
    label,
    artifactTitle: 'نسخهٔ طرح',
    status: 'internal_review',
    snapshot: { kind: 'generic', variant: seq },
    checksum: mockChecksum(`${projectId}|${label}|generic|${seq}`),
    note: '',
    createdBy: TEAM.designer,
    createdAt: iso(10),
    implementsDecisionIds: [],
    baselineId: `bl_${projectId}_v1`,
    ...over,
  }
}

function mkFeedback(versionId: string, seq: number, over: Partial<Feedback>): Feedback {
  return {
    id: `fb_${versionId}_${seq}`,
    versionId,
    seq,
    author: TEAM.designer,
    authorRole: 'designer',
    text: '',
    createdAt: iso(12),
    status: 'open',
    visibility: 'internal',
    blocking: false,
    pin: null,
    comments: [],
    decisionIds: [],
    ...over,
  }
}

export function seedState(): AppState {
  const niloDoc = humanDoc({
    goal: 'ساده‌کردن انتقال وجه در اپلیکیشن موبایل بانک نیلو.',
    audience: 'مشتریان حقیقی بانک که از موبایل استفاده می‌کنند.',
    deliverables: ['جریان انتقال وجه', 'صفحهٔ رسید'],
    exclusions: ['ورود و ثبت‌نام'],
    rounds: 2,
    constraints: ['رعایت راهنمای برند بانک'],
    acceptance: ['تأیید نهایی مسئول محصول بانک بر نسخهٔ نهایی'],
  })
  const parcelDoc = humanDoc({
    goal: 'پایش لحظه‌ای وضعیت مرسوله‌ها برای کارکنان انبار.',
    audience: 'کارکنان و مسئولان انبار.',
    deliverables: ['صفحهٔ فهرست مرسوله‌ها', 'صفحهٔ جزئیات مرسوله'],
    exclusions: ['نسخهٔ موبایل'],
    rounds: 3,
    constraints: [],
    acceptance: ['هر دو صفحه روی دسکتاپ بدون ابهام توسط مسئول انبار قابل استفاده باشد'],
  })

  const vajehScope = applyAiResult(emptyScope(), VAJEH_AI)

  const projects: Project[] = [
    seedProject({
      id: 'prj_nilo_transfer',
      name: 'اپلیکیشن بانکداری نیلو — انتقال وجه',
      client: 'بانک نیلو',
      pm: TEAM.pmB,
      stage: 'awaiting_client',
      lastActivity: 'نسخهٔ v2 برای مشتری منتشر شد',
      updatedAt: iso(27, 9),
      brief: NILO_BRIEF,
      analysis: { status: 'manual', manualReason: 'user_choice' },
      scope: niloDoc,
      baselines: [baselineFor('prj_nilo_transfer', niloDoc, TEAM.pmB, iso(8))],
      versions: [
        mkVersion('prj_nilo_transfer', 1, { artifactTitle: 'جریان انتقال وجه', status: 'superseded', createdAt: iso(15), note: 'نسخهٔ اول جریان انتقال وجه' }),
        mkVersion('prj_nilo_transfer', 2, {
          artifactTitle: 'جریان انتقال وجه',
          status: 'client_review',
          createdAt: iso(22),
          publishedAt: iso(27, 9),
          publishedBy: TEAM.pmB,
          note: 'دکمهٔ تأیید انتقال پررنگ‌تر شد',
          implementsDecisionIds: ['dec_nilo_1'],
        }),
      ],
      feedback: [
        mkFeedback('av_prj_nilo_transfer_v1', 1, {
          text: 'دکمهٔ تأیید انتقال در پایین صفحه گم می‌شود.',
          pin: { x: 0.5, y: 0.82 },
          status: 'resolved',
          createdAt: iso(17),
          decisionIds: ['dec_nilo_1'],
        }),
      ],
      invites: [
        {
          id: 'inv_nilo_v2',
          accessId: 'demo-nilo-v2',
          versionId: 'av_prj_nilo_transfer_v2',
          approverName: 'کیوان محمدی',
          createdAt: iso(27, 9),
          createdBy: TEAM.pmB,
          expiresAt: '2099-01-01T00:00:00.000Z',
          status: 'sent',
        },
      ],
      decisions: [
        {
          id: 'dec_nilo_1',
          summary: 'دکمهٔ تأیید انتقال ثابت و پررنگ شود',
          outcome: 'adopt',
          reason: 'مشتری در آزمون داخلی دکمه را پیدا نکرد و این گام حیاتی‌ترین اقدام صفحه است.',
          author: TEAM.designer,
          authorRole: 'designer',
          createdAt: iso(18),
          status: 'final',
          versionId: 'av_prj_nilo_transfer_v1',
          feedbackIds: ['fb_av_prj_nilo_transfer_v1_1'],
          finalizedBy: TEAM.pmB,
          finalizedAt: iso(19),
          implementedInVersionId: 'av_prj_nilo_transfer_v2',
        },
      ],
    }),
    seedProject({
      id: 'prj_parcel_dash',
      name: 'داشبورد عملیات پارسل‌یار',
      client: 'پارسل‌یار',
      pm: TEAM.pmA,
      stage: 'in_review',
      lastActivity: 'بازخورد جدید روی نسخهٔ v1',
      updatedAt: iso(28, 16),
      brief: PARCEL_BRIEF,
      analysis: { status: 'manual', manualReason: 'user_choice' },
      scope: parcelDoc,
      baselines: [baselineFor('prj_parcel_dash', parcelDoc, TEAM.pmA, iso(14))],
      versions: [mkVersion('prj_parcel_dash', 1, { artifactTitle: 'فهرست مرسوله‌ها', createdAt: iso(24), note: 'نسخهٔ اول صفحهٔ فهرست' })],
      feedback: [
        mkFeedback('av_prj_parcel_dash_v1', 1, { text: 'رنگ وضعیت «در راه» روی پس‌زمینه کم‌کنتراست است.', pin: { x: 0.68, y: 0.38 }, blocking: true, status: 'in_progress', createdAt: iso(26), decisionIds: ['dec_parcel_1'] }),
        mkFeedback('av_prj_parcel_dash_v1', 2, { text: 'فیلتر انبار باید همیشه بالای جدول دیده شود.', pin: { x: 0.3, y: 0.2 }, createdAt: iso(27) }),
        mkFeedback('av_prj_parcel_dash_v1', 3, { text: 'خالی بودن فهرست باید توضیح داشته باشد.', pin: null, createdAt: iso(28, 8) }),
      ],
      decisions: [
        {
          id: 'dec_parcel_1',
          summary: 'رنگ وضعیت‌ها با نسبت کنتراست حداقل ۴٫۵ اصلاح شود',
          outcome: 'adopt',
          reason: 'کارکنان انبار در نور محیط وضعیت را سخت می‌خوانند.',
          author: TEAM.designer,
          authorRole: 'designer',
          createdAt: iso(27, 15),
          status: 'draft',
          versionId: 'av_prj_parcel_dash_v1',
          feedbackIds: ['fb_av_prj_parcel_dash_v1_1'],
        } satisfies Decision,
      ],
    }),
    seedProject({
      id: 'prj_vajeh_web',
      name: 'بازطراحی وب‌سایت مجلهٔ واژه',
      client: 'مجلهٔ واژه',
      pm: TEAM.pmA,
      stage: 'scope_draft',
      lastActivity: 'پیش‌نویس محدوده از تحلیل بریف ساخته شد',
      updatedAt: iso(28, 11),
      brief: VAJEH_BRIEF,
      analysis: { status: 'ready' },
      scope: vajehScope,
    }),
    seedProject({
      id: 'prj_sepid_panel',
      name: 'پنل نوبت‌دهی کلینیک سپید',
      client: 'کلینیک سپید',
      pm: TEAM.pmB,
      stage: 'brief_saved',
      lastActivity: 'بریف ثبت شد؛ هنوز تحلیل نشده',
      updatedAt: iso(27, 14),
      brief: SEPID_BRIEF,
    }),
  ]
  return { version: 1, role: 'pm', projects }
}

export function emptyState(role: AppState['role'], actor?: string, actorTitle?: string): AppState {
  return { version: 1, role, actor, actorTitle, projects: [] }
}

/** برچسب و ویژگی هر مرحله برای فهرست پروژه‌ها */
export const STAGE_META: Record<
  StageId,
  { label: string; next: string; needsAction: boolean; waitingClient: boolean; tone: 'neutral' | 'ai' | 'warn' | 'ok' | 'info' }
> = {
  brief_saved: { label: 'بریف ثبت شد', next: 'تحلیل بریف و ساخت محدوده', needsAction: true, waitingClient: false, tone: 'neutral' },
  analyzing: { label: 'در حال تحلیل بریف', next: 'بازبینی نتیجهٔ تحلیل', needsAction: false, waitingClient: false, tone: 'ai' },
  scope_draft: { label: 'پیش‌نویس محدوده', next: 'بازبینی و تأیید داخلی محدوده', needsAction: true, waitingClient: false, tone: 'warn' },
  scope_approved: { label: 'محدوده تأیید داخلی شد', next: 'افزودن نسخهٔ طرح', needsAction: true, waitingClient: false, tone: 'ok' },
  in_review: { label: 'در بازبینی طرح', next: 'رسیدگی به بازخوردهای باز', needsAction: true, waitingClient: false, tone: 'info' },
  awaiting_client: { label: 'منتظر مشتری', next: 'پیگیری تأیید مشتری', needsAction: false, waitingClient: true, tone: 'info' },
  client_approved: { label: 'تأیید مشتری', next: 'ثبت درخواست‌های بعدی', needsAction: false, waitingClient: false, tone: 'ok' },
}
