import { Component, type ReactNode } from 'react'
import { useRouteError } from 'react-router-dom'
import { Button } from './ui/Button'
import { Icon } from './ui/Icon'

/** خطای غیرمنتظرهٔ رندر؛ مسیر بازیابی: تلاش دوباره یا بازنشانی داده‌های نمونه (ممکن است دادهٔ ذخیره‌شده خراب باشد) */
export function ErrorFallback() {
  return (
    <div className="mx-auto mt-16 flex max-w-md flex-col items-center px-4 text-center" role="alert">
      <span className="mb-4 grid size-12 place-items-center rounded-full bg-err-soft text-err">
        <Icon name="alert" size={20} />
      </span>
      <h1 className="text-heading">مشکلی پیش آمد</h1>
      <p className="mt-2 text-ui leading-7 text-muted">این صفحه نمایش داده نشد. چیزی از دست نرفته است. می‌توانید دوباره تلاش کنید؛ اگر ادامه داشت، داده‌های نمونهٔ مرورگر را بازنشانی کنید (فقط داده‌های دمو پاک می‌شود).</p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Button variant="primary" icon="retry" onClick={() => window.location.reload()}>
          تلاش دوباره
        </Button>
        <Button
          onClick={() => {
            try {
              localStorage.removeItem('sanjaq.demo.v1')
              localStorage.removeItem('atelier.demo.v1')
              localStorage.removeItem('sanjaq.draft.newProject')
              localStorage.removeItem('atelier.draft.newProject')
            } catch {
              /* نادیده */
            }
            window.location.assign(`${import.meta.env.BASE_URL}studio/projects`)
          }}
        >
          بازنشانی داده‌های نمونه
        </Button>
      </div>
    </div>
  )
}

/** خطای رندر داخل مسیر (React Router) */
export function RouteError() {
  const error = useRouteError()
  if (import.meta.env.DEV) console.error(error)
  return <ErrorFallback />
}

/** آخرین خط دفاع: خطا در Provider یا بیرون از مسیرها نباید صفحهٔ سفید بسازد */
export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    if (import.meta.env.DEV) console.error(error)
  }
  render() {
    return this.state.failed ? <ErrorFallback /> : this.props.children
  }
}
