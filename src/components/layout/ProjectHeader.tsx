import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { latestVersion } from '../../domain/project'
import { STAGE_META } from '../../domain/fixtures'
import type { Project } from '../../domain/types'
import { Badge } from '../ui/Badge'
import { teamOf } from '../../domain/fixtures'
import { Avatar, AvatarStack } from '../ui/Misc'
import { Icon, type IconName } from '../ui/Icon'

export function Breadcrumb({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="مسیر" className="mb-3 text-caption text-muted">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((it, i) => (
          <li key={it.label} className="flex items-center gap-1.5">
            {it.to ? (
              <Link to={it.to} className="inline-flex min-h-8 items-center rounded-control px-1 hover:text-ink hover:underline">
                {it.label}
              </Link>
            ) : (
              <span aria-current="page" className="font-semibold text-ink">
                {it.label}
              </span>
            )}
            {i < items.length - 1 ? <Icon name="next" size={14} className="text-line-strong" /> : null}
          </li>
        ))}
      </ol>
    </nav>
  )
}

export function ProjectHeader({ project, active = 'brief' }: { project: Project; active?: string }) {
  const tabsRef = useRef<HTMLElement>(null)
  /* در موبایل تب فعال نباید بیرون از نوار اسکرول بماند */
  useEffect(() => {
    tabsRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [active])
  const meta = STAGE_META[project.stage]
  const latest = latestVersion(project)
  const hasBaseline = project.baselines.length > 0
  const base = `/studio/projects/${project.id}`
  const tabs: { id: string; label: string; icon: IconName; to?: string; why?: string }[] = [
    { id: 'overview', label: 'نمای کلی', icon: 'home', to: hasBaseline ? base : undefined, why: 'بعد از تأیید داخلی محدوده فعال می‌شود' },
    { id: 'brief', label: 'بریف و محدوده', icon: 'brief', to: `${base}/brief` },
    { id: 'review', label: 'بازبینی طرح', icon: 'version', to: latest ? `${base}/review/${latest.id}` : undefined, why: 'ابتدا یک نسخهٔ طرح اضافه کنید' },
    { id: 'decisions', label: 'تصمیم‌ها', icon: 'decision', to: hasBaseline ? `${base}/decisions` : undefined, why: 'بعد از تأیید داخلی محدوده فعال می‌شود' },
    { id: 'changes', label: 'تغییرات', icon: 'change', to: hasBaseline ? `${base}/changes` : undefined, why: 'بعد از تأیید محدوده فعال می‌شود' },
  ]
  return (
    <header className="mb-6">
      <Breadcrumb items={[{ label: 'پروژه‌ها', to: '/studio/projects' }, { label: project.name }]} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-title">{project.name}</h1>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-ui text-muted">
            <span>مشتری: {project.client}</span>
            <span className="flex items-center gap-1.5">
              <Avatar name={project.pm} size={26} /> مدیر پروژه: {project.pm}
            </span>
            <span className="flex items-center gap-2">
              <AvatarStack names={teamOf(project.id, project.pm)} size={28} max={5} /> تیم پروژه
            </span>
          </p>
        </div>
        <Badge tone={meta.tone} dot>{meta.label}</Badge>
      </div>
      <nav ref={tabsRef} aria-label="بخش‌های پروژه" className="mt-5 overflow-x-auto">
        <ul className="flex min-w-max gap-2">
          {tabs.map((t) => (
            <li key={t.id}>
              {t.to ? (
                <Link
                  to={t.to}
                  aria-current={active === t.id ? 'page' : undefined}
                  className={`flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full px-4 text-ui font-bold transition-colors duration-[var(--duration-fast)] ${
                    active === t.id ? 'bg-ink text-on-ink' : 'bg-surface text-ink hover:bg-hover'
                  }`}
                >
                  <Icon name={t.icon} size={16} duo={active === t.id} />
                  {t.label}
                </Link>
              ) : (
                <span aria-disabled="true" title={t.why} className="flex min-h-11 cursor-not-allowed items-center gap-2 whitespace-nowrap rounded-full bg-surface/50 px-4 text-ui font-bold text-muted">
                  <Icon name={t.icon} size={16} />
                  {t.label}
                </span>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}
