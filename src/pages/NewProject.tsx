import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useBlocker, useNavigate } from 'react-router-dom'
import {
  ARMA_BRIEF,
  ARMA_CLIENT,
  ARMA_DESCRIPTION,
  ARMA_PROJECT_NAME,
  PM_OPTIONS,
  TEAM,
  classifyBriefSource,
} from '../domain/fixtures'
import type { Project } from '../domain/types'
import { fa, newId } from '../lib/format'
import { Banner } from '../components/ui/Banner'
import { Button, ButtonLink } from '../components/ui/Button'
import { Dialog } from '../components/ui/Dialog'
import { Select, TextArea, TextInput } from '../components/ui/FormField'
import { Icon } from '../components/ui/Icon'
import { Stepper } from '../components/ui/Misc'
import { Breadcrumb } from '../components/layout/ProjectHeader'
import { useDocumentTitle } from '../lib/usePage'
import { nowIso, useStore } from '../state/store'

const DRAFT_KEY = 'sanjaq.draft.newProject'
const MAX_FILE = 500 * 1024

interface Form {
  name: string
  client: string
  pm: string
  description: string
  briefText: string
  fileName: string
  simulateError: boolean
}
const initial: Form = { name: '', client: '', pm: TEAM.pmA, description: '', briefText: '', fileName: '', simulateError: false }

function readDraft(): Form | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    return raw ? { ...initial, ...(JSON.parse(raw) as Partial<Form>) } : null
  } catch {
    return null
  }
}
const clearDraft = () => {
  try {
    localStorage.removeItem(DRAFT_KEY)
  } catch {
    /* نادیده */
  }
}

type Errors = Partial<Record<'name' | 'client' | 'pm' | 'brief', string>>

function validate(f: Form, mode: 'analyze' | 'manual'): Errors {
  const e: Errors = {}
  if (!f.name.trim()) e.name = 'نام پروژه را بنویسید.'
  if (!f.client.trim()) e.client = 'نام مشتری را بنویسید.'
  if (!f.pm) e.pm = 'مدیر پروژه را انتخاب کنید.'
  if (!f.briefText.trim() && !f.fileName) e.brief = 'حداقل متن بریف یا یک فایل بریف لازم است.'
  else if (mode === 'analyze' && !f.briefText.trim())
    e.brief = 'برای تحلیل، متن بریف لازم است. متن را جای‌گذاری کنید یا «ادامه بدون AI» را بزنید.'
  return e
}

export default function NewProject() {
  const { role, dispatch } = useStore()
  const navigate = useNavigate()
  useDocumentTitle('پروژه و بریف جدید')
  const [restored] = useState(() => readDraft())
  const [form, setForm] = useState<Form>(restored ?? initial)
  const [restoredVisible, setRestoredVisible] = useState(restored !== null)
  const [errors, setErrors] = useState<Errors>({})
  const [attempted, setAttempted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [fileNote, setFileNote] = useState<string | null>(null)
  const [mode, setMode] = useState<'analyze' | 'manual'>('analyze')
  const summaryRef = useRef<HTMLDivElement>(null)
  const submittedRef = useRef(false)

  const dirty = useMemo(
    () => !submitting && (form.name.trim() !== '' || form.client.trim() !== '' || form.description.trim() !== '' || form.briefText.trim() !== '' || form.fileName !== ''),
    [form, submitting],
  )

  // ذخیرهٔ خودکار پیش‌نویس
  useEffect(() => {
    if (submittedRef.current) return
    try {
      if (dirty) localStorage.setItem(DRAFT_KEY, JSON.stringify(form))
    } catch {
      /* نادیده */
    }
  }, [form, dirty])

  useEffect(() => {
    if (!dirty) return
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [dirty])

  const blocker = useBlocker(() => dirty && !submittedRef.current)

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm((f) => ({ ...f, [k]: v }))
    setRestoredVisible(false)
    if (attempted) setErrors((prev) => ({ ...prev, [k === 'briefText' || k === 'fileName' ? 'brief' : k]: undefined }))
  }

  const useSample = () => {
    setForm((f) => ({
      ...f,
      briefText: ARMA_BRIEF,
      name: f.name.trim() ? f.name : ARMA_PROJECT_NAME,
      client: f.client.trim() ? f.client : ARMA_CLIENT,
      description: f.description.trim() ? f.description : ARMA_DESCRIPTION,
    }))
    setErrors({})
  }

  const onFile = async (file: File | undefined) => {
    setFileNote(null)
    if (!file) return
    if (file.size > MAX_FILE) {
      setErrors((e) => ({ ...e, brief: 'حجم فایل بیش از ۵۰۰ کیلوبایت است. متن بریف را مستقیم جای‌گذاری کنید.' }))
      return
    }
    const isPdf = /\.pdf$/i.test(file.name) || file.type === 'application/pdf'
    if (isPdf) {
      setForm((f) => ({ ...f, fileName: file.name }))
      setFileNote('استخراج متن از PDF در این نمونه فعال نیست و فقط نام فایل ذخیره می‌شود. برای تحلیل، متن بریف را جای‌گذاری کنید.')
      return
    }
    if (!/\.txt$/i.test(file.name) && file.type !== 'text/plain') {
      setErrors((e) => ({ ...e, brief: 'فقط فایل متنی (TXT) یا PDF پذیرفته می‌شود.' }))
      return
    }
    const text = await file.text()
    setForm((f) => ({ ...f, fileName: file.name, briefText: f.briefText.trim() ? `${f.briefText.trim()}\n\n${text}` : text }))
    setErrors((e) => ({ ...e, brief: undefined }))
  }

  const submit = (m: 'analyze' | 'manual') => (e?: FormEvent) => {
    e?.preventDefault()
    if (submitting) return
    setMode(m)
    setAttempted(true)
    const errs = validate(form, m)
    setErrors(errs)
    if (Object.keys(errs).length > 0) {
      requestAnimationFrame(() => summaryRef.current?.focus())
      return
    }
    setSubmitting(true)
    submittedRef.current = true
    clearDraft()
    const now = nowIso()
    const text = form.briefText.trim()
    const project: Project = {
      id: newId('prj'),
      name: form.name.trim(),
      client: form.client.trim(),
      pm: form.pm,
      description: form.description.trim(),
      createdAt: now,
      updatedAt: now,
      stage: 'brief_saved',
      lastActivity: 'پروژه و بریف ثبت شد',
      brief: { text, fileName: form.fileName || null, source: classifyBriefSource(text), savedAt: now },
      analysis: { status: 'idle', failNext: m === 'analyze' && form.simulateError },
      scope: null,
      baselines: [],
      revisionOpen: false,
      versions: [],
      feedback: [],
      decisions: [],
      invites: [],
      receipts: [],
      changes: [],
    }
    dispatch({ type: 'createProject', project })
    dispatch(m === 'analyze' ? { type: 'startAnalysis', projectId: project.id, now } : { type: 'goManual', projectId: project.id, now })
    navigate(`/studio/projects/${project.id}/brief`)
  }

  const errorList = Object.entries(errors).filter(([, v]) => v) as [keyof Errors, string][]
  const anchor: Record<keyof Errors, string> = { name: 'np-name', client: 'np-client', pm: 'np-pm', brief: 'np-brief' }

  if (role === 'designer') {
    return (
      <div className="fade-up max-w-xl">
        <Breadcrumb items={[{ label: 'پروژه‌ها', to: '/studio/projects' }, { label: 'پروژهٔ جدید' }]} />
        <Banner tone="warn" title="ساخت پروژه برای نقش «طراح» فعال نیست" live="off">
          فقط مدیر پروژه یا مدیر استودیو می‌تواند پروژه بسازد. نقش خود را از منوی بالای صفحه (کنار کلید تم) تغییر دهید.
        </Banner>
        <div className="mt-4">
          <ButtonLink to="/studio/projects">بازگشت به پروژه‌ها</ButtonLink>
        </div>
      </div>
    )
  }

  const customText = form.briefText.trim() !== '' && classifyBriefSource(form.briefText) === 'custom'

  return (
    <div className="fade-up">
      <Breadcrumb items={[{ label: 'پروژه‌ها', to: '/studio/projects' }, { label: 'پروژهٔ جدید' }]} />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-title">پروژه و بریف جدید</h1>
        <Stepper steps={['اطلاعات پروژه', 'تحلیل بریف', 'تأیید محدوده']} current={0} />
      </div>

      {restoredVisible ? (
        <Banner
          tone="info"
          icon="doc"
          className="mb-4"
          title="پیش‌نویس قبلی شما بازیابی شد"
          actions={
            <Button
              size="sm"
              onClick={() => {
                clearDraft()
                setForm(initial)
                setRestoredVisible(false)
              }}
            >
              شروع از نو
            </Button>
          }
        >
          آخرین چیزی که در این فرم نوشته بودید دست‌نخورده برگردانده شد.
        </Banner>
      ) : null}

      {errorList.length > 0 ? (
        <div ref={summaryRef} tabIndex={-1} className="mb-4 outline-none">
          <Banner tone="err" live="assertive" title="قبل از ادامه، این موارد را اصلاح کنید">
            <ul className="mt-1 list-disc ps-5">
              {errorList.map(([k, msg]) => (
                <li key={k}>
                  <a
                    className="underline underline-offset-2"
                    href={`#${anchor[k]}`}
                    onClick={(ev) => {
                      ev.preventDefault()
                      document.getElementById(anchor[k])?.focus()
                    }}
                  >
                    {msg}
                  </a>
                </li>
              ))}
            </ul>
          </Banner>
        </div>
      ) : null}

      <form onSubmit={submit('analyze')} noValidate className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-6">
          <section aria-labelledby="sec-info" className="rounded-card bg-surface p-5 shadow-card">
            <h2 id="sec-info" className="mb-4 text-section">
              اطلاعات اصلی
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <TextInput id="np-name" label="نام پروژه" required value={form.name} onChange={(e) => set('name', e.target.value)} error={errors.name} placeholder="مثلاً بازطراحی جریان پرداخت…" autoComplete="off" />
              </div>
              <TextInput id="np-client" label="نام مشتری" required value={form.client} onChange={(e) => set('client', e.target.value)} error={errors.client} autoComplete="off" />
              <Select id="np-pm" label="مدیر پروژه" required value={form.pm} onChange={(e) => set('pm', e.target.value)} error={errors.pm}>
                {PM_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
              <div className="sm:col-span-2">
                <TextArea id="np-desc" label="توضیح کوتاه" hint="اختیاری؛ برای تشخیص سریع پروژه در فهرست." rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} />
              </div>
            </div>
          </section>

          <section aria-labelledby="sec-brief" className="rounded-card bg-surface p-5 shadow-card">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 id="sec-brief" className="text-section">
                بریف مشتری
              </h2>
              <Button size="sm" icon="doc" onClick={useSample}>
                استفاده از بریف نمونهٔ آرما
              </Button>
            </div>
            <TextArea
              id="np-brief"
              label="متن بریف"
              required
              rows={11}
              value={form.briefText}
              onChange={(e) => set('briefText', e.target.value)}
              error={errors.brief}
              hint="متن اصلی بریف همیشه همان‌طور که وارد کردید نگه داشته می‌شود؛ خروجی AI از آن جداست."
              placeholder="بریف مشتری را اینجا جای‌گذاری کنید…"
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-control border border-line-strong bg-surface px-3 text-ui font-semibold hover:bg-sunken focus-within:outline-2 focus-within:outline-ai">
                <Icon name="clip" size={16} />
                انتخاب فایل (TXT یا PDF)
                <input type="file" accept=".txt,.pdf,text/plain,application/pdf" className="sr-only" onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = '' }} />
              </label>
              {form.fileName ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-sunken px-3 py-1 text-caption">
                  <bdi dir="ltr" translate="no" className="font-mono text-label">{form.fileName}</bdi>
                  <button type="button" aria-label="حذف فایل" onClick={() => { set('fileName', ''); setFileNote(null) }} className="text-muted hover:text-ink">
                    <Icon name="x" size={14} />
                  </button>
                </span>
              ) : (
                <span className="text-caption text-muted">حداکثر {fa(500)} کیلوبایت</span>
              )}
            </div>
            {fileNote ? (
              <p className="mt-2 flex gap-1.5 text-caption text-warn" role="status">
                <Icon name="info" size={16} className="mt-1 shrink-0" />
                {fileNote}
              </p>
            ) : null}
          </section>

          <section aria-labelledby="sec-demo" className="rounded-card border border-dashed border-warn-line bg-warn-soft/50 p-4">
            <h2 id="sec-demo" className="mb-1 text-ui font-bold text-warn">
              ابزار آزمون (فقط دمو)
            </h2>
            <label className="flex cursor-pointer items-start gap-2 text-ui">
              <input type="checkbox" className="mt-1.5 size-4 accent-[var(--color-ink)]" checked={form.simulateError} onChange={(e) => set('simulateError', e.target.checked)} />
              <span>
                شبیه‌سازی خطای AI در نخستین تحلیل
                <span className="block text-caption text-muted">برای دیدن مسیر «خطا ← تلاش دوباره / ادامهٔ دستی». پروژه و بریف در هر حال حفظ می‌شوند.</span>
              </span>
            </label>
          </section>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button variant="primary" type="submit" icon="spark" loading={submitting && mode === 'analyze'} disabled={submitting}>
              ذخیره و تحلیل بریف
            </Button>
            <Button
              variant="secondary"
              disabled={submitting}
              loading={submitting && mode === 'manual'}
              onClick={() => submit('manual')()}
            >
              ذخیره و ادامه بدون AI
            </Button>
            <ButtonLink to="/studio/projects" variant="ghost">
              انصراف
            </ButtonLink>
          </div>
          {customText ? (
            <p className="-mt-3 text-caption text-muted">
              تحلیل نمایشی فقط برای بریف نمونهٔ آرما وجود دارد. برای متن دلخواه شما، AI خروجی نمی‌سازد و فرم محدوده به‌صورت دستی باز می‌شود.
            </p>
          ) : null}
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start" aria-label="راهنما">
          <div className="rounded-card bg-lav p-5">
            <h2 className="mb-2 flex items-center gap-2 text-section text-lav-ink">
              <Icon name="spark" size={18} />
              قبل از ادامه
            </h2>
            <ul className="flex flex-col gap-2.5 text-ui leading-7">
              <li>تحلیل هوش مصنوعی یک پیشنهاد اولیه است. قبل از تأیید محدوده، می‌توانید همهٔ فیلدها را اصلاح کنید.</li>
              <li>هر مورد پیشنهادی با عبارتی از خود بریف (شاهد) همراه است؛ آنچه بریف نگفته، «نامشخص» علامت می‌خورد.</li>
              <li>اگر AI در دسترس نبود، بریف ذخیره می‌شود و می‌توانید محدوده را دستی تکمیل کنید.</li>
              <li>تأیید نهایی محدوده همیشه با شما، مدیر پروژه، است.</li>
            </ul>
          </div>
        </aside>
      </form>

      <Dialog
        open={blocker.state === 'blocked'}
        onClose={() => blocker.reset?.()}
        title="این فرم هنوز ثبت نشده است"
        description="اگر از این صفحه بروید، چه کنیم؟"
        tone="warn"
        footer={
          <>
            <Button variant="primary" onClick={() => blocker.reset?.()}>
              ماندن و ادامهٔ ویرایش
            </Button>
            <Button onClick={() => blocker.proceed?.()}>خروج و نگه‌داشتن پیش‌نویس</Button>
            <Button
              variant="danger"
              onClick={() => {
                clearDraft()
                submittedRef.current = true
                blocker.proceed?.()
              }}
            >
              دور انداختن پیش‌نویس
            </Button>
          </>
        }
      >
        <p className="text-ui leading-7">
          آنچه تا اینجا نوشته‌اید به‌صورت خودکار به‌عنوان پیش‌نویس در همین مرورگر نگه داشته می‌شود و با بازگشت به «پروژهٔ جدید» برمی‌گردد. اگر پیش‌نویس را دور بیندازید، قابل بازیابی نیست.
        </p>
      </Dialog>
    </div>
  )
}
