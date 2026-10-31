import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ROSTER, type TeamMember } from '../domain/fixtures'
import { fa } from '../lib/format'
import { signIn, useSignedIn } from '../lib/session'
import { useDocumentTitle } from '../lib/usePage'
import { useStore } from '../state/store'
import { Button } from '../components/ui/Button'
import { TextInput } from '../components/ui/FormField'
import { Icon } from '../components/ui/Icon'
import { Illus, PORTRAIT_IDS, defaultPortraitId, portraitTint, portraitUrl, setPortraitChoice } from '../components/ui/Illus'
import { Logo } from '../components/ui/Logo'

const MIN_PASSWORD = 4

const DEFAULT_MEMBER = ROSTER.find((m) => m.role === 'pm') ?? (ROSTER[0] as TeamMember)

/** پرتره گرد؛ با `tint` روی تن پاستلی، بدون آن فقط خط روی زمینهٔ صفحه */
function Portrait({ id, tint, size, fit = false }: { id: number; tint?: string; size: number; fit?: boolean }) {
  return (
    <span className={`inline-grid shrink-0 overflow-hidden rounded-full ${tint ?? ''}`} style={{ width: size, height: size }} aria-hidden="true">
      <img src={portraitUrl(id)} alt="" width={256} height={256} loading="lazy" decoding="async" draggable={false} className={`illus size-full ${fit ? 'object-contain p-1' : 'object-cover'}`} />
    </span>
  )
}

export default function Login() {
  useDocumentTitle('ورود')
  const signedIn = useSignedIn()
  const { dispatch } = useStore()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/studio/projects'

  const [member, setMember] = useState<TeamMember>(DEFAULT_MEMBER)
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState(() => defaultPortraitId(DEFAULT_MEMBER.name))
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [errors, setErrors] = useState<{ name?: string; password?: string }>({})
  const [busy, setBusy] = useState(false)
  const [avatarOpen, setAvatarOpen] = useState(false)

  if (signedIn && !busy) return <Navigate to={from} replace />

  /** انتخاب نقش: سطح دسترسی و آواتار پیش‌فرض همان نقش؛ نام را خود کاربر می‌نویسد */
  const pickMember = (m: TeamMember) => {
    setMember(m)
    setAvatar(defaultPortraitId(m.name))
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const next: typeof errors = {}
    const n = name.trim()
    if (n.length < 2) next.name = 'نام را وارد کنید (دست‌کم دو حرف).'
    if (password.length < MIN_PASSWORD) next.password = `رمز دست‌کم ${new Intl.NumberFormat('fa-IR').format(MIN_PASSWORD)} نویسه باشد.`
    setErrors(next)
    if (next.name || next.password) {
      document.getElementById(next.name ? 'login-name' : 'login-password')?.focus()
      return
    }
    setBusy(true)
    window.setTimeout(() => {
      setPortraitChoice(n, avatar)
      dispatch({ type: 'setRole', role: member.role, actor: n, title: member.title })
      signIn()
      navigate(from, { replace: true })
    }, 450)
  }

  return (
    <div className="min-h-dvh">
      <main id="main" className="relative mx-auto flex min-h-dvh max-w-[600px] flex-col px-5 py-6 sm:px-8">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2.5 text-section">
            <Logo />
            سنجاق
          </span>
        </div>

        <div className="mx-auto flex w-full max-w-[520px] flex-1 flex-col justify-center py-8">
          <Illus name="login" className="mx-auto h-36 w-full max-w-md object-cover object-[50%_54%] sm:h-52" />
          <h1 className="mt-5 text-center text-title">ورود به سنجاق</h1>
          <p className="mt-1 text-center text-body text-muted">نقش‌تان را انتخاب کنید و وارد فضای کاری سنجاق شوید.</p>

          <form onSubmit={submit} noValidate className="mt-7 flex flex-col gap-5">
            <fieldset>
              <legend className="mb-2 text-ui font-semibold">نقش شما در تیم</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {ROSTER.map((m) => {
                  const on = m.name === member.name
                  return (
                    <label
                      key={m.name}
                      className="group relative flex min-h-11 cursor-pointer flex-row items-center gap-3 rounded-card border border-line-strong bg-surface p-3 transition-colors duration-[var(--duration-fast)] hover:bg-hover sm:flex-col sm:items-start sm:gap-1.5 has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-on-ink has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand"
                    >
                      <input type="radio" name="role" value={m.name} checked={on} onChange={() => pickMember(m)} className="sr-only" aria-label={m.title} />
                      <Portrait id={on ? avatar : defaultPortraitId(m.name)} tint={portraitTint(m.name)} size={44} />
                      <span className="min-w-0">
                        <span className="block text-ui font-bold leading-6">{m.title}</span>
                        <span className="block text-label font-normal leading-5 text-ink-soft group-has-[:checked]:text-on-ink/80">{m.blurb}</span>
                      </span>
                      {on ? <Icon name="check" size={16} className="absolute end-3 top-3 sm:top-3" /> : null}
                    </label>
                  )
                })}
              </div>
            </fieldset>


            <TextInput
              id="login-name"
              name="username"
              label="نام و نام‌خانوادگی"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (errors.name) setErrors({ ...errors, name: undefined })
              }}
              autoComplete="username"
              placeholder="مثلاً علی رحیمی…"
              error={errors.name}
              required
            />

            <TextInput
              id="login-password"
              name="password"
              label="رمز عبور"
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (errors.password) setErrors({ ...errors, password: undefined })
              }}
              autoComplete="current-password"
              dir="ltr"
              className="text-start"
              error={errors.password}
              required
              labelAside={
                <button type="button" onClick={() => setShow((v) => !v)} aria-pressed={show} className="inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-caption font-bold text-ink-soft hover:bg-sunken hover:text-ink">
                  <Icon name="eye" size={14} /> {show ? 'پنهان‌کردن' : 'نمایش'}
                </button>
              }
            />

            <section aria-labelledby="avatar-title">
              <div className="flex items-center gap-3">
                <Portrait id={avatar} tint={portraitTint(name.trim() || member.name)} size={56} />
                <div className="min-w-0 flex-1">
                  <h2 id="avatar-title" className="text-ui font-semibold">
                    آواتار شما
                  </h2>
                  <p className="text-caption text-muted">پرتره پیش‌فرض نقش انتخاب شده است؛ اگر خواستید عوضش کنید.</p>
                </div>
                <Button size="sm" aria-expanded={avatarOpen} aria-controls="avatar-grid" onClick={() => setAvatarOpen((v) => !v)}>
                  {avatarOpen ? 'بستن' : 'تغییر'}
                </Button>
              </div>
              {avatarOpen ? (
                <div id="avatar-grid" role="radiogroup" aria-labelledby="avatar-title" className="mt-3 grid grid-cols-6 gap-x-1 gap-y-3 sm:gap-x-2">
                  {PORTRAIT_IDS.map((id, i) => (
                    <label key={id} className="relative cursor-pointer justify-self-center rounded-full has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand">
                      <input type="radio" name="avatar" value={id} checked={avatar === id} onChange={() => setAvatar(id)} aria-label={`آواتار ${fa(i + 1)} از ${fa(PORTRAIT_IDS.length)}`} className="sr-only" />
                      <span className={`grid size-[52px] place-items-center rounded-full bg-surface transition-shadow duration-[var(--duration-fast)] sm:size-[60px] ${avatar === id ? 'ring-2 ring-ink' : 'ring-1 ring-line-strong hover:ring-ink-soft'}`}>
                        <Portrait id={id} size={48} fit />
                      </span>
                    </label>
                  ))}
                </div>
              ) : null}
            </section>

            <p className="flex items-start gap-2 rounded-control bg-sunken p-3 text-caption leading-6 text-ink-soft">
              <Icon name="info" size={16} className="mt-1 shrink-0" />
              <span>ورود نمایشی است: رمز بررسی و ذخیره نمی‌شود و هر رمزی با حداقل طول پذیرفته می‌شود. داده‌ها ساختگی‌اند و فقط در همین مرورگر می‌مانند.</span>
            </p>

            <Button type="submit" variant="primary" icon="next" loading={busy} className="w-full">
              ورود به پنل
            </Button>
          </form>
        </div>
      </main>
    </div>
  )
}
