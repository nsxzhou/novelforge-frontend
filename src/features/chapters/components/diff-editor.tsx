import { useState, useMemo } from 'react'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { Check, X, CheckCircle2, XCircle, ArrowLeftRight } from 'lucide-react'
import { cn } from '@/shared/lib/cn'

type DiffEditorProps = {
  originalText: string
  rewrittenText: string
  onAccept: (mergedText: string) => void
  onCancel: () => void
}

type DiffType = 'unchanged' | 'modified' | 'added' | 'removed'

type DiffEntry = {
  type: DiffType
  original: string | null
  rewritten: string | null
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
}

function computeLCS(a: string[], b: string[]): boolean[][] {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  const inLCS: boolean[][] = Array.from({ length: m }, () => Array(n).fill(false))
  let i = m
  let j = n
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      inLCS[i - 1][j - 1] = true
      i--
      j--
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--
    } else {
      j--
    }
  }

  return inLCS
}

function diffParagraphs(originalText: string, rewrittenText: string): DiffEntry[] {
  const origParagraphs = splitParagraphs(originalText)
  const rewriteParagraphs = splitParagraphs(rewrittenText)

  const lcs = computeLCS(origParagraphs, rewriteParagraphs)
  const result: DiffEntry[] = []

  let oi = 0
  let ri = 0

  while (oi < origParagraphs.length || ri < rewriteParagraphs.length) {
    if (oi < origParagraphs.length && ri < rewriteParagraphs.length && lcs[oi][ri]) {
      result.push({ type: 'unchanged', original: origParagraphs[oi], rewritten: rewriteParagraphs[ri] })
      oi++
      ri++
    } else {
      // Find next LCS match positions
      let nextOi = -1
      let nextRi = -1
      outer: for (let a = oi; a < origParagraphs.length; a++) {
        for (let b = ri; b < rewriteParagraphs.length; b++) {
          if (lcs[a][b]) {
            nextOi = a
            nextRi = b
            break outer
          }
        }
      }

      if (nextOi === -1) {
        // No more LCS matches - pair remaining as modified, then add/remove extras
        while (oi < origParagraphs.length && ri < rewriteParagraphs.length) {
          result.push({ type: 'modified', original: origParagraphs[oi], rewritten: rewriteParagraphs[ri] })
          oi++
          ri++
        }
        while (oi < origParagraphs.length) {
          result.push({ type: 'removed', original: origParagraphs[oi], rewritten: null })
          oi++
        }
        while (ri < rewriteParagraphs.length) {
          result.push({ type: 'added', original: null, rewritten: rewriteParagraphs[ri] })
          ri++
        }
      } else {
        // Pair up items before the next match as modified, then add/remove extras
        const origBefore = nextOi - oi
        const rewriteBefore = nextRi - ri
        const paired = Math.min(origBefore, rewriteBefore)
        for (let k = 0; k < paired; k++) {
          result.push({ type: 'modified', original: origParagraphs[oi + k], rewritten: rewriteParagraphs[ri + k] })
        }
        for (let k = paired; k < origBefore; k++) {
          result.push({ type: 'removed', original: origParagraphs[oi + k], rewritten: null })
        }
        for (let k = paired; k < rewriteBefore; k++) {
          result.push({ type: 'added', original: null, rewritten: rewriteParagraphs[ri + k] })
        }
        oi = nextOi
        ri = nextRi
      }
    }
  }

  return result
}

export function DiffEditor({ originalText, rewrittenText, onAccept, onCancel }: DiffEditorProps) {
  const diffs = useMemo(() => diffParagraphs(originalText, rewrittenText), [originalText, rewrittenText])

  // Track accept/reject state per diff entry: true = accept rewritten, false = keep original
  const [decisions, setDecisions] = useState<(boolean | null)[]>(() => diffs.map(() => null))

  const changedCount = diffs.filter((d) => d.type !== 'unchanged').length
  const decidedCount = decisions.filter((d) => d !== null).length

  function setDecision(index: number, accepted: boolean) {
    setDecisions((prev) => {
      const next = [...prev]
      next[index] = accepted
      return next
    })
  }

  function acceptAll() {
    setDecisions(diffs.map((d) => (d.type === 'unchanged' ? null : true)))
  }

  function rejectAll() {
    setDecisions(diffs.map((d) => (d.type === 'unchanged' ? null : false)))
  }

  function buildMergedText(): string {
    const parts: string[] = []
    for (let i = 0; i < diffs.length; i++) {
      const diff = diffs[i]
      const decision = decisions[i]

      if (diff.type === 'unchanged') {
        parts.push(diff.original!)
      } else if (decision === true) {
        // Accept rewritten
        if (diff.type === 'removed') {
          // Accepted removal = remove the paragraph (don't add anything)
        } else {
          parts.push(diff.rewritten!)
        }
      } else {
        // Reject rewritten (keep original) or undecided (default to original)
        if (diff.type === 'added') {
          // Reject addition = don't add anything
        } else {
          parts.push(diff.original!)
        }
      }
    }
    return parts.join('\n\n')
  }

  function handleApply() {
    onAccept(buildMergedText())
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold text-foreground">对比编辑器</h4>
          <Badge variant="default">
            {decidedCount}/{changedCount} 已处理
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={acceptAll}>
            <CheckCircle2 className="mr-1 h-3.5 w-3.5 text-emerald-600" />
            全部接受
          </Button>
          <Button variant="ghost" size="sm" onClick={rejectAll}>
            <XCircle className="mr-1 h-3.5 w-3.5 text-red-500" />
            全部拒绝
          </Button>
        </div>
      </div>

      {/* Diff grid */}
      <div className="rounded-lg border border-border overflow-hidden">
        {/* Column headers */}
        <div className="grid grid-cols-[1fr_1fr_auto] border-b border-border bg-slate-50">
          <div className="px-4 py-2 text-xs font-medium text-muted-foreground">原文</div>
          <div className="px-4 py-2 text-xs font-medium text-muted-foreground border-l border-border">改写结果</div>
          <div className="w-20" />
        </div>

        {diffs.map((diff, index) => {
          const decision = decisions[index]
          const isChanged = diff.type !== 'unchanged'

          return (
            <div
              key={index}
              className={cn(
                'grid grid-cols-[1fr_1fr_auto] border-b border-border last:border-b-0',
                decision === true && 'ring-1 ring-inset ring-emerald-200',
                decision === false && 'ring-1 ring-inset ring-red-200',
              )}
            >
              {/* Left: original */}
              <div
                className={cn(
                  'px-4 py-3 text-sm leading-relaxed',
                  diff.type === 'unchanged' && 'text-foreground bg-white',
                  diff.type === 'modified' && 'bg-red-50 text-red-800 line-through',
                  diff.type === 'removed' && 'bg-red-50 text-red-800 line-through',
                  diff.type === 'added' && 'bg-slate-50 text-muted-foreground italic',
                  decision === false && diff.type !== 'unchanged' && 'bg-white text-foreground no-underline',
                )}
              >
                {diff.original ?? <span className="text-xs text-muted-foreground">（无对应内容）</span>}
              </div>

              {/* Right: rewritten */}
              <div
                className={cn(
                  'px-4 py-3 text-sm leading-relaxed border-l border-border',
                  diff.type === 'unchanged' && 'text-foreground bg-white',
                  diff.type === 'modified' && 'bg-emerald-50 text-emerald-800',
                  diff.type === 'added' && 'bg-emerald-50 text-emerald-800',
                  diff.type === 'removed' && 'bg-slate-50 text-muted-foreground italic',
                  decision === true && diff.type !== 'unchanged' && 'bg-emerald-100/60',
                )}
              >
                {diff.rewritten ?? <span className="text-xs text-muted-foreground">（已删除）</span>}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 px-2 bg-white border-l border-border w-20 justify-center">
                {isChanged ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setDecision(index, true)}
                      title="接受改写"
                      className={cn(
                        'rounded p-1.5 transition-colors',
                        decision === true
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50',
                      )}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDecision(index, false)}
                      title="保留原文"
                      className={cn(
                        'rounded p-1.5 transition-colors',
                        decision === false
                          ? 'bg-red-100 text-red-700'
                          : 'text-muted-foreground hover:text-red-600 hover:bg-red-50',
                      )}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : (
                  <span className="text-[10px] text-muted-foreground">无变化</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          取消
        </Button>
        <Button size="sm" onClick={handleApply}>
          <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
          应用更改
        </Button>
      </div>
    </div>
  )
}
