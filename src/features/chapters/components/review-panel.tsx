import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Sparkles } from 'lucide-react'
import { reviewChapter } from '@/shared/api/chapters'
import type { ReviewResult } from '@/shared/api/types'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import { getErrorMessage } from '@/shared/lib/error-message'

type ReviewPanelProps = {
  chapterId: string
}

const DIMENSION_LABELS: Record<string, string> = {
  logic_consistency: '逻辑一致性',
  character_fidelity: '人物一致性',
  pacing: '节奏把控',
  writing_quality: '文笔质量',
}

function scoreColor(score: number): string {
  if (score >= 8) return '#10B981'
  if (score >= 5) return '#F59E0B'
  return '#EF4444'
}

export function ReviewPanel({ chapterId }: ReviewPanelProps) {
  const [result, setResult] = useState<ReviewResult | null>(null)

  const reviewMutation = useMutation({
    mutationFn: () => reviewChapter(chapterId),
    onSuccess: (data) => setResult(data),
  })

  const dimensions = result
    ? ([
        ['logic_consistency', result.logic_consistency],
        ['character_fidelity', result.character_fidelity],
        ['pacing', result.pacing],
        ['writing_quality', result.writing_quality],
      ] as const)
    : []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground">AI 评审</h4>
        <Button
          size="sm"
          variant="secondary"
          loading={reviewMutation.isPending}
          onClick={() => reviewMutation.mutate()}
          leftIcon={<Sparkles className="h-3.5 w-3.5" />}
        >
          {result ? '重新评审' : 'AI 评审'}
        </Button>
      </div>

      {reviewMutation.error && (
        <p className="text-xs font-medium text-red-600">
          {getErrorMessage(reviewMutation.error)}
        </p>
      )}

      {result && (
        <Card>
          {/* Overall score */}
          <div className="mb-5 flex items-center gap-4">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-xl text-xl font-bold text-white"
              style={{ backgroundColor: scoreColor(result.overall_score) }}
            >
              {result.overall_score}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">综合评分</p>
              <p className="text-xs text-muted-foreground">满分 10 分</p>
            </div>
          </div>

          {/* Dimension scores */}
          <div className="space-y-3">
            {dimensions.map(([key, dim]) => (
              <div key={key}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm text-foreground">
                    {DIMENSION_LABELS[key]}
                  </span>
                  <span
                    className="text-sm font-medium"
                    style={{ color: scoreColor(dim.score) }}
                  >
                    {dim.score}/10
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#E2E8F0]">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(dim.score / 10) * 100}%`,
                      backgroundColor: scoreColor(dim.score),
                    }}
                  />
                </div>
                {dim.comment && (
                  <p className="mt-1 text-xs text-muted-foreground">{dim.comment}</p>
                )}
              </div>
            ))}
          </div>

          {/* Summary */}
          {result.summary && (
            <div className="mt-4 border-t border-border pt-4">
              <p className="text-sm font-medium text-foreground mb-1">总结</p>
              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                {result.summary}
              </p>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
