import type { ClientInvite, Project } from './types'

export const INVITE_DAYS = 7
export const CLIENT_APPROVER_NAME = 'کیوان محمدی'

export type InviteState = 'active' | 'expired' | 'revoked' | 'approved' | 'changes_requested'

export function inviteState(i: ClientInvite, now: number = Date.now()): InviteState {
  if (i.status === 'revoked') return 'revoked'
  if (i.status === 'approved') return 'approved'
  if (i.status === 'changes_requested') return 'changes_requested'
  return new Date(i.expiresAt).getTime() <= now ? 'expired' : 'active'
}

export const activeInvite = (p: Project, versionId: string, now?: number): ClientInvite | undefined =>
  [...p.invites].reverse().find((i) => i.versionId === versionId && inviteState(i, now) === 'active')

export const latestInvite = (p: Project, versionId: string): ClientInvite | undefined =>
  [...p.invites].reverse().find((i) => i.versionId === versionId)


export const expiryFrom = (nowIso: string) => new Date(new Date(nowIso).getTime() + INVITE_DAYS * 86400000).toISOString()

