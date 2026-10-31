import { actorOf, emptyState, mockAnalyze, seedState } from '../domain/fixtures'
import {
  applyAiResult,
  canApprove,
  cloneDoc,
  compactDoc,
  editField,
  emptyScope,
  isFieldEmpty,
  resolveUnknown,
  FIELD_ORDER,
} from '../domain/scope'
import { clientStatement, findByAccess, receiptNumber } from '../domain/client'
import { CLIENT_APPROVER_NAME, activeInvite, expiryFrom, inviteState } from '../domain/invites'
import { assessmentComplete, currentProposal, latestReceipt, matchExclusions } from '../domain/changes'
import { blockingOpen, decisionsToImplement } from '../domain/project'
import { DEFAULT_ARTIFACT_TITLE, mockChecksum, snapshotFor } from '../domain/snapshots'
import type {
  AppState,
  ArtifactVersion,
  Baseline,
  Decision,
  DecisionOutcome,
  Feedback,
  FeedbackStatus,
  ChangeRequest,
  ScopeClass,
  Visibility,
  FieldKey,
  Project,
  Role,
  ScopeDoc,
  ScopeFields,
  UnknownResolution,
} from '../domain/types'

export type Action =
  | { type: 'setRole'; role: Role; actor?: string; title?: string }
  | { type: 'resetDemo' }
  | { type: 'emptyWorkspace' }
  | { type: 'createProject'; project: Project }
  | { type: 'startAnalysis'; projectId: string; now: string }
  | { type: 'completeAnalysis'; projectId: string; now: string }
  | { type: 'goManual'; projectId: string; now: string }
  | { type: 'editField'; projectId: string; key: FieldKey; value: ScopeFields[FieldKey]['value']; now: string }
  | { type: 'resolveUnknown'; projectId: string; unknownId: string; resolution: UnknownResolution; now: string }
  | { type: 'approveScope'; projectId: string; now: string }
  | { type: 'createRevision'; projectId: string; now: string }
  | { type: 'discardRevision'; projectId: string; now: string }
  | { type: 'addVersion'; projectId: string; versionId: string; note: string; artifactTitle?: string; implementsDecisionIds: string[]; now: string }
  | { type: 'addFeedback'; projectId: string; feedbackId: string; versionId: string; text: string; pin: { x: number; y: number } | null; visibility: Visibility; blocking: boolean; now: string }
  | { type: 'setFeedbackStatus'; projectId: string; feedbackId: string; status: FeedbackStatus; now: string }
  | { type: 'addComment'; projectId: string; feedbackId: string; commentId: string; text: string; now: string }
  | {
      type: 'createDecision'
      projectId: string
      decisionId: string
      summary: string
      outcome: DecisionOutcome
      reason: string
      versionId: string
      feedbackIds: string[]
      supersedesId?: string
      finalize: boolean
      now: string
    }
  | { type: 'finalizeDecision'; projectId: string; decisionId: string; now: string }
  | { type: 'deleteDecisionDraft'; projectId: string; decisionId: string; now: string }
  | { type: 'publishVersion'; projectId: string; versionId: string; accessId: string; exceptionNote?: string; now: string }
  | { type: 'markInviteOpened'; accessId: string; now: string }
  | { type: 'clientApprove'; accessId: string; versionId: string; feedbackId?: string; now: string }
  | { type: 'clientRequestChanges'; accessId: string; versionId: string; note: string; feedbackId: string; now: string }
  | { type: 'revokeInvite'; projectId: string; inviteId: string; now: string }
  | { type: 'reissueInvite'; projectId: string; versionId: string; accessId: string; now: string }
  | { type: 'simulateExpiry'; projectId: string; inviteId: string; now: string }
  | { type: 'createChange'; projectId: string; changeId: string; title: string; description: string; now: string }
  | { type: 'clientCreateChange'; accessId: string; changeId: string; title: string; description: string; now: string }
  | { type: 'classifyChange'; projectId: string; changeId: string; classification: ScopeClass; note: string; clientMessage: string; now: string }
  | { type: 'clientAnswerChange'; accessId: string; changeId: string; answer: string; now: string }
  | { type: 'saveAssessment'; projectId: string; changeId: string; internalHours: number | null; scheduleDays: number | null; amountToman: number | null; note: string; now: string }
  | { type: 'sendProposal'; projectId: string; changeId: string; proposalId: string; summary: string; now: string }
  | { type: 'clientRespondProposal'; accessId: string; changeId: string; proposalId: string; decision: 'accept' | 'reject'; now: string }

/** Baseline تأییدشده فقط با Revision جدید قابل تغییر است. */
export const latestBaseline = (p: Project): Baseline | null => p.baselines[p.baselines.length - 1] ?? null
export const isLocked = (p: Project) => latestBaseline(p) !== null && !p.revisionOpen
export const isEditable = (p: Project) => p.scope !== null && !isLocked(p)

export const canApproveRole = (role: Role) => role === 'pm' || role === 'founder'

function patch(state: AppState, id: string, fn: (p: Project) => Project): AppState {
  let touched = false
  const projects = state.projects.map((p) => {
    if (p.id !== id) return p
    touched = true
    return fn(p)
  })
  return touched ? { ...state, projects } : state
}

const hasContent = (doc: ScopeDoc | null) =>
  doc !== null && FIELD_ORDER.some((k) => !isFieldEmpty(k, doc.fields[k].value as never))

const isNonNegInt = (n: number | null) => n === null || (Number.isInteger(n) && n >= 0 && n <= 1e12)

function patchChange(p: Project, id: string, fn: (c: ChangeRequest) => ChangeRequest): Project {
  return { ...p, changes: p.changes.map((c) => (c.id === id ? fn(c) : c)) }
}
const ev = (c: ChangeRequest, id: string, at: string, actor: string, text: string) => [...c.events, { id: `${c.id}_${id}_${c.events.length}`, at, actor, text }]

function newChange(p: Project, id: string, title: string, description: string, by: string, byRole: ChangeRequest['requestedByRole'], now: string): Project {
  const receipt = latestReceipt(p)
  const base = latestBaseline(p)
  const t = title.trim()
  const d = description.trim()
  if (!receipt || !base || p.revisionOpen || t === '' || d === '' || p.changes.some((c) => c.id === id)) return p
  const c: ChangeRequest = {
    id,
    seq: p.changes.length + 1,
    title: t,
    description: d,
    requestedBy: by,
    requestedByRole: byRole,
    createdAt: now,
    baselineId: receipt.baselineId,
    receiptId: receipt.id,
    status: 'draft',
    classification: null,
    classificationNote: '',
    clientMessage: '',
    assessment: { internalHours: null, scheduleDays: null, amountToman: null, note: '' },
    proposals: [],
    events: [{ id: `${id}_created`, at: now, actor: by, text: 'درخواست ثبت شد' }],
  }
  return { ...p, changes: [...p.changes, c], updatedAt: now, lastActivity: `درخواست تغییر ${t}` }
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

/** نهایی‌کردن تصمیم: بازخوردهای وصل‌شده حل می‌شوند و تصمیم قبلی (در صورت وجود) جایگزین می‌شود. */
function finalize(p: Project, d: Decision, actor: string, now: string): Project {
  const final: Decision = { ...d, status: 'final', finalizedBy: actor, finalizedAt: now }
  return {
    ...p,
    decisions: p.decisions.map((x) => {
      if (x.id === d.id) return final
      if (d.supersedesId && x.id === d.supersedesId && x.status === 'final') return { ...x, status: 'superseded' as const, supersededById: d.id }
      return x
    }),
    feedback: p.feedback.map((f) => (d.feedbackIds.includes(f.id) ? { ...f, status: 'resolved' as const } : f)),
    updatedAt: now,
    lastActivity: `تصمیم نهایی شد: ${d.summary}`,
  }
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'setRole':
      return { ...state, role: action.role, actor: action.actor, actorTitle: action.title }

    case 'resetDemo':
      return { ...seedState(), role: state.role, actor: state.actor, actorTitle: state.actorTitle }

    case 'emptyWorkspace':
      return emptyState(state.role, state.actor, state.actorTitle)

    case 'createProject':
      return { ...state, projects: [action.project, ...state.projects] }

    case 'startAnalysis':
      return patch(state, action.projectId, (p) => {
        if (!p.brief || p.analysis.status === 'processing' || isLocked(p)) return p
        const scope = p.scope ?? emptyScope()
        const text = p.brief.text.trim()
        if (text === '') {
          return { ...p, scope, stage: 'scope_draft', analysis: { status: 'manual', manualReason: 'no_text' }, updatedAt: action.now }
        }
        // برای متن دلخواه، خروجی AI جعلی ساخته نمی‌شود: مسیر دستی باز می‌شود.
        if (mockAnalyze(p.brief) === null) {
          return {
            ...p,
            scope,
            stage: 'scope_draft',
            updatedAt: action.now,
            lastActivity: 'تحلیل خودکار برای این بریف در دسترس نبود؛ ادامهٔ دستی',
            analysis: { status: 'manual', manualReason: 'custom_brief' },
          }
        }
        return {
          ...p,
          scope,
          stage: 'analyzing',
          updatedAt: action.now,
          lastActivity: 'تحلیل بریف آغاز شد',
          analysis: { ...p.analysis, status: 'processing', startedAt: action.now },
        }
      })

    case 'completeAnalysis':
      return patch(state, action.projectId, (p) => {
        if (p.analysis.status !== 'processing' || !p.brief) return p
        const scope = p.scope ?? emptyScope()
        const fallbackStage = hasContent(scope) ? 'scope_draft' : 'brief_saved'
        if (p.analysis.failNext) {
          return {
            ...p,
            scope,
            stage: fallbackStage,
            updatedAt: action.now,
            lastActivity: 'تحلیل بریف با خطا متوقف شد',
            analysis: { status: 'error' },
          }
        }
        const result = mockAnalyze(p.brief)
        if (!result) return { ...p, scope, stage: fallbackStage, analysis: { status: 'error' }, updatedAt: action.now }
        return {
          ...p,
          scope: applyAiResult(scope, result),
          stage: 'scope_draft',
          updatedAt: action.now,
          lastActivity: 'پیش‌نویس محدوده از تحلیل بریف ساخته شد',
          analysis: { status: 'ready' },
        }
      })

    case 'goManual':
      return patch(state, action.projectId, (p) => {
        if (isLocked(p)) return p
        return {
          ...p,
          scope: p.scope ?? emptyScope(),
          stage: p.stage === 'brief_saved' || p.stage === 'analyzing' ? 'scope_draft' : p.stage,
          updatedAt: action.now,
          analysis: { status: 'manual', manualReason: 'user_choice' },
        }
      })

    case 'editField':
      return patch(state, action.projectId, (p) => {
        if (!isEditable(p) || !p.scope) return p
        const scope = editField(p.scope, action.key, action.value as never)
        return {
          ...p,
          scope,
          updatedAt: action.now,
          stage: p.stage === 'brief_saved' ? 'scope_draft' : p.stage,
        }
      })

    case 'resolveUnknown':
      return patch(state, action.projectId, (p) => {
        if (!isEditable(p) || !p.scope) return p
        return { ...p, scope: resolveUnknown(p.scope, action.unknownId, action.resolution), updatedAt: action.now }
      })

    case 'approveScope':
      return patch(state, action.projectId, (p) => {
        if (!canApproveRole(state.role) || !isEditable(p) || !p.scope) return p
        const snapshot = compactDoc(p.scope)
        if (!canApprove(snapshot)) return p
        const prev = latestBaseline(p)
        const version = (prev?.version ?? 0) + 1
        const id = `bl_${p.id}_v${version}`
        // اجرای تکراری (کلیک دوباره) هرگز Baseline دوم نمی‌سازد.
        if (p.baselines.some((b) => b.id === id)) return p
        const baseline: Baseline = {
          id,
          projectId: p.id,
          version,
          status: 'approved',
          approvedBy: actorOf(state),
          approvedRole: state.role,
          approvedAt: action.now,
          supersedes: prev?.id ?? null,
          snapshot,
        }
        const early = p.stage === 'brief_saved' || p.stage === 'analyzing' || p.stage === 'scope_draft'
        return {
          ...p,
          scope: cloneDoc(snapshot),
          baselines: [...p.baselines.map((b) => (b.status === 'approved' ? { ...b, status: 'superseded' as const } : b)), baseline],
          revisionOpen: false,
          stage: early ? 'scope_approved' : p.stage,
          updatedAt: action.now,
          lastActivity: `Baseline v${version} تأیید داخلی شد`,
        }
      })

    case 'createRevision':
      return patch(state, action.projectId, (p) => {
        const base = latestBaseline(p)
        // بعد از تأیید مشتری، تغییر تعهد فقط از مسیر Change Request ممکن است.
        if (!canApproveRole(state.role) || !base || p.revisionOpen || p.receipts.length > 0) return p
        return {
          ...p,
          revisionOpen: true,
          scope: cloneDoc(base.snapshot),
          updatedAt: action.now,
          lastActivity: `Revision جدید روی Baseline v${base.version} ایجاد شد`,
        }
      })

    case 'discardRevision':
      return patch(state, action.projectId, (p) => {
        const base = latestBaseline(p)
        if (!base || !p.revisionOpen) return p
        return { ...p, revisionOpen: false, scope: cloneDoc(base.snapshot), updatedAt: action.now }
      })

    case 'addVersion':
      return patch(state, action.projectId, (p) => {
        const base = latestBaseline(p)
        const last = p.versions[p.versions.length - 1]
        if (!base || last?.status === 'client_review' || last?.status === 'approved') return p
        const seq = p.versions.length + 1
        const label = `v${seq}`
        const snapshot = snapshotFor(p, seq)
        const toImplement = decisionsToImplement(p).filter((d) => action.implementsDecisionIds.includes(d.id))
        const version: ArtifactVersion = {
          id: action.versionId,
          label,
          artifactTitle: action.artifactTitle?.trim() || last?.artifactTitle || DEFAULT_ARTIFACT_TITLE(p),
          status: 'internal_review',
          snapshot,
          checksum: mockChecksum(`${p.id}|${label}|${snapshot.kind}|${snapshot.variant}`),
          note: action.note.trim(),
          createdBy: actorOf(state),
          createdAt: action.now,
          implementsDecisionIds: toImplement.map((d) => d.id),
          baselineId: base.id,
        }
        return {
          ...p,
          versions: [...p.versions.map((v) => (v.status === 'internal_review' || v.status === 'changes_requested' ? { ...v, status: 'superseded' as const } : v)), version],
          decisions: p.decisions.map((d) => (toImplement.some((t) => t.id === d.id) ? { ...d, implementedInVersionId: version.id } : d)),
          stage: p.stage === 'awaiting_client' || p.stage === 'client_approved' ? p.stage : 'in_review',
          updatedAt: action.now,
          lastActivity: `نسخهٔ ${label} ثبت شد`,
        }
      })

    case 'addFeedback':
      return patch(state, action.projectId, (p) => {
        const v = p.versions.find((x) => x.id === action.versionId)
        const text = action.text.trim()
        if (!v || v.status === 'approved' || text === '') return p
        const seq = Math.max(0, ...p.feedback.filter((f) => f.versionId === v.id).map((f) => f.seq)) + 1
        const fb: Feedback = {
          id: action.feedbackId,
          versionId: v.id,
          seq,
          author: actorOf(state),
          authorRole: state.role,
          text,
          createdAt: action.now,
          status: 'open',
          // نسخهٔ منتشرشده ثابت است و طراح فقط بازخورد داخلی می‌سازد؛ رؤیت‌پذیری برای مشتری با PM است.
          visibility: v.status === 'client_review' || state.role === 'designer' ? 'internal' : action.visibility,
          blocking: action.blocking,
          pin: action.pin ? { x: clamp01(action.pin.x), y: clamp01(action.pin.y) } : null,
          comments: [],
          decisionIds: [],
        }
        return { ...p, feedback: [...p.feedback, fb], updatedAt: action.now, lastActivity: `بازخورد جدید روی نسخهٔ ${v.label}` }
      })

    case 'setFeedbackStatus':
      return patch(state, action.projectId, (p) => ({
        ...p,
        feedback: p.feedback.map((f) => (f.id === action.feedbackId ? { ...f, status: action.status } : f)),
        updatedAt: action.now,
      }))

    case 'addComment':
      return patch(state, action.projectId, (p) => {
        const text = action.text.trim()
        if (text === '') return p
        return {
          ...p,
          feedback: p.feedback.map((f) =>
            f.id === action.feedbackId
              ? { ...f, comments: [...f.comments, { id: action.commentId, author: actorOf(state), text, createdAt: action.now }] }
              : f,
          ),
          updatedAt: action.now,
        }
      })

    case 'createDecision':
      return patch(state, action.projectId, (p) => {
        const summary = action.summary.trim()
        const reason = action.reason.trim()
        if (summary === '' || reason === '' || !p.versions.some((v) => v.id === action.versionId)) return p
        if (p.decisions.some((d) => d.id === action.decisionId)) return p
        const feedbackIds = action.feedbackIds.filter((id) => p.feedback.some((f) => f.id === id))
        const old = action.supersedesId ? p.decisions.find((d) => d.id === action.supersedesId) : undefined
        if (action.supersedesId && old?.status !== 'final') return p
        const d: Decision = {
          id: action.decisionId,
          summary,
          outcome: action.outcome,
          reason,
          author: actorOf(state),
          authorRole: state.role,
          createdAt: action.now,
          status: 'draft',
          versionId: action.versionId,
          feedbackIds,
          supersedesId: action.supersedesId,
        }
        let next: Project = {
          ...p,
          decisions: [...p.decisions, d],
          feedback: p.feedback.map((f) =>
            feedbackIds.includes(f.id) ? { ...f, decisionIds: [...f.decisionIds, d.id], status: f.status === 'open' ? ('in_progress' as const) : f.status } : f,
          ),
          updatedAt: action.now,
          lastActivity: `پیش‌نویس تصمیم: ${summary}`,
        }
        // فقط مدیر پروژه یا مدیر استودیو می‌تواند مستقیم نهایی کند.
        if (action.finalize && canApproveRole(state.role)) next = finalize(next, d, actorOf(state), action.now)
        return next
      })

    case 'finalizeDecision':
      return patch(state, action.projectId, (p) => {
        const d = p.decisions.find((x) => x.id === action.decisionId)
        if (!d || d.status !== 'draft' || !canApproveRole(state.role)) return p
        return finalize(p, d, actorOf(state), action.now)
      })

    case 'deleteDecisionDraft':
      return patch(state, action.projectId, (p) => {
        const d = p.decisions.find((x) => x.id === action.decisionId)
        if (!d || d.status !== 'draft') return p
        const rest = p.decisions.filter((x) => x.id !== d.id)
        return {
          ...p,
          decisions: rest,
          feedback: p.feedback.map((f) => {
            if (!f.decisionIds.includes(d.id)) return f
            const ids = f.decisionIds.filter((x) => x !== d.id)
            return { ...f, decisionIds: ids, status: f.status === 'in_progress' && ids.length === 0 ? ('open' as const) : f.status }
          }),
          updatedAt: action.now,
        }
      })

    case 'publishVersion':
      return patch(state, action.projectId, (p) => {
        const v = p.versions.find((x) => x.id === action.versionId)
        const base = latestBaseline(p)
        if (!canApproveRole(state.role) || !v || !base || p.revisionOpen) return p
        if (v.status !== 'internal_review' || p.versions[p.versions.length - 1]?.id !== v.id) return p
        const note = action.exceptionNote?.trim() ?? ''
        if (blockingOpen(p, v.id).length > 0 && note === '') return p
        const published: ArtifactVersion = {
          ...v,
          status: 'client_review',
          publishedAt: action.now,
          publishedBy: actorOf(state),
          publishException: blockingOpen(p, v.id).length > 0 ? note : undefined,
        }
        return {
          ...p,
          versions: p.versions.map((x) => (x.id === v.id ? published : x)),
          invites: [
            ...p.invites,
            {
              id: `inv_${action.accessId}`,
              accessId: action.accessId,
              versionId: v.id,
              approverName: CLIENT_APPROVER_NAME,
              createdAt: action.now,
              createdBy: actorOf(state),
              expiresAt: expiryFrom(action.now),
              status: 'sent' as const,
            },
          ],
          stage: 'awaiting_client',
          updatedAt: action.now,
          lastActivity: `نسخهٔ ${v.label} برای مشتری منتشر شد`,
        }
      })

    case 'markInviteOpened': {
      const hit = findByAccess(state, action.accessId)
      if (!hit || hit.invite.status !== 'sent' || inviteState(hit.invite, new Date(action.now).getTime()) !== 'active') return state
      return patch(state, hit.project.id, (p) => ({
        ...p,
        invites: p.invites.map((i) => (i.id === hit.invite.id ? { ...i, status: 'opened' as const, openedAt: action.now } : i)),
      }))
    }

    case 'clientApprove': {
      const hit = findByAccess(state, action.accessId)
      if (!hit) return state
      return patch(state, hit.project.id, (p) => {
        const invite = p.invites.find((i) => i.accessId === action.accessId)
        const v = p.versions.find((x) => x.id === action.versionId)
        const base = latestBaseline(p)
        if (!invite || !v || !base) return p
        // کلیک تکراری یا نسخهٔ قبلاً تأییدشده: هرگز Receipt دوم ساخته نمی‌شود.
        if (p.receipts.some((r) => r.versionId === v.id)) return p
        // فقط دعوت فعال برای همین نسخهٔ منتشرشده و هنوز جاری
        if (invite.versionId !== v.id || v.status !== 'client_review') return p
        if (inviteState(invite, new Date(action.now).getTime()) !== 'active') return p
        const receipt = {
          id: `rcp_${v.id}`,
          number: receiptNumber(v.checksum, p.receipts.length + 1),
          versionId: v.id,
          versionLabel: v.label,
          artifactTitle: v.artifactTitle,
          baselineId: base.id,
          baselineVersion: base.version,
          checksum: v.checksum,
          approverName: invite.approverName,
          approverOrg: p.client,
          approvedAt: action.now,
          statement: clientStatement(p, v),
          inviteId: invite.id,
        }
        return {
          ...p,
          receipts: [...p.receipts, receipt],
          versions: p.versions.map((x) => (x.id === v.id ? { ...x, status: 'approved' as const } : x)),
          invites: p.invites.map((i) => (i.id === invite.id ? { ...i, status: 'approved' as const, respondedAt: action.now } : i)),
          stage: 'client_approved',
          updatedAt: action.now,
          lastActivity: `مشتری نسخهٔ ${v.label} را تأیید کرد`,
        }
      })
    }

    case 'clientRequestChanges': {
      const hit = findByAccess(state, action.accessId)
      const note = action.note.trim()
      if (!hit || note === '') return state
      return patch(state, hit.project.id, (p) => {
        const invite = p.invites.find((i) => i.accessId === action.accessId)
        const v = p.versions.find((x) => x.id === action.versionId)
        if (!invite || !v || invite.versionId !== v.id || v.status !== 'client_review') return p
        if (inviteState(invite, new Date(action.now).getTime()) !== 'active') return p
        const seq = Math.max(0, ...p.feedback.filter((f) => f.versionId === v.id).map((f) => f.seq)) + 1
        return {
          ...p,
          // درخواست اصلاح قبل از تأیید، یک Review Iteration است و Change Request پولی نیست.
          feedback: [
            ...p.feedback,
            {
              id: action.feedbackId,
              versionId: v.id,
              seq,
              author: invite.approverName,
              authorRole: 'client' as const,
              text: note,
              createdAt: action.now,
              status: 'open' as const,
              visibility: 'client' as const,
              blocking: true,
              pin: null,
              comments: [],
              decisionIds: [],
            },
          ],
          versions: p.versions.map((x) => (x.id === v.id ? { ...x, status: 'changes_requested' as const } : x)),
          invites: p.invites.map((i) => (i.id === invite.id ? { ...i, status: 'changes_requested' as const, respondedAt: action.now } : i)),
          stage: 'in_review',
          updatedAt: action.now,
          lastActivity: `مشتری برای ${v.label} درخواست اصلاح داد`,
        }
      })
    }

    case 'revokeInvite':
      return patch(state, action.projectId, (p) => {
        if (!canApproveRole(state.role)) return p
        return {
          ...p,
          invites: p.invites.map((i) => (i.id === action.inviteId && (i.status === 'sent' || i.status === 'opened') ? { ...i, status: 'revoked' as const, revokedAt: action.now } : i)),
          updatedAt: action.now,
        }
      })

    case 'reissueInvite':
      return patch(state, action.projectId, (p) => {
        const v = p.versions.find((x) => x.id === action.versionId)
        if (!canApproveRole(state.role) || !v || v.status !== 'client_review') return p
        if (activeInvite(p, v.id, new Date(action.now).getTime())) return p
        return {
          ...p,
          invites: [
            ...p.invites,
            {
              id: `inv_${action.accessId}`,
              accessId: action.accessId,
              versionId: v.id,
              approverName: CLIENT_APPROVER_NAME,
              createdAt: action.now,
              createdBy: actorOf(state),
              expiresAt: expiryFrom(action.now),
              status: 'sent' as const,
            },
          ],
          updatedAt: action.now,
        }
      })

    case 'simulateExpiry':
      return patch(state, action.projectId, (p) => ({
        ...p,
        invites: p.invites.map((i) => (i.id === action.inviteId && (i.status === 'sent' || i.status === 'opened') ? { ...i, expiresAt: new Date(new Date(action.now).getTime() - 60000).toISOString() } : i)),
      }))

    case 'createChange':
      return patch(state, action.projectId, (p) => newChange(p, action.changeId, action.title, action.description, actorOf(state), state.role, action.now))

    case 'clientCreateChange': {
      const hit = findByAccess(state, action.accessId)
      if (!hit || inviteState(hit.invite) !== 'approved') return state
      return patch(state, hit.project.id, (p) => newChange(p, action.changeId, action.title, action.description, hit.invite.approverName, 'client', action.now))
    }

    case 'classifyChange':
      return patch(state, action.projectId, (p) => {
        if (!canApproveRole(state.role)) return p
        const c = p.changes.find((x) => x.id === action.changeId)
        if (!c || (c.status !== 'draft' && c.status !== 'assessed')) return p
        const msg = action.clientMessage.trim()
        if ((action.classification === 'within' || action.classification === 'unclear') && msg === '') return p
        const actor = actorOf(state)
        const status = action.classification === 'within' ? 'within_scope' : action.classification === 'unclear' ? 'needs_clarification' : assessmentComplete(c) ? 'assessed' : 'draft'
        const text = action.classification === 'within' ? 'طبقه‌بندی: داخل محدودهٔ فعلی' : action.classification === 'unclear' ? 'از مشتری توضیح خواسته شد' : 'طبقه‌بندی: خارج از محدودهٔ تأییدشده'
        return {
          ...patchChange(p, c.id, (x) => ({
            ...x,
            classification: action.classification,
            classificationNote: action.note.trim(),
            clientMessage: action.classification === 'out' ? x.clientMessage : msg,
            status: status as ChangeRequest['status'],
            events: ev(x, 'cls', action.now, actor, text),
          })),
          updatedAt: action.now,
        }
      })

    case 'clientAnswerChange': {
      const hit = findByAccess(state, action.accessId)
      const answer = action.answer.trim()
      if (!hit || inviteState(hit.invite) !== 'approved' || answer === '') return state
      return patch(state, hit.project.id, (p) => {
        const c = p.changes.find((x) => x.id === action.changeId)
        if (!c || c.status !== 'needs_clarification') return p
        return {
          ...patchChange(p, c.id, (x) => ({
            ...x,
            clarificationAnswer: answer,
            classification: null,
            status: 'draft' as const,
            events: ev(x, 'ans', action.now, hit.invite.approverName, 'مشتری توضیح داد'),
          })),
          updatedAt: action.now,
        }
      })
    }

    case 'saveAssessment':
      return patch(state, action.projectId, (p) => {
        if (!canApproveRole(state.role)) return p
        const c = p.changes.find((x) => x.id === action.changeId)
        if (!c || c.classification !== 'out' || !['draft', 'assessed', 'proposal_sent'].includes(c.status)) return p
        if (![action.internalHours, action.scheduleDays, action.amountToman].every(isNonNegInt)) return p
        const actor = actorOf(state)
        return {
          ...patchChange(p, c.id, (x) => {
            const assessment = { internalHours: action.internalHours, scheduleDays: action.scheduleDays, amountToman: action.amountToman, note: action.note.trim(), updatedBy: actor, updatedAt: action.now }
            const next = { ...x, assessment }
            const complete = assessmentComplete(next)
            return {
              ...next,
              status: x.status === 'proposal_sent' ? x.status : complete ? ('assessed' as const) : ('draft' as const),
              events: ev(x, 'asm', action.now, actor, 'ارزیابی دستی ثبت شد'),
            }
          }),
          updatedAt: action.now,
        }
      })

    case 'sendProposal':
      return patch(state, action.projectId, (p) => {
        if (!canApproveRole(state.role)) return p
        const c = p.changes.find((x) => x.id === action.changeId)
        const summary = action.summary.trim()
        if (!c || c.classification !== 'out' || !assessmentComplete(c) || summary === '') return p
        if (c.status !== 'assessed' && c.status !== 'proposal_sent') return p
        if (c.proposals.some((x) => x.id === action.proposalId)) return p
        const actor = actorOf(state)
        const proposal = {
          id: action.proposalId,
          number: c.proposals.length + 1,
          summary,
          amountToman: c.assessment.amountToman!,
          scheduleDays: c.assessment.scheduleDays!,
          createdAt: action.now,
          sentBy: actor,
          status: 'sent' as const,
        }
        return {
          ...patchChange(p, c.id, (x) => ({
            ...x,
            proposals: [...x.proposals.map((q) => (q.status === 'sent' ? { ...q, status: 'superseded' as const } : q)), proposal],
            status: 'proposal_sent' as const,
            events: ev(x, 'prop', action.now, actor, `پیشنهاد ${proposal.number} برای مشتری ارسال شد`),
          })),
          updatedAt: action.now,
        }
      })

    case 'clientRespondProposal': {
      const hit = findByAccess(state, action.accessId)
      if (!hit || inviteState(hit.invite) !== 'approved') return state
      return patch(state, hit.project.id, (p) => {
        const c = p.changes.find((x) => x.id === action.changeId)
        const prop = c && currentProposal(c)
        const base = latestBaseline(p)
        // فقط Proposal Version جاری و منتظر پاسخ؛ پاسخ تکراری یا پیشنهاد جایگزین‌شده بی‌اثر است.
        if (!c || !prop || prop.id !== action.proposalId || c.status !== 'proposal_sent' || !base) return p
        const who = hit.invite.approverName
        if (action.decision === 'reject') {
          return {
            ...patchChange(p, c.id, (x) => ({
              ...x,
              status: 'rejected' as const,
              proposals: x.proposals.map((q) => (q.id === prop.id ? { ...q, status: 'rejected' as const, respondedAt: action.now } : q)),
              events: ev(x, 'rej', action.now, who, 'پیشنهاد را رد کرد؛ تعهد قبلی بدون تغییر ماند'),
            })),
            updatedAt: action.now,
            lastActivity: `پیشنهاد ${c.title} رد شد`,
          }
        }
        // پذیرش: Baseline جدید ساخته می‌شود؛ Baseline قبلی، Receipt و تأیید نسخه دست‌نخورده می‌مانند.
        const snapshot = cloneDoc(base.snapshot)
        const matched = matchExclusions(c, snapshot.fields.exclusions.value)
        snapshot.fields.deliverables.value = [...snapshot.fields.deliverables.value, `${c.title} (CR-${c.seq})`]
        snapshot.fields.exclusions.value = snapshot.fields.exclusions.value.filter((e) => !matched.includes(e))
        const version = base.version + 1
        const baseline: Baseline = {
          id: `bl_${p.id}_v${version}`,
          projectId: p.id,
          version,
          status: 'approved',
          approvedBy: `${who} (پذیرش پیشنهاد)`,
          approvedRole: 'client',
          approvedAt: action.now,
          origin: 'change_request',
          sourceChangeId: c.id,
          supersedes: base.id,
          snapshot,
        }
        return {
          ...patchChange(p, c.id, (x) => ({
            ...x,
            status: 'accepted' as const,
            resultingBaselineId: baseline.id,
            proposals: x.proposals.map((q) => (q.id === prop.id ? { ...q, status: 'accepted' as const, respondedAt: action.now } : q)),
            events: ev(x, 'acc', action.now, who, `پیشنهاد را پذیرفت؛ Baseline v${version} ساخته شد`),
          })),
          baselines: [...p.baselines.map((b) => (b.status === 'approved' ? { ...b, status: 'superseded' as const } : b)), baseline],
          scope: cloneDoc(snapshot),
          updatedAt: action.now,
          lastActivity: `Baseline v${version} از پذیرش ${c.title} ساخته شد`,
        }
      })
    }

    default:
      return state
  }
}
