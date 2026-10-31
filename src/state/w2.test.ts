import { describe, expect, it } from 'vitest'
import { ARMA_BRIEF, classifyBriefSource, seedState } from '../domain/fixtures'
import { blockingOpen, buildTimeline, decisionsToImplement, nextAction, projectHome, publishGates } from '../domain/project'
import type { AppState, Project, Role } from '../domain/types'
import { reducer, type Action } from './reducer'

const T = (n: number) => new Date(Date.UTC(2026, 9, 29, 8, n)).toISOString()
const run = (s: AppState, ...a: Action[]) => a.reduce(reducer, s)
const get = (s: AppState) => s.projects.find((p) => p.id === 'prj_t')!

function base(role: Role = 'pm'): AppState {
  const brief = { text: ARMA_BRIEF, fileName: null, source: classifyBriefSource(ARMA_BRIEF), savedAt: T(0) }
  const project: Project = {
    id: 'prj_t', name: 'آزمون', client: 'آرما', pm: 'نازنین رضایی', description: '', createdAt: T(0), updatedAt: T(0),
    stage: 'brief_saved', lastActivity: '', brief, analysis: { status: 'idle' }, scope: null, baselines: [], revisionOpen: false,
    versions: [], feedback: [], decisions: [], invites: [], receipts: [], changes: [],
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
    { type: 'setRole', role },
  )
}
const addV = (id: string, extra: Partial<Extract<Action, { type: 'addVersion' }>> = {}): Action => ({ type: 'addVersion', projectId: 'prj_t', versionId: id, note: '', implementsDecisionIds: [], now: T(3), ...extra })
const addFb = (id: string, versionId: string, extra: Partial<Extract<Action, { type: 'addFeedback' }>> = {}): Action => ({
  type: 'addFeedback', projectId: 'prj_t', feedbackId: id, versionId, text: 'متن دکمه پرداخت کافی واضح نیست', pin: { x: 0.5, y: 0.8 }, visibility: 'client', blocking: false, now: T(4), ...extra,
})
const dec = (id: string, versionId: string, feedbackIds: string[], extra: Partial<Extract<Action, { type: 'createDecision' }>> = {}): Action => ({
  type: 'createDecision', projectId: 'prj_t', decisionId: id, summary: 'متن CTA تغییر کند', outcome: 'adopt', reason: 'ابهام در متن', versionId, feedbackIds, finalize: true, now: T(5), ...extra,
})

describe('نسخهٔ طرح', () => {
  it('بدون Baseline نسخه ثبت نمی‌شود', () => {
    const s = run({ ...seedState(), projects: [{ ...get(base()), baselines: [], revisionOpen: false }] }, addV('av1'))
    expect(get(s).versions).toHaveLength(0)
  })

  it('v1 با Snapshot ثابت و Checksum؛ v2 قبلی را Superseded می‌کند و تصمیم نهایی را وصل می‌کند', () => {
    let s = run(base(), addV('av1'))
    expect(get(s).versions[0]).toMatchObject({ label: 'v1', status: 'internal_review', snapshot: { kind: 'arma-checkout', variant: 1 } })
    expect(get(s).versions[0]!.checksum).toMatch(/^sha256:/)
    expect(get(s).stage).toBe('in_review')
    s = run(s, addFb('fb1', 'av1'), dec('d1', 'av1', ['fb1']))
    expect(decisionsToImplement(get(s))).toHaveLength(1)
    s = run(s, addV('av2', { implementsDecisionIds: ['d1'] }))
    expect(get(s).versions.map((v) => v.status)).toEqual(['superseded', 'internal_review'])
    expect(get(s).versions[1]!.snapshot.variant).toBe(2)
    expect(get(s).decisions[0]!.implementedInVersionId).toBe('av2')
    expect(decisionsToImplement(get(s))).toHaveLength(0)
  })
})

describe('بازخورد و Pin', () => {
  it('Pin به همان نسخه تعلق دارد و شماره‌گذاری هر نسخه مستقل است', () => {
    const s = run(base(), addV('av1'), addFb('f1', 'av1'), addFb('f2', 'av1', { pin: null }), addV('av2'), addFb('f3', 'av2'))
    const fb = get(s).feedback
    expect(fb.map((f) => [f.versionId, f.seq])).toEqual([['av1', 1], ['av1', 2], ['av2', 1]])
    expect(fb[1]!.pin).toBeNull()
  })

  it('مختصات به بازهٔ ۰ تا ۱ محدود می‌شود و متن خالی پذیرفته نمی‌شود', () => {
    let s = run(base(), addV('av1'), addFb('f1', 'av1', { pin: { x: 4, y: -2 } }))
    expect(get(s).feedback[0]!.pin).toEqual({ x: 1, y: 0 })
    s = run(s, addFb('f2', 'av1', { text: '   ' }))
    expect(get(s).feedback).toHaveLength(1)
  })
})

describe('دفتر تصمیم‌ها', () => {
  const withFb = (role: Role = 'pm') => run(base(role), addV('av1'), addFb('fb1', 'av1'))

  it('طراح حتی با finalize فقط پیش‌نویس می‌سازد؛ نهایی‌سازی را رد می‌کنند', () => {
    let s = run(withFb('designer'), dec('d1', 'av1', ['fb1']))
    expect(get(s).decisions[0]!.status).toBe('draft')
    expect(get(s).feedback[0]!.status).toBe('in_progress')
    s = run(s, { type: 'finalizeDecision', projectId: 'prj_t', decisionId: 'd1', now: T(6) })
    expect(get(s).decisions[0]!.status).toBe('draft')
  })

  it('مدیر پروژه نهایی می‌کند: بازخورد حل می‌شود و Actor/زمان ثبت می‌شود', () => {
    let s = run(withFb(), dec('d1', 'av1', ['fb1'], { finalize: false }))
    s = run(s, { type: 'finalizeDecision', projectId: 'prj_t', decisionId: 'd1', now: T(6) })
    expect(get(s).decisions[0]).toMatchObject({ status: 'final', finalizedBy: 'نازنین رضایی', finalizedAt: T(6) })
    expect(get(s).feedback[0]!.status).toBe('resolved')
    expect(get(s).feedback[0]!.decisionIds).toEqual(['d1'])
  })

  it('تصمیم جدید مخالف، تصمیم قبلی را Superseded می‌کند و تاریخچه حفظ می‌شود', () => {
    let s = run(withFb(), dec('d1', 'av1', ['fb1']))
    s = run(s, dec('d2', 'av1', ['fb1'], { outcome: 'reject', summary: 'متن همان بماند', supersedesId: 'd1' }))
    const [a, b] = get(s).decisions
    expect(a).toMatchObject({ status: 'superseded', supersededById: 'd2', summary: 'متن CTA تغییر کند' })
    expect(b).toMatchObject({ status: 'final', supersedesId: 'd1' })
  })

  it('فقط تصمیم نهایی قابل جایگزینی است و پیش‌نویس قابل حذف', () => {
    let s = run(withFb('designer'), dec('d1', 'av1', ['fb1']))
    s = run(s, dec('d2', 'av1', [], { supersedesId: 'd1' }))
    expect(get(s).decisions).toHaveLength(1)
    s = run(s, { type: 'deleteDecisionDraft', projectId: 'prj_t', decisionId: 'd1', now: T(6) })
    expect(get(s).decisions).toHaveLength(0)
    expect(get(s).feedback[0]!.status).toBe('open')
  })

  it('تصمیم بدون دلیل یا خلاصه ثبت نمی‌شود', () => {
    const s = run(withFb(), dec('d1', 'av1', ['fb1'], { reason: ' ' }))
    expect(get(s).decisions).toHaveLength(0)
  })
})

describe('انتشار برای مشتری', () => {
  const ready = (role: Role = 'pm') => run(base(role), addV('av1'))
  const pub = (note?: string): Action => ({ type: 'publishVersion', projectId: 'prj_t', versionId: 'av1', accessId: 'acc-test', exceptionNote: note, now: T(9) })

  it('طراح نمی‌تواند منتشر کند', () => {
    expect(get(run(ready('designer'), pub())).versions[0]!.status).toBe('internal_review')
  })

  it('بازخورد مسدودکنندهٔ باز بدون دلیل استثنا مانع است و با دلیل ثبت می‌شود', () => {
    let s = run(ready(), addFb('f1', 'av1', { blocking: true }))
    expect(blockingOpen(get(s), 'av1')).toHaveLength(1)
    expect(publishGates(get(s), get(s).versions[0]!).find((g) => g.id === 'blocking')!.ok).toBe(false)
    s = run(s, pub('  '))
    expect(get(s).versions[0]!.status).toBe('internal_review')
    s = run(s, pub('مشتری در جلسه تأیید شفاهی داد'))
    expect(get(s).versions[0]).toMatchObject({ status: 'client_review', publishedBy: 'نازنین رضایی', publishException: 'مشتری در جلسه تأیید شفاهی داد' })
    expect(get(s).stage).toBe('awaiting_client')
  })

  it('بعد از انتشار: نسخهٔ جدید مسدود، بازخورد تازه فقط داخلی', () => {
    let s = run(ready(), pub())
    expect(get(s).versions[0]!.status).toBe('client_review')
    s = run(s, addV('av2'))
    expect(get(s).versions).toHaveLength(1)
    s = run(s, addFb('f1', 'av1', { visibility: 'client' }))
    expect(get(s).feedback[0]!.visibility).toBe('internal')
  })

  it('انتشار دوباره Receipt یا وضعیت را تغییر نمی‌دهد', () => {
    const s1 = run(ready(), pub())
    const s2 = run(s1, pub())
    expect(JSON.stringify(get(s2).versions)).toBe(JSON.stringify(get(s1).versions))
  })
})

describe('اقدام بعدی و مسیر ورود', () => {
  it('ترتیب اقدام‌ها در سناریوی آرما', () => {
    let s = base()
    expect(nextAction(get(s), 'pm').cta?.action).toBe('addVersion')
    s = run(s, addV('av1'), addFb('fb1', 'av1'))
    expect(nextAction(get(s), 'pm').cta?.action).toBe('openReview')
    s = run(s, dec('d1', 'av1', ['fb1']))
    expect(nextAction(get(s), 'pm').cta?.action).toBe('addVersion')
    s = run(s, addV('av2', { implementsDecisionIds: ['d1'] }))
    expect(nextAction(get(s), 'pm').cta?.action).toBe('publish')
    expect(nextAction(get(s), 'designer').blockedReason).toBeTruthy()
    s = run(s, { type: 'publishVersion', projectId: 'prj_t', versionId: 'av2', accessId: 'acc-test2', now: T(9) })
    expect(nextAction(get(s), 'pm').title).toContain('منتظر تأیید مشتری')
  })

  it('مقصد ورود: پیش‌نویس محدوده → بریف؛ بعد از Baseline → نمای کلی', () => {
    expect(projectHome(get(base()))).toBe('/studio/projects/prj_t')
    expect(projectHome({ ...get(base()), baselines: [], stage: 'scope_draft' })).toBe('/studio/projects/prj_t/brief')
  })

  it('خط زمان از داده مشتق می‌شود و جدیدترین رویداد اول است', () => {
    const s = run(base(), addV('av1'), addFb('fb1', 'av1'))
    const tl = buildTimeline(get(s))
    expect(tl[0]!.at >= tl[tl.length - 1]!.at).toBe(true)
    expect(tl.some((e) => e.kind === 'feedback')).toBe(true)
  })
})

describe('رؤیت‌پذیری بازخورد', () => {
  it('طراح فقط بازخورد داخلی می‌سازد؛ مدیر پروژه می‌تواند قابل‌رؤیت برای مشتری بسازد', () => {
    const d = run(base('designer'), addV('av1'), addFb('f1', 'av1', { visibility: 'client' }))
    expect(get(d).feedback[0]!.visibility).toBe('internal')
    const p = run(base('pm'), addV('av1'), addFb('f1', 'av1', { visibility: 'client' }))
    expect(get(p).feedback[0]!.visibility).toBe('client')
  })
})
