import { describe, expect, it } from 'vitest'
import { ARMA_BRIEF, classifyBriefSource, seedState } from '../domain/fixtures'
import { clientView, findByAccess } from '../domain/client'
import { matchExclusions } from '../domain/changes'
import { nextAction } from '../domain/project'
import type { AppState, Project, Role } from '../domain/types'
import { reducer, type Action } from './reducer'

const T = (m: number) => new Date(Date.UTC(2026, 9, 29, 8, m)).toISOString()
const run = (s: AppState, ...a: Action[]) => a.reduce(reducer, s)
const get = (s: AppState) => s.projects.find((p) => p.id === 'prj_t')!
const ACC = 'acc-w4'

/** آرمای تأییدشده با Receipt (v2 تأیید مشتری)؛ نقش فعلی قابل تنظیم */
function approved(role: Role = 'pm'): AppState {
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
    { type: 'publishVersion', projectId: 'prj_t', versionId: 'av1', accessId: ACC, now: T(4) },
    { type: 'clientApprove', accessId: ACC, versionId: 'av1', now: T(5) },
    { type: 'setRole', role },
  )
}

const create = (extra: Partial<Extract<Action, { type: 'createChange' }>> = {}): Action => ({ type: 'createChange', projectId: 'prj_t', changeId: 'c1', title: 'افزودن پرداخت اشتراکی', description: 'مشتری پرداخت اشتراکی ماهانه می‌خواهد', now: T(10), ...extra })
const classify = (classification: 'within' | 'out' | 'unclear' = 'out', clientMessage = '', note = 'یادداشت داخلی'): Action => ({ type: 'classifyChange', projectId: 'prj_t', changeId: 'c1', classification, note, clientMessage, now: T(11) })
const assess = (over: Partial<Extract<Action, { type: 'saveAssessment' }>> = {}): Action => ({ type: 'saveAssessment', projectId: 'prj_t', changeId: 'c1', internalHours: 40, scheduleDays: 6, amountToman: 12000000, note: 'ساعت داخلی محرمانه', now: T(12), ...over })
const send = (id = 'p1', summary = 'طراحی جریان پرداخت اشتراکی'): Action => ({ type: 'sendProposal', projectId: 'prj_t', changeId: 'c1', proposalId: id, summary, now: T(13) })
const respond = (decision: 'accept' | 'reject', proposalId = 'p1'): Action => ({ type: 'clientRespondProposal', accessId: ACC, changeId: 'c1', proposalId, decision, now: T(20) })
const ready = () => run(approved(), create(), classify(), assess(), send())

describe('ثبت درخواست', () => {
  it('قبل از تأیید مشتری Change Request ساخته نمی‌شود', () => {
    const s = run({ ...approved(), projects: get(approved()) ? [{ ...get(approved()), receipts: [] }] : [] }, create())
    expect(get(s).changes).toHaveLength(0)
  })

  it('بعد از تأیید: به Baseline و Receipt قبلی وصل می‌شود و تأیید قبلی دست‌نخورده می‌ماند', () => {
    const before = get(approved())
    const s = run(approved(), create())
    const c = get(s).changes[0]!
    expect(c).toMatchObject({ seq: 1, status: 'draft', baselineId: before.receipts[0]!.baselineId, receiptId: before.receipts[0]!.id })
    expect(JSON.stringify(get(s).receipts)).toBe(JSON.stringify(before.receipts))
    expect(get(s).versions[0]!.status).toBe('approved')
  })

  it('مشتری با لینک تأییدشده می‌تواند ثبت کند؛ لینک ناشناس نه', () => {
    const ok = run(approved(), { type: 'clientCreateChange', accessId: ACC, changeId: 'c1', title: 'x', description: 'y', now: T(10) })
    expect(get(ok).changes[0]).toMatchObject({ requestedByRole: 'client', requestedBy: 'کیوان محمدی' })
    const bad = run(approved(), { type: 'clientCreateChange', accessId: 'nope', changeId: 'c1', title: 'x', description: 'y', now: T(10) })
    expect(get(bad).changes).toHaveLength(0)
  })

  it('عنوان یا توضیح خالی پذیرفته نمی‌شود', () => {
    expect(get(run(approved(), create({ title: ' ' }))).changes).toHaveLength(0)
    expect(get(run(approved(), create({ description: '' }))).changes).toHaveLength(0)
  })
})

describe('طبقه‌بندی', () => {
  it('طراح نمی‌تواند طبقه‌بندی یا ارزیابی کند', () => {
    const s = run(run(approved('pm'), create()), { type: 'setRole', role: 'designer' }, classify())
    expect(get(s).changes[0]!.classification).toBeNull()
  })

  it('«داخل محدوده» پیام برای مشتری می‌خواهد و بدون هزینه بسته می‌شود', () => {
    expect(get(run(approved(), create(), classify('within', ''))).changes[0]!.status).toBe('draft')
    const s = run(approved(), create(), classify('within', 'این مورد در تحویل‌دادنی‌ها هست'))
    expect(get(s).changes[0]).toMatchObject({ status: 'within_scope', classification: 'within' })
  })

  it('«نیازمند توضیح»: پرسش به مشتری می‌رود، پاسخ مشتری وضعیت را به «جدید» برمی‌گرداند', () => {
    let s = run(approved(), create(), classify('unclear', 'منظور از اشتراکی چیست؟'))
    expect(get(s).changes[0]!.status).toBe('needs_clarification')
    s = run(s, { type: 'clientAnswerChange', accessId: ACC, changeId: 'c1', answer: 'پرداخت ماهانه', now: T(12) })
    expect(get(s).changes[0]).toMatchObject({ status: 'draft', clarificationAnswer: 'پرداخت ماهانه', classification: null })
  })

  it('تشخیص ساده از موارد خارج از محدوده فقط راهنما است', () => {
    expect(matchExclusions({ title: 'افزودن پرداخت اشتراکی', description: '' }, ['پرداخت اشتراکی', 'پنل مدیریت فروشگاه'])).toEqual(['پرداخت اشتراکی'])
  })
})

describe('ارزیابی دستی و پیشنهاد', () => {
  it('ارزیابی فقط وقتی «خارج از محدوده» است؛ اعداد منفی یا اعشاری رد می‌شوند', () => {
    expect(get(run(approved(), create(), assess())).changes[0]!.assessment.internalHours).toBeNull()
    const s = run(approved(), create(), classify(), assess({ amountToman: -5 }))
    expect(get(s).changes[0]!.assessment.amountToman).toBeNull()
    expect(get(run(approved(), create(), classify(), assess({ internalHours: 1.5 }))).changes[0]!.assessment.internalHours).toBeNull()
  })

  it('ارزیابی کامل وضعیت را «ارزیابی‌شده» می‌کند و ناقص آن را «جدید» نگه می‌دارد', () => {
    expect(get(run(approved(), create(), classify(), assess())).changes[0]!.status).toBe('assessed')
    expect(get(run(approved(), create(), classify(), assess({ amountToman: null }))).changes[0]!.status).toBe('draft')
  })

  it('بدون ارزیابی کامل یا خلاصه، پیشنهاد ارسال نمی‌شود', () => {
    expect(get(run(approved(), create(), classify(), assess({ amountToman: null }), send())).changes[0]!.proposals).toHaveLength(0)
    expect(get(run(approved(), create(), classify(), assess(), send('p1', ' '))).changes[0]!.proposals).toHaveLength(0)
  })

  it('ارسال: نسخهٔ پیشنهاد ثابت است و ویرایش بعدی ارزیابی آن را عوض نمی‌کند؛ ارسال دوباره نسخهٔ ۲ می‌سازد', () => {
    let s = ready()
    const p1 = get(s).changes[0]!.proposals[0]!
    expect(p1).toMatchObject({ number: 1, amountToman: 12000000, scheduleDays: 6, status: 'sent' })
    s = run(s, assess({ amountToman: 15000000 }))
    expect(get(s).changes[0]!.proposals[0]).toEqual(p1)
    s = run(s, send('p2', 'پیشنهاد اصلاح‌شده'))
    expect(get(s).changes[0]!.proposals.map((x) => [x.number, x.status, x.amountToman])).toEqual([[1, 'superseded', 12000000], [2, 'sent', 15000000]])
  })

  it('اقدام بعدی استودیو با وضعیت درخواست هماهنگ است', () => {
    expect(nextAction(get(run(approved(), create())), 'pm').cta?.action).toBe('openChanges')
    expect(nextAction(get(ready()), 'pm').title).toContain('منتظر پاسخ مشتری')
  })
})

describe('پاسخ مشتری', () => {
  it('پذیرش: Baseline v2 با تحویل‌دادنی تازه، حذف مورد مطابق از «خارج از محدوده»، Baseline و Receipt قبلی دست‌نخورده', () => {
    const before = get(ready())
    const s = run(ready(), respond('accept'))
    const p = get(s)
    expect(p.changes[0]).toMatchObject({ status: 'accepted', resultingBaselineId: 'bl_prj_t_v2' })
    expect(p.baselines.map((b) => [b.version, b.status])).toEqual([[1, 'superseded'], [2, 'approved']])
    const b2 = p.baselines[1]!
    expect(b2).toMatchObject({ origin: 'change_request', sourceChangeId: 'c1', supersedes: p.baselines[0]!.id, approvedRole: 'client' })
    expect(b2.snapshot.fields.deliverables.value.at(-1)).toContain('افزودن پرداخت اشتراکی')
    expect(b2.snapshot.fields.exclusions.value).not.toContain('پرداخت اشتراکی')
    expect(JSON.stringify(p.baselines[0]!.snapshot)).toBe(JSON.stringify(before.baselines[0]!.snapshot))
    expect(JSON.stringify(p.receipts)).toBe(JSON.stringify(before.receipts))
    expect(p.versions[0]!.status).toBe('approved')
    expect(p.changes[0]!.proposals[0]!.status).toBe('accepted')
  })

  it('رد: هیچ Baseline جدیدی ساخته نمی‌شود و تعهد قبلی ثابت می‌ماند', () => {
    const p = get(run(ready(), respond('reject')))
    expect(p.changes[0]!.status).toBe('rejected')
    expect(p.baselines).toHaveLength(1)
    expect(p.baselines[0]!.status).toBe('approved')
  })

  it('پاسخ تکراری، پیشنهاد جایگزین‌شده یا لینک ناشناس بی‌اثر است', () => {
    const s1 = run(ready(), respond('accept'))
    expect(get(run(s1, respond('accept'))).baselines).toHaveLength(2)
    expect(get(run(s1, respond('reject'))).changes[0]!.status).toBe('accepted')
    const s2 = run(ready(), send('p2', 'جدید'), respond('accept', 'p1'))
    expect(get(s2).baselines).toHaveLength(1)
    expect(get(run(ready(), { ...respond('accept'), accessId: 'bad' } as Action)).baselines).toHaveLength(1)
  })
})

describe('S6: تغییر تعهد تأییدشده', () => {
  it('بعد از تأیید مشتری، Revision مستقیم ساخته نمی‌شود', () => {
    const s = run(approved(), { type: 'createRevision', projectId: 'prj_t', now: T(30) })
    expect(get(s).revisionOpen).toBe(false)
  })

  it('نسخهٔ جدید روی نسخهٔ تأییدشده ممکن نیست', () => {
    const s = run(approved(), { type: 'addVersion', projectId: 'prj_t', versionId: 'av2', note: 'x', implementsDecisionIds: [], now: T(30) })
    expect(get(s).versions).toHaveLength(1)
  })
})

describe('مرز دادهٔ مشتری', () => {
  it('Projection ساعت داخلی، یادداشت‌ها و طبقه‌بندی داخلی را ندارد', () => {
    const s = run(ready(), assess({ note: 'ساعت داخلی محرمانه' }))
    const hit = findByAccess(s, ACC)!
    const view = clientView(hit.project, hit.invite)!
    const json = JSON.stringify(view)
    for (const secret of ['ساعت داخلی محرمانه', 'یادداشت داخلی', 'internalHours', 'classification', 'assessment']) expect(json).not.toContain(secret)
    expect(view.changes[0]!.proposal).toMatchObject({ amountToman: 12000000, scheduleDays: 6, status: 'sent' })
    expect(JSON.stringify(view.changes[0])).not.toContain('40')
  })

  it('پیام استودیو فقط برای وضعیت‌های مجاز دیده می‌شود', () => {
    const s = run(approved(), create(), classify('within', 'داخل محدوده است'))
    const hit = findByAccess(s, ACC)!
    expect(clientView(hit.project, hit.invite)!.changes[0]!.message).toBe('داخل محدوده است')
  })
})
