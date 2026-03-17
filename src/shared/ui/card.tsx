import type { PropsWithChildren, ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

type CardVariant = 'default' | 'ghost'

type CardProps = PropsWithChildren<{
  className?: string
  variant?: CardVariant
  interactive?: boolean
  padding?: 'sm' | 'md' | 'lg' | 'none'
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
  onClick,
}: CardProps) {
  return (
    <section
      onClick={onClick}
      className={cn(
        'rounded-lg transition-all duration-150',
        variant === 'default' && 'border border-[#E2E8F0] bg-white',
        variant === 'ghost' && 'bg-transparent',
        interactive && 'cursor-pointer hover:bg-[#F8FAFC]',
        paddingClassMap[padding],
        className,
      )}
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
      <h3 className="text-lg font-medium tracking-tight text-foreground">
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
