import { Link } from 'react-router-dom'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'

export function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card padding="lg" className="max-w-md text-center">
        <p className="gradient-text font-display text-7xl">404</p>
        <h1 className="mt-4 font-display text-2xl tracking-tight">页面不存在</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          当前地址没有内容，请返回首页继续创作流程。
        </p>
        <div className="mt-6">
          <Link to="/">
            <Button size="lg">返回首页</Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}
