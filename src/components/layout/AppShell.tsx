import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, ScrollRestoration, useLocation, useNavigate } from 'react-router-dom'
import { ROSTER, STUDIO_NAME, STUDIO_SIZE } from '../../domain/fixtures'
import { fa } from '../../lib/format'
import { useRouteFocus } from '../../lib/useRouteFocus'
import { signOut } from '../../lib/session'
import { useStore } from '../../state/store'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { Avatar } from '../ui/Misc'
import { Logo } from '../ui/Logo'
import { Icon, type IconName } from '../ui/Icon'

/** `bar`: قرص با عنوان در هدر موبایل؛ `rail`: فقط آواتار ته ریل راست در دسکتاپ */
function DemoMenu({ variant }: { variant: 'bar' | 'rail' }) {
  const { actor: me, actorTitle, dispatch } = useStore()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState<'empty' | 'reset' | null>(null)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="relative" ref={root}>
      {variant === 'rail' ? (
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="true"
          aria-label={`حساب کاربری: ${me}، ${actorTitle}`}
          title={`${me} · ${actorTitle}`}
          onClick={() => setOpen((v) => !v)}
          className="grid size-12 place-items-center rounded-full transition-colors duration-[var(--duration-fast)] hover:bg-hover"
        >
          <Avatar name={me} size={40} />
        </button>
      ) : (
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="true"
          onClick={() => setOpen((v) => !v)}
          className="flex min-h-11 items-center gap-2 rounded-full bg-surface py-1 ps-1 pe-3 text-caption font-bold hover:bg-hover"
        >
          <Avatar name={me} size={32} />
          <span className="max-w-[10rem] truncate">{actorTitle}</span>
          <Icon name="back" size={14} className="rotate-90 text-muted" />
        </button>
      )}
      {open ? (
        <div className={`fade-up absolute z-30 max-h-[calc(100dvh-5rem)] w-[min(20rem,calc(100vw-2rem))] overflow-y-auto rounded-card bg-surface p-4 shadow-pop ${variant === 'rail' ? 'bottom-0 start-full ms-3' : 'end-0 top-full mt-2'}`}>
          <div className="mb-3 flex items-center gap-3 rounded-control bg-sunken p-3">
            <Avatar name={me} size={48} />
            <div className="min-w-0 leading-6">
              <p className="truncate text-body font-bold">{me}</p>
              <p className="truncate text-caption text-muted">{actorTitle}</p>
            </div>
          </div>
          <fieldset>
            <legend className="mb-1 text-caption font-bold">تغییر حساب (نمایشی)</legend>
            <p className="mb-2 text-label font-normal leading-5 text-muted">
              فقط برای نمایش است؛ این سوئیچ احراز هویت یا مجوز واقعی نیست و محدودیت‌ها فقط در رابط اعمال می‌شوند.
            </p>
            <div className="flex flex-col gap-0.5">
              {ROSTER.map((m) => (
                <label key={m.name} className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-control px-2 hover:bg-hover">
                  <input type="radio" name="demo-account" checked={m.name === me} onChange={() => dispatch({ type: 'setRole', role: m.role, actor: m.name, title: m.title })} className="accent-[var(--color-brand)]" />
                  <Avatar name={m.name} size={28} />
                  <span className="min-w-0 leading-5">
                    <span className="block truncate text-ui font-semibold">{m.title}</span>
                    <span className="block truncate text-label font-normal text-muted">{m.name}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <hr className="my-3 border-line" />
          <p className="mb-1.5 text-caption font-bold">ابزار نمایشی</p>
          <div className="flex flex-col gap-2">
            <Button size="sm" onClick={() => setConfirm('empty')}>
              پاک‌کردن همهٔ پروژه‌ها
            </Button>
            <Button size="sm" onClick={() => setConfirm('reset')}>
              بازگرداندن داده‌های نمونه
            </Button>
          </div>
          <hr className="my-3 border-line" />
          <Button
            size="sm"
            variant="ghost"
            icon="logout"
            className="w-full"
            onClick={() => {
              signOut()
              setOpen(false)
              navigate('/login', { replace: true })
            }}
          >
            خروج از حساب
          </Button>
        </div>
      ) : null}
      <Dialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        tone="warn"
        title={confirm === 'empty' ? 'همهٔ پروژه‌ها پاک شوند؟' : 'داده‌های نمونه برگردند؟'}
        description={
          confirm === 'empty'
            ? 'فضای کاری خالی می‌شود تا حالت «بدون پروژه» را ببینید. پروژه‌ها و تغییرات شما حذف می‌شوند.'
            : 'همهٔ پروژه‌ها به همان داده‌های اولیه برمی‌گردند. پروژه‌ها، بازخوردها و تصمیم‌هایی که ساخته‌اید پاک می‌شوند.'
        }
        footer={
          <>
            <Button onClick={() => setConfirm(null)}>انصراف</Button>
            <Button
              variant="danger"
              onClick={() => {
                if (confirm === 'empty') dispatch({ type: 'emptyWorkspace' })
                else {
                  dispatch({ type: 'resetDemo' })
                  try {
                    localStorage.removeItem('sanjaq.draft.newProject')
                    localStorage.removeItem('atelier.draft.newProject')
                  } catch {
                    /* نادیده */
                  }
                }
                setConfirm(null)
                setOpen(false)
                navigate('/studio/projects')
              }}
            >
              {confirm === 'empty' ? 'پاک کن' : 'بازگردان'}
            </Button>
          </>
        }
      >
        <p className="text-body text-ink-soft">این کار برگشت‌پذیر نیست.</p>
      </Dialog>
    </div>
  )
}

const pill = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-11 items-center gap-2 rounded-full px-4 text-ui font-bold whitespace-nowrap transition-colors duration-[var(--duration-fast)] ${
    isActive ? 'bg-ink text-on-ink' : 'bg-surface text-ink hover:bg-hover'
  }`

const railLink = ({ isActive }: { isActive: boolean }) =>
  `grid size-11 place-items-center rounded-full transition-colors duration-[var(--duration-fast)] ${isActive ? 'bg-lime text-ink' : 'text-ink-soft hover:bg-hover hover:text-ink'}`

const ITEMS: { to: string; label: string; icon: IconName }[] = [
  { to: '/studio/projects', label: 'پروژه‌ها', icon: 'folder' },
  { to: '/studio/projects/new', label: 'پروژهٔ جدید', icon: 'plus' },
]

export function AppShell() {
  const { pathname } = useLocation()
  const { state } = useStore()
  const onNew = pathname === '/studio/projects/new'
  const active = (to: string, a: boolean) => (to === '/studio/projects' ? a && !onNew : a)
  useRouteFocus(pathname)

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[76px_minmax(0,1fr)]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-on-ink"
      >
        پرش به محتوای اصلی
      </a>

      {/* ریل آیکون (دسکتاپ) */}
      <aside className="hidden border-e border-line bg-surface lg:sticky lg:top-0 lg:z-30 lg:flex lg:h-dvh lg:flex-col lg:items-center lg:gap-2 lg:py-5">
        <Link to="/studio/projects" aria-label="سنجاق، بازگشت به پروژه‌ها" className="mb-3">
          <Logo />
        </Link>
        <nav aria-label="ناوبری اصلی" className="flex flex-col items-center gap-2">
          {ITEMS.map((it) => (
            <NavLink key={it.to} to={it.to} title={it.label} aria-label={it.label} className={({ isActive }) => railLink({ isActive: active(it.to, isActive) })}>
              <Icon name={it.icon} size={20} />
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto">
          <DemoMenu variant="rail" />
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 bg-canvas/90 backdrop-blur-[3px]">
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-2 lg:min-h-[68px] lg:flex-nowrap lg:px-10">
            <Link to="/studio/projects" aria-label="سنجاق" className="order-1 grid size-11 place-items-center lg:hidden">
              <Logo size={36} />
            </Link>
            <nav aria-label="بخش‌های اصلی" className="order-3 flex w-full gap-2 overflow-x-auto py-1.5 lg:hidden">
              {ITEMS.map((it) => (
                <NavLink key={it.to} to={it.to} className={({ isActive }) => pill({ isActive: active(it.to, isActive) })}>
                  {it.label}
                </NavLink>
              ))}
            </nav>
            <div className="order-2 flex items-center gap-2">
              <span className="hidden text-caption text-muted lg:inline">
                {STUDIO_NAME} · {fa(STUDIO_SIZE)} نفر · {fa(state.projects.length)} پروژه
              </span>
              <div className="lg:hidden">
                <DemoMenu variant="bar" />
              </div>
            </div>
          </div>
        </header>

        <main id="main" tabIndex={-1} className="mx-auto max-w-[1200px] px-4 pb-10 pt-3 outline-none lg:px-10 lg:pb-12">
          <Outlet />
        </main>
      </div>
      <ScrollRestoration />
    </div>
  )
}
