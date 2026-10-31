import { normalizeFa } from '../lib/format'
import type { ChangeRequest, ChangeStatus, Project, ScopeClass } from './types'

export const CHANGE_STATUS: Record<ChangeStatus, { label: string; tone: 'neutral' | 'ai' | 'warn' | 'ok' | 'info' | 'err' }> = {
  draft: { label: 'جدید', tone: 'warn' },
  needs_clarification: { label: 'منتظر توضیح مشتری', tone: 'info' },
  assessed: { label: 'ارزیابی‌شده', tone: 'info' },
  proposal_sent: { label: 'پیشنهاد ارسال شد', tone: 'ai' },
  accepted: { label: 'پذیرفته شد', tone: 'ok' },
  rejected: { label: 'رد شد', tone: 'neutral' },
  within_scope: { label: 'داخل محدوده', tone: 'ok' },
}

export const SCOPE_CLASS_LABEL: Record<ScopeClass, string> = {
  within: 'داخل محدودهٔ فعلی (بدون هزینهٔ جدید)',
  out: 'خارج از محدودهٔ تأییدشده',
  unclear: 'نیازمند توضیح بیشتر از مشتری',
}

export const isOpenChange = (c: ChangeRequest) => c.status === 'draft' || c.status === 'needs_clarification' || c.status === 'assessed' || c.status === 'proposal_sent'

export const hasClientApproval = (p: Project) => p.receipts.length > 0
export const latestReceipt = (p: Project) => p.receipts[p.receipts.length - 1] ?? null
export const currentProposal = (c: ChangeRequest) => c.proposals.find((x) => x.status === 'sent')

export const assessmentComplete = (c: ChangeRequest) =>
  c.assessment.internalHours !== null && c.assessment.scheduleDays !== null && c.assessment.amountToman !== null

/** تشخیص ساده: آیا متن درخواست به یکی از موارد «خارج از محدوده» Baseline اشاره دارد؟ (فقط راهنما؛ تصمیم با PM) */
export function matchExclusions(c: Pick<ChangeRequest, 'title' | 'description'>, exclusions: string[]): string[] {
  const hay = normalizeFa(`${c.title} ${c.description}`)
  return exclusions.filter((e) => {
    const n = normalizeFa(e)
    return n.length >= 3 && hay.includes(n)
  })
}

export const changeLabel = (c: ChangeRequest) => `CR-${c.seq}`
