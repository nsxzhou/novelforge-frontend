import { cn } from '@/shared/lib/cn'
import type { PropsWithChildren } from 'react'

export function Kbd({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  return (
    <kbd
      className={cn(
        'inline-flex items-center gap-0.5 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-1.5 py-0.5 font-mono text-[11px] font-medium text-muted-foreground',
        className,
      )}
    >
      {children}
    </kbd>
  )
}
