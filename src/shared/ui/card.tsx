import type { PropsWithChildren, ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

type CardVariant = 'default' | 'elevated' | 'ghost' | 'highlighted' | 'inset'

type CardProps = PropsWithChildren<{
  className?: string
  variant?: CardVariant
  interactive?: boolean
  padding?: 'sm' | 'md' | 'lg' | 'none'
  highlightColor?: string
  onClick?: () => void
}>

const paddingClassMap = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

export function Card({
  children,
  className,
  variant = 'default',
  interactive = false,
  padding = 'md',
  highlightColor,
  onClick,
}: CardProps) {
  return (
    <section
      onClick={onClick}
      className={cn(
        'rounded-xl transition-all duration-150',
        variant === 'default' && 'border border-border bg-card shadow-xs',
        variant === 'elevated' && 'border border-border bg-card shadow-md',
        variant === 'ghost' && 'bg-transparent',
        variant === 'highlighted' && 'border border-border bg-card shadow-xs border-l-[3px]',
        variant === 'inset' && 'bg-stone-50 border border-stone-100',
        variant === 'highlighted' && !highlightColor && 'border-l-ink-500',
        interactive && 'cursor-pointer hover:shadow-sm hover:border-stone-300',
        paddingClassMap[padding],
        className,
      )}
      style={
        variant === 'highlighted' && highlightColor
          ? { borderLeftColor: highlightColor }
          : undefined
      }
    >
      {children}
    </section>
  )
}

function CardHeader({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  return (
    <div className={cn('mb-4', className)}>
      {children}
    </div>
  )
}

function CardBody({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  return <div className={cn(className)}>{children}</div>
}

function CardFooter({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  return (
    <div className={cn('mt-4 flex items-center gap-2 border-t border-border pt-4', className)}>
      {children}
    </div>
  )
}

function CardTitle({
  children,
  className,
  action,
}: PropsWithChildren<{ className?: string; action?: ReactNode }>) {
  return (
    <div className={cn('flex items-center justify-between gap-2', className)}>
      <h3 className="font-display text-lg font-semibold tracking-tight text-foreground">
        {children}
      </h3>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

Card.Header = CardHeader
Card.Body = CardBody
Card.Footer = CardFooter
Card.Title = CardTitle
