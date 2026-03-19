import { useState } from 'react'
import { ArrowRight, ChevronDown, ChevronUp } from 'lucide-react'
import type { GuidedProjectCandidate } from '@/shared/api/types'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/cn'

function CandidateSection({ title, content }: { title: string; content: string | string[] | undefined }) {
  if (!content || (Array.isArray(content) && content.length === 0)) return null
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
      <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{title}</p>
      {Array.isArray(content) ? (
        <p className="text-sm leading-6 text-foreground">{content.join('、')}</p>
      ) : (
        <p className="text-sm leading-6 text-foreground">{content}</p>
      )}
    </div>
  )
}

type StepCandidatesProps = {
  discussionSummary: string
  candidates: GuidedProjectCandidate[]
  onSelect: (index: number) => void
  onNext: () => void
  selectedIndex: number | null
}

export function StepCandidates({
  discussionSummary,
  candidates,
  onSelect,
  onNext,
  selectedIndex,
}: StepCandidatesProps) {
  const [summaryExpanded, setSummaryExpanded] = useState(false)

  return (
    <div className="space-y-6">
      {discussionSummary && (
        <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC]">
          <button
            type="button"
            onClick={() => setSummaryExpanded(!summaryExpanded)}
            className="flex w-full items-center justify-between p-4"
          >
            <span className="text-sm font-medium text-foreground">讨论摘要</span>
            {summaryExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          {summaryExpanded && (
            <div className="border-t border-[#E2E8F0] px-4 pb-4 pt-3">
              <p className="text-sm leading-7 text-muted-foreground">{discussionSummary}</p>
            </div>
          )}
        </div>
      )}

      <div>
        <h2 className="text-lg font-medium tracking-tight text-foreground">候选方案</h2>
        <p className="mt-1 text-sm text-muted-foreground">选择一个最接近你想法的方向</p>
      </div>

      <div className="space-y-4">
        {candidates.map((candidate, index) => (
          <button
            type="button"
            key={`${candidate.title}-${index}`}
            onClick={() => onSelect(index)}
            className={cn(
              'w-full rounded-2xl border bg-white p-6 text-left transition-all duration-150',
              selectedIndex === index
                ? 'border-[#0F172A] shadow-[0_12px_32px_rgba(15,23,42,0.08)]'
                : 'border-[#E2E8F0] hover:border-[#94A3B8]',
            )}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  候选方案 {index + 1}
                </p>
                <h3 className="mt-1 text-xl font-medium tracking-tight text-foreground">{candidate.title}</h3>
              </div>
              <div
                className={cn(
                  'flex h-8 min-w-8 items-center justify-center rounded-full border px-2 text-xs font-medium',
                  selectedIndex === index
                    ? 'border-[#0F172A] bg-[#0F172A] text-white'
                    : 'border-[#CBD5E1] text-muted-foreground',
                )}
              >
                {selectedIndex === index ? '已选' : '选择'}
              </div>
            </div>

            <p className="mb-4 text-sm leading-7 text-foreground">{candidate.summary}</p>

            <div className="grid gap-3 md:grid-cols-2">
              <CandidateSection title="故事钩子" content={candidate.hook} />
              <CandidateSection title="核心冲突" content={candidate.core_conflict} />
              <CandidateSection title="氛围风格" content={candidate.tone} />
              <CandidateSection title="主题" content={candidate.outline_seed.themes} />
            </div>

            <div className="mt-4 grid gap-3">
              <CandidateSection
                title="大纲种子"
                content={candidate.outline_seed.premise ?? candidate.outline_seed.notes}
              />
              <CandidateSection
                title="世界观种子"
                content={candidate.worldbuilding_seed.history ?? candidate.worldbuilding_seed.notes}
              />
              <CandidateSection
                title="主角种子"
                content={candidate.protagonist_seed.backstory ?? candidate.protagonist_seed.motivation}
              />
            </div>
          </button>
        ))}
      </div>

      {selectedIndex !== null && (
        <div className="flex justify-end">
          <Button onClick={onNext} rightIcon={<ArrowRight className="h-4 w-4" />}>
            下一步
          </Button>
        </div>
      )}
    </div>
  )
}
