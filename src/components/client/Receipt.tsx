import { Link } from 'react-router-dom'
import type { Receipt as R } from '../../domain/types'
import { jalaliDateTime } from '../../lib/format'
import { Banner } from '../ui/Banner'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-t border-line py-2.5 first:border-t-0 sm:flex-row sm:items-baseline sm:gap-4">
      <dt className="w-36 shrink-0 text-caption text-muted">{label}</dt>
      <dd className="min-w-0 text-ui leading-7">{children}</dd>
    </div>
  )
}

/** رسید پایدار تأیید؛ نه Toast گذرا */
export function Receipt({ receipt, summaryHref, fresh }: { receipt: R; summaryHref: string; fresh: boolean }) {
  return (
    <section aria-labelledby="rcp-title" className="fade-up">
      {fresh ? (
        <div className="mb-4 flex flex-col items-center text-center">
          <span className="mb-3 grid size-16 place-items-center rounded-full bg-ok-solid text-white ring-8 ring-mint">
            <Icon name="approval" size={34} duo />
          </span>
          <h1 id="rcp-title" className="text-title">
            تأیید شما ثبت شد
          </h1>
          <p className="mt-1 text-ui text-muted">این رسید را نگه دارید؛ هر زمان لازم شد از همین لینک هم قابل مشاهده است.</p>
        </div>
      ) : (
        <h1 id="rcp-title" className="mb-3 text-heading">
          رسید تأیید
        </h1>
      )}

      <div className="rounded-card border border-ok-line bg-surface shadow-card">
        <div className="flex items-center justify-between gap-3 rounded-t-card border-b border-ok-line bg-ok-soft px-4 py-3">
          <span className="text-caption font-semibold text-ok">رسید تأیید نسخه</span>
          <bdi dir="ltr" translate="no" className="font-mono text-ui font-bold">
            {receipt.number}
          </bdi>
        </div>
        <dl className="px-4 py-2">
          <Row label="تأییدکننده">
            {receipt.approverName} · نمایندهٔ {receipt.approverOrg}
          </Row>
          <Row label="تحویل‌دادنی">{receipt.artifactTitle}</Row>
          <Row label="نسخهٔ تأییدشده">
            <bdi dir="ltr" translate="no" className="font-mono font-bold">
              {receipt.versionLabel}
            </bdi>
            <span className="block break-all text-label font-normal text-muted">
              شناسه: <bdi dir="ltr" translate="no" className="font-mono">{receipt.versionId}</bdi>
            </span>
          </Row>
          <Row label="محدودهٔ توافق‌شده">
            <bdi dir="ltr" translate="no" className="font-mono">Baseline v{receipt.baselineVersion}</bdi>
          </Row>
          <Row label="زمان تأیید">
            {jalaliDateTime(receipt.approvedAt)} <span className="text-label font-normal text-muted">(به وقت تهران)</span>
          </Row>
          <Row label="اثرانگشت نسخه">
            <bdi dir="ltr" translate="no" className="break-all font-mono text-label">
              {receipt.checksum}
            </bdi>
          </Row>
          <Row label="متن تأیید">{receipt.statement}</Row>
        </dl>
      </div>

      <div className="mt-4">
        <Banner tone="neutral" live="off" icon="info" title="این تأیید محصولی است، نه امضای حقوقی">
          رسید، تأیید شما را برای همین نسخه در سنجاق ثبت می‌کند و جایگزین قرارداد یا امضای حقوقی معتبر نیست. تغییر بعدی در طرح، با درخواست جدید و جدا از این تأیید ثبت می‌شود.
        </Banner>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link to={summaryHref} className="inline-flex min-h-11 items-center justify-center rounded-control bg-ink px-4 text-ui font-semibold text-on-ink hover:opacity-90">
          بازگشت به خلاصهٔ پروژه
        </Link>
        <Button icon="doc" onClick={() => window.print()}>
          چاپ یا ذخیرهٔ رسید
        </Button>
      </div>
    </section>
  )
}
