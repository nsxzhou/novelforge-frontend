import { useState } from 'react'
import { ArrowRight, CheckSquare } from 'lucide-react'
import type { GuidedProjectCandidate } from '@/shared/api/types'
import { Button } from '@/shared/ui/button'

type SeedSelection = {
  persist_outline: boolean
  persist_worldbuilding: boolean
  persist_protagonist: boolean
}

type StepConfirmProps = {
  candidate: GuidedProjectCandidate
  onConfirm: (seeds: SeedSelection) => void
  isLoading?: boolean
}

const initialSeeds: SeedSelection = {
  persist_outline: true,
  persist_worldbuilding: true,
  persist_protagonist: true,
}

export function StepConfirm({ candidate, onConfirm, isLoading }: StepConfirmProps) {
  const [seedSelection, setSeedSelection] = useState(initialSeeds)

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">已选候选</p>
        <h3 className="mt-1 text-xl font-medium tracking-tight text-foreground">{candidate.title}</h3>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">{candidate.summary}</p>
      </div>

      <div>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-muted text-foreground">
            <CheckSquare className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-lg font-medium tracking-tight text-foreground">选择落库内容</h3>
            <p className="text-sm text-muted-foreground">只把你想保留的种子同步创建为初始资产。</p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {[
            { key: 'persist_outline' as const, label: '大纲种子', description: '生成 1 份 outline 资产' },
            { key: 'persist_worldbuilding' as const, label: '世界观种子', description: '生成 1 份 worldbuilding 资产' },
            { key: 'persist_protagonist' as const, label: '主角种子', description: '生成 1 份 character 资产' },
          ].map((item) => (
            <label key={item.key} className="flex cursor-pointer gap-3 rounded-xl border border-[#E2E8F0] p-4">
              <input
                type="checkbox"
                aria-label={item.label}
                checked={seedSelection[item.key]}
                onChange={(e) => setSeedSelection((prev) => ({ ...prev, [item.key]: e.target.checked }))}
                className="mt-1 h-4 w-4 rounded border-border"
              />
              <div>
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="mt-1 text-xs leading-6 text-muted-foreground">{item.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => onConfirm(seedSelection)} loading={isLoading} rightIcon={<ArrowRight className="h-4 w-4" />}>
          创建项目并进入设定工坊
        </Button>
      </div>
    </div>
  )
}
