import { AlertTriangle, LoaderCircle } from 'lucide-react'
import { cn } from '@/shared/lib/cn'

export function LoadingState({ text = '加载中...', className }: { text?: string; className?: string }) {
  return (
    <div className={cn('inline-flex items-center gap-2.5 rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-muted-foreground shadow-xs', className)}>
      <LoaderCircle className="h-4 w-4 animate-spin text-ink-500" />
      {text}
    </div>
  )
}

export function ErrorState({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn('inline-flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700', className)}>
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      {text}
    </div>
  )
}
