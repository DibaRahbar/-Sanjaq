/**
 * تصویرسازی‌های سایت همه از پوشهٔ Genillu.com انتخاب شده‌اند (فایل‌ها در `src/assets/illustrations`).
 * خط سیاه با پس‌زمینهٔ شفاف است و در تم تیره وارونه می‌شود (`.illus` در index.css).
 */
/** همهٔ فایل‌های تصویر؛ در ساخت ایستا (`--mode static`) به‌صورت data URI داخل بسته می‌نشینند */
const FILES = import.meta.glob('../../assets/illustrations/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const asset = (file: string): string => FILES[`../../assets/illustrations/${file}`] ?? ''

export type SceneName = 'pin' | 'scope' | 'search' | 'lock' | 'team' | 'doc' | 'present' | 'chat' | 'chart' | 'deal' | 'gears' | 'laptop' | 'login'

export function Illus({ name, className = '' }: { name: SceneName; className?: string }) {
  return <img src={asset(`s-${name}.png`)} alt="" aria-hidden="true" width={520} height={520} loading="lazy" decoding="async" draggable={false} className={`illus select-none ${className}`} />
}

/** نگاشت آیکون حالت خالی به تصویر */
export function sceneForIcon(icon: string): SceneName | undefined {
  return ({ pin: 'pin', doc: 'scope', search: 'search', lock: 'lock', folder: 'team' } as Record<string, SceneName>)[icon]
}

/** تن‌های پاستلی زمینهٔ پرتره */
export const PORTRAIT_TINTS = ['bg-lav', 'bg-lime', 'bg-pink', 'bg-sky', 'bg-org', 'bg-mint']

/** پرتره پیش‌فرض هر عضو تیم؛ شمارهٔ فایل در پوشهٔ Genillu.com */
const TEAM: Record<string, { id: number; tint: number }> = {
  'سارا نوری': { id: 92, tint: 0 },
  'نازنین رضایی': { id: 184, tint: 2 },
  'مانی کریمی': { id: 182, tint: 3 },
  'کیان احمدی': { id: 200, tint: 1 },
  'ملیکا صادقی': { id: 147, tint: 5 },
  'آرمان حسینی': { id: 112, tint: 4 },
  'یاسمن فرهادی': { id: 163, tint: 0 },
  'پویا عباسی': { id: 237, tint: 3 },
  'دانیال مرادی': { id: 125, tint: 5 },
}

/** همهٔ پرتره‌هایی که کاربر هنگام ورود می‌تواند برگزیند */
export const PORTRAIT_IDS = [
  92, 184, 182, 200, 147, 112, 163, 237, 125, 14, 30, 45, 155, 164, 168, 195, 243, 244, 252, 186, 11, 21, 24, 41, 42, 46, 71, 105, 149, 160, 167, 169, 250, 259, 126, 123,
]

/** برای نام‌های خارج از تیم (کاربر واردشده، نمایندهٔ مشتری) از روی هش یکی از این‌ها برداشته می‌شود */
const POOL = [14, 30, 45, 155, 164, 168, 195, 243, 244, 252, 186, 11]

const CHOICE_KEY = 'sanjaq.avatars'
let choices: Record<string, number> | null = null

function loadChoices(): Record<string, number> {
  if (choices) return choices
  choices = {}
  try {
    const raw = JSON.parse(localStorage.getItem(CHOICE_KEY) ?? '{}') as Record<string, unknown>
    for (const [k, v] of Object.entries(raw)) if (typeof v === 'number' && PORTRAIT_IDS.includes(v)) choices[k] = v
  } catch {
    /* حافظه در دسترس نیست یا خراب است؛ پرتره‌های پیش‌فرض */
  }
  return choices
}

const hashOf = (name: string): number => {
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h
}

/** پرتره پیش‌فرض یک نام (بدون انتخاب کاربر) */
export function defaultPortraitId(name: string): number {
  return TEAM[name]?.id ?? (POOL[hashOf(name) % POOL.length] as number)
}

export const portraitUrl = (id: number): string => asset(`p${id}.png`)

/** تن پاستلی ثابت هر نام */
export function portraitTint(name: string): string {
  return PORTRAIT_TINTS[(TEAM[name]?.tint ?? hashOf(name)) % PORTRAIT_TINTS.length] as string
}

/** انتخاب آواتار هنگام ورود؛ برای همان نام در همهٔ صفحه‌ها اعمال می‌شود و در مرورگر می‌ماند */
export function setPortraitChoice(name: string, id: number): void {
  if (!PORTRAIT_IDS.includes(id)) return
  loadChoices()[name] = id
  try {
    localStorage.setItem(CHOICE_KEY, JSON.stringify(choices))
  } catch {
    /* فقط برای همین نشست */
  }
}

export function portraitFor(name: string): { src: string; tint: string } {
  return { src: portraitUrl(loadChoices()[name] ?? defaultPortraitId(name)), tint: portraitTint(name) }
}
