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
  const paragraphs = content === '' ? [] : content.split(/\n\s*\n/)

  return (
    <div className={cn('space-y-4 text-sm leading-7 text-foreground', className)}>
      {paragraphs.map((paragraph, index) => {
        const isLastParagraph = index === paragraphs.length - 1
        return (
          <p key={`${index}-${paragraph.slice(0, 16)}`} className="whitespace-pre-wrap indent-8">
            {paragraph}
            {isStreaming && isLastParagraph ? (
              <span className="ml-0.5 inline-block h-[18px] w-[2px] animate-cursor-blink rounded-sm bg-[#0F172A] align-text-bottom" />
            ) : null}
          </p>
        )
      })}
      {paragraphs.length === 0 && isStreaming ? (
        <p className="indent-8">
          <span className="ml-0.5 inline-block h-[18px] w-[2px] animate-cursor-blink rounded-sm bg-[#0F172A] align-text-bottom" />
        </p>
      ) : null}
    </div>
  )
}
