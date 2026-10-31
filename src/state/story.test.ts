import { describe, expect, it } from 'vitest'
import { ARMA_BRIEF, classifyBriefSource, seedState } from '../domain/fixtures'
import { clientView, findByAccess } from '../domain/client'
import { buildTimeline, nextAction } from '../domain/project'
import type { AppState, Project, Role } from '../domain/types'
import { reducer, type Action } from './reducer'

/** سناریوی کامل رایا دیزاین / آرما: چهار Flow پشت‌سرهم، فقط با Reducer (مثل رابط). */
const t = (m: number) => new Date(Date.UTC(2026, 9, 29, 6, m)).toISOString()
let clock = 0
const now = () => t(clock++)
const run = (s: AppState, ...a: Action[]) => a.reduce(reducer, s)
const P = 'prj_story'
const get = (s: AppState) => s.projects.find((p) => p.id === P)!
const as = (s: AppState, role: Role) => reducer(s, { type: 'setRole', role })

describe('چهار Flow از ابتدا تا انتها', () => {
  it('Brief → Scope → Version → Feedback → Decision → Sign-off → Change Request → Baseline v2', () => {
    const project: Project = {
      id: P, name: 'بازطراحی پرداخت آرما', client: 'آرما', pm: 'نازنین رضایی', description: '', createdAt: now(), updatedAt: now(), stage: 'brief_saved', lastActivity: '',
      brief: { text: ARMA_BRIEF, fileName: null, source: classifyBriefSource(ARMA_BRIEF), savedAt: now() }, analysis: { status: 'idle' }, scope: null,
      baselines: [], revisionOpen: false, versions: [], feedback: [], decisions: [], invites: [], receipts: [], changes: [],
    }

    /* Flow A: بریف ← Scope Baseline */
    let s = run({ ...seedState(), role: 'pm' }, { type: 'createProject', project }, { type: 'startAnalysis', projectId: P, now: now() }, { type: 'completeAnalysis', projectId: P, now: now() })
    expect(get(s).scope!.evidence.length).toBeGreaterThan(0)
    s = run(s, { type: 'approveScope', projectId: P, now: now() })
    expect(get(s).baselines, 'تأیید بدون معیار پذیرش و ابهام باز نباید ممکن باشد').toHaveLength(0)
    s = run(
      s,
      { type: 'editField', projectId: P, key: 'acceptance', value: ['هر دو جریان دسکتاپ و موبایل تأیید شود'], now: now() },
      { type: 'resolveUnknown', projectId: P, unknownId: 'unk_acceptance', resolution: { kind: 'answered', note: 'تلفنی' }, now: now() },
      { type: 'resolveUnknown', projectId: P, unknownId: 'unk_deadline', resolution: { kind: 'assumption', note: 'پایان آذر' }, now: now() },
      { type: 'approveScope', projectId: P, now: now() },
    )
    expect(get(s).baselines).toHaveLength(1)
    expect(get(s).baselines[0]!.snapshot.fields.exclusions.value).toContain('پرداخت اشتراکی')

    /* Flow B: نسخه ← Pin ← Decision ← v2 ← انتشار */
    s = as(s, 'designer')
    s = run(s, { type: 'addVersion', projectId: P, versionId: 'av1', note: '', implementsDecisionIds: [], now: now() },
      { type: 'addFeedback', projectId: P, feedbackId: 'fb1', versionId: 'av1', text: 'متن دکمه پرداخت کافی واضح نیست', pin: { x: 0.7, y: 0.78 }, visibility: 'client', blocking: false, now: now() },
      { type: 'createDecision', projectId: P, decisionId: 'd1', summary: 'متن CTA: پرداخت و ثبت سفارش', outcome: 'adopt', reason: 'ابهام', versionId: 'av1', feedbackIds: ['fb1'], finalize: true, now: now() })
    expect(get(s).feedback[0]!.visibility, 'طراح فقط بازخورد داخلی می‌سازد').toBe('internal')
    expect(get(s).decisions[0]!.status, 'طراح فقط پیش‌نویس می‌سازد').toBe('draft')
    s = as(s, 'pm')
    s = run(s, { type: 'finalizeDecision', projectId: P, decisionId: 'd1', now: now() })
    expect(get(s).feedback[0]!.status).toBe('resolved')
    expect(nextAction(get(s), 'pm').cta?.action).toBe('addVersion')
    s = run(s,
      { type: 'addVersion', projectId: P, versionId: 'av2', note: 'متن CTA تغییر کرد', implementsDecisionIds: ['d1'], now: now() },
      { type: 'publishVersion', projectId: P, versionId: 'av2', accessId: 'tok-story', now: now() })
    expect(get(s).versions.map((v) => v.status)).toEqual(['superseded', 'client_review'])
    expect(get(s).decisions[0]!.implementedInVersionId).toBe('av2')
    expect(get(s).feedback.every((f) => f.versionId === 'av1'), 'Pin نسخهٔ قبل به v2 منتقل نشود').toBe(true)

    /* Flow C: مشتری ← تأیید ← Receipt */
    s = run(s, { type: 'markInviteOpened', accessId: 'tok-story', now: now() }, { type: 'clientApprove', accessId: 'tok-story', versionId: 'av2', now: now() }, { type: 'clientApprove', accessId: 'tok-story', versionId: 'av2', now: now() })
    const receipts = get(s).receipts
    expect(receipts).toHaveLength(1)
    expect(receipts[0]).toMatchObject({ versionLabel: 'v2', approverOrg: 'آرما', baselineVersion: 1 })
    const frozenReceipt = JSON.stringify(receipts)
    const frozenBaseline = JSON.stringify(get(s).baselines[0])

    /* Flow D: درخواست پس از تأیید ← Proposal ← Baseline v2؛ تأیید قبلی دست‌نخورده */
    s = run(s,
      { type: 'createRevision', projectId: P, now: now() },
      { type: 'addVersion', projectId: P, versionId: 'av3', note: 'x', implementsDecisionIds: [], now: now() })
    expect(get(s).revisionOpen, 'Revision مستقیم بعد از تأیید ممنوع است').toBe(false)
    expect(get(s).versions).toHaveLength(2)

    s = run(s, { type: 'clientCreateChange', accessId: 'tok-story', changeId: 'c1', title: 'افزودن پرداخت اشتراکی', description: 'اشتراک ماهانه', now: now() })
    s = run(s,
      { type: 'classifyChange', projectId: P, changeId: 'c1', classification: 'out', note: 'خارج از محدوده', clientMessage: '', now: now() },
      { type: 'saveAssessment', projectId: P, changeId: 'c1', internalHours: 40, scheduleDays: 6, amountToman: 12000000, note: 'داخلی', now: now() },
      { type: 'sendProposal', projectId: P, changeId: 'c1', proposalId: 'p1', summary: 'جریان اشتراکی', now: now() })
    const hit = findByAccess(s, 'tok-story')!
    expect(JSON.stringify(clientView(hit.project, hit.invite))).not.toMatch(/internalHours|خارج از محدوده|داخلی/)
    s = run(s, { type: 'clientRespondProposal', accessId: 'tok-story', changeId: 'c1', proposalId: 'p1', decision: 'accept', now: now() })

    const p = get(s)
    expect(p.baselines.map((b) => [b.version, b.status])).toEqual([[1, 'superseded'], [2, 'approved']])
    expect(p.baselines[1]!.snapshot.fields.exclusions.value).not.toContain('پرداخت اشتراکی')
    expect(p.baselines[1]!.snapshot.fields.deliverables.value.at(-1)).toContain('افزودن پرداخت اشتراکی')
    expect(JSON.stringify(p.receipts)).toBe(frozenReceipt)
    expect(JSON.stringify({ ...p.baselines[0], status: 'approved' })).toBe(frozenBaseline.replace('"status":"approved"', '"status":"approved"'))
    expect(p.versions[1]!.status).toBe('approved')

    /* ردگیری: همهٔ رویدادها در یک خط زمان */
    const kinds = new Set(buildTimeline(p).map((e) => e.kind))
    for (const k of ['project', 'scope', 'version', 'feedback', 'decision', 'publish', 'client', 'change']) expect(kinds.has(k as never), k).toBe(true)
  })
})
