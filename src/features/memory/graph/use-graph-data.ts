import { useMemo, useState, useCallback, useRef } from 'react'
import type {
  CharacterState,
  RelationType,
} from '@/shared/api/types'
import { getRelationColor, getRelationLabel } from '@/shared/api/types'

interface ParsedRelation {
  target: string
  type: RelationType
  custom_label?: string
  description?: string
}

export interface ForceGraphNode {
  id: string
  name: string
  color: string
  val: number
  data: { state?: CharacterState; hasState: boolean; hasAsset: boolean }
  x?: number
  y?: number
}

export interface ForceGraphLink {
  source: string | ForceGraphNode
  target: string | ForceGraphNode
  label: string
  color: string
  data: { relation: ParsedRelation }
}

interface UseGraphDataParams {
  scopedStates: CharacterState[]
  knownCharacterNames: Set<string>
}

interface UseGraphDataResult {
  nodes: ForceGraphNode[]
  links: ForceGraphLink[]
  selectedNodeId: string | null
  onNodeClick: (node: ForceGraphNode) => void
  onClearSelection: () => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  filterTypes: Set<RelationType>
  setFilterTypes: (types: Set<RelationType> | ((prev: Set<RelationType>) => Set<RelationType>)) => void
  graphRef: React.MutableRefObject<any>
}

// 解析关系数据（兼容新旧格式）
function parseRelations(value: string): ParsedRelation[] {
  if (!value?.trim()) return []

  try {
    const parsed = JSON.parse(value) as unknown
    if (!Array.isArray(parsed)) return []

    const result: ParsedRelation[] = []
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue

      const obj = item as Record<string, unknown>
      const target = String(obj.target ?? '').trim()
      if (!target) continue

      // 新格式：有 type 字段
      if (obj.type) {
        result.push({
          target,
          type: obj.type as RelationType,
          custom_label: obj.custom_label ? String(obj.custom_label) : undefined,
          description: obj.description ? String(obj.description) : undefined,
        })
        continue
      }

      // 旧格式兼容：relation 字段
      if (obj.relation) {
        result.push({
          target,
          type: 'custom' as RelationType,
          custom_label: String(obj.relation),
        })
      }
    }

    return result
  } catch {
    return []
  }
}

export function useGraphData({
  scopedStates,
  knownCharacterNames,
}: UseGraphDataParams): UseGraphDataResult {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTypes, setFilterTypes] = useState<Set<RelationType>>(new Set())
  const graphRef = useRef<any>(null)

  // 生成图数据
  const { nodes, links } = useMemo(() => {
    // 收集所有角色名称
    const stateNames = new Set(scopedStates.map((s) => s.character_name))
    const relatedNames = new Set(
      scopedStates.flatMap((s) =>
        parseRelations(s.relationships).map((r) => r.target),
      ),
    )
    const allNames = new Set([
      ...knownCharacterNames,
      ...stateNames,
      ...relatedNames,
    ])

    // 搜索过滤
    const filteredNames = Array.from(allNames).filter(
      (name) => !searchQuery || name.includes(searchQuery),
    )

    // 生成节点
    const stateByName = new Map(
      scopedStates.map((s) => [s.character_name, s]),
    )
    const nodes: ForceGraphNode[] = filteredNames.map((name) => {
      const state = stateByName.get(name)
      const hasState = Boolean(state)
      const hasAsset = knownCharacterNames.has(name)

      return {
        id: name,
        name,
        color: hasState ? '#FFFFFF' : '#F8FAFC',
        val: hasState ? 8 : 4,
        data: { state, hasState, hasAsset },
      }
    })

    // 生成边
    const links: ForceGraphLink[] = scopedStates.flatMap((state) =>
      parseRelations(state.relationships)
        .filter((r) => filterTypes.size === 0 || filterTypes.has(r.type))
        .map((relation) => {
          const color = getRelationColor(relation.type)
          return {
            source: state.character_name,
            target: relation.target,
            label: getRelationLabel(relation),
            color,
            data: { relation },
          }
        }),
    )

    return { nodes, links }
  }, [scopedStates, knownCharacterNames, searchQuery, filterTypes])

  // 节点点击处理
  const onNodeClick = useCallback((node: ForceGraphNode) => {
    setSelectedNodeId((prev) => (prev === node.id ? null : node.id))
  }, [])

  // 清除选择
  const onClearSelection = useCallback(() => {
    setSelectedNodeId(null)
  }, [])

  return {
    nodes,
    links,
    selectedNodeId,
    onNodeClick,
    onClearSelection,
    searchQuery,
    setSearchQuery,
    filterTypes,
    setFilterTypes,
    graphRef,
  }
}
