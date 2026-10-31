import { useEffect, useState } from 'react'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { TextArea, TextInput } from '../ui/FormField'

/** ثبت درخواست تغییر؛ هم برای استودیو (از طرف مشتری) و هم برای خود مشتری */
export function NewChangeDialog({
  open,
  onClose,
  onSubmit,
  audience,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (v: { title: string; description: string }) => void
  audience: 'studio' | 'client'
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [err, setErr] = useState<{ title?: string; description?: string }>({})
  useEffect(() => {
    if (open) {
      setTitle('')
      setDescription('')
      setErr({})
    }
  }, [open])

  const submit = () => {
    const e: typeof err = {}
    if (!title.trim()) e.title = 'عنوان درخواست را بنویسید.'
    if (!description.trim()) e.description = 'توضیح دهید دقیقاً چه چیزی می‌خواهید.'
    setErr(e)
    if (Object.keys(e).length === 0) onSubmit({ title, description })
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="درخواست جدید"
      description={audience === 'client' ? 'تأیید قبلی شما تغییر نمی‌کند؛ این درخواست جدا بررسی می‌شود.' : 'ثبت از طرف مشتری (مثلاً بعد از تماس یا پیام). تأیید قبلی تغییر نمی‌کند.'}
      footer={
        <>
          <Button variant="primary" onClick={submit}>
            ثبت درخواست
          </Button>
          <Button onClick={onClose}>انصراف</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <TextInput label="عنوان" required value={title} onChange={(e) => { setTitle(e.target.value); setErr((x) => ({ ...x, title: undefined })) }} error={err.title} placeholder="مثلاً افزودن پرداخت اشتراکی…" />
        <TextArea label="چه چیزی می‌خواهید؟" required rows={4} value={description} onChange={(e) => { setDescription(e.target.value); setErr((x) => ({ ...x, description: undefined })) }} error={err.description} hint={audience === 'client' ? 'هزینه و زمان را استودیو بعد از بررسی به شما پیشنهاد می‌دهد.' : undefined} />
      </div>
    </Dialog>
  )
}
