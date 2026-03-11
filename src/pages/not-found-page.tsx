import { Link } from 'react-router-dom'
import { AppShell } from '@/shared/ui/layout'
import { Button } from '@/shared/ui/button'

export function NotFoundPage() {
  return (
    <AppShell>
      <div className="rounded-lg bg-muted p-8 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight">页面不存在</h1>
        <p className="mt-2 text-sm text-gray-600">请返回项目列表继续操作。</p>
        <div className="mt-4">
          <Link to="/projects">
            <Button>返回项目列表</Button>
          </Link>
        </div>
      </div>
    </AppShell>
  )
}
