import { cn } from '@/shared/lib/cn'
import type { PropsWithChildren } from 'react'

export function Kbd({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  return (
    <kbd
      className={cn(
        'inline-flex items-center gap-0.5 rounded-md border border-stone-200 bg-stone-50 px-1.5 py-0.5 font-mono text-[11px] font-medium text-stone-500 shadow-xs',
        className,
      )}
    >
      {children}
    </kbd>
  )
}
