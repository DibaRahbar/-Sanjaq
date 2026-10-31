import { Outlet, ScrollRestoration, useLocation } from 'react-router-dom'
import { useRouteFocus } from '../../lib/useRouteFocus'
import { Badge } from '../ui/Badge'
import { Logo } from '../ui/Logo'

/** پوستهٔ ساده و محدود پورتال مشتری: بدون Sidebar، منوی داخلی یا اصطلاح استودیو */
export function ClientShell() {
  useRouteFocus(useLocation().pathname)
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="bg-canvas">
        <div className="mx-auto flex h-14 max-w-[720px] items-center justify-between gap-3 px-4">
          <span className="flex items-center gap-2.5">
            <Logo size={36} />
            <span className="text-section">
              سنجاق
            </span>
          </span>
          <span className="flex items-center gap-2">
            <Badge tone="lime">نمونهٔ نمایشی</Badge>
          </span>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[720px] flex-1 px-4 pb-32 pt-6 outline-none">
        <Outlet />
      </main>
      <footer className="px-4 py-4 text-center text-label font-normal leading-6 text-muted">
        این صفحه بخشی از یک نمونهٔ نمایشی است و داده‌های آن ساختگی‌اند.
      </footer>
      <ScrollRestoration />
    </div>
  )
}
