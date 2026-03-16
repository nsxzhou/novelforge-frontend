import { cn } from '@/shared/lib/cn'
import type { ReactNode } from 'react'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'accent' | 'outline'

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-stone-100 text-stone-600 border-stone-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  danger: 'bg-red-50 text-red-700 border-red-200',
  accent: 'bg-ink-50 text-ink-700 border-ink-200',
  outline: 'bg-transparent text-stone-600 border-stone-300',
}

export function Badge({
  children,
  variant = 'default',
  dot,
  icon,
  className,
}: {
  children: ReactNode
  variant?: BadgeVariant
  dot?: boolean
  icon?: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium leading-none',
        variantStyles[variant],
        className,
      )}
    >
      {dot && (
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            variant === 'success' && 'bg-emerald-500',
            variant === 'warning' && 'bg-amber-500',
            variant === 'danger' && 'bg-red-500',
            variant === 'accent' && 'bg-ink-500',
            variant === 'default' && 'bg-stone-400',
            variant === 'outline' && 'bg-stone-400',
          )}
        />
      )}
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  )
}
