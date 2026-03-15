import { LLMProvidersPanel } from '@/features/llm-providers/llm-providers-panel'

export function SettingsPage() {
  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <div className="inline-flex items-center gap-2.5 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5">
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-accent" />
          <span className="font-mono text-xs uppercase tracking-[0.15em] text-accent">
            Settings
          </span>
        </div>
        <h1 className="font-display text-4xl tracking-tight">
          全局<span className="gradient-text">设置</span>
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          管理 LLM Provider 配置，控制 AI 生成使用的模型和服务。
        </p>
      </section>

      <LLMProvidersPanel />
    </div>
  )
}
