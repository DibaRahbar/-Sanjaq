import { useEffect, useState } from 'react'

/** عنوان تب مرورگر و اعلان تغییر صفحه برای صفحه‌خوان‌ها */
export function useDocumentTitle(title: string | undefined) {
  useEffect(() => {
    if (!title) return
    const prev = document.title
    document.title = `${title} · سنجاق`
    return () => {
      document.title = prev
    }
  }, [title])
}

const seen = new Set<string>()

/**
 * حالت Loading نمایشی: هر صفحه (با کلید یکتا) در هر نشست فقط یک بار برای مدت کوتاهی Skeleton نشان می‌دهد.
 * داده‌ها در واقع همگام و محلی‌اند؛ این فقط برای نمایش حالت بارگذاری در Prototype است.
 */
export function useSimulatedLoad(key: string, ms = 320): boolean {
  const [loading, setLoading] = useState(() => !seen.has(key))
  useEffect(() => {
    if (!loading) return
    const t = window.setTimeout(() => {
      seen.add(key)
      setLoading(false)
    }, ms)
    return () => window.clearTimeout(t)
  }, [loading, key, ms])
  return loading
}
