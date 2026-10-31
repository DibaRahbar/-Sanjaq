import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import './index.css'
import { AppErrorBoundary } from './components/RouteError'
import { router } from './router'
import { StoreProvider } from './state/store'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <StoreProvider>
        <RouterProvider router={router} />
      </StoreProvider>
    </AppErrorBoundary>
  </StrictMode>,
)
