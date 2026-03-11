import type { ButtonHTMLAttributes, PropsWithChildren } from 'react'
import { cn } from '@/shared/lib/cn'

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger'
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
    'bg-primary text-white hover:bg-blue-600 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
  secondary:
    'bg-muted text-foreground hover:bg-gray-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
  outline:
    'border-4 border-primary bg-transparent text-primary hover:bg-primary hover:text-white focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
  danger:
    'bg-red-500 text-white hover:bg-red-600 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2',
}

const sizeClassMap: Record<ButtonSize, string> = {
  // 统一按钮尺寸阶梯，避免业务层继续手写高度与字号。
  sm: 'h-10 px-3 text-xs',
  md: 'h-12 px-4 text-sm',
  lg: 'h-14 px-6 text-sm',
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
        'inline-flex items-center justify-center rounded-md font-semibold uppercase tracking-wide transition-all duration-200',
        'disabled:cursor-not-allowed disabled:opacity-60',
        !disabled && !loading && 'hover:scale-105',
        variantClassMap[variant],
        sizeClassMap[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? '处理中...' : children}
    </button>
  )
}
