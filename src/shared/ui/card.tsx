import type { PropsWithChildren } from 'react'
import { cn } from '@/shared/lib/cn'

type CardProps = PropsWithChildren<{
  className?: string
  tone?: 'default' | 'blue' | 'green' | 'amber'
}>

const toneClassMap = {
  default: 'bg-white',
  blue: 'bg-blue-50',
  green: 'bg-green-50',
  amber: 'bg-amber-50',
}

export function Card({ children, className, tone = 'default' }: CardProps) {
  return (
    <section
      className={cn(
        'rounded-lg p-6 transition-all duration-200 hover:scale-[1.01]',
        toneClassMap[tone],
        className,
      )}
    >
      {children}
    </section>
  )
}
