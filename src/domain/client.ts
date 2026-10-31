import { STUDIO_NAME } from './fixtures'
import { latestBaselineOf, signoffStatement } from './project'
import { inviteState, type InviteState } from './invites'

export { activeInvite, inviteState, latestInvite, expiryFrom, INVITE_DAYS, CLIENT_APPROVER_NAME, type InviteState } from './invites'
import { changeLabel } from './changes'
import type { AppState, ArtifactVersion, ChangeStatus, ClientInvite, Project, Receipt, SnapshotRef } from './types'

export function findByAccess(state: AppState, accessId: string | undefined): { project: Project; invite: ClientInvite } | null {
  if (!accessId) return null
  for (const project of state.projects) {
    const invite = project.invites.find((i) => i.accessId === accessId)
    if (invite) return { project, invite }
  }
  return null
}

export const receiptNumber = (checksum: string, seq: number) => `RC-${checksum.replace('sha256:', '').slice(0, 6).toUpperCase()}-${String(seq).padStart(2, '0')}`

/**
 * تنها داده‌ای که پورتال مشتری اجازهٔ دیدن دارد.
 * یادداشت‌های داخلی، تصمیم‌ها و دلایلشان، Baseline داخلی و پیش‌نویس‌ها هرگز وارد این Projection نمی‌شوند.
 */
/** درخواست تغییر، آن‌طور که مشتری می‌بیند: بدون ساعت داخلی، طبقه‌بندی داخلی و یادداشت ارزیابی */
export interface ClientChange {
  id: string
  number: string
  title: string
  description: string
  status: ChangeStatus
  /** فقط وقتی استودیو برای مشتری پیام یا پرسش نوشته (داخل محدوده یا نیازمند توضیح) */
  message: string
  answer?: string
  proposal?: { id: string; number: number; summary: string; amountToman: number; scheduleDays: number; status: 'sent' | 'accepted' | 'rejected' }
  resultingBaseline: number | null
  createdAt: string
}

export interface ClientView {
  studioName: string
  projectName: string
  clientName: string
  approverName: string
  inviteId: string
  state: InviteState
  expiresAt: string
  version: {
    id: string
    label: string
    title: string
    note: string
    snapshot: SnapshotRef
    checksum: string
    publishedAt?: string
    superseded: boolean
  }
  /** فقط بازخوردهای صریحاً «قابل رؤیت برای مشتری» */
  feedback: { id: string; seq: number; text: string; status: 'open' | 'resolved'; pin: { x: number; y: number } | null; byClient: boolean }[]
  receipt?: Receipt
  receipts: Receipt[]
  baselineVersion: number | null
  changes: ClientChange[]
}

export function clientView(project: Project, invite: ClientInvite, now?: number): ClientView | null {
  const v: ArtifactVersion | undefined = project.versions.find((x) => x.id === invite.versionId)
  if (!v) return null
  return {
    studioName: STUDIO_NAME,
    projectName: project.name,
    clientName: project.client,
    approverName: invite.approverName,
    inviteId: invite.id,
    state: inviteState(invite, now),
    expiresAt: invite.expiresAt,
    version: {
      id: v.id,
      label: v.label,
      title: v.artifactTitle,
      note: v.note,
      snapshot: v.snapshot,
      checksum: v.checksum,
      publishedAt: v.publishedAt,
      superseded: v.status === 'superseded',
    },
    feedback: project.feedback
      .filter((f) => f.versionId === v.id && f.visibility === 'client')
      .map((f) => ({ id: f.id, seq: f.seq, text: f.text, status: f.status === 'resolved' ? ('resolved' as const) : ('open' as const), pin: f.pin, byClient: f.authorRole === 'client' })),
    receipt: project.receipts.find((r) => r.versionId === v.id),
    receipts: project.receipts,
    baselineVersion: latestBaselineOf(project)?.version ?? null,
    changes: project.changes.map((c) => {
      const last = [...c.proposals].reverse().find((q) => q.status !== 'superseded')
      return {
        id: c.id,
        number: changeLabel(c),
        title: c.title,
        description: c.description,
        status: c.status,
        message: c.status === 'within_scope' || c.status === 'needs_clarification' ? c.clientMessage : '',
        answer: c.clarificationAnswer,
        proposal: last && { id: last.id, number: last.number, summary: last.summary, amountToman: last.amountToman, scheduleDays: last.scheduleDays, status: last.status as 'sent' | 'accepted' | 'rejected' },
        resultingBaseline: c.resultingBaselineId ? project.baselines.find((b) => b.id === c.resultingBaselineId)?.version ?? null : null,
        createdAt: c.createdAt,
      }
    }),
  }
}

export const clientStatement = (project: Project, v: ArtifactVersion) => signoffStatement(project, v)
