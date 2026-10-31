import { useEffect, useState } from 'react'
import { clientView, findByAccess, inviteState, type ClientView } from '../domain/client'
import { nowIso, useStore } from './store'

/**
 * تنها راه پورتال مشتری برای خواندن داده: خروجی همیشه Projection محدود است،
 * نه خود پروژه. بنابراین هیچ صفحه‌ای در پورتال به دادهٔ داخلی دسترسی ندارد.
 */
export function useClientAccess(accessId: string | undefined): { view: ClientView | null; known: boolean } {
  const { state, dispatch } = useStore()
  const [, tick] = useState(0)
  const hit = findByAccess(state, accessId)

  // وضعیت انقضا را زنده نگه می‌داریم
  useEffect(() => {
    const t = window.setInterval(() => tick((n) => n + 1), 15000)
    return () => window.clearInterval(t)
  }, [])

  const firstOpen = hit && hit.invite.status === 'sent' && inviteState(hit.invite) === 'active'
  useEffect(() => {
    if (firstOpen && accessId) dispatch({ type: 'markInviteOpened', accessId, now: nowIso() })
  }, [firstOpen, accessId, dispatch])

  return { view: hit ? clientView(hit.project, hit.invite) : null, known: !!hit }
}
