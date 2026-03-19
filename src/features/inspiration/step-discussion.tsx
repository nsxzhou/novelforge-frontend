import { useCallback, useEffect, useRef, useState } from 'react'
import { BookOpen, Crown, Globe, User } from 'lucide-react'
import {
  brainstormGuidedProjectStream,
  type BrainstormEvent,
  type BrainstormResult,
  type GuidedProjectInput,
} from '@/shared/api/projects'
import { cn } from '@/shared/lib/cn'

type AgentRole = 'story_architect' | 'world_architect' | 'character_designer' | 'chief_editor'
type AgentStatus = 'waiting' | 'thinking' | 'done'

type StepDiscussionProps = {
  input: GuidedProjectInput
  onComplete: (result: BrainstormResult) => void
  onError: (error: string) => void
}

const agents: { role: AgentRole; label: string; icon: typeof BookOpen; thinkingHint: string }[] = [
  { role: 'story_architect', label: '故事架构师', icon: BookOpen, thinkingHint: '正在构思叙事结构...' },
  { role: 'world_architect', label: '世界观架构师', icon: Globe, thinkingHint: '正在构建世界设定...' },
  { role: 'character_designer', label: '角色设计师', icon: User, thinkingHint: '正在设计角色 DNA...' },
  { role: 'chief_editor', label: '主编', icon: Crown, thinkingHint: '正在综合评审并生成候选...' },
]

export function StepDiscussion({ input, onComplete, onError }: StepDiscussionProps) {
  const [agentStatuses, setAgentStatuses] = useState<Record<AgentRole, AgentStatus>>({
    story_architect: 'waiting',
    world_architect: 'waiting',
    character_designer: 'waiting',
    chief_editor: 'waiting',
  })
  const [currentRound, setCurrentRound] = useState(0)
  const [hints, setHints] = useState<Record<string, string>>({})
  const abortRef = useRef<AbortController | null>(null)

  const handleProgressEvent = useCallback((event: BrainstormEvent) => {
    switch (event.type) {
      case 'agent_start':
        if (event.agent) {
          setAgentStatuses((prev) => ({ ...prev, [event.agent as AgentRole]: 'thinking' }))
        }
        if (event.round) setCurrentRound(event.round)
        break
      case 'agent_thinking':
        if (event.agent && event.hint) {
          setHints((prev) => ({ ...prev, [event.agent as AgentRole]: event.hint ?? '' }))
        }
        break
      case 'agent_done':
        if (event.agent) {
          setAgentStatuses((prev) => ({ ...prev, [event.agent as AgentRole]: 'done' }))
        }
        break
      case 'round_done':
        if (event.round) setCurrentRound(event.round)
        break
    }
  }, [])

  useEffect(() => {
    setAgentStatuses({
      story_architect: 'waiting',
      world_architect: 'waiting',
      character_designer: 'waiting',
      chief_editor: 'waiting',
    })
    setCurrentRound(0)
    setHints({})

    const abortController = new AbortController()
    abortRef.current = abortController

    brainstormGuidedProjectStream(
      input,
      {
        onContent: () => {},
        onDone: (result) => {
          abortRef.current = null
          onComplete(result)
        },
        onError: (error) => {
          abortRef.current = null
          onError(error)
        },
      },
      handleProgressEvent,
      abortController.signal,
    )

    return () => {
      abortController.abort()
    }
  }, [handleProgressEvent, input, onComplete, onError])

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-lg font-medium tracking-tight text-foreground">AI 团队头脑风暴中</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {currentRound > 0 ? `第 ${currentRound} 轮讨论` : '准备中...'}
        </p>
      </div>

      <div className="mx-auto grid max-w-2xl gap-4 sm:grid-cols-2">
        {agents.map(({ role, label, icon: Icon, thinkingHint }) => {
          const status = agentStatuses[role]
          const hint = hints[role] ?? thinkingHint
          return (
            <div
              key={role}
              className={cn(
                'rounded-2xl border p-5 transition-all duration-300',
                status === 'thinking' && 'border-[#0F172A] shadow-[0_4px_16px_rgba(15,23,42,0.06)]',
                status === 'done' && 'border-[#0F172A]/30 bg-[#F8FAFC]',
                status === 'waiting' && 'border-[#E2E8F0]',
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-2xl',
                    status === 'thinking' && 'bg-[#0F172A] text-white',
                    status === 'done' && 'bg-[#0F172A]/80 text-white',
                    status === 'waiting' && 'bg-muted text-muted-foreground',
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {status === 'waiting' && '等待中...'}
                    {status === 'thinking' && hint}
                    {status === 'done' && '已完成'}
                  </p>
                </div>
                {status === 'thinking' && (
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#0F172A]" />
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#0F172A] [animation-delay:0.2s]" />
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#0F172A] [animation-delay:0.4s]" />
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
