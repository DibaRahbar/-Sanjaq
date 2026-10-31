import { Link, useParams } from 'react-router-dom'
import { useClientAccess } from '../../state/useClientAccess'
import { ClientChanges } from '../../components/client/ClientChanges'
import { InvalidAccess } from '../../components/client/InvalidAccess'
import { Badge } from '../../components/ui/Badge'
import { Banner } from '../../components/ui/Banner'
import { Icon } from '../../components/ui/Icon'
import { Illus } from '../../components/ui/Illus'
import { jalaliDate, jalaliDateTime } from '../../lib/format'
import { PageSkeleton } from '../../components/ui/PageSkeleton'
import { useDocumentTitle, useSimulatedLoad } from '../../lib/usePage'

export default function ClientSummary() {
  const { accessId } = useParams()
  const { view } = useClientAccess(accessId)
  const loading = useSimulatedLoad(`cs:${accessId}`)
  useDocumentTitle(view ? `${view.projectName} · نمای مشتری` : 'لینک معتبر نیست')

  if (!view) return <InvalidAccess reason="unknown" />
  if (view.state === 'expired' || view.state === 'revoked') return <InvalidAccess reason={view.state} />
  if (loading) return <PageSkeleton label="در حال بارگذاری پروژه" />

  const base = `/client/p/${accessId}`
  const v = view.version
  const pending = view.state === 'active'
  const approved = view.state === 'approved'
  const changes = view.state === 'changes_requested'
  const myNote = view.feedback.find((f) => f.byClient)

  return (
    <div className="fade-up">
      <p className="text-caption text-muted">
        سلام {view.approverName} · از طرف {view.studioName}
      </p>
      <h1 className="mt-1 text-title leading-9">{view.projectName}</h1>
      <p className="text-ui text-muted">مشتری: {view.clientName}</p>

      {/* وضعیت اصلی و CTA واحد */}
      <section aria-labelledby="st-title" className={`relative mt-5 rounded-card p-5 [&_.text-muted]:text-ink-soft ${approved ? 'bg-mint' : pending ? 'bg-lav' : 'bg-org'}`}>
        <Illus name={approved ? 'deal' : pending ? 'present' : 'doc'} className="absolute end-4 top-4 hidden size-24 sm:block" />
        <div className="mb-2 flex flex-wrap items-center gap-2 sm:me-28">
          {pending ? <Badge tone="ai" icon="eye">منتظر نظر شما</Badge> : null}
          {approved ? <Badge tone="ok" icon="check">تأیید شد</Badge> : null}
          {changes ? <Badge tone="warn">درخواست اصلاح ارسال شد</Badge> : null}
        </div>
        <h2 id="st-title" className="text-heading leading-8 sm:me-28">
          {pending ? `${v.title} · نسخهٔ ` : approved ? `نسخهٔ ` : `${v.title} · نسخهٔ `}
          <bdi dir="ltr" translate="no">{v.label}</bdi>
          {approved ? ' را تأیید کرده‌اید' : pending ? ' آمادهٔ بررسی شماست' : ''}
        </h2>

        {pending ? (
          <>
            <dl className="mt-3 flex flex-col gap-2.5 text-ui">
              <div>
                <dt className="text-label font-bold text-muted">چه چیزی تغییر کرده؟</dt>
                <dd className="leading-7">{v.note || 'این اولین نسخه‌ای است که برای بررسی شما فرستاده شده است.'}</dd>
              </div>
              <div>
                <dt className="text-label font-bold text-muted">مهلت بازبینی</dt>
                <dd>{new Date(view.expiresAt).getTime() - Date.now() < 120 * 86400000 ? jalaliDate(view.expiresAt) : 'بدون مهلت مشخص'}</dd>
              </div>
            </dl>
            <Link
              to={`${base}/review/${v.id}`}
              className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-ink px-4 text-body font-bold text-on-ink hover:opacity-90 sm:w-auto sm:min-w-52"
            >
              بازبینی نسخه
              <Icon name="next" size={16} />
            </Link>
          </>
        ) : null}

        {approved && view.receipt ? (
          <>
            <p className="mt-2 text-ui leading-7 text-ink/85">
              تأیید شما در {jalaliDateTime(view.receipt.approvedAt)} ثبت شد. رسید با شمارهٔ <bdi dir="ltr" translate="no" className="font-mono font-bold">{view.receipt.number}</bdi> نگه‌داری می‌شود.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to={`${base}/review/${v.id}`} className="inline-flex min-h-11 items-center rounded-control bg-ink px-4 text-ui font-semibold text-on-ink hover:opacity-90">
                مشاهدهٔ رسید
              </Link>
            </div>
          </>
        ) : null}

        {changes ? (
          <>
            <p className="mt-2 text-ui leading-7 text-ink/85">درخواست شما برای استودیو ارسال شد. وقتی نسخهٔ اصلاح‌شده آماده شد، لینک تازه‌ای دریافت می‌کنید. این نسخه تأیید نشده است.</p>
            {myNote ? <p className="mt-3 rounded-control bg-canvas p-3 text-ui leading-7 ring-1 ring-line">«{myNote.text}»</p> : null}
          </>
        ) : null}
      </section>

      {approved ? <ClientChanges view={view} accessId={accessId!} /> : null}

      <section aria-labelledby="what" className="mt-5 rounded-card bg-surface p-5 shadow-card">
        <h2 id="what" className="mb-2 text-section">
          تأیید شما دقیقاً شامل چیست؟
        </h2>
        <ul className="flex flex-col gap-2 text-ui leading-7">
          <li className="flex gap-2">
            <Icon name="check" size={16} className="mt-1.5 shrink-0 text-ok" />
            <span>
              فقط همین نسخه از «{v.title}»
              <span className="block break-all text-label font-normal text-muted">
                شناسه: <bdi dir="ltr" translate="no" className="font-mono">{v.id}</bdi>
              </span>
            </span>
          </li>
          <li className="flex gap-2">
            <Icon name="check" size={16} className="mt-1.5 shrink-0 text-ok" />
            اگر موافق نیستید، «درخواست اصلاح» می‌زنید و چیزی تأیید نمی‌شود.
          </li>
          <li className="flex gap-2">
            <Icon name="info" size={16} className="mt-1.5 shrink-0 text-muted" />
            این تأیید در سنجاق ثبت می‌شود و جایگزین قرارداد یا امضای حقوقی نیست.
          </li>
        </ul>
      </section>

      {view.receipts.length > 0 ? (
        <section aria-labelledby="hist" className="mt-5 rounded-card bg-surface p-5 shadow-card">
          <h2 id="hist" className="mb-2 text-section">
            تاریخچهٔ تأییدها
          </h2>
          <ul className="flex flex-col gap-2">
            {view.receipts.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-control bg-canvas p-2.5 text-ui ring-1 ring-line">
                <span>
                  {r.artifactTitle} · <bdi dir="ltr" translate="no" className="font-mono">{r.versionLabel}</bdi>
                </span>
                <span className="text-label font-normal text-muted">
                  <bdi dir="ltr" translate="no" className="font-mono">{r.number}</bdi> · {jalaliDate(r.approvedAt)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!pending && !approved && !changes ? <Banner tone="neutral">نسخه‌ای برای بررسی نیست.</Banner> : null}
    </div>
  )
}
