import type { ButtonHTMLAttributes, PropsWithChildren } from 'react'
import { cn } from '@/shared/lib/cn'

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger'

type ButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant
    loading?: boolean
  }
>

const variantClassMap: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-white hover:bg-blue-600 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
  secondary:
    'bg-muted text-foreground hover:bg-gray-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
  outline:
    'border-4 border-primary text-primary hover:bg-primary hover:text-white focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
  danger:
    'bg-red-500 text-white hover:bg-red-600 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2',
}

export function Button({
  children,
  className,
  variant = 'primary',
  loading = false,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex h-12 items-center justify-center rounded-md px-4 text-sm font-semibold uppercase tracking-wide transition-all duration-200',
        'disabled:cursor-not-allowed disabled:opacity-60',
        !disabled && !loading && 'hover:scale-105',
        variantClassMap[variant],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? '处理中...' : children}
    </button>
  )
}
