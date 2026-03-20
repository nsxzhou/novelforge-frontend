import type { DailyTokens } from '@/shared/api/types'

type TokenChartProps = {
  data: DailyTokens[]
}

export function TokenChart({ data }: TokenChartProps) {
  if (data.length === 0) return null

  const maxTokens = Math.max(...data.map(d => d.total_tokens), 1)

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr)
    return `${d.getMonth() + 1}/${d.getDate()}`
  }

  function formatTokens(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return String(n)
  }

  return (
    <div className="space-y-1">
      <div className="flex items-end gap-[2px]" style={{ height: 160 }}>
        {data.map((day) => {
          const heightPct = (day.total_tokens / maxTokens) * 100
          return (
            <div
              key={day.date}
              className="group relative flex-1 flex flex-col items-center justify-end"
              style={{ height: '100%' }}
            >
              {/* Tooltip */}
              <div className="absolute bottom-full mb-1 hidden group-hover:block z-10">
                <div className="rounded bg-foreground px-2 py-1 text-xs text-background whitespace-nowrap">
                  {formatDate(day.date)}: {formatTokens(day.total_tokens)} tokens ({day.count} 次)
                </div>
              </div>
              {/* Bar */}
              <div
                className="w-full min-h-[2px] rounded-t bg-foreground/80 hover:bg-foreground transition-colors"
                style={{ height: `${Math.max(heightPct, 1)}%` }}
              />
            </div>
          )
        })}
      </div>
      {/* X-axis labels - show every few */}
      <div className="flex gap-[2px]">
        {data.map((day, i) => {
          const showLabel = data.length <= 10 || i % Math.ceil(data.length / 8) === 0 || i === data.length - 1
          return (
            <div key={day.date} className="flex-1 text-center">
              {showLabel && (
                <span className="text-[10px] text-muted-foreground">{formatDate(day.date)}</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
