import { useEffect, useRef, type ReactNode } from 'react'
import { Icon } from './Icon'

/** Dialog بومی مرورگر: تله‌ی فوکوس، Esc و بازگرداندن فوکوس را خودش انجام می‌دهد. */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  tone = 'neutral',
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer: ReactNode
  tone?: 'neutral' | 'warn'
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby="dlg-title"
      aria-describedby={description ? 'dlg-desc' : undefined}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
      className="m-auto w-[min(34rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] overflow-hidden rounded-card bg-surface p-0 text-ink shadow-pop open:flex open:flex-col"
    >
      {open ? (
        <>
          <div className={`flex items-start justify-between gap-3 border-b border-line px-5 py-4 ${tone === 'warn' ? 'bg-warn-soft' : ''}`}>
            <div>
              <h2 id="dlg-title" className="text-section leading-7">
                {title}
              </h2>
              {description ? (
                <p id="dlg-desc" className="mt-0.5 text-caption text-muted">
                  {description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="بستن"
              className="grid size-9 shrink-0 place-items-center rounded-control text-muted hover:bg-sunken"
            >
              <Icon name="x" />
            </button>
          </div>
          <div className="overflow-y-auto px-5 py-4" tabIndex={0} role="region" aria-labelledby="dlg-title">
            {children}
          </div>
          <div className="flex flex-col-reverse gap-2 border-t border-line bg-canvas px-5 py-3 sm:flex-row sm:flex-wrap sm:justify-start">{footer}</div>
        </>
      ) : null}
    </dialog>
  )
}
