import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  ArrowRight,
  BookOpen,
  CalendarRange,
  Clock3,
  GitBranch,
  PencilLine,
  Plus,
  Save,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import {
  deleteCharacterState,
  listChapterCharacterStates,
  listLatestCharacterStates,
  updateCharacterState,
  type UpdateCharacterStateInput,
} from '@/shared/api/character-states'
import { queryKeys } from '@/shared/api/queries'
import {
  createTimelineEvent,
  deleteTimelineEvent,
  listTimelineEvents,
  updateTimelineEvent,
  type CreateTimelineEventInput,
  type UpdateTimelineEventInput,
} from '@/shared/api/timeline'
import type {
  Asset,
  CharacterRelationship,
  CharacterState,
  Chapter,
  TimelineEvent,
} from '@/shared/api/types'
import { parseStructuredContent } from '@/features/assets/schemas/asset-content'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import { EmptyState } from '@/shared/ui/empty-state'
import { ErrorState } from '@/shared/ui/feedback'
import { FormField, Input, Select, Textarea } from '@/shared/ui/input'
import { SectionTitle } from '@/shared/ui/section-title'
import { Tabs } from '@/shared/ui/tabs'
import { Badge } from '@/shared/ui/badge'
import { useToast } from '@/shared/ui/toast'
import { getErrorMessage } from '@/shared/lib/error-message'
import { formatDate, formatRelativeTime } from '@/shared/lib/format'

type MemoryScope = 'latest' | 'chapter'

type CharacterStateDraft = {
  character_name: string
  location: string
  emotional_state: string
  relationships: string
  notes: string
}

type TimelineEventDraft = {
  summary: string
  story_time: string
}

function parseRelationships(value: string): CharacterRelationship[] {
  if (!value.trim()) return []

  try {
    const parsed = JSON.parse(value) as unknown
    if (!Array.isArray(parsed)) return []

    return parsed.flatMap((item) => {
      if (!item || typeof item !== 'object') return []
      const target = String((item as Record<string, unknown>).target ?? '').trim()
      const relation = String((item as Record<string, unknown>).relation ?? '').trim()
      if (!target || !relation) return []
      return [{ target, relation }]
    })
  } catch {
    return []
  }
}

function buildStateDraft(state: CharacterState): CharacterStateDraft {
  return {
    character_name: state.character_name,
    location: state.location,
    emotional_state: state.emotional_state,
    relationships: state.relationships,
    notes: state.notes,
  }
}

function buildTimelineDraft(event: TimelineEvent): TimelineEventDraft {
  return {
    summary: event.summary,
    story_time: event.story_time,
  }
}

function areStateDraftsEqual(a: CharacterStateDraft, b: CharacterStateDraft) {
  return a.character_name === b.character_name
    && a.location === b.location
    && a.emotional_state === b.emotional_state
    && a.relationships === b.relationships
    && a.notes === b.notes
}

function areTimelineDraftsEqual(a: TimelineEventDraft, b: TimelineEventDraft) {
  return a.summary === b.summary && a.story_time === b.story_time
}

function getCharacterNameFromAsset(asset: Asset): string | null {
  const structured = parseStructuredContent(asset.content, asset.type)
  if (asset.type === 'character' && structured && 'name' in structured) {
    const name = String(structured.name ?? '').trim()
    return name || null
  }
  return asset.title.trim() || null
}

export function MemoryPanel({
  projectId,
  chapters,
  assets,
  activeChapterId,
  onOpenChapter,
}: {
  projectId: string
  chapters: Chapter[]
  assets: Asset[]
  activeChapterId: string | null
  onOpenChapter: (chapterId: string) => void
}) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [scope, setScope] = useState<MemoryScope>('latest')
  const [chapterScopeId, setChapterScopeId] = useState<string>('')
  const [editingStateId, setEditingStateId] = useState<string | null>(null)
  const [stateDraft, setStateDraft] = useState<CharacterStateDraft | null>(null)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [eventDraft, setEventDraft] = useState<TimelineEventDraft | null>(null)
  const [createEventDraft, setCreateEventDraft] = useState<CreateTimelineEventInput>({
    chapter_id: '',
    summary: '',
    story_time: '',
  })

  const sortedChapters = useMemo(
    () => [...chapters].sort((a, b) => a.ordinal - b.ordinal),
    [chapters],
  )

  useEffect(() => {
    const nextChapterId = activeChapterId ?? sortedChapters[0]?.id ?? ''
    if (!nextChapterId) return

    setChapterScopeId((current) => current || nextChapterId)
    setCreateEventDraft((current) => ({
      ...current,
      chapter_id: current.chapter_id || nextChapterId,
    }))
  }, [activeChapterId, sortedChapters])

  const chaptersById = useMemo(
    () => Object.fromEntries(sortedChapters.map((chapter) => [chapter.id, chapter])),
    [sortedChapters],
  )

  const characterAssets = useMemo(
    () => assets.filter((asset) => asset.type === 'character'),
    [assets],
  )

  const knownCharacterNames = useMemo(
    () => new Set(characterAssets.map(getCharacterNameFromAsset).filter((name): name is string => Boolean(name))),
    [characterAssets],
  )

  const latestStatesQuery = useQuery({
    queryKey: queryKeys.characterStatesLatest(projectId),
    queryFn: () => listLatestCharacterStates(projectId),
    enabled: Boolean(projectId),
  })

  const chapterStatesQuery = useQuery({
    queryKey: queryKeys.characterStatesChapter(projectId, chapterScopeId),
    queryFn: () => listChapterCharacterStates(projectId, chapterScopeId),
    enabled: Boolean(projectId && chapterScopeId),
  })

  const timelineQuery = useQuery({
    queryKey: queryKeys.timeline(projectId),
    queryFn: () => listTimelineEvents(projectId),
    enabled: Boolean(projectId),
  })

  const scopedStates = useMemo(
    () => (scope === 'latest' ? (latestStatesQuery.data ?? []) : (chapterStatesQuery.data ?? [])),
    [chapterStatesQuery.data, latestStatesQuery.data, scope],
  )

  const refreshCharacterStates = async (targetChapterId?: string) => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.characterStatesLatest(projectId) })
    if (targetChapterId) {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.characterStatesChapter(projectId, targetChapterId),
      })
    }
  }

  const refreshTimeline = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.timeline(projectId) })
  }

  const updateStateMutation = useMutation({
    mutationFn: ({ stateId, input }: { stateId: string; input: UpdateCharacterStateInput }) =>
      updateCharacterState(projectId, stateId, input),
    onSuccess: async (state) => {
      await refreshCharacterStates(state.chapter_id)
      setEditingStateId(null)
      setStateDraft(null)
      toast('角色状态已更新')
    },
    onError: (error) => toast(getErrorMessage(error), 'error'),
  })

  const deleteStateMutation = useMutation({
    mutationFn: (state: CharacterState) => deleteCharacterState(projectId, state.id),
    onSuccess: async (_, state) => {
      await refreshCharacterStates(state.chapter_id)
      if (editingStateId === state.id) {
        setEditingStateId(null)
        setStateDraft(null)
      }
      toast('角色状态已删除')
    },
    onError: (error) => toast(getErrorMessage(error), 'error'),
  })

  const createTimelineMutation = useMutation({
    mutationFn: (input: CreateTimelineEventInput) => createTimelineEvent(projectId, input),
    onSuccess: async () => {
      await refreshTimeline()
      setCreateEventDraft((current) => ({ ...current, summary: '', story_time: '' }))
      toast('时间线事件已添加')
    },
    onError: (error) => toast(getErrorMessage(error), 'error'),
  })

  const updateTimelineMutation = useMutation({
    mutationFn: ({ eventId, input }: { eventId: string; input: UpdateTimelineEventInput }) =>
      updateTimelineEvent(projectId, eventId, input),
    onSuccess: async () => {
      await refreshTimeline()
      setEditingEventId(null)
      setEventDraft(null)
      toast('时间线事件已更新')
    },
    onError: (error) => toast(getErrorMessage(error), 'error'),
  })

  const deleteTimelineMutation = useMutation({
    mutationFn: (eventId: string) => deleteTimelineEvent(projectId, eventId),
    onSuccess: async () => {
      await refreshTimeline()
      toast('时间线事件已删除')
    },
    onError: (error) => toast(getErrorMessage(error), 'error'),
  })

  const flowData = useMemo(() => {
    const stateNames = new Set(scopedStates.map((state) => state.character_name))
    const relatedNames = new Set(
      scopedStates.flatMap((state) => parseRelationships(state.relationships).map((relation) => relation.target)),
    )
    const names = new Set([
      ...knownCharacterNames,
      ...stateNames,
      ...relatedNames,
    ])

    const orderedNames = Array.from(names).sort((a, b) => a.localeCompare(b, 'zh-CN'))
    const stateByName = new Map(scopedStates.map((state) => [state.character_name, state]))
    const columns = Math.max(1, Math.ceil(Math.sqrt(Math.max(orderedNames.length, 1))))

    const nodes: Node[] = orderedNames.map((name, index) => {
      const state = stateByName.get(name)
      const row = Math.floor(index / columns)
      const column = index % columns
      const hasState = Boolean(state)

      return {
        id: name,
        position: { x: column * 240, y: row * 150 },
        data: {
          label: (
            <div className="space-y-1">
              <div className="text-sm font-medium text-foreground">{name}</div>
              <div className="text-[11px] text-muted-foreground">
                {hasState ? (state?.location || '位置未记录') : '仅设定角色'}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {hasState ? (state?.emotional_state || '情绪未记录') : '暂无状态'}
              </div>
            </div>
          ),
        },
        draggable: false,
        selectable: false,
        style: {
          width: 190,
          borderRadius: 16,
          border: hasState ? '1px solid #CBD5E1' : '1px dashed #CBD5E1',
          background: hasState ? '#FFFFFF' : '#F8FAFC',
          color: '#0F172A',
          padding: 14,
          boxShadow: 'none',
        },
      }
    })

    const edges: Edge[] = scopedStates.flatMap((state, stateIndex) =>
      parseRelationships(state.relationships).map((relation, relationIndex) => ({
        id: `${state.id}-${relation.target}-${relationIndex}`,
        source: state.character_name,
        target: relation.target,
        label: relation.relation,
        animated: false,
        style: { stroke: '#94A3B8', strokeWidth: 1.5 },
        labelStyle: {
          fill: '#475569',
          fontSize: 11,
          fontWeight: 500,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: stateIndex % 2 === 0 ? '#94A3B8' : '#64748B',
        },
      })),
    )

    return { nodes, edges }
  }, [knownCharacterNames, scopedStates])

  const timelineGroups = useMemo(() => {
    const items = [...(timelineQuery.data ?? [])].sort((a, b) => {
      if (a.ordinal !== b.ordinal) return a.ordinal - b.ordinal
      return a.created_at.localeCompare(b.created_at)
    })

    return items.reduce<Array<{ chapter: Chapter | null; events: TimelineEvent[] }>>((groups, event) => {
      const chapter = chaptersById[event.chapter_id] ?? null
      const lastGroup = groups[groups.length - 1]
      if (lastGroup && lastGroup.chapter?.id === chapter?.id) {
        lastGroup.events.push(event)
        return groups
      }

      groups.push({ chapter, events: [event] })
      return groups
    }, [])
  }, [chaptersById, timelineQuery.data])

  const scopeDescription = scope === 'latest'
    ? '展示每个角色当前最新状态'
    : '浏览指定章节结束时的状态快照'

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Memory"
        title="记忆层"
        description="把角色状态与故事时间线放到同一工作区，便于检查连续性与章节衔接。"
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Card className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-medium tracking-tight text-foreground">角色关系与状态图</h3>
              <p className="mt-1 text-sm text-muted-foreground">{scopeDescription}</p>
            </div>
            <Badge icon={<Users className="h-3 w-3" />} variant="default">
              {scopedStates.length} 条状态
            </Badge>
          </div>

          <Tabs
            tabs={[
              { key: 'latest', label: '最新状态' },
              { key: 'chapter', label: '按章节查看' },
            ]}
            activeKey={scope}
            onChange={(next) => setScope(next as MemoryScope)}
          />

          {scope === 'chapter' && (
            <FormField label="章节范围">
              <Select value={chapterScopeId} onChange={(event) => setChapterScopeId(event.target.value)}>
                {sortedChapters.map((chapter) => (
                  <option key={chapter.id} value={chapter.id}>
                    第{chapter.ordinal}章 · {chapter.title}
                  </option>
                ))}
              </Select>
            </FormField>
          )}

          {latestStatesQuery.error && scope === 'latest' && (
            <ErrorState text={getErrorMessage(latestStatesQuery.error)} />
          )}
          {chapterStatesQuery.error && scope === 'chapter' && (
            <ErrorState text={getErrorMessage(chapterStatesQuery.error)} />
          )}

          {flowData.nodes.length > 0 ? (
            <div className="memory-flow h-[360px] overflow-hidden rounded-xl border border-border bg-[#F8FAFC]">
              <ReactFlow
                nodes={flowData.nodes}
                edges={flowData.edges}
                fitView
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={false}
                panOnScroll
                minZoom={0.5}
              >
                <MiniMap pannable zoomable nodeStrokeWidth={2} maskColor="rgba(241, 245, 249, 0.72)" />
                <Controls showInteractive={false} />
                <Background gap={18} size={1} color="#E2E8F0" />
              </ReactFlow>
            </div>
          ) : (
            <EmptyState
              icon={<GitBranch className="h-5 w-5" />}
              title="暂无可视化数据"
              description="角色状态会在章节生成后沉淀到这里，关系边会自动从状态里的 JSON 关系字段解析出来。"
              className="py-10"
            />
          )}

          <div className="space-y-3">
            {scopedStates.length === 0 ? (
              <EmptyState
                icon={<Users className="h-5 w-5" />}
                title="当前范围没有角色状态"
                description={scope === 'latest' ? '继续生成章节后会自动出现。' : '选择其他章节查看历史快照。'}
                className="py-8"
              />
            ) : (
              scopedStates.map((state) => {
                const isEditing = editingStateId === state.id && stateDraft !== null
                const relationships = parseRelationships(state.relationships)
                const originalDraft = buildStateDraft(state)
                const isDirty = isEditing && !areStateDraftsEqual(stateDraft, originalDraft)
                const relatedChapter = chaptersById[state.chapter_id]

                return (
                  <Card key={state.id} padding="sm" className="space-y-3 border-[#D7E0EA]">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium text-foreground">{state.character_name}</h4>
                          <Badge variant="default">
                            {relatedChapter ? `第${relatedChapter.ordinal}章` : '章节快照'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          更新于 {formatRelativeTime(state.updated_at)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onOpenChapter(state.chapter_id)}
                          leftIcon={<ArrowRight className="h-3.5 w-3.5" />}
                        >
                          跳到章节
                        </Button>
                        {isEditing ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingStateId(null)
                              setStateDraft(null)
                            }}
                            leftIcon={<X className="h-3.5 w-3.5" />}
                          >
                            取消
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingStateId(state.id)
                              setStateDraft(buildStateDraft(state))
                            }}
                            leftIcon={<PencilLine className="h-3.5 w-3.5" />}
                          >
                            编辑
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteStateMutation.mutate(state)}
                          loading={deleteStateMutation.isPending && deleteStateMutation.variables?.id === state.id}
                          className="text-red-500 hover:bg-red-50 hover:text-red-600"
                          leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                        >
                          删除
                        </Button>
                      </div>
                    </div>

                    {isEditing && stateDraft ? (
                      <div className="grid gap-3 md:grid-cols-2">
                        <FormField label="角色名">
                          <Input
                            value={stateDraft.character_name}
                            onChange={(event) => setStateDraft({
                              ...stateDraft,
                              character_name: event.target.value,
                            })}
                          />
                        </FormField>
                        <FormField label="所在位置">
                          <Input
                            value={stateDraft.location}
                            onChange={(event) => setStateDraft({
                              ...stateDraft,
                              location: event.target.value,
                            })}
                          />
                        </FormField>
                        <FormField label="情绪状态" className="md:col-span-2">
                          <Input
                            value={stateDraft.emotional_state}
                            onChange={(event) => setStateDraft({
                              ...stateDraft,
                              emotional_state: event.target.value,
                            })}
                          />
                        </FormField>
                        <FormField
                          label="关系 JSON"
                          description='格式示例：[{"target":"李青","relation":"盟友"}]'
                          className="md:col-span-2"
                        >
                          <Textarea
                            rows={4}
                            value={stateDraft.relationships}
                            onChange={(event) => setStateDraft({
                              ...stateDraft,
                              relationships: event.target.value,
                            })}
                          />
                        </FormField>
                        <FormField label="备注" className="md:col-span-2">
                          <Textarea
                            rows={3}
                            value={stateDraft.notes}
                            onChange={(event) => setStateDraft({
                              ...stateDraft,
                              notes: event.target.value,
                            })}
                          />
                        </FormField>
                        <div className="md:col-span-2 flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            onClick={() => updateStateMutation.mutate({
                              stateId: state.id,
                              input: stateDraft,
                            })}
                            disabled={!isDirty}
                            loading={updateStateMutation.isPending}
                            leftIcon={<Save className="h-3.5 w-3.5" />}
                          >
                            保存状态
                          </Button>
                          <span className="text-xs text-muted-foreground">
                            角色状态仅支持查看、编辑、删除；新增仍由章节生成后自动提取。
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-lg bg-[#F8FAFC] p-3">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">位置</p>
                          <p className="mt-1 text-sm text-foreground">{state.location || '未记录'}</p>
                        </div>
                        <div className="rounded-lg bg-[#F8FAFC] p-3">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">情绪</p>
                          <p className="mt-1 text-sm text-foreground">{state.emotional_state || '未记录'}</p>
                        </div>
                        <div className="rounded-lg bg-[#F8FAFC] p-3">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">关系</p>
                          {relationships.length > 0 ? (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {relationships.map((relation, index) => (
                                <Badge key={`${relation.target}-${index}`} variant="default">
                                  {relation.target} · {relation.relation}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <p className="mt-1 text-sm text-foreground">未记录</p>
                          )}
                        </div>
                        <div className="md:col-span-3 rounded-lg border border-dashed border-border bg-white px-3 py-2.5">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">备注</p>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{state.notes || '暂无备注'}</p>
                        </div>
                      </div>
                    )}
                  </Card>
                )
              })
            )}
          </div>
        </Card>

        <Card className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-medium tracking-tight text-foreground">故事时间线</h3>
              <p className="mt-1 text-sm text-muted-foreground">按章节序号汇总关键事件，可手动补充、修订与清理。</p>
            </div>
            <Badge icon={<CalendarRange className="h-3 w-3" />} variant="default">
              {(timelineQuery.data ?? []).length} 条事件
            </Badge>
          </div>

          <Card padding="sm" className="space-y-3 bg-[#F8FAFC]">
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-medium text-foreground">添加时间线事件</h4>
            </div>
            <FormField label="归属章节">
              <Select
                value={createEventDraft.chapter_id}
                onChange={(event) => setCreateEventDraft({
                  ...createEventDraft,
                  chapter_id: event.target.value,
                })}
              >
                <option value="">选择章节</option>
                {sortedChapters.map((chapter) => (
                  <option key={chapter.id} value={chapter.id}>
                    第{chapter.ordinal}章 · {chapter.title}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="事件摘要">
              <Textarea
                rows={3}
                value={createEventDraft.summary}
                onChange={(event) => setCreateEventDraft({
                  ...createEventDraft,
                  summary: event.target.value,
                })}
                placeholder="用一句话概括关键事件"
              />
            </FormField>
            <FormField label="故事内时间">
              <Input
                value={createEventDraft.story_time}
                onChange={(event) => setCreateEventDraft({
                  ...createEventDraft,
                  story_time: event.target.value,
                })}
                placeholder="例如：第三天傍晚"
              />
            </FormField>
            <Button
              size="sm"
              onClick={() => createTimelineMutation.mutate(createEventDraft)}
              disabled={!createEventDraft.chapter_id || !createEventDraft.summary.trim()}
              loading={createTimelineMutation.isPending}
              leftIcon={<Plus className="h-3.5 w-3.5" />}
            >
              添加事件
            </Button>
          </Card>

          {timelineQuery.error && <ErrorState text={getErrorMessage(timelineQuery.error)} />}

          {timelineGroups.length === 0 ? (
            <EmptyState
              icon={<Clock3 className="h-5 w-5" />}
              title="暂无时间线事件"
              description="章节抽取完成后会自动沉淀到这里，也可以手动补充缺失事件。"
              className="py-10"
            />
          ) : (
            <div className="space-y-4">
              {timelineGroups.map(({ chapter, events }) => (
                <div
                  key={chapter?.id ?? `chapter-${events[0]?.ordinal ?? 'unknown'}`}
                  className="rounded-xl border border-border bg-white"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="default">{chapter ? `第${chapter.ordinal}章` : `第${events[0]?.ordinal ?? '?'}章`}</Badge>
                        <h4 className="text-sm font-medium text-foreground">
                          {chapter?.title ?? '章节已删除'}
                        </h4>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {events.length} 条事件
                      </p>
                    </div>
                    {chapter ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onOpenChapter(chapter.id)}
                        leftIcon={<BookOpen className="h-3.5 w-3.5" />}
                      >
                        查看章节
                      </Button>
                    ) : null}
                  </div>

                  <div className="space-y-3 px-4 py-4">
                    {events.map((event, index) => {
                      const isEditing = editingEventId === event.id && eventDraft !== null
                      const originalDraft = buildTimelineDraft(event)
                      const isDirty = isEditing && !areTimelineDraftsEqual(eventDraft, originalDraft)

                      return (
                        <div key={event.id} className="relative pl-6">
                          <div className="absolute left-0 top-2 h-2.5 w-2.5 rounded-full bg-[#0F172A]" />
                          {index < events.length - 1 ? (
                            <div className="absolute left-[4px] top-5 bottom-[-18px] w-px bg-[#E2E8F0]" />
                          ) : null}
                          <div className="rounded-lg bg-[#F8FAFC] p-3">
                            {isEditing && eventDraft ? (
                              <div className="space-y-3">
                                <FormField label="事件摘要">
                                  <Textarea
                                    rows={3}
                                    value={eventDraft.summary}
                                    onChange={(editEvent) => setEventDraft({
                                      ...eventDraft,
                                      summary: editEvent.target.value,
                                    })}
                                  />
                                </FormField>
                                <FormField label="故事内时间">
                                  <Input
                                    value={eventDraft.story_time}
                                    onChange={(editEvent) => setEventDraft({
                                      ...eventDraft,
                                      story_time: editEvent.target.value,
                                    })}
                                  />
                                </FormField>
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => updateTimelineMutation.mutate({
                                      eventId: event.id,
                                      input: eventDraft,
                                    })}
                                    disabled={!eventDraft.summary.trim() || !isDirty}
                                    loading={updateTimelineMutation.isPending}
                                    leftIcon={<Save className="h-3.5 w-3.5" />}
                                  >
                                    保存
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setEditingEventId(null)
                                      setEventDraft(null)
                                    }}
                                    leftIcon={<X className="h-3.5 w-3.5" />}
                                  >
                                    取消
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div className="space-y-1">
                                    <p className="text-sm leading-6 text-foreground">{event.summary}</p>
                                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                      <span>{event.story_time || '故事时间未填写'}</span>
                                      <span>·</span>
                                      <span>{formatDate(event.updated_at)}</span>
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setEditingEventId(event.id)
                                        setEventDraft(buildTimelineDraft(event))
                                      }}
                                      leftIcon={<PencilLine className="h-3.5 w-3.5" />}
                                    >
                                      编辑
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => deleteTimelineMutation.mutate(event.id)}
                                      loading={deleteTimelineMutation.isPending && deleteTimelineMutation.variables === event.id}
                                      className="text-red-500 hover:bg-red-50 hover:text-red-600"
                                      leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                                    >
                                      删除
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
