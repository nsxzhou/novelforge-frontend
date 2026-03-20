import { useQuery } from '@tanstack/react-query'
import { Activity, Zap, CheckCircle, Clock } from 'lucide-react'
import { getDashboard } from '@/shared/api/metrics'
import { queryKeys } from '@/shared/api/queries'
import { Card } from '@/shared/ui/card'
import { Badge } from '@/shared/ui/badge'
import { LoadingState, ErrorState } from '@/shared/ui/feedback'
import { EmptyState } from '@/shared/ui/empty-state'
import { getErrorMessage } from '@/shared/lib/error-message'
import { MetricCard } from './metric-card'
import { TokenChart } from './token-chart'

type CostDashboardProps = {
  projectId?: string
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function formatDuration(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.round(ms)}ms`
}

const KIND_LABELS: Record<string, string> = {
  asset_generation: '设定生成',
  chapter_generation: '章节生成',
  chapter_continuation: '章节续写',
  chapter_rewrite: '章节重写',
  chapter_suggestion: '章节建议',
}

export function CostDashboard({ projectId }: CostDashboardProps) {
  const dashboardQuery = useQuery({
    queryKey: queryKeys.dashboard(projectId),
    queryFn: () => getDashboard(projectId),
  })

  if (dashboardQuery.isLoading) return <LoadingState text="加载指标数据..." />
  if (dashboardQuery.error) return <ErrorState text={getErrorMessage(dashboardQuery.error)} />

  const data = dashboardQuery.data
  if (!data) return null

  const hasData = data.total_generations > 0

  if (!hasData) {
    return (
      <EmptyState
        icon={<Activity className="h-5 w-5" />}
        title="暂无指标数据"
        description="开始使用 AI 功能后，这里会显示用量统计"
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Overview cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="总 Tokens"
          value={formatTokens(data.total_tokens)}
          icon={<Zap className="h-5 w-5" />}
          color="text-amber-600"
          bgColor="bg-amber-50"
        />
        <MetricCard
          label="生成次数"
          value={data.total_generations}
          icon={<Activity className="h-5 w-5" />}
          color="text-blue-600"
          bgColor="bg-blue-50"
        />
        <MetricCard
          label="成功率"
          value={`${(data.success_rate * 100).toFixed(1)}%`}
          icon={<CheckCircle className="h-5 w-5" />}
          color="text-emerald-600"
          bgColor="bg-emerald-50"
        />
        <MetricCard
          label="平均耗时"
          value={formatDuration(data.avg_duration_ms)}
          icon={<Clock className="h-5 w-5" />}
          color="text-purple-600"
          bgColor="bg-purple-50"
        />
      </div>

      {/* Token trend */}
      {data.tokens_by_day.length > 0 && (
        <Card>
          <h4 className="text-sm font-medium text-foreground mb-4">Token 趋势 (近30天)</h4>
          <TokenChart data={data.tokens_by_day} />
        </Card>
      )}

      {/* By kind + By project */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* By kind */}
        {data.tokens_by_kind.length > 0 && (
          <Card>
            <h4 className="text-sm font-medium text-foreground mb-3">按类型分布</h4>
            <div className="space-y-2">
              {data.tokens_by_kind.map((item) => {
                const pct = data.total_tokens > 0
                  ? ((item.total_tokens / data.total_tokens) * 100).toFixed(1)
                  : '0'
                return (
                  <div key={item.kind} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-foreground">
                        {KIND_LABELS[item.kind] ?? item.kind}
                      </span>
                      <span className="text-muted-foreground">
                        {formatTokens(item.total_tokens)} ({pct}%)
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-foreground transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        {/* By project */}
        {data.tokens_by_project.length > 0 && (
          <Card>
            <h4 className="text-sm font-medium text-foreground mb-3">按项目分布</h4>
            <div className="space-y-2">
              {data.tokens_by_project.map((item) => (
                <div
                  key={item.project_id}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                >
                  <div>
                    <p className="text-sm text-foreground">{item.project_name}</p>
                    <p className="text-xs text-muted-foreground">{item.count} 次生成</p>
                  </div>
                  <Badge>{formatTokens(item.total_tokens)}</Badge>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
