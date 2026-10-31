import { describe, expect, it } from 'vitest'
import { PM_OPTIONS, ROSTER, STUDIO_SIZE, actorOf } from './fixtures'
import { PORTRAIT_IDS } from '../components/ui/Illus'

describe('تیم و حساب‌ها', () => {
  it('تعداد اعضا با اندازهٔ استودیو برابر است و نام‌ها یکتا و نقش‌ها معتبرند', () => {
    expect(ROSTER).toHaveLength(STUDIO_SIZE)
    expect(new Set(ROSTER.map((m) => m.name)).size).toBe(ROSTER.length)
    expect(new Set(ROSTER.map((m) => m.title)).size).toBe(ROSTER.length)
    for (const m of ROSTER) expect(['founder', 'pm', 'designer']).toContain(m.role)
  })

  it('مدیران پروژه و مدیر استودیو همان سطح دسترسی را دارند', () => {
    for (const name of PM_OPTIONS) expect(ROSTER.find((m) => m.name === name)?.role).toBe('pm')
    expect(ROSTER.filter((m) => m.role === 'founder')).toHaveLength(1)
  })

  it('ورود با هر حساب، نام همان عضو را ثبت‌کننده می‌کند', () => {
    for (const m of ROSTER) expect(actorOf({ role: m.role, actor: m.name })).toBe(m.name)
  })

  it('هر ۹ عضو در ورود در دسترس‌اند و هر سه سطح دسترسی را پوشش می‌دهند', () => {
    expect(new Set(ROSTER.map((m) => m.role))).toEqual(new Set(['founder', 'pm', 'designer']))
    expect(new Set(ROSTER.map((m) => m.blurb)).size).toBe(ROSTER.length)
  })

  it('فهرست آواتارها تکراری ندارد', () => {
    expect(new Set(PORTRAIT_IDS).size).toBe(PORTRAIT_IDS.length)
  })
})

describe('عنوان نقش انتخاب‌شده هنگام ورود', () => {
  it('با تغییر نقش، ریست داده و فضای خالی می‌ماند', async () => {
    const { reducer } = await import('../state/reducer')
    const { seedState } = await import('./fixtures')
    let s = reducer(seedState(), { type: 'setRole', role: 'designer', actor: 'علی احمدی', title: 'طراح ارشد محصول' })
    expect(s.actorTitle).toBe('طراح ارشد محصول')
    s = reducer(s, { type: 'resetDemo' })
    expect(s.actorTitle).toBe('طراح ارشد محصول')
    s = reducer(s, { type: 'emptyWorkspace' })
    expect(s.actorTitle).toBe('طراح ارشد محصول')
    s = reducer(s, { type: 'setRole', role: 'pm' })
    expect(s.actorTitle).toBeUndefined()
  })
})
