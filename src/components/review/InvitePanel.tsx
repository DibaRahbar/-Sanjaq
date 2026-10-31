import { useState } from 'react'
import { Link } from 'react-router-dom'
import { inviteState, latestInvite, type InviteState } from '../../domain/client'
import type { ArtifactVersion, Project } from '../../domain/types'
import { jalaliDate, jalaliDateTime } from '../../lib/format'
import { Badge, type Tone } from '../ui/Badge'
import { Button } from '../ui/Button'

const STATE: Record<InviteState, { label: string; tone: Tone }> = {
  active: { label: 'لینک فعال', tone: 'ai' },
  expired: { label: 'منقضی', tone: 'warn' },
  revoked: { label: 'باطل‌شده', tone: 'err' },
  approved: { label: 'تأیید شد', tone: 'ok' },
  changes_requested: { label: 'درخواست اصلاح', tone: 'warn' },
}

/** لینک اشتراک نسخه برای مشتری: وضعیت، باز کردن نمای مشتری، ابطال و صدور دوباره */
export function InvitePanel({
  project,
  version,
  canManage,
  onRevoke,
  onReissue,
  onExpire,
}: {
  project: Project
  version: ArtifactVersion
  canManage: boolean
  onRevoke: (inviteId: string) => void
  onReissue: () => void
  onExpire: (inviteId: string) => void
}) {
  const invite = latestInvite(project, version.id)
  const [copied, setCopied] = useState(false)
  if (!invite) return null
  const st = inviteState(invite)
  const path = `/client/p/${invite.accessId}`
  const receipt = project.receipts.find((r) => r.versionId === version.id)
  const live = st === 'active'

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, '')}${path}`)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section aria-labelledby="inv-title" className="mt-4 rounded-card bg-lav p-4 [&_.text-muted]:text-ink-soft">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 id="inv-title" className="text-body font-bold">
          لینک مشتری
        </h2>
        <Badge tone={STATE[st].tone}>{STATE[st].label}</Badge>
      </div>
      <p className="text-caption leading-6 text-muted">
        برای {invite.approverName} (نمایندهٔ فرضی {project.client}) · فقط همین نسخه
        {live ? ` · تا ${jalaliDate(invite.expiresAt)}` : ''}
      </p>
      {invite.openedAt ? <p className="text-label font-normal text-muted">باز شده: {jalaliDateTime(invite.openedAt)}</p> : null}
      <p className="mt-2 break-all rounded-control bg-canvas px-2.5 py-1.5 text-label font-normal ring-1 ring-line">
        <bdi dir="ltr" translate="no" className="font-mono">{path}</bdi>
      </p>
      {receipt ? (
        <p className="mt-2 text-caption leading-6 text-ok">
          رسید <bdi dir="ltr" translate="no" className="font-mono">{receipt.number}</bdi> ثبت شد · {jalaliDateTime(receipt.approvedAt)}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {live ? (
          <>
            <Link to={path} target="_blank" rel="noopener" className="inline-flex min-h-11 items-center rounded-control border border-line-strong bg-surface px-3 text-caption font-semibold hover:bg-sunken">
              باز کردن نمای مشتری (دمو)
            </Link>
            <Button size="sm" onClick={copy}>
              {copied ? 'کپی شد' : 'کپی لینک'}
            </Button>
            <Button size="sm" variant="danger" disabled={!canManage} onClick={() => onRevoke(invite.id)}>
              ابطال لینک
            </Button>
          </>
        ) : null}
        {!live && version.status === 'client_review' ? (
          <Button size="sm" variant="primary" disabled={!canManage} onClick={onReissue}>
            صدور لینک تازه
          </Button>
        ) : null}
        {(st === 'approved' || st === 'changes_requested') ? (
          <Link to={path} target="_blank" rel="noopener" className="inline-flex min-h-11 items-center rounded-control border border-line-strong bg-surface px-3 text-caption font-semibold hover:bg-sunken">
            دیدن نمای مشتری (دمو)
          </Link>
        ) : null}
      </div>
      {!canManage && (live || version.status === 'client_review') ? <p className="mt-2 text-label font-normal text-warn">ابطال و صدور لینک فقط برای مدیر پروژه یا مدیر استودیو است.</p> : null}
      {live ? (
        <p className="mt-2 text-label font-normal text-muted">
          نمایشی:{' '}
          <button type="button" className="underline underline-offset-2" onClick={() => onExpire(invite.id)}>
            شبیه‌سازی انقضای لینک
          </button>
        </p>
      ) : null}
    </section>
  )
}
