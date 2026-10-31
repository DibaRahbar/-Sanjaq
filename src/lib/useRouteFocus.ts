import { useEffect, useRef } from 'react'

/** بعد از جابه‌جایی بین صفحه‌ها، فوکوس به محتوای اصلی می‌رود تا صفحه‌خوان و صفحه‌کلید از بالای صفحهٔ تازه شروع کنند. */
export function useRouteFocus(pathname: string) {
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    document.getElementById('main')?.focus({ preventScroll: true })
  }, [pathname])
}
