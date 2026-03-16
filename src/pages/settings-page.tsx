import { useState } from 'react'
import { motion } from 'framer-motion'
import { Settings, Cpu, Palette, Bell, Globe } from 'lucide-react'
import { LLMProvidersPanel } from '@/features/llm-providers/llm-providers-panel'
import { cn } from '@/shared/lib/cn'

type SettingsSection = 'ai-providers' | 'appearance' | 'notifications' | 'language'

const sections: { key: SettingsSection; label: string; icon: typeof Cpu; available: boolean }[] = [
  { key: 'ai-providers', label: 'AI Providers', icon: Cpu, available: true },
  { key: 'appearance', label: '外观设置', icon: Palette, available: false },
  { key: 'notifications', label: '通知设置', icon: Bell, available: false },
  { key: 'language', label: '语言设置', icon: Globe, available: false },
]

export function SettingsPage() {
  const [active, setActive] = useState<SettingsSection>('ai-providers')

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-50 text-ink-500">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl tracking-tight">
              全局<span className="gradient-text">设置</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              管理 AI 服务配置与应用偏好
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Side navigation — desktop */}
        <nav className="hidden lg:block lg:w-48 shrink-0">
          <div className="sticky top-8 space-y-0.5">
            {sections.map((section) => {
              const Icon = section.icon
              const isActive = active === section.key
              return (
                <button
                  key={section.key}
                  onClick={() => section.available && setActive(section.key)}
                  disabled={!section.available}
                  className={cn(
                    'relative flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                    isActive
                      ? 'bg-ink-50 font-medium text-ink-700'
                      : section.available
                        ? 'text-stone-600 hover:bg-stone-100 hover:text-foreground'
                        : 'text-stone-300 cursor-not-allowed',
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="settings-nav-indicator"
                      className="absolute left-0 top-1 bottom-1 w-[3px] rounded-full bg-ink-500"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <Icon className="h-4 w-4 shrink-0" />
                  {section.label}
                  {!section.available && (
                    <span className="ml-auto text-[10px] font-medium text-stone-300">
                      即将推出
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </nav>

        {/* Top navigation — mobile */}
        <div className="flex gap-1 overflow-x-auto lg:hidden">
          {sections.map((section) => {
            const Icon = section.icon
            const isActive = active === section.key
            return (
              <button
                key={section.key}
                onClick={() => section.available && setActive(section.key)}
                disabled={!section.available}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-ink-50 text-ink-700'
                    : section.available
                      ? 'text-stone-500 hover:bg-stone-100'
                      : 'text-stone-300',
                )}
              >
                <Icon className="h-4 w-4" />
                {section.label}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {active === 'ai-providers' && <LLMProvidersPanel />}
          {active !== 'ai-providers' && (
            <div className="flex items-center justify-center rounded-xl border border-dashed border-stone-300 bg-stone-50/50 py-24 text-sm text-muted-foreground">
              此功能即将推出
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
