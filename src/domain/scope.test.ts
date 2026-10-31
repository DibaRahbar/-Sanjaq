import { describe, expect, it } from 'vitest'
import { ARMA_BRIEF, classifyBriefSource, mockAnalyze, seedState } from './fixtures'
import { applyAiResult, canApprove, editField, emptyScope, resolveUnknown, validateScope } from './scope'
import type { Brief } from './types'

const brief = (text: string, source: Brief['source'] = classifyBriefSource(text)): Brief => ({ text, fileName: null, source, savedAt: '2026-10-29T00:00:00.000Z' })

describe('تحلیل نمایشی', () => {
  it('هر شاهد عین عبارتی از متن بریف است', () => {
    const result = mockAnalyze(brief(ARMA_BRIEF))!
    expect(result.evidence.length).toBeGreaterThan(0)
    for (const e of result.evidence) expect(ARMA_BRIEF.includes(e.quote), e.id).toBe(true)
  })

  it('برای بریف دلخواه خروجی جعلی نمی‌سازد', () => {
    expect(mockAnalyze(brief('بریف دلخواه با متن متفاوت'))).toBeNull()
    expect(mockAnalyze(brief(ARMA_BRIEF, 'custom'))).toBeNull()
  })

  it('شاهدهای پروژهٔ نمونهٔ واژه هم در متن بریفشان هستند', () => {
    const p = seedState().projects.find((x) => x.id === 'prj_vajeh_web')!
    for (const e of p.scope!.evidence) expect(p.brief!.text.includes(e.quote), e.id).toBe(true)
  })

  it('برای معیار پذیرش پیشنهادی نمی‌سازد و آن را نامشخص می‌گذارد', () => {
    const doc = applyAiResult(emptyScope(), mockAnalyze(brief(ARMA_BRIEF))!)
    expect(doc.fields.acceptance.origin).toBe('empty')
    expect(doc.unknowns.some((u) => u.field === 'acceptance' && u.severity === 'critical')).toBe(true)
  })
})

describe('شروط تأیید داخلی', () => {
  const draft = () => applyAiResult(emptyScope(), mockAnalyze(brief(ARMA_BRIEF))!)

  it('بدون معیار پذیرش و با ابهام حیاتی باز، تأیید ممکن نیست', () => {
    const g = validateScope(draft())
    expect(g.filter((x) => !x.ok).map((x) => x.id)).toEqual(['acceptance', 'unknowns'])
    expect(canApprove(draft())).toBe(false)
  })

  it('ابهام حیاتی بدون متن پاسخ، حل‌شده حساب نمی‌شود', () => {
    let doc = editField(draft(), 'acceptance', ['چک‌لیست پذیرش'])
    doc = resolveUnknown(doc, 'unk_acceptance', { kind: 'answered', note: '  ' })
    doc = resolveUnknown(doc, 'unk_deadline', { kind: 'assumption', note: 'تا پایان آذر' })
    expect(canApprove(doc)).toBe(false)
  })

  it('با معیار پذیرش و رفع ابهام‌های حیاتی آماده است', () => {
    let doc = editField(draft(), 'acceptance', ['چک‌لیست پذیرش'])
    doc = resolveUnknown(doc, 'unk_acceptance', { kind: 'answered', note: 'تأیید تلفنی مشتری' })
    doc = resolveUnknown(doc, 'unk_deadline', { kind: 'assumption', note: 'تا پایان آذر' })
    expect(canApprove(doc)).toBe(true)
  })
})

describe('منشأ فیلد و حفظ ویرایش انسانی', () => {
  it('ویرایش پیشنهاد AI منشأ را «ویرایش انسانی» می‌کند و بازگرداندن مقدار، دوباره AI', () => {
    const base = applyAiResult(emptyScope(), mockAnalyze(brief(ARMA_BRIEF))!)
    const ai = base.fields.goal.value
    const edited = editField(base, 'goal', 'هدف دیگر')
    expect(edited.fields.goal.origin).toBe('edited')
    expect(editField(edited, 'goal', ai).fields.goal.origin).toBe('ai')
  })

  it('اجرای دوبارهٔ AI ویرایش انسانی را بازنویسی نمی‌کند', () => {
    const result = mockAnalyze(brief(ARMA_BRIEF))!
    const first = applyAiResult(emptyScope(), result)
    const edited = editField(first, 'goal', 'هدف اصلاح‌شدهٔ من')
    const again = applyAiResult(edited, result)
    expect(again.fields.goal.value).toBe('هدف اصلاح‌شدهٔ من')
    expect(again.fields.goal.origin).toBe('edited')
  })

  it('فیلد نوشته‌شدهٔ دستی با خالی‌شدن به «خالی» برمی‌گردد', () => {
    const doc = editField(editField(emptyScope(), 'goal', 'x'), 'goal', '  ')
    expect(doc.fields.goal.origin).toBe('empty')
  })
})
