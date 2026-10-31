import { Skeleton } from './Misc'

/** اسکلت بارگذاری هم‌شکل با صفحات پروژه: سرتیتر، تب‌ها و دو بلوک محتوا */
export function PageSkeleton({ label = 'در حال بارگذاری' }: { label?: string }) {
  return (
    <div aria-busy="true" aria-label={label} role="status">
      <Skeleton className="mb-3 h-4 w-40" />
      <Skeleton className="mb-2 h-8 w-2/3" />
      <Skeleton className="mb-6 h-4 w-1/3" />
      <Skeleton className="mb-6 h-10 w-full" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
      </div>
      <span className="sr-only">{label}…</span>
    </div>
  )
}
