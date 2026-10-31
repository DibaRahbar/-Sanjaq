export type Role = 'founder' | 'pm' | 'designer'

export const ROLE_LABEL: Record<Role, string> = {
  founder: 'مدیر استودیو',
  pm: 'مدیر پروژه',
  designer: 'طراح',
}

export const roleName = (r: Role | 'client') => (r === 'client' ? 'مشتری' : ROLE_LABEL[r])

export type StageId =
  | 'brief_saved'
  | 'analyzing'
  | 'scope_draft'
  | 'scope_approved'
  | 'in_review'
  | 'awaiting_client'
  | 'client_approved'

export type FieldKey =
  | 'goal'
  | 'audience'
  | 'deliverables'
  | 'exclusions'
  | 'reviewRounds'
  | 'constraints'
  | 'acceptance'

/** پیشنهاد AI، ویرایش‌شدهٔ انسانی، نوشتهٔ انسانی، یا هنوز خالی */
export type Origin = 'empty' | 'ai' | 'edited' | 'human'

export interface ScopeField<V> {
  value: V
  origin: Origin
  /** شناسهٔ شواهد برگرفته از بریف؛ فقط برای فیلدهایی که AI پر کرده است */
  evidenceIds: string[]
  /** مقدار اولیهٔ پیشنهاد AI برای مقایسه با ویرایش انسانی */
  aiValue?: V
}

export interface ScopeFields {
  goal: ScopeField<string>
  audience: ScopeField<string>
  deliverables: ScopeField<string[]>
  exclusions: ScopeField<string[]>
  reviewRounds: ScopeField<number | null>
  constraints: ScopeField<string[]>
  acceptance: ScopeField<string[]>
}

export interface Evidence {
  id: string
  /** عین عبارت بریف؛ باید زیررشتهٔ متن بریف باشد */
  quote: string
  /** توضیح جایگاه در بریف، مثل «بند ۲» */
  location: string
}

export type UnknownResolution =
  | { kind: 'open' }
  | { kind: 'answered'; note: string }
  | { kind: 'assumption'; note: string }

export interface UnknownItem {
  id: string
  field: FieldKey
  question: string
  why: string
  severity: 'critical' | 'normal'
  resolution: UnknownResolution
}

/** محتوای محدوده + شواهد و ابهام‌ها؛ نسخهٔ ثابت Baseline یک کپی عمیق از همین است. */
export interface ScopeDoc {
  fields: ScopeFields
  evidence: Evidence[]
  unknowns: UnknownItem[]
}

export interface Brief {
  text: string
  fileName: string | null
  /** «sample» فقط وقتی متن دقیقاً بریف نمونه باشد؛ در غیر این صورت «custom» */
  source: 'sample' | 'custom'
  savedAt: string
}

export type AnalysisStatus = 'idle' | 'processing' | 'ready' | 'error' | 'manual'

export interface Analysis {
  status: AnalysisStatus
  startedAt?: string
  /** دلیل ورود به مسیر دستی */
  manualReason?: 'user_choice' | 'custom_brief' | 'no_text'
  /** فقط برای آزمون: خطای AI در نخستین تلاش */
  failNext?: boolean
}

export interface Baseline {
  id: string
  projectId: string
  version: number
  status: 'approved' | 'superseded'
  approvedBy: string
  approvedRole: Role | 'client'
  approvedAt: string
  /** «internal» = تأیید داخلی محدوده؛ «change_request» = ساخته‌شده از پذیرش پیشنهاد تغییر */
  origin?: 'internal' | 'change_request'
  sourceChangeId?: string
  /** نسخهٔ قبلی که این Baseline جایگزین آن شده است */
  supersedes: string | null
  snapshot: ScopeDoc
}

/* ---------------- W2: نسخهٔ طرح، بازخورد، تصمیم ---------------- */

export type VersionStatus = 'internal_review' | 'client_review' | 'approved' | 'changes_requested' | 'superseded'

export interface SnapshotRef {
  /** نوع Snapshot نمونهٔ نمایشی؛ تصویر واقعی یا Figma وجود ندارد */
  kind: 'arma-checkout' | 'generic'
  /** شمارهٔ نسخهٔ طرح نمونه برای kind=arma-checkout */
  variant: number
}

export interface ArtifactVersion {
  id: string
  label: string
  artifactTitle: string
  status: VersionStatus
  snapshot: SnapshotRef
  /** Hash نمایشی برای شناسایی Snapshot ثابت (Mock) */
  checksum: string
  note: string
  createdBy: string
  createdAt: string
  /** تصمیم‌های نهایی‌ای که این نسخه اعمال می‌کند */
  implementsDecisionIds: string[]
  baselineId: string
  publishedAt?: string
  publishedBy?: string
  /** دلیل ثبت‌شدهٔ PM برای انتشار با بازخورد مسدودکنندهٔ باز */
  publishException?: string
}

export type FeedbackStatus = 'open' | 'in_progress' | 'resolved'
export type Visibility = 'internal' | 'client'

export interface Comment {
  id: string
  author: string
  text: string
  createdAt: string
}

export interface Feedback {
  id: string
  versionId: string
  /** شمارهٔ نمایشی در همان نسخه */
  seq: number
  author: string
  authorRole: Role | 'client'
  text: string
  createdAt: string
  status: FeedbackStatus
  visibility: Visibility
  blocking: boolean
  /** مختصات نرمال‌شده (۰ تا ۱) نسبت به Snapshot؛ null یعنی بازخورد عمومی */
  pin: { x: number; y: number } | null
  comments: Comment[]
  decisionIds: string[]
}

export type DecisionOutcome = 'adopt' | 'reject' | 'defer'
export type DecisionStatus = 'draft' | 'final' | 'superseded'

export const OUTCOME_LABEL: Record<DecisionOutcome, string> = {
  adopt: 'اعمال شود',
  reject: 'رد شد',
  defer: 'به بعد موکول شد',
}

export interface Decision {
  id: string
  summary: string
  outcome: DecisionOutcome
  reason: string
  author: string
  authorRole: Role
  createdAt: string
  status: DecisionStatus
  /** نسخه‌ای که مسئله در آن مطرح شد */
  versionId: string
  feedbackIds: string[]
  finalizedBy?: string
  finalizedAt?: string
  supersedesId?: string
  supersededById?: string
  /** نسخه‌ای که این تصمیم را اعمال کرده است */
  implementedInVersionId?: string
}

/* ---------------- W3: دعوت مشتری و رسید ---------------- */

export type InviteStatus = 'sent' | 'opened' | 'approved' | 'changes_requested' | 'revoked'

/** دعوت محدود و قابل ابطال برای یک نسخهٔ مشخص */
export interface ClientInvite {
  id: string
  /** شناسهٔ غیرقابل‌حدس در URL؛ در محصول واقعی فقط Hash آن سمت سرور نگه داشته می‌شود */
  accessId: string
  versionId: string
  approverName: string
  createdAt: string
  createdBy: string
  expiresAt: string
  status: InviteStatus
  openedAt?: string
  respondedAt?: string
  revokedAt?: string
}

/** رسید تأیید مشتری؛ بعد از ثبت هرگز تغییر نمی‌کند */
export interface Receipt {
  id: string
  number: string
  versionId: string
  versionLabel: string
  artifactTitle: string
  baselineId: string
  baselineVersion: number
  checksum: string
  approverName: string
  approverOrg: string
  approvedAt: string
  statement: string
  inviteId: string
}

/* ---------------- W4: درخواست تغییر بعد از تأیید ---------------- */

export type ChangeStatus = 'draft' | 'needs_clarification' | 'assessed' | 'proposal_sent' | 'accepted' | 'rejected' | 'within_scope'
export type ScopeClass = 'within' | 'out' | 'unclear'

/** نسخهٔ پیشنهاد ارسال‌شده به مشتری؛ بعد از ارسال هرگز تغییر نمی‌کند */
export interface ProposalVersion {
  id: string
  number: number
  summary: string
  /** مبلغ پیشنهادی به مشتری، به تومان */
  amountToman: number
  scheduleDays: number
  createdAt: string
  sentBy: string
  status: 'sent' | 'accepted' | 'rejected' | 'superseded'
  respondedAt?: string
}

/** ارزیابی دستی: هیچ عددی خودکار ساخته نمی‌شود */
export interface Assessment {
  /** فقط داخلی؛ هرگز به مشتری نمایش داده نمی‌شود */
  internalHours: number | null
  scheduleDays: number | null
  amountToman: number | null
  /** یادداشت داخلی ارزیابی؛ فقط داخلی */
  note: string
  updatedBy?: string
  updatedAt?: string
}

export interface ChangeEvent {
  id: string
  at: string
  actor: string
  text: string
}

export interface ChangeRequest {
  id: string
  seq: number
  title: string
  description: string
  requestedBy: string
  requestedByRole: Role | 'client'
  createdAt: string
  /** تعهد تأییدشده‌ای که این درخواست بعد از آن آمده است؛ هرگز تغییر نمی‌کند */
  baselineId: string
  receiptId: string
  status: ChangeStatus
  classification: ScopeClass | null
  /** یادداشت داخلی طبقه‌بندی؛ فقط داخلی */
  classificationNote: string
  /** پیام قابل‌نمایش به مشتری (پرسش یا توضیح داخل/خارج محدوده) */
  clientMessage: string
  clarificationAnswer?: string
  assessment: Assessment
  proposals: ProposalVersion[]
  resultingBaselineId?: string
  events: ChangeEvent[]
}

export interface Project {
  id: string
  name: string
  client: string
  pm: string
  description: string
  createdAt: string
  updatedAt: string
  stage: StageId
  lastActivity: string
  brief: Brief | null
  analysis: Analysis
  scope: ScopeDoc | null
  baselines: Baseline[]
  /** true یعنی Revision جدیدی روی Baseline تأییدشده در حال ویرایش است */
  revisionOpen: boolean
  versions: ArtifactVersion[]
  feedback: Feedback[]
  decisions: Decision[]
  invites: ClientInvite[]
  receipts: Receipt[]
  changes: ChangeRequest[]
}

export interface AppState {
  version: 1
  role: Role
  /** نام کاربر واردشده؛ اگر نباشد، نام عضو نمونهٔ همان نقش به‌کار می‌رود */
  actor?: string
  /** عنوان نقش انتخاب‌شده هنگام ورود (مثلاً «طراح ارشد محصول») */
  actorTitle?: string
  projects: Project[]
}

export interface Actor {
  name: string
  role: Role
}
