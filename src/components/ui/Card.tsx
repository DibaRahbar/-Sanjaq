import type { HTMLAttributes } from 'react'

/** سطح پایهٔ محتوا: مرز ظریف و سایهٔ کم؛ `raised` برای عناصر شناور یا انتخاب‌شده */
export function Card({ raised = false, className = '', ...rest }: HTMLAttributes<HTMLDivElement> & { raised?: boolean }) {
  return <div className={`rounded-card bg-surface ${raised ? 'shadow-raised' : 'shadow-card'} ${className}`} {...rest} />
}
