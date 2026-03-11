import { ProjectsPanel } from '@/features/projects/projects-panel'
import { AppShell } from '@/shared/ui/layout'

export function ProjectsPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <section className="relative overflow-hidden rounded-lg bg-primary p-6 text-white md:p-8">
          <div className="flat-deco-dot -top-12 right-4 h-24 w-24" />
          <div className="flat-deco-square bottom-2 left-1/3 h-12 w-12" />
          <div className="flat-deco-dot -bottom-6 left-4 h-16 w-16" />

          <div className="relative grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100">Project Studio</p>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight">NovelForge 项目入口</h1>
              <p className="mt-2 text-sm text-blue-100">
                管理你的小说项目，进入工作台继续资产设定、对话微调和章节生成。
              </p>
            </div>
            <div className="rounded-lg bg-white/15 px-4 py-3 text-sm font-semibold">
              V1 核心闭环已可用
            </div>
          </div>
        </section>

        <ProjectsPanel />
      </div>
    </AppShell>
  )
}
