import { cn } from '@/shared/lib/cn'
import type { ReactNode } from 'react'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger'

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-[#F1F5F9] text-[#64748B]',
  success: 'bg-emerald-50 text-emerald-600',
  warning: 'bg-amber-50 text-amber-600',
  danger: 'bg-red-50 text-red-600',
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
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium leading-none',
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
            variant === 'default' && 'bg-slate-400',
          )}
        />
      )}
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  )
}
