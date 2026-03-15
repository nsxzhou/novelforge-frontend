import { cn } from '@/shared/lib/cn'

type Tab = {
  key: string
  label: string
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
    <div className="flex flex-wrap gap-1.5">
      {tabs.map((tab) => {
        const isActive = activeKey === tab.key
        return (
          <button
            key={tab.key}
            type="button"
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200',
              isActive
                ? 'bg-gradient-to-r from-accent to-accent-secondary text-white shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
            onClick={() => onChange(tab.key as K)}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
