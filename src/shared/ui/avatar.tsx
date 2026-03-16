import { cn } from '@/shared/lib/cn'
import { Sparkles, User } from 'lucide-react'
import type { ReactNode } from 'react'

type AvatarVariant = 'ai' | 'user' | 'neutral'

const variantStyles: Record<AvatarVariant, string> = {
  ai: 'bg-gradient-to-br from-ink-500 to-ink-400 text-white',
  user: 'bg-stone-100 text-stone-600',
  neutral: 'bg-stone-100 text-stone-500',
}

const defaultIcons: Record<AvatarVariant, ReactNode> = {
  ai: <Sparkles className="h-3.5 w-3.5" />,
  user: <User className="h-3.5 w-3.5" />,
  neutral: <User className="h-3.5 w-3.5" />,
}

export function Avatar({
  variant = 'neutral',
  icon,
  size = 'md',
  className,
}: {
  variant?: AvatarVariant
  icon?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const sizeClasses = {
    sm: 'h-7 w-7',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
  }

  return (
    <div
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full',
        variantStyles[variant],
        sizeClasses[size],
        className,
      )}
    >
      {icon ?? defaultIcons[variant]}
    </div>
  )
}
