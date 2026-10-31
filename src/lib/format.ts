const faDigits = new Intl.NumberFormat('fa-IR', { useGrouping: false })
const faGrouped = new Intl.NumberFormat('fa-IR')

const dateFmt = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  timeZone: 'Asia/Tehran',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})
const timeFmt = new Intl.DateTimeFormat('fa-IR', {
  timeZone: 'Asia/Tehran',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

/** عدد با ارقام فارسی، بدون جداکنندهٔ هزارگان (برای شمارش و نسخه) */
export const fa = (n: number) => faDigits.format(n)

/** عدد با ارقام فارسی و جداکنندهٔ هزارگان (برای مبلغ) */
export const faMoney = (n: number) => faGrouped.format(n)

/** تاریخ شمسی، منطقهٔ زمانی تهران: «۷ آبان ۱۴۰۵» */
export const jalaliDate = (iso: string) => dateFmt.format(new Date(iso))

export const jalaliTime = (iso: string) => timeFmt.format(new Date(iso))

export const jalaliDateTime = (iso: string) => `${jalaliDate(iso)}، ${jalaliTime(iso)}`

/** زمان نسبی کوتاه؛ برای بیش از یک هفته تاریخ شمسی نمایش داده می‌شود */
export function relativeTime(iso: string, now: number = Date.now()): string {
  const diff = Math.max(0, now - new Date(iso).getTime())
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'همین الان'
  if (min < 60) return `${fa(min)} دقیقه پیش`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${fa(hr)} ساعت پیش`
  const day = Math.floor(hr / 24)
  if (day === 1) return 'دیروز'
  if (day < 8) return `${fa(day)} روز پیش`
  return jalaliDate(iso)
}

/** نویسه‌های یکپارچه برای جست‌وجو: ی/ک عربی، ارقام فارسی/عربی، نیم‌فاصله */
export function normalizeFa(s: string): string {
  return s
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/‌/g, ' ')
    .toLowerCase()
    .trim()
}

let counter = 0
/** شناسهٔ پایدار و یکتا برای موجودیت‌های جدید */
export function newId(prefix: string): string {
  counter += 1
  const rand = Math.random().toString(36).slice(2, 7)
  return `${prefix}_${Date.now().toString(36)}${rand}${counter}`
}

/** جداسازی جهت متن لاتین (مثل Baseline v1) داخل جملهٔ فارسی */
export const ltr = (s: string) => `\u2066${s}\u2069`

/** هر شناسهٔ نسخه مانند «v2» یا «Baseline v1» را از جهت جملهٔ فارسی مستقل می‌کند */
export const isolateVersions = (s: string) => s.replace(/(?:Baseline |Revision )?v\d+/g, (m) => ltr(m))

/** توکن غیرقابل‌حدس برای لینک مشتری (نمایشی؛ در محصول واقعی سمت سرور ساخته و Hash می‌شود) */
export function accessToken(): string {
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('')
}

const longFmt = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { timeZone: 'Asia/Tehran', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
/** «پنجشنبه ۷ آبان ۱۴۰۵» */
export const jalaliLong = (iso: string) => longFmt.format(new Date(iso))

/** عبارت خوش‌آمد بر اساس ساعت تهران */
export function greetingFor(iso: string): string {
  const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Tehran', hour: '2-digit', hour12: false }).format(new Date(iso)))
  return h < 12 ? 'صبح بخیر' : h < 18 ? 'روز بخیر' : 'عصر بخیر'
}
