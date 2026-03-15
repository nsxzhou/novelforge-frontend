import type { PropsWithChildren } from 'react'
import { cn } from '@/shared/lib/cn'

type CardVariant = 'default' | 'elevated' | 'featured'

type CardProps = PropsWithChildren<{
  className?: string
  variant?: CardVariant
  interactive?: boolean
  padding?: 'md' | 'lg'
}>

const paddingClassMap = {
  md: 'p-6',
  lg: 'p-8',
}

export function Card({
  children,
  className,
  variant = 'default',
  interactive = false,
  padding = 'md',
}: CardProps) {
  if (variant === 'featured') {
    return (
      <div className={cn('rounded-xl bg-gradient-to-br from-accent via-accent-secondary to-accent p-[2px]', className)}>
        <section
          className={cn(
            'h-full w-full rounded-[calc(16px-2px)] bg-card',
            interactive && 'cursor-pointer transition-shadow duration-200 hover:shadow-md',
            paddingClassMap[padding],
          )}
        >
          {children}
        </section>
      </div>
    )
  }

  return (
    <section
      className={cn(
        'rounded-xl border border-border bg-card transition-all duration-200',
        variant === 'elevated' && 'shadow-md',
        variant === 'default' && 'shadow-sm',
        interactive &&
          'cursor-pointer hover:shadow-md hover:bg-gradient-to-br hover:from-accent/[0.02] hover:to-transparent',
        paddingClassMap[padding],
        className,
      )}
    >
      {children}
    </section>
  )
}
