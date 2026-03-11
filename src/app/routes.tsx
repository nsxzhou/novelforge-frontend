import { Navigate, Route, Routes } from 'react-router-dom'
import { ProjectsPage } from '@/pages/projects-page'
import { ProjectWorkbenchPage } from '@/pages/project-workbench-page'
import { NotFoundPage } from '@/pages/not-found-page'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/projects" replace />} />
      <Route path="/projects" element={<ProjectsPage />} />
      <Route path="/projects/:projectId" element={<ProjectWorkbenchPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
