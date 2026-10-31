import { useDocumentTitle } from '../lib/usePage'
import { ButtonLink } from '../components/ui/Button'
import { EmptyState } from '../components/ui/Misc'

export function NotFound() {
  useDocumentTitle('صفحه پیدا نشد')
  return (
    <div className="mx-auto max-w-xl pt-8">
      <EmptyState level={1} icon="search" title="این صفحه پیدا نشد" actions={<ButtonLink to="/studio/projects" variant="primary">بازگشت به پروژه‌ها</ButtonLink>}>
        نشانی واردشده وجود ندارد.
      </EmptyState>
    </div>
  )
}
