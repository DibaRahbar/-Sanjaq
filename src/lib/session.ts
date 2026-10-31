import { useSyncExternalStore } from 'react'

/**
 * نشست ورود نمایشی: فقط یک نشانهٔ «واردشده» در مرورگر. هیچ رمزی ذخیره یا بررسی نمی‌شود و
 * این مکانیزم احراز هویت واقعی نیست؛ نقش و نام کاربر در State برنامه (`AppState.role` و `actor`) می‌مانند.
 */
const KEY = 'sanjaq.session'
const listeners = new Set<() => void>()
let memory = false

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return memory
  }
}

function write(v: boolean) {
  memory = v
  try {
    if (v) localStorage.setItem(KEY, '1')
    else localStorage.removeItem(KEY)
  } catch {
    /* حافظه در دسترس نیست؛ فقط برای همین نشست در حافظهٔ موقت می‌ماند */
  }
  listeners.forEach((l) => l())
}

export const signIn = () => write(true)
export const signOut = () => write(false)

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useSignedIn(): boolean {
  return useSyncExternalStore(subscribe, read, () => false)
}
