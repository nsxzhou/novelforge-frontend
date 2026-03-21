import { type ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

type SidebarNavTab = {
  key: string
  label: string
  icon?: ReactNode
  count?: number
}

export function SidebarNav<K extends string>({
  tabs,
  activeKey,
  onChange,
}: {
  tabs: SidebarNavTab[]
  activeKey: K
  onChange: (key: K) => void
}) {
  return (
    <nav className="flex flex-col pb-2">
      {tabs.map((tab) => {
        const isActive = activeKey === tab.key
        return (
          <button
            key={tab.key}
            type="button"
            className={cn(
              'flex items-center gap-3 px-5 py-2.5 text-sm transition-colors duration-150',
              isActive
                ? 'border-l-[3px] border-foreground bg-muted font-medium text-foreground'
                : 'border-l-[3px] border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground',
            )}
            onClick={() => onChange(tab.key as K)}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span className="flex-1 text-left">{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={cn(
                  'inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-medium',
                  isActive
                    ? 'bg-background text-foreground'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </nav>
  )
}
