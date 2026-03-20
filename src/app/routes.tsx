import React, { Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { AppShell } from '@/shared/ui/layout'
import { HomePage } from '@/pages/home-page'
import { NotFoundPage } from '@/pages/not-found-page'
import { LoadingState } from '@/shared/ui/feedback'

const InspirationPage = React.lazy(() =>
  import('@/features/inspiration/inspiration-page').then((m) => ({ default: m.InspirationPage })),
)
const ProjectWorkbenchPage = React.lazy(() =>
  import('@/pages/project-workbench-page').then((m) => ({ default: m.ProjectWorkbenchPage })),
)
const SettingsPage = React.lazy(() =>
  import('@/pages/settings-page').then((m) => ({ default: m.SettingsPage })),
)
const WritePage = React.lazy(() =>
  import('@/pages/write-page').then((m) => ({ default: m.WritePage })),
)

function LazyFallback() {
  return (
    <div className="flex h-64 items-center justify-center">
      <LoadingState text="加载中..." />
    </div>
  )
}

export function AppRoutes() {
  return (
    <Suspense fallback={<LazyFallback />}>
      <Routes>
        {/* Fullscreen route - outside AppShell */}
        <Route path="/write/:chapterId" element={<WritePage />} />

        {/* Standard routes inside AppShell */}
        <Route
          path="*"
          element={
            <AppShell>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/new-project" element={<InspirationPage />} />
                <Route path="/projects/:projectId" element={<ProjectWorkbenchPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </AppShell>
          }
        />
      </Routes>
    </Suspense>
  )
}
