import { cn } from '@/shared/lib/cn'
import { Card } from '@/shared/ui/card'

type MetricCardProps = {
  label: string
  value: string | number
  icon: React.ReactNode
  color?: string
  bgColor?: string
}

export function MetricCard({ label, value, icon, color = 'text-foreground', bgColor = 'bg-muted' }: MetricCardProps) {
  return (
    <Card padding="md">
      <div className="flex items-center gap-4">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', bgColor, color)}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-light tracking-tight text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </Card>
  )
}
