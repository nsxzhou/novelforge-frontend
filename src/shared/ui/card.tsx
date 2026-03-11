import type { PropsWithChildren } from 'react'
import { cn } from '@/shared/lib/cn'

type CardProps = PropsWithChildren<{
  className?: string
  tone?: 'default' | 'blue' | 'green' | 'amber'
  interactive?: boolean
  padding?: 'md' | 'lg'
}>

const toneClassMap = {
  default: 'bg-white/95',
  blue: 'bg-blue-50',
  green: 'bg-green-50',
  amber: 'bg-amber-50',
}

const paddingClassMap = {
  // 统一卡片内边距，保证页面在不同区块下有稳定节奏。
  md: 'p-6',
  lg: 'p-8',
}

export function Card({
  children,
  className,
  tone = 'default',
  interactive = false,
  padding = 'md',
}: CardProps) {
  return (
    <section
      className={cn(
        'rounded-lg transition-all duration-200',
        interactive && 'cursor-pointer hover:scale-[1.02]',
        toneClassMap[tone],
        paddingClassMap[padding],
        className,
      )}
    >
      {children}
    </section>
  )
}
