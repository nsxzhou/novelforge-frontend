import { Route, Routes } from 'react-router-dom'
import { AppShell } from '@/shared/ui/layout'
import { HomePage } from '@/pages/home-page'
import { InspirationPage } from '@/features/inspiration/inspiration-page'
import { ProjectWorkbenchPage } from '@/pages/project-workbench-page'
import { SettingsPage } from '@/pages/settings-page'
import { NotFoundPage } from '@/pages/not-found-page'

export function AppRoutes() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/new-project" element={<InspirationPage />} />
        <Route path="/projects/:projectId" element={<ProjectWorkbenchPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppShell>
  )
}
