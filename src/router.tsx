import type { ComponentType, ReactNode } from 'react'
import { Navigate, createBrowserRouter, createMemoryRouter, useLocation, useParams, type RouteObject } from 'react-router-dom'
import { useSignedIn } from './lib/session'
import { RouteError } from './components/RouteError'
import { ClientShell } from './components/client/ClientShell'
import { InvalidAccess } from './components/client/InvalidAccess'
import { AppShell } from './components/layout/AppShell'
import Login from './pages/Login'
import { NotFound } from './pages/Misc'
import ProjectOverview from './pages/ProjectOverview'
import { useStore } from './state/store'
import ProjectList from './pages/ProjectList'

/** صفحه‌های سنگین فقط هنگام ورود بار می‌شوند (تقسیم بسته)؛ در ساخت ایستا inline می‌شوند */
const page = (load: () => Promise<{ default: ComponentType }>) => async () => ({ Component: (await load()).default })

function ReviewRedirect() {
  const { projectId } = useParams()
  const { getProject } = useStore()
  const latest = getProject(projectId)?.versions.at(-1)
  return <Navigate to={`/studio/projects/${projectId}/review/${latest?.id ?? 'none'}`} replace />
}

/** بدون ورود نمایشی، همهٔ صفحه‌های استودیو به صفحهٔ ورود می‌روند (مسیر اصلی را برای بازگشت نگه می‌داریم) */
function RequireSession({ children }: { children: ReactNode }) {
  const signedIn = useSignedIn()
  const { pathname, search } = useLocation()
  if (!signedIn) return <Navigate to="/login" state={{ from: pathname + search }} replace />
  return children
}

const routes: RouteObject[] = [
  {
    element: <ClientShell />,
    errorElement: <RouteError />,
    children: [
      { path: '/client/p/:accessId', lazy: page(() => import('./pages/client/ClientSummary')) },
      { path: '/client/p/:accessId/review/:versionId', lazy: page(() => import('./pages/client/ClientReview')) },
      { path: '/client/*', element: <InvalidAccess reason="unknown" /> },
    ],
  },
  { path: '/login', element: <Login />, errorElement: <RouteError /> },
  {
    element: (
      <RequireSession>
        <AppShell />
      </RequireSession>
    ),
    errorElement: <RouteError />,
    children: [
      { path: '/', element: <Navigate to="/studio/projects" replace /> },
      { path: '/studio/projects', element: <ProjectList /> },
      { path: '/studio/projects/new', lazy: page(() => import('./pages/NewProject')) },
      { path: '/studio/projects/:projectId/brief', lazy: page(() => import('./pages/BriefScope')) },
      { path: '/studio/projects/:projectId', element: <ProjectOverview /> },
      { path: '/studio/projects/:projectId/review', element: <ReviewRedirect /> },
      { path: '/studio/projects/:projectId/review/:versionId', lazy: page(() => import('./pages/DesignReview')) },
      { path: '/studio/projects/:projectId/decisions', lazy: page(() => import('./pages/DecisionLedger')) },
      { path: '/studio/projects/:projectId/changes', lazy: page(() => import('./pages/ChangeRequests')) },
      ...(import.meta.env.DEV ? [{ path: '/dev/design-system', lazy: page(() => import('./pages/DesignSystem')) }] : []),
      { path: '*', element: <NotFound /> },
    ],
  },
]

/** ساخت ایستای Artifact نشانی مرورگر را ندارد؛ مسیریاب در حافظه از صفحهٔ ورود شروع می‌کند */
export const router = import.meta.env.MODE === 'static' ? createMemoryRouter(routes, { initialEntries: ['/login'] }) : createBrowserRouter(routes, { basename: import.meta.env.BASE_URL })

