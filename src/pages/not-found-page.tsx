import { Link } from 'react-router-dom'
import { BookX, ArrowLeft } from 'lucide-react'
import { Button } from '@/shared/ui/button'

export function NotFoundPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="max-w-md text-center animate-fade-in-up">
        <div className="space-y-6 px-8 py-12">
          {/* Large 404 */}
          <p className="text-8xl font-light text-foreground">
            404
          </p>

          {/* Icon */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <BookX className="h-8 w-8" />
          </div>

          {/* Text */}
          <div className="space-y-2">
            <h1 className="text-2xl font-light tracking-tight text-foreground">
              页面不存在
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              你访问的页面可能已被移动或删除，<br />
              请返回首页继续你的创作之旅。
            </p>
          </div>

          {/* Button */}
          <div>
            <Link to="/">
              <Button size="lg" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                返回首页
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
