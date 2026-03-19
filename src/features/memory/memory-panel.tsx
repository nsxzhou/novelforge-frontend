import { useEffect, useMemo, useState, type ReactNode } from 'react'
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
import { listAllAssets } from '@/shared/api/assets'
import {
  deleteCharacterState,
  listChapterCharacterStates,
  listLatestCharacterStates,
  updateCharacterState,
  type UpdateCharacterStateInput,
} from '@/shared/api/character-states'
import { listAllChapters } from '@/shared/api/chapters'
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
  TimelineEvent,
} from '@/shared/api/types'
import { parseStructuredContent } from '@/features/assets/schemas/asset-content'
import { getErrorMessage } from '@/shared/lib/error-message'
import { formatDate, formatRelativeTime } from '@/shared/lib/format'
import { cn } from '@/shared/lib/cn'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import { EmptyState } from '@/shared/ui/empty-state'
import { ErrorState, LoadingState } from '@/shared/ui/feedback'
import { FormField, Input, Select, Textarea } from '@/shared/ui/input'
import { SectionTitle } from '@/shared/ui/section-title'
import { Tabs } from '@/shared/ui/tabs'
import { useToast } from '@/shared/ui/toast'

type MemoryScope = 'latest' | 'chapter'
type MemoryWorkspaceView = 'states' | 'timeline' | 'graph'
type RelationshipDraft = CharacterRelationship

type CharacterStateDraft = {
  character_name: string
  location: string
  emotional_state: string
  relationships: RelationshipDraft[]
  notes: string
}

type TimelineEventDraft = {
  summary: string
  story_time: string
}

function normalizeRelationships(value: RelationshipDraft[]): RelationshipDraft[] {
  return value.flatMap((item) => {
    const target = item.target.trim()
    const relation = item.relation.trim()
    if (!target || !relation) return []
    return [{ target, relation }]
  })
}

function parseRelationships(value: string): RelationshipDraft[] {
  if (!value.trim()) return []

  try {
    const parsed = JSON.parse(value) as unknown
    if (!Array.isArray(parsed)) return []

    return normalizeRelationships(parsed.flatMap((item) => {
      if (!item || typeof item !== 'object') return []
      return [{
        target: String((item as Record<string, unknown>).target ?? ''),
        relation: String((item as Record<string, unknown>).relation ?? ''),
      }]
    }))
  } catch {
    return []
  }
}

function serializeRelationships(value: RelationshipDraft[]) {
  return JSON.stringify(normalizeRelationships(value))
}

function buildStateDraft(state: CharacterState): CharacterStateDraft {
  return {
    character_name: state.character_name,
    location: state.location,
    emotional_state: state.emotional_state,
    relationships: parseRelationships(state.relationships),
    notes: state.notes,
  }
}

function buildStateInput(draft: CharacterStateDraft): UpdateCharacterStateInput {
  return {
    character_name: draft.character_name,
    location: draft.location,
    emotional_state: draft.emotional_state,
    relationships: serializeRelationships(draft.relationships),
    notes: draft.notes,
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
    && a.notes === b.notes
    && serializeRelationships(a.relationships) === serializeRelationships(b.relationships)
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

function getLatestUpdatedAt<T extends { updated_at: string }>(items: T[]): string | null {
  if (items.length === 0) return null
  return items.reduce((latest, item) => item.updated_at > latest ? item.updated_at : latest, items[0].updated_at)
}

function MemoryMetricCard({
  label,
  value,
  description,
  badge,
}: {
  label: string
  value: string
  description: string
  badge?: ReactNode
}) {
  return (
    <div className="rounded-xl border border-border bg-[#F8FAFC] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
          <p className="mt-2 text-lg font-medium tracking-tight text-foreground">{value}</p>
        </div>
        {badge ? <div className="shrink-0">{badge}</div> : null}
      </div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{description}</p>
    </div>
  )
}

export function MemoryPanel({
  projectId,
  activeChapterId,
  onOpenChapter,
}: {
  projectId: string
  activeChapterId: string | null
  onOpenChapter: (chapterId: string) => void
}) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [workspaceView, setWorkspaceView] = useState<MemoryWorkspaceView>('states')
  const [scope, setScope] = useState<MemoryScope>('latest')
  const [chapterScopeId, setChapterScopeId] = useState<string>('')
  const [selectedStateId, setSelectedStateId] = useState<string | null>(null)
  const [editingStateId, setEditingStateId] = useState<string | null>(null)
  const [stateDraft, setStateDraft] = useState<CharacterStateDraft | null>(null)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [eventDraft, setEventDraft] = useState<TimelineEventDraft | null>(null)
  const [showCreateEventForm, setShowCreateEventForm] = useState(false)
  const [createEventDraft, setCreateEventDraft] = useState<CreateTimelineEventInput>({
    chapter_id: '',
    summary: '',
    story_time: '',
  })

  const chaptersQuery = useQuery({
    queryKey: queryKeys.chaptersAll(projectId),
    queryFn: () => listAllChapters(projectId),
    enabled: Boolean(projectId),
    placeholderData: (previousData) => previousData,
  })

  const characterAssetsQuery = useQuery({
    queryKey: queryKeys.assetsAll(projectId, 'character'),
    queryFn: () => listAllAssets({ projectId, type: 'character' }),
    enabled: Boolean(projectId),
    placeholderData: (previousData) => previousData,
  })

  const latestStatesQuery = useQuery({
    queryKey: queryKeys.characterStatesLatest(projectId),
    queryFn: () => listLatestCharacterStates(projectId),
    enabled: Boolean(projectId),
    placeholderData: (previousData) => previousData,
  })

  const chapterStatesQuery = useQuery({
    queryKey: queryKeys.characterStatesChapter(projectId, chapterScopeId),
    queryFn: () => listChapterCharacterStates(projectId, chapterScopeId),
    enabled: Boolean(projectId && chapterScopeId),
    placeholderData: (previousData) => previousData,
  })

  const timelineQuery = useQuery({
    queryKey: queryKeys.timeline(projectId),
    queryFn: () => listTimelineEvents(projectId),
    enabled: Boolean(projectId),
    placeholderData: (previousData) => previousData,
  })

  const sortedChapters = useMemo(
    () => [...(chaptersQuery.data ?? [])].sort((a, b) => a.ordinal - b.ordinal),
    [chaptersQuery.data],
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

  useEffect(() => {
    setEditingStateId(null)
    setStateDraft(null)
  }, [scope, chapterScopeId])

  const chaptersById = useMemo(
    () => Object.fromEntries(sortedChapters.map((chapter) => [chapter.id, chapter])),
    [sortedChapters],
  )

  const characterAssets = useMemo(
    () => characterAssetsQuery.data ?? [],
    [characterAssetsQuery.data],
  )

  const knownCharacterNames = useMemo(
    () => new Set(characterAssets.map(getCharacterNameFromAsset).filter((name): name is string => Boolean(name))),
    [characterAssets],
  )

  const activeStateQuery = scope === 'latest' ? latestStatesQuery : chapterStatesQuery
  const scopedStates = activeStateQuery.data ?? []
  const currentScopeChapter = chapterScopeId ? (chaptersById[chapterScopeId] ?? null) : null

  useEffect(() => {
    if (scopedStates.length === 0) {
      setSelectedStateId(null)
      return
    }

    if (!selectedStateId || !scopedStates.some((state) => state.id === selectedStateId)) {
      setSelectedStateId(scopedStates[0].id)
    }
  }, [scopedStates, selectedStateId])

  const sortedTimelineEvents = useMemo(() => (
    [...(timelineQuery.data ?? [])].sort((a, b) => {
      if (a.ordinal !== b.ordinal) return a.ordinal - b.ordinal
      return a.created_at.localeCompare(b.created_at)
    })
  ), [timelineQuery.data])

  useEffect(() => {
    if (sortedTimelineEvents.length === 0) {
      setSelectedEventId(null)
      return
    }

    if (showCreateEventForm) return

    if (!selectedEventId || !sortedTimelineEvents.some((event) => event.id === selectedEventId)) {
      setSelectedEventId(sortedTimelineEvents[0].id)
    }
  }, [selectedEventId, showCreateEventForm, sortedTimelineEvents])

  const selectedState = selectedStateId
    ? (scopedStates.find((state) => state.id === selectedStateId) ?? null)
    : null
  const selectedEvent = selectedEventId
    ? (sortedTimelineEvents.find((event) => event.id === selectedEventId) ?? null)
    : null

  const refreshCharacterStates = async (targetChapterId?: string) => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.characterStatesLatest(projectId) })

    if (chapterScopeId) {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.characterStatesChapter(projectId, chapterScopeId),
      })
    }

    if (targetChapterId && targetChapterId !== chapterScopeId) {
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
      setSelectedStateId(state.id)
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
      if (selectedStateId === state.id) {
        setSelectedStateId(null)
      }
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
    onSuccess: async (event) => {
      await refreshTimeline()
      setSelectedEventId(event.id)
      setShowCreateEventForm(false)
      setCreateEventDraft((current) => ({
        ...current,
        chapter_id: current.chapter_id || event.chapter_id,
        summary: '',
        story_time: '',
      }))
      toast('时间线事件已添加')
    },
    onError: (error) => toast(getErrorMessage(error), 'error'),
  })

  const updateTimelineMutation = useMutation({
    mutationFn: ({ eventId, input }: { eventId: string; input: UpdateTimelineEventInput }) =>
      updateTimelineEvent(projectId, eventId, input),
    onSuccess: async (event) => {
      await refreshTimeline()
      setSelectedEventId(event.id)
      setEditingEventId(null)
      setEventDraft(null)
      toast('时间线事件已更新')
    },
    onError: (error) => toast(getErrorMessage(error), 'error'),
  })

  const deleteTimelineMutation = useMutation({
    mutationFn: (event: TimelineEvent) => deleteTimelineEvent(projectId, event.id),
    onSuccess: async (_, event) => {
      await refreshTimeline()
      if (selectedEventId === event.id) {
        setSelectedEventId(null)
      }
      if (editingEventId === event.id) {
        setEditingEventId(null)
        setEventDraft(null)
      }
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

  const stateLatestUpdate = getLatestUpdatedAt(scopedStates)
  const overallLatestStateUpdate = getLatestUpdatedAt(latestStatesQuery.data ?? [])
  const timelineLatestUpdate = getLatestUpdatedAt(sortedTimelineEvents)
  const missingStateCount = Array.from(knownCharacterNames).filter((name) => !scopedStates.some((state) => state.character_name === name)).length

  const metadataMessages = [
    chaptersQuery.error ? getErrorMessage(chaptersQuery.error) : null,
    characterAssetsQuery.error ? getErrorMessage(characterAssetsQuery.error) : null,
  ].filter((message): message is string => Boolean(message))

  const isAnySyncing = chaptersQuery.isFetching
    || characterAssetsQuery.isFetching
    || latestStatesQuery.isFetching
    || chapterStatesQuery.isFetching
    || timelineQuery.isFetching

  const syncVariant = metadataMessages.length > 0 || activeStateQuery.error || timelineQuery.error
    ? 'danger'
    : isAnySyncing
      ? 'warning'
      : 'success'

  const syncLabel = syncVariant === 'danger'
    ? '同步异常'
    : syncVariant === 'warning'
      ? '同步中'
      : '已同步'

  const stateScopeLabel = scope === 'latest'
    ? '角色最新状态'
    : currentScopeChapter
      ? `第${currentScopeChapter.ordinal}章快照`
      : '章节快照'

  const stateScopeDescription = scope === 'latest'
    ? '按角色汇总最近一次章节快照，适合审查当前连续性。'
    : currentScopeChapter
      ? `当前查看第${currentScopeChapter.ordinal}章结束时抽取的状态快照。`
      : '当前查看指定章节结束时抽取的状态快照。'

  const showStatesLoading = activeStateQuery.isLoading && !activeStateQuery.data
  const showStatesEmpty = !showStatesLoading && !activeStateQuery.error && scopedStates.length === 0
  const showTimelineLoading = timelineQuery.isLoading && !timelineQuery.data
  const showTimelineEmpty = !showTimelineLoading && !timelineQuery.error && sortedTimelineEvents.length === 0

  const selectedStateChapter = selectedState ? (chaptersById[selectedState.chapter_id] ?? null) : null
  const selectedStateHasAsset = selectedState ? knownCharacterNames.has(selectedState.character_name) : false
  const isEditingSelectedState = Boolean(selectedState && editingStateId === selectedState.id && stateDraft)
  const originalSelectedStateDraft = selectedState ? buildStateDraft(selectedState) : null
  const selectedStateDirty = Boolean(
    stateDraft && originalSelectedStateDraft && !areStateDraftsEqual(stateDraft, originalSelectedStateDraft),
  )

  const selectedEventChapter = selectedEvent ? (chaptersById[selectedEvent.chapter_id] ?? null) : null
  const isEditingSelectedEvent = Boolean(selectedEvent && editingEventId === selectedEvent.id && eventDraft)
  const originalSelectedEventDraft = selectedEvent ? buildTimelineDraft(selectedEvent) : null
  const selectedEventDirty = Boolean(
    eventDraft && originalSelectedEventDraft && !areTimelineDraftsEqual(eventDraft, originalSelectedEventDraft),
  )

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Memory"
        title="记忆工作区"
        description="以列表审查为主，统一查看角色状态、时间线与关系概览，并明确展示同步范围与数据来源。"
      />

      <Card className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-lg font-medium tracking-tight text-foreground">工作区状态</h3>
            <p className="text-sm text-muted-foreground">
              状态与时间线来自章节抽取，可在此人工修订；角色档案来自设定资产，用于补充来源与缺口判断。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={syncVariant} dot>{syncLabel}</Badge>
            <Badge variant="default">{stateScopeLabel}</Badge>
          </div>
        </div>

        {metadataMessages.map((message) => (
          <ErrorState key={message} text={message} className="flex w-full" />
        ))}

        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <Badge variant="warning">覆盖提示</Badge>
          <p className="leading-6">
            角色状态与时间线来自章节抽取。若后续重新抽取同一章节，相关手动修订或补录内容可能被新的抽取结果覆盖。
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <MemoryMetricCard
            label="当前范围"
            value={`${scopedStates.length} 条角色状态`}
            description={stateScopeDescription}
            badge={<Badge variant={scope === 'latest' ? 'success' : 'default'}>{scope === 'latest' ? '最新' : '快照'}</Badge>}
          />
          <MemoryMetricCard
            label="新鲜度"
            value={stateLatestUpdate ? `状态 ${formatRelativeTime(stateLatestUpdate)}` : '等待首批数据'}
            description={timelineLatestUpdate
              ? `时间线最近更新于 ${formatRelativeTime(timelineLatestUpdate)}。`
              : '时间线尚未沉淀事件。'}
            badge={<Badge variant={isAnySyncing ? 'warning' : 'success'}>{isAnySyncing ? '同步中' : '已刷新'}</Badge>}
          />
          <MemoryMetricCard
            label="数据来源"
            value={`${characterAssets.length} 个角色档案 / ${sortedChapters.length} 章`}
            description="角色档案用于识别已建档人物；状态和事件由章节抽取生成，可回到原章节核对上下文。"
            badge={<Badge variant="default">可追溯</Badge>}
          />
        </div>

        <Tabs
          tabs={[
            { key: 'states', label: '角色状态', icon: <Users className="h-3.5 w-3.5" />, count: scopedStates.length },
            { key: 'timeline', label: '故事时间线', icon: <CalendarRange className="h-3.5 w-3.5" />, count: sortedTimelineEvents.length },
            { key: 'graph', label: '关系概览', icon: <GitBranch className="h-3.5 w-3.5" />, count: flowData.edges.length },
          ]}
          activeKey={workspaceView}
          onChange={(next) => setWorkspaceView(next as MemoryWorkspaceView)}
        />
      </Card>

      {workspaceView !== 'timeline' ? (
        <Card padding="sm" className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-medium text-foreground">角色状态范围</h3>
              <p className="mt-1 text-sm text-muted-foreground">{stateScopeDescription}</p>
            </div>
            {overallLatestStateUpdate ? (
              <Badge variant={activeStateQuery.isFetching ? 'warning' : 'default'}>
                全局最近更新 {formatRelativeTime(overallLatestStateUpdate)}
              </Badge>
            ) : null}
          </div>

          <Tabs
            tabs={[
              { key: 'latest', label: '最新状态' },
              { key: 'chapter', label: '按章节快照' },
            ]}
            activeKey={scope}
            onChange={(next) => setScope(next as MemoryScope)}
          />

          {scope === 'chapter' ? (
            <FormField label="章节范围">
              <Select value={chapterScopeId} onChange={(event) => setChapterScopeId(event.target.value)}>
                {sortedChapters.map((chapter) => (
                  <option key={chapter.id} value={chapter.id}>
                    第{chapter.ordinal}章 · {chapter.title}
                  </option>
                ))}
              </Select>
            </FormField>
          ) : null}
        </Card>
      ) : null}

      {workspaceView === 'states' ? (
        <Card padding="none" className="overflow-hidden">
          <div className="grid lg:grid-cols-[320px_minmax(0,1fr)]">
            <div className="space-y-4 border-b border-border p-4 lg:border-b-0 lg:border-r">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-medium text-foreground">角色状态列表</h3>
                  <p className="mt-1 text-xs text-muted-foreground">先选角色，再在右侧审查来源、连续性与修订内容。</p>
                </div>
                <Badge variant="default">{scopedStates.length} 人</Badge>
              </div>

              {activeStateQuery.error ? (
                <ErrorState text={getErrorMessage(activeStateQuery.error)} className="flex w-full" />
              ) : null}

              {showStatesLoading ? <LoadingState text="加载角色状态中..." className="flex w-full" /> : null}

              {showStatesEmpty ? (
                <EmptyState
                  icon={<Users className="h-5 w-5" />}
                  title="当前范围没有角色状态"
                  description={scope === 'latest' ? '继续生成章节后会自动出现。' : '切换章节以查看其他历史快照。'}
                  className="py-8"
                />
              ) : (
                <div className="space-y-1.5">
                  {scopedStates.map((state) => {
                    const relatedChapter = chaptersById[state.chapter_id] ?? null
                    const isActive = selectedStateId === state.id
                    const hasCharacterAsset = knownCharacterNames.has(state.character_name)

                    return (
                      <button
                        key={state.id}
                        type="button"
                        onClick={() => {
                          setSelectedStateId(state.id)
                          setEditingStateId(null)
                          setStateDraft(null)
                        }}
                        className={cn(
                          'w-full rounded-lg px-3 py-2.5 text-left transition-all duration-150',
                          isActive
                            ? 'border border-border border-l-[3px] border-l-[#0F172A] bg-card'
                            : 'border border-transparent hover:bg-muted',
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 space-y-1">
                            <p className="truncate text-sm font-medium tracking-tight text-foreground">{state.character_name}</p>
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                              <span>{relatedChapter ? `第${relatedChapter.ordinal}章` : '章节缺失'}</span>
                              <span>·</span>
                              <span>{formatRelativeTime(state.updated_at)}</span>
                            </div>
                          </div>
                          <Badge variant={hasCharacterAsset ? 'success' : 'warning'}>
                            {hasCharacterAsset ? '已建档' : '未建档'}
                          </Badge>
                        </div>
                        <p className="mt-2 truncate text-xs text-muted-foreground">
                          {state.location || state.emotional_state || '暂无位置或情绪记录'}
                        </p>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="p-6">
              {showStatesLoading ? (
                <LoadingState text="加载角色详情中..." className="flex" />
              ) : activeStateQuery.error ? (
                <ErrorState text={getErrorMessage(activeStateQuery.error)} className="flex" />
              ) : !selectedState ? (
                <EmptyState
                  icon={<Users className="h-5 w-5" />}
                  title="选择一个角色状态"
                  description="从左侧列表选择角色，在这里查看来源、关系与修订内容。"
                />
              ) : (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-medium tracking-tight text-foreground">{selectedState.character_name}</h3>
                        <Badge variant={scope === 'latest' ? 'success' : 'default'}>
                          {scope === 'latest' ? '当前最新' : '章节快照'}
                        </Badge>
                        <Badge variant={selectedStateHasAsset ? 'success' : 'warning'}>
                          {selectedStateHasAsset ? '已有角色设定' : '仅记忆记录'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {scope === 'latest'
                          ? '这条记录代表该角色当前最新一次章节抽取结果，可直接修订以维持连续性。'
                          : '这条记录保留了所选章节结束时的状态快照，适合对照历史变化。'}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{selectedStateChapter ? `来源：第${selectedStateChapter.ordinal}章 · ${selectedStateChapter.title}` : '来源章节已删除'}</span>
                        <span>·</span>
                        <span>更新于 {formatRelativeTime(selectedState.updated_at)}</span>
                        <span>·</span>
                        <span>{formatDate(selectedState.updated_at)}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onOpenChapter(selectedState.chapter_id)}
                        leftIcon={<ArrowRight className="h-3.5 w-3.5" />}
                      >
                        跳到章节
                      </Button>
                      {isEditingSelectedState ? (
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
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setEditingStateId(selectedState.id)
                            setStateDraft(buildStateDraft(selectedState))
                          }}
                          leftIcon={<PencilLine className="h-3.5 w-3.5" />}
                        >
                          编辑状态
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteStateMutation.mutate(selectedState)}
                        loading={deleteStateMutation.isPending && deleteStateMutation.variables?.id === selectedState.id}
                        className="text-red-500 hover:bg-red-50 hover:text-red-600"
                        leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                      >
                        删除
                      </Button>
                    </div>
                  </div>

                  {isEditingSelectedState && stateDraft ? (
                    <div className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
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
                      </div>

                      <FormField
                        label="角色关系"
                        description="以结构化条目编辑，保存时会自动回写为兼容后端的 JSON 数组。空条目会被忽略。"
                      >
                        <div className="space-y-3 rounded-xl border border-border bg-[#F8FAFC] p-4">
                          {stateDraft.relationships.length === 0 ? (
                            <p className="text-sm text-muted-foreground">暂无关系条目，点击下方按钮补充。</p>
                          ) : (
                            stateDraft.relationships.map((relationship, index) => (
                              <div key={`${relationship.target}-${index}`} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                                <Input
                                  value={relationship.target}
                                  onChange={(event) => {
                                    const next = [...stateDraft.relationships]
                                    next[index] = { ...relationship, target: event.target.value }
                                    setStateDraft({ ...stateDraft, relationships: next })
                                  }}
                                  placeholder="对方角色"
                                />
                                <Input
                                  value={relationship.relation}
                                  onChange={(event) => {
                                    const next = [...stateDraft.relationships]
                                    next[index] = { ...relationship, relation: event.target.value }
                                    setStateDraft({ ...stateDraft, relationships: next })
                                  }}
                                  placeholder="关系描述"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setStateDraft({
                                    ...stateDraft,
                                    relationships: stateDraft.relationships.filter((_, relationshipIndex) => relationshipIndex !== index),
                                  })}
                                  leftIcon={<X className="h-3.5 w-3.5" />}
                                >
                                  删除
                                </Button>
                              </div>
                            ))
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setStateDraft({
                              ...stateDraft,
                              relationships: [...stateDraft.relationships, { target: '', relation: '' }],
                            })}
                            leftIcon={<Plus className="h-3.5 w-3.5" />}
                          >
                            添加关系
                          </Button>
                        </div>
                      </FormField>

                      <FormField label="备注">
                        <Textarea
                          rows={5}
                          value={stateDraft.notes}
                          onChange={(event) => setStateDraft({
                            ...stateDraft,
                            notes: event.target.value,
                          })}
                        />
                      </FormField>

                      <div className="flex flex-wrap items-center gap-3">
                        <Button
                          size="sm"
                          onClick={() => updateStateMutation.mutate({
                            stateId: selectedState.id,
                            input: buildStateInput(stateDraft),
                          })}
                          disabled={!stateDraft.character_name.trim() || !selectedStateDirty}
                          loading={updateStateMutation.isPending}
                          leftIcon={<Save className="h-3.5 w-3.5" />}
                        >
                          保存状态
                        </Button>
                        <span className="text-xs text-muted-foreground">
                          状态仍以章节抽取为主，这里的修改用于补正连续性或关系描述；后续重新抽取同章时，手动修改可能被覆盖。
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-lg bg-[#F8FAFC] p-4">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">位置</p>
                          <p className="mt-2 text-sm text-foreground">{selectedState.location || '未记录'}</p>
                        </div>
                        <div className="rounded-lg bg-[#F8FAFC] p-4">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">情绪</p>
                          <p className="mt-2 text-sm text-foreground">{selectedState.emotional_state || '未记录'}</p>
                        </div>
                        <div className="rounded-lg bg-[#F8FAFC] p-4">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">来源</p>
                          <p className="mt-2 text-sm text-foreground">
                            {selectedStateChapter ? `第${selectedStateChapter.ordinal}章` : '章节缺失'}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-xl border border-border bg-white p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">角色关系</p>
                          <Badge variant="default">{parseRelationships(selectedState.relationships).length} 条</Badge>
                        </div>
                        {parseRelationships(selectedState.relationships).length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {parseRelationships(selectedState.relationships).map((relationship, index) => (
                              <Badge key={`${relationship.target}-${index}`} variant="default">
                                {relationship.target} · {relationship.relation}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-3 text-sm text-muted-foreground">暂无关系记录。</p>
                        )}
                      </div>

                      <div className="rounded-xl border border-dashed border-border bg-white px-4 py-3">
                        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">备注</p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">{selectedState.notes || '暂无备注'}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </Card>
      ) : null}

      {workspaceView === 'timeline' ? (
        <Card padding="none" className="overflow-hidden">
          <div className="grid lg:grid-cols-[320px_minmax(0,1fr)]">
            <div className="space-y-4 border-b border-border p-4 lg:border-b-0 lg:border-r">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-medium text-foreground">时间线列表</h3>
                  <p className="mt-1 text-xs text-muted-foreground">按事件顺序审查，再在右侧修订或补录细节。</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setShowCreateEventForm(true)
                    setEditingEventId(null)
                    setEventDraft(null)
                  }}
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                >
                  新建事件
                </Button>
              </div>

              {timelineQuery.error ? (
                <ErrorState text={getErrorMessage(timelineQuery.error)} className="flex w-full" />
              ) : null}

              {showTimelineLoading ? <LoadingState text="加载时间线中..." className="flex w-full" /> : null}

              {showTimelineEmpty ? (
                <EmptyState
                  icon={<Clock3 className="h-5 w-5" />}
                  title="暂无时间线事件"
                  description="章节抽取完成后会自动沉淀到这里，也可以手动补充缺失事件。"
                  action={
                    <Button
                      size="sm"
                      onClick={() => setShowCreateEventForm(true)}
                      leftIcon={<Plus className="h-3.5 w-3.5" />}
                    >
                      添加首个事件
                    </Button>
                  }
                  className="py-8"
                />
              ) : (
                <div className="space-y-1.5">
                  {sortedTimelineEvents.map((event) => {
                    const relatedChapter = chaptersById[event.chapter_id] ?? null
                    const isActive = !showCreateEventForm && selectedEventId === event.id

                    return (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => {
                          setShowCreateEventForm(false)
                          setSelectedEventId(event.id)
                          setEditingEventId(null)
                          setEventDraft(null)
                        }}
                        className={cn(
                          'w-full rounded-lg px-3 py-2.5 text-left transition-all duration-150',
                          isActive
                            ? 'border border-border border-l-[3px] border-l-[#0F172A] bg-card'
                            : 'border border-transparent hover:bg-muted',
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 space-y-1">
                            <p className="truncate text-sm font-medium tracking-tight text-foreground">{event.summary}</p>
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                              <span>{relatedChapter ? `第${relatedChapter.ordinal}章` : `第${event.ordinal}章`}</span>
                              <span>·</span>
                              <span>{event.story_time || '故事时间未填'}</span>
                            </div>
                          </div>
                          <Badge variant="default">{formatRelativeTime(event.updated_at)}</Badge>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="p-6">
              {showTimelineLoading ? (
                <LoadingState text="加载事件详情中..." className="flex" />
              ) : timelineQuery.error && sortedTimelineEvents.length === 0 ? (
                <ErrorState text={getErrorMessage(timelineQuery.error)} className="flex" />
              ) : showCreateEventForm ? (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-medium tracking-tight text-foreground">添加时间线事件</h3>
                      <Badge variant="default">手动补录</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      时间线通常来自章节抽取。这里适合补上漏掉的关键事件，或显式记录故事内时间。
                    </p>
                    <p className="text-xs leading-6 text-amber-700">
                      注意：如果后续重新抽取所选章节，这里新增的事件也可能被新的抽取结果覆盖。
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
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
                  </div>

                  <FormField label="事件摘要">
                    <Textarea
                      rows={5}
                      value={createEventDraft.summary}
                      onChange={(event) => setCreateEventDraft({
                        ...createEventDraft,
                        summary: event.target.value,
                      })}
                      placeholder="用一句话概括关键事件"
                    />
                  </FormField>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      size="sm"
                      onClick={() => createTimelineMutation.mutate(createEventDraft)}
                      disabled={!createEventDraft.chapter_id || !createEventDraft.summary.trim()}
                      loading={createTimelineMutation.isPending}
                      leftIcon={<Plus className="h-3.5 w-3.5" />}
                    >
                      添加事件
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowCreateEventForm(false)}
                      leftIcon={<X className="h-3.5 w-3.5" />}
                    >
                      取消
                    </Button>
                  </div>
                </div>
              ) : !selectedEvent ? (
                <EmptyState
                  icon={<Clock3 className="h-5 w-5" />}
                  title="选择一个时间线事件"
                  description="从左侧列表选择事件，在这里查看来源、故事时间与修订记录。"
                />
              ) : (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-medium tracking-tight text-foreground">时间线事件</h3>
                        <Badge variant="default">{selectedEventChapter ? `第${selectedEventChapter.ordinal}章` : `第${selectedEvent.ordinal}章`}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        事件按章节顺序排列。你可以修订摘要与故事时间，也可以回到原章节核对上下文。
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{selectedEventChapter ? selectedEventChapter.title : '章节已删除'}</span>
                        <span>·</span>
                        <span>更新于 {formatRelativeTime(selectedEvent.updated_at)}</span>
                        <span>·</span>
                        <span>{formatDate(selectedEvent.updated_at)}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {selectedEventChapter ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onOpenChapter(selectedEventChapter.id)}
                          leftIcon={<BookOpen className="h-3.5 w-3.5" />}
                        >
                          查看章节
                        </Button>
                      ) : null}
                      {isEditingSelectedEvent ? (
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
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setEditingEventId(selectedEvent.id)
                            setEventDraft(buildTimelineDraft(selectedEvent))
                          }}
                          leftIcon={<PencilLine className="h-3.5 w-3.5" />}
                        >
                          编辑事件
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteTimelineMutation.mutate(selectedEvent)}
                        loading={deleteTimelineMutation.isPending && deleteTimelineMutation.variables?.id === selectedEvent.id}
                        className="text-red-500 hover:bg-red-50 hover:text-red-600"
                        leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                      >
                        删除
                      </Button>
                    </div>
                  </div>

                  {isEditingSelectedEvent && eventDraft ? (
                    <div className="space-y-4">
                      <FormField label="事件摘要">
                        <Textarea
                          rows={5}
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
                      <div className="flex flex-wrap items-center gap-3">
                        <Button
                          size="sm"
                          onClick={() => updateTimelineMutation.mutate({
                            eventId: selectedEvent.id,
                            input: eventDraft,
                          })}
                          disabled={!eventDraft.summary.trim() || !selectedEventDirty}
                          loading={updateTimelineMutation.isPending}
                          leftIcon={<Save className="h-3.5 w-3.5" />}
                        >
                          保存事件
                        </Button>
                        <span className="text-xs text-muted-foreground">
                          修订会保留原章节归属，但后续重新抽取该章节时，手动修改可能被覆盖。
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="rounded-xl border border-border bg-[#F8FAFC] p-4">
                        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">事件摘要</p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">{selectedEvent.summary}</p>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-lg bg-[#F8FAFC] p-4">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">故事内时间</p>
                          <p className="mt-2 text-sm text-foreground">{selectedEvent.story_time || '未填写'}</p>
                        </div>
                        <div className="rounded-lg bg-[#F8FAFC] p-4">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">来源章节</p>
                          <p className="mt-2 text-sm text-foreground">
                            {selectedEventChapter ? `第${selectedEventChapter.ordinal}章 · ${selectedEventChapter.title}` : '章节已删除'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </Card>
      ) : null}

      {workspaceView === 'graph' ? (
        <Card className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-medium tracking-tight text-foreground">关系概览</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                图谱现在作为总览辅助使用，帮助快速识别缺失状态、关系边和角色设定覆盖情况。
              </p>
            </div>
            <Badge icon={<GitBranch className="h-3 w-3" />} variant="default">
              {flowData.edges.length} 条关系边
            </Badge>
          </div>

          {activeStateQuery.error ? (
            <ErrorState text={getErrorMessage(activeStateQuery.error)} className="flex w-full" />
          ) : showStatesLoading ? (
            <LoadingState text="加载关系概览中..." className="flex w-full" />
          ) : flowData.nodes.length === 0 ? (
            <EmptyState
              icon={<GitBranch className="h-5 w-5" />}
              title="暂无可视化数据"
              description="先在角色状态视图中沉淀角色与关系后，再回到这里检查整体连通性。"
              className="py-10"
            />
          ) : (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
              <div className="memory-flow h-[420px] overflow-hidden rounded-xl border border-border bg-[#F8FAFC]">
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

              <div className="space-y-3">
                <MemoryMetricCard
                  label="节点覆盖"
                  value={`${flowData.nodes.length} 个角色节点`}
                  description="包含角色设定中的人物、已沉淀状态的人物，以及关系中提到但尚未建档的人物。"
                />
                <MemoryMetricCard
                  label="关系缺口"
                  value={`${missingStateCount} 个已建档角色暂无状态`}
                  description="如果图中存在虚线节点，通常表示只有角色设定而没有最新状态，可回到章节继续补全。"
                  badge={<Badge variant={missingStateCount > 0 ? 'warning' : 'success'}>{missingStateCount > 0 ? '待补全' : '已覆盖'}</Badge>}
                />
                <div className="rounded-xl border border-border bg-white p-4">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">阅读提示</p>
                  <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                    <li>实线框：已有状态记录的角色。</li>
                    <li>虚线框：只有角色设定或关系引用，尚未沉淀状态。</li>
                    <li>箭头标签：当前范围内解析出的角色关系。</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </Card>
      ) : null}
    </div>
  )
}
