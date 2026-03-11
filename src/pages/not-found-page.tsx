import { Link } from 'react-router-dom'
import { AppShell } from '@/shared/ui/layout'
import { Button } from '@/shared/ui/button'

export function NotFoundPage() {
  return (
    <AppShell>
      <div className="relative overflow-hidden rounded-lg bg-white p-8 text-center md:p-10">
        <div className="flat-deco-dot -left-6 -top-6 h-20 w-20 bg-blue-100/60" />
        <div className="flat-deco-square bottom-4 right-8 h-10 w-10 bg-amber-100/70" />
        <div className="relative space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">404</p>
          <h1 className="text-3xl font-extrabold tracking-tight">页面不存在</h1>
          <p className="text-sm text-gray-600">当前地址没有内容，请返回项目列表继续创作流程。</p>
          <div>
            <Link to="/projects">
              <Button size="lg">返回项目列表</Button>
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
