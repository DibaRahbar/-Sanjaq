import { describe, expect, it } from 'vitest'
import { ARMA_BRIEF, classifyBriefSource, seedState } from '../domain/fixtures'
import { clientView, inviteState, findByAccess } from '../domain/client'
import { nextAction } from '../domain/project'
import type { AppState, Project, Role } from '../domain/types'
import { reducer, type Action } from './reducer'

const T = (m: number, d = 29) => new Date(Date.UTC(2026, 9, d, 8, m)).toISOString()
const run = (s: AppState, ...a: Action[]) => a.reduce(reducer, s)
const get = (s: AppState) => s.projects.find((p) => p.id === 'prj_t')!
const ACC = 'acc-secret-1'

/** پروژه‌ای با v1 منتشرشده، یک بازخورد داخلی و یک بازخورد قابل‌رؤیت برای مشتری */
function published(role: Role = 'pm'): AppState {
  const brief = { text: ARMA_BRIEF, fileName: null, source: classifyBriefSource(ARMA_BRIEF), savedAt: T(0) }
  const project: Project = {
    id: 'prj_t', name: 'آزمون', client: 'آرما', pm: 'نازنین رضایی', description: '', createdAt: T(0), updatedAt: T(0), stage: 'brief_saved', lastActivity: '',
    brief, analysis: { status: 'idle' }, scope: null, baselines: [], revisionOpen: false, versions: [], feedback: [], decisions: [], invites: [], receipts: [], changes: [],
  }
  return run(
    { ...seedState(), role: 'pm' as Role },
    { type: 'createProject', project },
    { type: 'startAnalysis', projectId: 'prj_t', now: T(1) },
    { type: 'completeAnalysis', projectId: 'prj_t', now: T(1) },
    { type: 'editField', projectId: 'prj_t', key: 'acceptance', value: ['چک‌لیست'], now: T(1) },
    { type: 'resolveUnknown', projectId: 'prj_t', unknownId: 'unk_acceptance', resolution: { kind: 'answered', note: 'ok' }, now: T(1) },
    { type: 'resolveUnknown', projectId: 'prj_t', unknownId: 'unk_deadline', resolution: { kind: 'assumption', note: 'ok' }, now: T(1) },
    { type: 'approveScope', projectId: 'prj_t', now: T(2) },
    { type: 'addVersion', projectId: 'prj_t', versionId: 'av1', note: '', implementsDecisionIds: [], now: T(3) },
    { type: 'addFeedback', projectId: 'prj_t', feedbackId: 'fb_pub', versionId: 'av1', text: 'متن عمومی برای مشتری', pin: { x: 0.5, y: 0.5 }, visibility: 'client', blocking: false, now: T(4) },
    { type: 'addFeedback', projectId: 'prj_t', feedbackId: 'fb_int', versionId: 'av1', text: 'یادداشت داخلی محرمانه', pin: null, visibility: 'internal', blocking: false, now: T(4) },
    { type: 'createDecision', projectId: 'prj_t', decisionId: 'd1', summary: 'تصمیم داخلی', outcome: 'adopt', reason: 'دلیل محرمانهٔ داخلی', versionId: 'av1', feedbackIds: ['fb_pub', 'fb_int'], finalize: true, now: T(5) },
    { type: 'publishVersion', projectId: 'prj_t', versionId: 'av1', accessId: ACC, now: T(6) },
    { type: 'setRole', role },
  )
}

const approve = (extra: Partial<Extract<Action, { type: 'clientApprove' }>> = {}): Action => ({ type: 'clientApprove', accessId: ACC, versionId: 'av1', now: T(30), ...extra })

describe('دعوت مشتری', () => {
  it('انتشار یک دعوت فعال با مهلت و توکن می‌سازد', () => {
    const p = get(published())
    expect(p.invites).toHaveLength(1)
    expect(p.invites[0]).toMatchObject({ accessId: ACC, versionId: 'av1', status: 'sent' })
    expect(inviteState(p.invites[0]!, new Date(T(7)).getTime())).toBe('active')
  })

  it('باز شدن لینک وضعیت را «opened» می‌کند و دوباره‌کاری تغییری نمی‌دهد', () => {
    const s = run(published(), { type: 'markInviteOpened', accessId: ACC, now: T(7) }, { type: 'markInviteOpened', accessId: ACC, now: T(9) })
    expect(get(s).invites[0]).toMatchObject({ status: 'opened', openedAt: T(7) })
  })

  it('لینک ناشناس چیزی پیدا نمی‌کند', () => {
    expect(findByAccess(published(), 'nope')).toBeNull()
    expect(findByAccess(published(), undefined)).toBeNull()
  })
})

describe('مرز دادهٔ مشتری', () => {
  it('Projection فقط بازخورد قابل‌رؤیت را دارد و هیچ نشانی از تصمیم یا دلیل داخلی نیست', () => {
    const s = published()
    const hit = findByAccess(s, ACC)!
    const view = clientView(hit.project, hit.invite)!
    expect(view.feedback.map((f) => f.id)).toEqual(['fb_pub'])
    const json = JSON.stringify(view)
    for (const secret of ['یادداشت داخلی محرمانه', 'دلیل محرمانهٔ داخلی', 'تصمیم داخلی', 'internal', 'reason', 'decisions']) expect(json).not.toContain(secret)
  })
})

describe('تأیید مشتری', () => {
  it('تأیید ← Receipt پایدار با نسخه، Checksum و هویت؛ وضعیت نسخه و پروژه عوض می‌شود', () => {
    const s = run(published(), approve())
    const p = get(s)
    expect(p.receipts).toHaveLength(1)
    expect(p.receipts[0]).toMatchObject({ versionId: 'av1', versionLabel: 'v1', approverName: 'کیوان محمدی', approverOrg: 'آرما', approvedAt: T(30), baselineVersion: 1 })
    expect(p.receipts[0]!.checksum).toBe(p.versions[0]!.checksum)
    expect(p.receipts[0]!.statement).toContain('v1')
    expect(p.versions[0]!.status).toBe('approved')
    expect(p.invites[0]!.status).toBe('approved')
    expect(p.stage).toBe('client_approved')
  })

  it('کلیک تکراری Receipt دوم نمی‌سازد و رسید قبلی دست‌نخورده می‌ماند', () => {
    const s1 = run(published(), approve())
    const s2 = run(s1, approve({ now: T(45) }))
    expect(get(s2).receipts).toHaveLength(1)
    expect(JSON.stringify(get(s2).receipts)).toBe(JSON.stringify(get(s1).receipts))
  })

  it('دعوت منقضی، باطل یا نسخهٔ نادرست نمی‌تواند تأیید کند', () => {
    const expired = run(published(), approve({ now: T(0, 10 + 29) }))
    expect(get(expired).receipts).toHaveLength(0)
    const revoked = run(published(), { type: 'revokeInvite', projectId: 'prj_t', inviteId: get(published()).invites[0]!.id, now: T(8) }, approve())
    expect(get(revoked).receipts).toHaveLength(0)
    const wrongVersion = run(published(), approve({ versionId: 'av_other' }))
    expect(get(wrongVersion).receipts).toHaveLength(0)
    const wrongToken = run(published(), approve({ accessId: 'bad' }))
    expect(get(wrongToken).receipts).toHaveLength(0)
  })

  it('طراح نمی‌تواند لینک را باطل کند', () => {
    const s = run(published('designer'), { type: 'revokeInvite', projectId: 'prj_t', inviteId: get(published()).invites[0]!.id, now: T(8) })
    expect(get(s).invites[0]!.status).toBe('sent')
  })
})

describe('درخواست اصلاح مشتری', () => {
  const req = (note = 'دکمه را بزرگ‌تر کنید'): Action => ({ type: 'clientRequestChanges', accessId: ACC, versionId: 'av1', note, feedbackId: 'fb_client', now: T(31) })

  it('به بازخورد مسدودکنندهٔ مشتری تبدیل می‌شود، نسخه changes_requested و Change Request پولی ساخته نمی‌شود', () => {
    const s = run(published(), req())
    const p = get(s)
    expect(p.versions[0]!.status).toBe('changes_requested')
    expect(p.feedback.at(-1)).toMatchObject({ id: 'fb_client', authorRole: 'client', blocking: true, visibility: 'client', status: 'open' })
    expect(p.receipts).toHaveLength(0)
    expect(p.stage).toBe('in_review')
    expect(nextAction(p, 'pm').cta?.action).toBe('addVersion')
  })

  it('متن خالی پذیرفته نمی‌شود و بعد از پاسخ دوباره نمی‌شود پاسخ داد', () => {
    expect(get(run(published(), req('  '))).versions[0]!.status).toBe('client_review')
    const s = run(published(), req(), req('دوباره'), approve())
    expect(get(s).feedback.filter((f) => f.authorRole === 'client')).toHaveLength(1)
    expect(get(s).receipts).toHaveLength(0)
  })

  it('نسخهٔ جدید می‌شود و نسخهٔ changes_requested جایگزین‌شده است', () => {
    const s = run(published(), req(), { type: 'addVersion', projectId: 'prj_t', versionId: 'av2', note: 'بزرگ‌تر شد', implementsDecisionIds: [], now: T(40) })
    expect(get(s).versions.map((v) => v.status)).toEqual(['superseded', 'internal_review'])
  })
})

describe('ابطال و صدور دوباره', () => {
  it('لینک باطل‌شده فعال نیست؛ صدور دوباره لینک تازه برای همان نسخه می‌دهد', () => {
    const inv = get(published()).invites[0]!
    let s = run(published(), { type: 'revokeInvite', projectId: 'prj_t', inviteId: inv.id, now: T(8) })
    expect(inviteState(get(s).invites[0]!)).toBe('revoked')
    expect(nextAction(get(s), 'pm').title).toContain('فعال نیست')
    s = run(s, { type: 'reissueInvite', projectId: 'prj_t', versionId: 'av1', accessId: 'acc-new', now: T(9) })
    expect(get(s).invites).toHaveLength(2)
    expect(findByAccess(s, 'acc-new')!.invite.versionId).toBe('av1')
    // لینک قدیمی همچنان مرده است
    expect(get(run(s, approve())).receipts).toHaveLength(0)
    expect(get(run(s, approve({ accessId: 'acc-new' }))).receipts).toHaveLength(1)
  })

  it('صدور دوباره وقتی لینک فعال دارد انجام نمی‌شود', () => {
    const s = run(published(), { type: 'reissueInvite', projectId: 'prj_t', versionId: 'av1', accessId: 'acc-new', now: T(9) })
    expect(get(s).invites).toHaveLength(1)
  })

  it('شبیه‌سازی انقضا دعوت را منقضی می‌کند', () => {
    const inv = get(published()).invites[0]!
    const s = run(published(), { type: 'simulateExpiry', projectId: 'prj_t', inviteId: inv.id, now: T(10) })
    expect(inviteState(get(s).invites[0]!, new Date(T(11)).getTime())).toBe('expired')
  })
})
