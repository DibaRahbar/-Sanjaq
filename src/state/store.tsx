import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react'
import { STAGE_META, actorOf, normalizeProject, seedState, titleOf } from '../domain/fixtures'
import { ROLE_LABEL, type AppState, type Project, type Role } from '../domain/types'
import { reducer, type Action } from './reducer'

const STORAGE_KEY = 'sanjaq.demo.v1'
/** کلید قدیمی (نام پیشین محصول)؛ یک بار خوانده و به کلید جدید منتقل می‌شود */
const LEGACY_KEY = 'atelier.demo.v1'
/** مدت شبیه‌سازی تحلیل AI */
export const ANALYSIS_MS = 4200

const seeds = new Map(seedState().projects.map((p) => [p.id, p]))

/** داده‌های ذخیره‌شدهٔ W1 فیلدهای W2 ندارند؛ برای پروژه‌های نمونه، داده‌های W2 از seed گرفته می‌شود. */
function migrate(p: Project): Project {
  const seed = seeds.get(p.id)
  if (p.versions === undefined && seed) return normalizeProject({ ...p, versions: seed.versions, feedback: seed.feedback, decisions: seed.decisions })
  return normalizeProject(p)
}

/** بررسی ساختار حداقلی؛ دادهٔ ذخیره‌شدهٔ خراب یا قدیمی نباید برنامه را از کار بیندازد. */
function isValidProject(p: unknown): p is Project {
  const o = p as Partial<Project> | null
  return (
    !!o &&
    typeof o.id === 'string' &&
    typeof o.name === 'string' &&
    typeof o.client === 'string' &&
    typeof o.stage === 'string' &&
    o.stage in STAGE_META &&
    !!o.analysis &&
    typeof o.analysis.status === 'string' &&
    Array.isArray(o.baselines)
  )
}

function load(): AppState {
  try {
    let raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      raw = localStorage.getItem(LEGACY_KEY)
      if (raw) {
        localStorage.setItem(STORAGE_KEY, raw)
        localStorage.removeItem(LEGACY_KEY)
      }
    }
    if (raw) {
      const parsed = JSON.parse(raw) as AppState
      if (parsed?.version === 1 && Array.isArray(parsed.projects) && parsed.projects.every(isValidProject)) return { ...parsed, actor: typeof parsed.actor === 'string' ? parsed.actor : undefined, actorTitle: typeof parsed.actorTitle === 'string' ? parsed.actorTitle : undefined, projects: parsed.projects.map(migrate) }
    }
  } catch {
    /* حافظهٔ مرورگر در دسترس نیست؛ با دادهٔ نمونه ادامه می‌دهیم */
  }
  return seedState()
}

interface Store {
  state: AppState
  role: Role
  /** نام کاربر فعلی (واردشده یا عضو نمونهٔ نقش) */
  actor: string
  /** عنوان نقش کاربر فعلی: عنوان انتخاب‌شده هنگام ورود یا عنوان عضو تیم یا برچسب سطح دسترسی */
  actorTitle: string
  dispatch: (a: Action) => void
  getProject: (id: string | undefined) => Project | undefined
  resetDemo: () => void
}

const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, rawDispatch] = useReducer(reducer, undefined, load)
  const timers = useRef(new Map<string, number>())

  const dispatch = useCallback((a: Action) => rawDispatch(a), [])

  // ذخیره در حافظهٔ مرورگر (Mock Persistence)
  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      } catch {
        /* نادیده */
      }
    }, 120)
    return () => window.clearTimeout(t)
  }, [state])

  // تحلیل نمایشی در پس‌زمینه؛ با جابه‌جایی صفحه یا بارگذاری دوباره هم ادامه پیدا می‌کند.
  useEffect(() => {
    const live = new Set<string>()
    for (const p of state.projects) {
      if (p.analysis.status !== 'processing') continue
      live.add(p.id)
      if (timers.current.has(p.id)) continue
      const started = p.analysis.startedAt ? new Date(p.analysis.startedAt).getTime() : Date.now()
      const remaining = Math.max(400, ANALYSIS_MS - (Date.now() - started))
      const id = window.setTimeout(() => {
        timers.current.delete(p.id)
        rawDispatch({ type: 'completeAnalysis', projectId: p.id, now: new Date().toISOString() })
      }, remaining)
      timers.current.set(p.id, id)
    }
    for (const [pid, handle] of timers.current) {
      if (!live.has(pid)) {
        window.clearTimeout(handle)
        timers.current.delete(pid)
      }
    }
  }, [state.projects])

  const value = useMemo<Store>(
    () => ({
      state,
      role: state.role,
      actor: actorOf(state),
      actorTitle: state.actorTitle ?? titleOf(actorOf(state)) ?? ROLE_LABEL[state.role],
      dispatch,
      getProject: (id) => state.projects.find((p) => p.id === id),
      resetDemo: () => dispatch({ type: 'resetDemo' }),
    }),
    [state, dispatch],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore(): Store {
  const v = useContext(Ctx)
  if (!v) throw new Error('StoreProvider is missing')
  return v
}

export const nowIso = () => new Date().toISOString()
