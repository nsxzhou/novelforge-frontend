import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

export function SectionTitle({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between', className)}>
      <div className="space-y-1.5">
        {eyebrow ? (
          <span className="font-mono text-[11px] font-medium uppercase tracking-[0.15em] text-ink-500">
            {eyebrow}
          </span>
        ) : null}
        <h2 className="font-display text-xl tracking-tight text-foreground">{title}</h2>
        {description ? (
          <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
