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
        <span className="ml-0.5 inline-block h-[18px] w-[2px] animate-cursor-blink rounded-sm bg-ink-500 align-text-bottom" />
      ) : null}
    </div>
  )
}
