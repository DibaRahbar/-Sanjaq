import { useState } from 'react'
import { fa, faMoney, jalaliDate, ltr } from '../lib/format'
import { Avatar, EmptyState, Skeleton } from '../components/ui/Misc'
import { Badge, type Tone } from '../components/ui/Badge'
import { Banner } from '../components/ui/Banner'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { DecisionChain } from '../components/ui/DecisionChain'
import { Dialog } from '../components/ui/Dialog'
import { NumField, Select, TextArea, TextInput } from '../components/ui/FormField'
import { Segmented } from '../components/ui/Segmented'
import { useDocumentTitle } from '../lib/usePage'

/** فقط در توسعه (`npm run dev`) در `/dev/design-system` در دسترس است؛ صفحهٔ محصول نیست. */

const lum = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!
}
const ratio = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
  return (x! + 0.05) / (y! + 0.05)
}

const SWATCHES: { name: string; token: string; hex: string; use: string; on?: string }[] = [
  { name: 'Canvas', token: 'canvas', hex: '#ebeae6', use: 'زمینهٔ صفحه (کِرِمی-خاکستری)' },
  { name: 'Surface', token: 'surface', hex: '#f8f7f4', use: 'کاشی و کارت' },
  { name: 'Sunken', token: 'sunken', hex: '#e2e1db', use: 'فرو‌رفته: نشان خنثی، اسکلت' },
  { name: 'Line', token: 'line', hex: '#dcdad2', use: 'تقسیم‌بندی آرام (تزئینی)' },
  { name: 'Field', token: 'field', hex: '#7d7b73', use: 'مرز کنترل‌های فرم', on: '#f8f7f4' },
  { name: 'Ink', token: 'ink', hex: '#101015', use: 'متن اصلی و اقدام اصلی', on: '#ebeae6' },
  { name: 'Ink soft', token: 'ink-soft', hex: '#3a3941', use: 'متن ثانویه روی کاشی رنگی', on: '#ffbd8f' },
  { name: 'Muted', token: 'muted', hex: '#5b5a62', use: 'متن ثانویه روی کِرِمی', on: '#ebeae6' },
  { name: 'Lime', token: 'lime', hex: '#dcec6c', use: 'نیازمند اقدام، تأکید', on: '#404a0b' },
  { name: 'Lavender', token: 'lav', hex: '#cdc6f6', use: 'AI، منتظر مشتری', on: '#382d85' },
  { name: 'Pink', token: 'pink', hex: '#f6c6e2', use: 'تغییرات، مشتری', on: '#6a2354' },
  { name: 'Sky', token: 'sky', hex: '#bfdaf2', use: 'نسخه و بازبینی', on: '#214966' },
  { name: 'Orange', token: 'org', hex: '#ffbd8f', use: 'هشدار، بازخورد', on: '#6b3205' },
  { name: 'Mint', token: 'mint', hex: '#c4ead3', use: 'تأییدشده', on: '#1b5a3c' },
  { name: 'Brand (فوکوس)', token: 'brand', hex: '#6858f5', use: 'حلقهٔ فوکوس فقط', on: '#ffffff' },
]

const TYPE: { cls: string; name: string; spec: string; use: string }[] = [
  { cls: 'text-display', name: 'Display', spec: '۳۶ / ۱٫۴ / ۸۰۰', use: 'عنوان تحریریهٔ صفحهٔ فهرست (محدود)' },
  { cls: 'text-title', name: 'Title', spec: '۲۶ / ۱٫۵ / ۸۰۰', use: 'عنوان صفحه' },
  { cls: 'text-heading', name: 'Heading', spec: '۲۰ / ۱٫۶ / ۷۰۰', use: 'عنوان بخش' },
  { cls: 'text-section', name: 'Section', spec: '۱۷ / ۱٫۷ / ۷۰۰', use: 'عنوان کارت و ردیف' },
  { cls: 'text-body', name: 'Body', spec: '۱۵ / ۱٫۸۵ / ۴۰۰', use: 'متن اصلی' },
  { cls: 'text-caption', name: 'Caption', spec: '۱۳ / ۱٫۷۵ / ۴۰۰', use: 'توضیح و Meta' },
  { cls: 'text-label', name: 'Label', spec: '۱۲ / ۱٫۶ / ۶۰۰', use: 'برچسب و Badge' },
]

const TONES: Tone[] = ['neutral', 'info', 'ai', 'ok', 'warn', 'err']
const CHAIN_DEMO = ['بریف', 'محدوده', 'نسخهٔ طرح', 'بازخورد و تصمیم', 'تأیید مشتری', 'تغییرات بعدی']

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="mb-12">
      <h2 id={id} className="mb-4 border-b border-line pb-2 text-heading">
        {title}
      </h2>
      {children}
    </section>
  )
}

export default function DesignSystem() {
  useDocumentTitle('Design System (توسعه)')
  const [seg, setSeg] = useState<'a' | 'b' | 'c'>('a')
  const [dlg, setDlg] = useState(false)
  const [num, setNum] = useState<number | null>(12000000)

  return (
    <div className="fade-up">
      <header className="mb-10">
        <Badge tone="warn" icon="tools">
          فقط توسعه · صفحهٔ محصول نیست
        </Badge>
        <h1 className="mt-2 text-display">سیستم طراحی سنجاق</h1>
        <p className="mt-1 max-w-2xl text-body text-muted">
          Calm Expressive Enterprise × Editorial Precision. اقدام اصلی مشکی (قرص گرد)، زمینهٔ کِرِمی، کاشی‌های پاستلی برای وضعیت و دسته‌بندی؛ بنفش فقط حلقهٔ فوکوس. هر وضعیت علاوه بر رنگ، متن هم دارد.
        </p>
      </header>

      <Section id="ds-color" title="رنگ و کنتراست">
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SWATCHES.map((s) => {
            const r = s.on ? ratio(s.hex, s.on) : null
            return (
              <li key={s.token} className="flex gap-3 rounded-card bg-surface p-3">
                <span className="size-14 shrink-0 rounded-control ring-1 ring-line" style={{ background: s.hex }} aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-caption font-bold">
                    {s.name} <bdi dir="ltr" translate="no" className="font-mono text-label font-normal text-muted">{s.hex}</bdi>
                  </p>
                  <p className="text-label font-normal text-muted">{s.use}</p>
                  {r ? (
                    <p className={`text-label ${r >= 4.5 ? 'text-ok' : r >= 3 ? 'text-warn' : 'text-err'}`}>
                      کنتراست {fa(Math.round(r * 100) / 100)}:۱ {r >= 4.5 ? '(AA متن)' : r >= 3 ? '(فقط اجزای رابط/متن درشت)' : '(ناکافی)'}
                    </p>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      </Section>

      <Section id="ds-type" title="تایپوگرافی (Vazirmatn)">
        <div className="flex flex-col divide-y divide-line rounded-card bg-surface">
          {TYPE.map((t) => (
            <div key={t.name} className="grid gap-1 px-4 py-3 sm:grid-cols-[160px_1fr]">
              <p className="text-caption text-muted">
                {t.name} <span className="text-label font-normal">· {t.spec}</span>
              </p>
              <div>
                <p className={t.cls}>بازطراحی تجربهٔ پرداخت فروشگاه آنلاین آرما</p>
                <p className="text-label font-normal text-muted">{t.use}</p>
              </div>
            </div>
          ))}
          <div className="grid gap-1 px-4 py-3 sm:grid-cols-[160px_1fr]">
            <p className="text-caption text-muted">Numeric</p>
            <p className="text-numeric">
              {faMoney(12000000)} <span className="text-caption font-normal text-muted">تومان</span> · {fa(6)} روز · {ltr('v2')} · {jalaliDate('2026-10-29T08:00:00Z')}
            </p>
          </div>
        </div>
        <p className="mt-2 text-caption text-muted">ارقام نمایشی فارسی‌اند؛ شناسه‌ها و نسخه با <code>bdi dir="ltr"</code> از جهت جمله مستقل می‌شوند.</p>
      </Section>

      <Section id="ds-shape" title="فاصله، شکل و ارتفاع">
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-4">
            <p className="mb-2 text-caption font-bold">مقیاس فاصله (۴ و ۸)</p>
            <div className="flex items-end gap-2">
              {[4, 8, 12, 16, 24, 32, 48].map((n) => (
                <div key={n} className="flex flex-col items-center gap-1">
                  <span className="block rounded-sm bg-brand" style={{ width: n, height: n }} />
                  <span className="text-label font-normal text-muted">{fa(n)}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-4">
            <p className="mb-2 text-caption font-bold">شعاع گوشه</p>
            <div className="flex gap-3">
              <span className="grid h-12 w-20 place-items-center rounded-control bg-sunken text-label ring-1 ring-line">کنترل ۱۰</span>
              <span className="grid h-12 w-20 place-items-center rounded-card bg-sunken text-label ring-1 ring-line">کارت ۱۴</span>
              <span className="grid h-12 w-20 place-items-center rounded-full bg-sunken text-label ring-1 ring-line">قرص</span>
            </div>
          </Card>
          <Card className="p-4">
            <p className="mb-2 text-caption font-bold">ارتفاع</p>
            <div className="flex gap-3">
              <span className="grid h-12 w-20 place-items-center rounded-card bg-surface text-label shadow-card">card</span>
              <span className="grid h-12 w-20 place-items-center rounded-card bg-surface text-label shadow-raised">raised</span>
              <span className="grid h-12 w-20 place-items-center rounded-card bg-surface text-label shadow-pop">pop</span>
            </div>
          </Card>
        </div>
      </Section>

      <Section id="ds-motion" title="حرکت">
        <ul className="grid gap-3 text-caption sm:grid-cols-3">
          <li className="rounded-card bg-surface p-3">
            <b>fast · ۱۲۰ms</b>
            <br />
            Hover، Press، رنگ کنترل
          </li>
          <li className="rounded-card bg-surface p-3">
            <b>base · ۲۰۰ms</b>
            <br />
            لغزش فلش ردیف، تغییر وضعیت
          </li>
          <li className="rounded-card bg-surface p-3">
            <b>slow · ۳۲۰ms</b>
            <br />
            ورود صفحه (fade-up ۶px). با <code>prefers-reduced-motion</code> همه خاموش می‌شود.
          </li>
        </ul>
      </Section>

      <Section id="ds-actions" title="دکمه‌ها">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" icon="plus">اقدام اصلی</Button>
          <Button variant="secondary">ثانویه</Button>
          <Button variant="ghost">سوم</Button>
          <Button variant="danger" icon="trash">حذف</Button>
          <Button variant="primary" disabled>غیرفعال</Button>
          <Button variant="primary" loading>در حال ارسال</Button>
          <Button size="sm">کوچک</Button>
          <Button size="sm" variant="primary">کوچک اصلی</Button>
        </div>
        <p className="mt-2 text-caption text-muted">در هر صفحه یک اقدام اصلی (برند)؛ بقیه ثانویه یا سوم. Focus: حلقهٔ ۲ پیکسلی برند.</p>
      </Section>

      <Section id="ds-status" title="وضعیت و برچسب">
        <div className="flex flex-wrap gap-2">
          {TONES.map((t) => (
            <Badge key={t} tone={t} dot>
              {t === 'ai' ? 'پیشنهاد AI' : t === 'ok' ? 'تأیید شد' : t === 'warn' ? 'نیازمند بررسی' : t === 'err' ? 'خطا' : t === 'info' ? 'در بازبینی' : 'پیش‌نویس'}
            </Badge>
          ))}
        </div>
      </Section>

      <Section id="ds-forms" title="فرم">
        <div className="grid gap-4 md:grid-cols-2">
          <TextInput label="نام پروژه" required hint="نام کوتاه و قابل‌تشخیص" placeholder="مثلاً بازطراحی پرداخت" />
          <TextInput label="با خطا" error="نام مشتری را بنویسید." defaultValue="" />
          <TextInput label="غیرفعال" disabled defaultValue="غیرفعال" />
          <Select label="مدیر پروژه" defaultValue="a">
            <option value="a">نازنین رضایی</option>
            <option value="b">مانی کریمی</option>
          </Select>
          <TextArea label="توضیح" rows={3} hint="اختیاری" />
          <NumField label="مبلغ پیشنهادی" value={num} onChange={setNum} grouped maxDigits={12} max={999999999999} suffix="تومان" />
        </div>
        <div className="mt-4">
          <Segmented label="نمونهٔ کنترل قطعه‌ای" value={seg} onChange={setSeg} options={[{ id: 'a', label: 'همه', count: 4 }, { id: 'b', label: 'نیازمند اقدام', count: 3 }, { id: 'c', label: 'منتظر مشتری', count: 1 }]} />
        </div>
      </Section>

      <Section id="ds-signature" title="امضا: زنجیرهٔ تصمیم">
        <Card className="grid gap-5 p-5 sm:grid-cols-3">
          {[1, 2, 4].map((cur) => (
            <div key={cur}>
              <DecisionChain
                labels
                steps={CHAIN_DEMO.map((label, i) => ({ id: String(i), label, state: i < cur ? 'done' : i === cur ? 'current' : 'todo' }))}
              />
            </div>
          ))}
        </Card>
        <p className="mt-2 text-caption text-muted">گره پر = انجام‌شده، گره با حلقهٔ تپنده = مرحلهٔ فعلی، گره توخالی = هنوز نرسیده. برای صفحه‌خوان، توضیح متنی دارد.</p>
      </Section>

      <Section id="ds-feedback" title="بازخورد و حالت‌ها">
        <div className="grid gap-3 md:grid-cols-2">
          <Banner tone="ai" title="پیشنهاد AI · قابل ویرایش">هنوز تأیید نشده است.</Banner>
          <Banner tone="warn" title="ابهام حیاتی باز است">تأیید ممکن نیست.</Banner>
          <Banner tone="ok" title="ثبت شد">رسید ساخته شد.</Banner>
          <Banner tone="err" title="خطا" live="off">دوباره تلاش کنید.</Banner>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Card className="p-4">
            <Skeleton className="mb-2 h-5 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </Card>
          <div className="flex items-center gap-3">
            <Avatar name="نازنین رضایی" size={36} />
            <Avatar name="کیان احمدی" size={36} />
            <Avatar name="مانی کریمی" size={36} />
            <Avatar name="سارا نوری" size={36} />
            <Button onClick={() => setDlg(true)}>باز کردن Dialog</Button>
          </div>
        </div>
        <div className="mt-4">
          <EmptyState icon="folder" title="حالت خالی">
            متن کوتاه که توضیح می‌دهد چه کاری بعد از این است.
          </EmptyState>
        </div>
      </Section>

      <Dialog open={dlg} onClose={() => setDlg(false)} title="نمونهٔ Dialog" description="Dialog بومی مرورگر: تله‌ی فوکوس، Esc و بازگشت فوکوس." footer={<Button variant="primary" onClick={() => setDlg(false)}>متوجه شدم</Button>}>
        <p className="text-body">اقدام اصلی همیشه در پایین و با رنگ برند است.</p>
      </Dialog>
    </div>
  )
}
