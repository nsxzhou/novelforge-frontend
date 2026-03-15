import { cn } from '@/shared/lib/cn'

export function StreamingText({
  content,
  isStreaming,
  className,
}: {
  content: string
  isStreaming: boolean
  className?: string
}) {
  return (
    <div className={cn('whitespace-pre-wrap text-sm leading-7 text-foreground', className)}>
      {content}
      {isStreaming ? (
        <span className="ml-0.5 inline-block h-5 w-[3px] animate-pulse rounded-sm bg-accent align-middle" />
      ) : null}
    </div>
  )
}
