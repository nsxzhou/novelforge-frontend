import { Check } from 'lucide-react'
import { cn } from '@/shared/lib/cn'

type WizardStep = 'conditions' | 'discussion' | 'candidates' | 'confirm'

const steps: { key: WizardStep; label: string }[] = [
  { key: 'conditions', label: '条件选择' },
  { key: 'discussion', label: 'Agent 讨论' },
  { key: 'candidates', label: '候选方案' },
  { key: 'confirm', label: '确认创建' },
]

const stepIndex = (step: WizardStep) => steps.findIndex((s) => s.key === step)

type StepIndicatorProps = {
  current: WizardStep
}

export function StepIndicator({ current }: StepIndicatorProps) {
  const currentIdx = stepIndex(current)

  return (
    <div className="flex items-center gap-2">
      {steps.map((step, idx) => {
        const isCompleted = idx < currentIdx
        const isActive = idx === currentIdx
        return (
          <div key={step.key} className="flex items-center gap-2">
            {idx > 0 && (
              <div className={cn('h-px w-8', isCompleted || isActive ? 'bg-[#0F172A]' : 'bg-[#E2E8F0]')} />
            )}
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium',
                  isCompleted && 'bg-[#0F172A] text-white',
                  isActive && 'border-2 border-[#0F172A] text-[#0F172A]',
                  !isCompleted && !isActive && 'border border-[#E2E8F0] text-muted-foreground',
                )}
              >
                {isCompleted ? <Check className="h-3.5 w-3.5" /> : idx + 1}
              </div>
              <span
                className={cn(
                  'hidden text-sm sm:inline',
                  isActive ? 'font-medium text-foreground' : 'text-muted-foreground',
                )}
              >
                {step.label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
