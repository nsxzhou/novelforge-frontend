import { type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/shared/lib/cn'

type Tab = {
  key: string
  label: string
  icon?: ReactNode
  count?: number
}

export function Tabs<K extends string>({
  tabs,
  activeKey,
  onChange,
}: {
  tabs: Tab[]
  activeKey: K
  onChange: (key: K) => void
}) {
  return (
    <div className="relative flex gap-0 border-b border-border">
      {tabs.map((tab) => {
        const isActive = activeKey === tab.key
        return (
          <button
            key={tab.key}
            type="button"
            className={cn(
              'relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors duration-150',
              isActive
                ? 'text-ink-600'
                : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={() => onChange(tab.key as K)}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  'inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-medium',
                  isActive
                    ? 'bg-ink-100 text-ink-700'
                    : 'bg-stone-100 text-stone-500',
                )}
              >
                {tab.count}
              </span>
            )}
            {isActive && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-ink-500 rounded-full"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
