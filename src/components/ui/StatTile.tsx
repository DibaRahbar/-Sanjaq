import { Badge, type Tone } from './Badge'
import { Icon, type IconName } from './Icon'

/** کاشی آمار: آیکون پاستلی + عدد درشت + نشان اختیاری. فقط با داده‌های واقعی پر می‌شود. */
export function StatTile({
  icon,
  tint,
  label,
  value,
  note,
}: {
  icon: IconName
  tint: string
  label: string
  value: string
  note?: { text: string; tone: Tone }
}) {
  return (
    <div className="flex flex-col gap-2 rounded-card bg-surface p-4">
      <div className="flex items-center gap-2.5">
        <span className={`grid size-10 place-items-center rounded-full ${tint}`}>
          <Icon name={icon} size={20} duo />
        </span>
        <span className="text-caption text-ink-soft">{label}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-numeric">{value}</span>
        {note ? <Badge tone={note.tone}>{note.text}</Badge> : null}
      </div>
    </div>
  )
}
