import { describe, expect, it } from 'vitest'
import { ARMA_BRIEF, DEMO_ACTOR_NAME, actorOf, classifyBriefSource, seedState } from '../domain/fixtures'
import type { AppState, Project, Role } from '../domain/types'
import { isLocked, reducer, type Action } from './reducer'

const T = '2026-10-29T08:00:00.000Z'

function newProject(text: string): Project {
  return {
    id: 'prj_test',
    name: 'آزمون',
    client: 'مشتری',
    pm: 'نازنین رضایی',
    description: '',
    createdAt: T,
    updatedAt: T,
    stage: 'brief_saved',
    lastActivity: '',
    brief: { text, fileName: null, source: classifyBriefSource(text), savedAt: T },
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
  }
}

const run = (state: AppState, ...actions: Action[]) => actions.reduce(reducer, state)
const get = (s: AppState) => s.projects.find((p) => p.id === 'prj_test')!
const withRole = (s: AppState, role: Role) => reducer(s, { type: 'setRole', role })

function approvedReady(role: Role = 'pm') {
  let s = run(
    { ...seedState(), role },
    { type: 'createProject', project: newProject(ARMA_BRIEF) },
    { type: 'startAnalysis', projectId: 'prj_test', now: T },
    { type: 'completeAnalysis', projectId: 'prj_test', now: T },
    { type: 'editField', projectId: 'prj_test', key: 'acceptance', value: ['چک‌لیست پذیرش'], now: T },
    { type: 'resolveUnknown', projectId: 'prj_test', unknownId: 'unk_acceptance', resolution: { kind: 'answered', note: 'تلفنی' }, now: T },
    { type: 'resolveUnknown', projectId: 'prj_test', unknownId: 'unk_deadline', resolution: { kind: 'assumption', note: 'پایان آذر' }, now: T },
  )
  s = withRole(s, role)
  return s
}

describe('جریان تحلیل', () => {
  it('بریف نمونه: پردازش ← پیش‌نویس با شواهد', () => {
    let s = run(seedState(), { type: 'createProject', project: newProject(ARMA_BRIEF) }, { type: 'startAnalysis', projectId: 'prj_test', now: T })
    expect(get(s).analysis.status).toBe('processing')
    expect(get(s).stage).toBe('analyzing')
    s = run(s, { type: 'completeAnalysis', projectId: 'prj_test', now: T })
    expect(get(s).analysis.status).toBe('ready')
    expect(get(s).stage).toBe('scope_draft')
    expect(get(s).scope!.evidence.length).toBeGreaterThan(0)
  })

  it('بریف دلخواه: خروجی AI جعلی نمی‌سازد و فرم دستی خالی می‌ماند', () => {
    const s = run(seedState(), { type: 'createProject', project: newProject('متن دلخواه') }, { type: 'startAnalysis', projectId: 'prj_test', now: T })
    const p = get(s)
    expect(p.analysis).toMatchObject({ status: 'manual', manualReason: 'custom_brief' })
    expect(p.scope!.fields.goal.value).toBe('')
    expect(p.scope!.evidence).toHaveLength(0)
  })

  it('خطای شبیه‌سازی‌شده بریف و پروژه را نگه می‌دارد و تلاش دوباره موفق است', () => {
    const proj = { ...newProject(ARMA_BRIEF), analysis: { status: 'idle' as const, failNext: true } }
    let s = run(seedState(), { type: 'createProject', project: proj }, { type: 'startAnalysis', projectId: 'prj_test', now: T }, { type: 'completeAnalysis', projectId: 'prj_test', now: T })
    expect(get(s).analysis.status).toBe('error')
    expect(get(s).brief!.text).toBe(ARMA_BRIEF)
    expect(get(s).stage).toBe('brief_saved')
    s = run(s, { type: 'startAnalysis', projectId: 'prj_test', now: T }, { type: 'completeAnalysis', projectId: 'prj_test', now: T })
    expect(get(s).analysis.status).toBe('ready')
  })

  it('ویرایش دستی هنگام پردازش با نتیجهٔ AI بازنویسی نمی‌شود', () => {
    const s = run(
      seedState(),
      { type: 'createProject', project: newProject(ARMA_BRIEF) },
      { type: 'startAnalysis', projectId: 'prj_test', now: T },
      { type: 'editField', projectId: 'prj_test', key: 'goal', value: 'هدف من', now: T },
      { type: 'completeAnalysis', projectId: 'prj_test', now: T },
    )
    expect(get(s).scope!.fields.goal.value).toBe('هدف من')
    expect(get(s).scope!.fields.goal.origin).toBe('human')
    expect(get(s).scope!.fields.audience.origin).toBe('ai')
  })
})

describe('تأیید داخلی و Baseline', () => {
  it('بدون شروط کامل، Baseline ساخته نمی‌شود', () => {
    const s = run(
      seedState(),
      { type: 'createProject', project: newProject(ARMA_BRIEF) },
      { type: 'startAnalysis', projectId: 'prj_test', now: T },
      { type: 'completeAnalysis', projectId: 'prj_test', now: T },
      { type: 'approveScope', projectId: 'prj_test', now: T },
    )
    expect(get(s).baselines).toHaveLength(0)
    expect(get(s).stage).toBe('scope_draft')
  })

  it('نقش طراح نمی‌تواند تأیید کند', () => {
    const s = run(withRole(approvedReady(), 'designer'), { type: 'approveScope', projectId: 'prj_test', now: T })
    expect(get(s).baselines).toHaveLength(0)
  })

  it('تأیید ← Baseline v1 قفل؛ کلیک تکراری Baseline دوم نمی‌سازد؛ ویرایش قفل نادیده گرفته می‌شود', () => {
    let s = run(approvedReady(), { type: 'approveScope', projectId: 'prj_test', now: T })
    expect(get(s).baselines).toHaveLength(1)
    expect(get(s).baselines[0]).toMatchObject({ version: 1, status: 'approved', supersedes: null, approvedBy: 'نازنین رضایی' })
    expect(get(s).stage).toBe('scope_approved')
    expect(isLocked(get(s))).toBe(true)

    s = run(s, { type: 'approveScope', projectId: 'prj_test', now: T })
    expect(get(s).baselines).toHaveLength(1)

    const before = JSON.stringify(get(s).scope)
    s = run(s, { type: 'editField', projectId: 'prj_test', key: 'goal', value: 'تغییر بی‌صدا', now: T })
    expect(JSON.stringify(get(s).scope)).toBe(before)
  })

  it('Revision: v2 جایگزین v1 می‌شود و v1 دست‌نخورده می‌ماند', () => {
    let s = run(approvedReady(), { type: 'approveScope', projectId: 'prj_test', now: T })
    const v1 = JSON.stringify(get(s).baselines[0]!.snapshot)

    s = run(s, { type: 'createRevision', projectId: 'prj_test', now: T })
    expect(get(s).revisionOpen).toBe(true)
    s = run(s, { type: 'editField', projectId: 'prj_test', key: 'reviewRounds', value: 3, now: T })
    s = run(s, { type: 'approveScope', projectId: 'prj_test', now: T })

    const [a, b] = get(s).baselines
    expect(get(s).baselines).toHaveLength(2)
    expect(a).toMatchObject({ version: 1, status: 'superseded' })
    expect(b).toMatchObject({ version: 2, status: 'approved', supersedes: a!.id })
    expect(JSON.stringify(a!.snapshot)).toBe(v1)
    expect(a!.snapshot.fields.reviewRounds.value).toBe(2)
    expect(b!.snapshot.fields.reviewRounds.value).toBe(3)
  })

  it('انصراف از Revision به Baseline فعلی برمی‌گردد', () => {
    let s = run(approvedReady(), { type: 'approveScope', projectId: 'prj_test', now: T }, { type: 'createRevision', projectId: 'prj_test', now: T })
    s = run(s, { type: 'editField', projectId: 'prj_test', key: 'goal', value: 'پیش‌نویس Revision', now: T }, { type: 'discardRevision', projectId: 'prj_test', now: T })
    expect(isLocked(get(s))).toBe(true)
    expect(get(s).scope!.fields.goal.value).not.toBe('پیش‌نویس Revision')
  })
})

describe('وضعیت فهرست', () => {
  it('حالت خالی با emptyWorkspace و بازنشانی با resetDemo', () => {
    expect(reducer(seedState(), { type: 'emptyWorkspace' }).projects).toHaveLength(0)
    expect(reducer({ ...seedState(), projects: [] }, { type: 'resetDemo' }).projects).toHaveLength(4)
  })
})

describe('ورود نمایشی: نام کاربر (actor)', () => {
  it('نام واردشده جای عضو نمونهٔ نقش می‌نشیند و با ریست داده یا فضای خالی می‌ماند', () => {
    let s = reducer(seedState(), { type: 'setRole', role: 'designer', actor: 'علی احمدی' })
    expect(s.role).toBe('designer')
    expect(actorOf(s)).toBe('علی احمدی')
    s = reducer(s, { type: 'resetDemo' })
    expect(actorOf(s)).toBe('علی احمدی')
    s = reducer(s, { type: 'emptyWorkspace' })
    expect(s.projects).toHaveLength(0)
    expect(actorOf(s)).toBe('علی احمدی')
  })

  it('بدون نام واردشده، عضو نمونهٔ نقش به‌کار می‌رود (تغییر نقش از منوی نمایشی)', () => {
    const s = reducer(reducer(seedState(), { type: 'setRole', role: 'pm', actor: 'علی احمدی' }), { type: 'setRole', role: 'founder' })
    expect(actorOf(s)).toBe(DEMO_ACTOR_NAME.founder)
  })
})
