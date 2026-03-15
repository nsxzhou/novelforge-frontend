import type { ButtonHTMLAttributes, PropsWithChildren } from 'react'
import { cn } from '@/shared/lib/cn'

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

type ButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant
    size?: ButtonSize
    loading?: boolean
  }
>

const variantClassMap: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-r from-accent to-accent-secondary text-white shadow-sm hover:shadow-accent hover:-translate-y-0.5 hover:brightness-105 active:scale-[0.98]',
  secondary:
    'bg-transparent border border-border text-foreground hover:bg-muted hover:border-accent/30 hover:shadow-sm',
  outline:
    'border border-accent/30 bg-transparent text-accent hover:bg-accent hover:text-white hover:shadow-accent',
  danger:
    'bg-red-500 text-white hover:bg-red-600 hover:-translate-y-0.5 hover:shadow-sm active:scale-[0.98]',
  ghost:
    'bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted',
}

const sizeClassMap: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-xs gap-1.5',
  md: 'h-11 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-sm gap-2',
}

export function Button({
  children,
  className,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        variantClassMap[variant],
        sizeClassMap[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          处理中...
        </>
      ) : (
        children
      )}
    </button>
  )
}
