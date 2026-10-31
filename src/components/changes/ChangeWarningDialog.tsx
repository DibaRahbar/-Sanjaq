import { latestReceipt } from '../../domain/changes'
import type { Project } from '../../domain/types'
import { jalaliDate, ltr } from '../../lib/format'
import { Banner } from '../ui/Banner'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'

/** S6: تلاش برای تغییر تعهد تأییدشده ← ساخت درخواست تغییر، نه دستکاری تأیید */
export function ChangeWarningDialog({
  open,
  onClose,
  onCreate,
  project,
  attempt,
}: {
  open: boolean
  onClose: () => void
  onCreate: () => void
  project: Project
  attempt: string
}) {
  const receipt = latestReceipt(project)
  return (
    <Dialog
      open={open}
      onClose={onClose}
      tone="warn"
      title="این بخش تأیید مشتری دارد"
      description={attempt}
      footer={
        <>
          <Button variant="primary" icon="plus" onClick={onCreate}>
            ایجاد درخواست تغییر
          </Button>
          <Button onClick={onClose}>بستن، بدون تغییر</Button>
        </>
      }
    >
      <p className="text-ui leading-7">
        {receipt ? (
          <>
            نسخهٔ <bdi dir="ltr" translate="no">{receipt.versionLabel}</bdi> در {jalaliDate(receipt.approvedAt)} توسط {receipt.approverName} تأیید شده و رسید{' '}
            <bdi dir="ltr" translate="no" className="font-mono">{receipt.number}</bdi> دارد.
          </>
        ) : (
          'این تعهد تأیید شده است.'
        )}{' '}
        برای تغییر چیزی که مشتری تأیید کرده، نباید خود تأیید یا محتوای آن دست بخورد.
      </p>
      <div className="mt-3">
        <Banner tone="info" live="off" icon="info" title="مسیر درست: درخواست تغییر">
          درخواست تازه جدا ثبت می‌شود، به همین Baseline و رسید وصل است، اثر آن دستی ارزیابی می‌شود و فقط با پذیرش پیشنهاد مشخص، Baseline جدید ساخته می‌شود. تأیید فعلی {ltr(receipt?.number ?? '')} تا آخر دست‌نخورده می‌ماند.
        </Banner>
      </div>
    </Dialog>
  )
}
