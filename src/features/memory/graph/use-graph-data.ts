import { useMemo, useState, useCallback } from 'react'
import type { GraphNode, GraphEdge } from 'reagraph'
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

interface UseGraphDataParams {
  scopedStates: CharacterState[]
  knownCharacterNames: Set<string>
}

interface UseGraphDataResult {
  nodes: GraphNode[]
  edges: GraphEdge[]
  selectedNode: GraphNode | null
  onNodeClick: (node: GraphNode) => void
  onClearSelection: () => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  filterTypes: Set<RelationType>
  setFilterTypes: (types: Set<RelationType> | ((prev: Set<RelationType>) => Set<RelationType>)) => void
  highlightEdges: string[]
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

  // 生成图数据
  const { nodes, edges } = useMemo(() => {
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
    const nodes: GraphNode[] = filteredNames.map((name) => {
      const state = stateByName.get(name)
      const hasState = Boolean(state)
      const hasAsset = knownCharacterNames.has(name)

      return {
        id: name,
        label: name,
        data: { state, hasState, hasAsset },
        fill: hasState ? '#FFFFFF' : '#F8FAFC',
      }
    })

    // 生成边
    const edges: GraphEdge[] = scopedStates.flatMap((state) =>
      parseRelations(state.relationships)
        .filter((r) => filterTypes.size === 0 || filterTypes.has(r.type))
        .map((relation, idx) => {
          const color = getRelationColor(relation.type)
          return {
            id: `${state.id}-${relation.target}-${idx}`,
            source: state.character_name,
            target: relation.target,
            label: getRelationLabel(relation),
            data: { relation, color },
            fill: color,
          }
        }),
    )

    return { nodes, edges }
  }, [scopedStates, knownCharacterNames, searchQuery, filterTypes])

  // 节点点击处理
  const onNodeClick = useCallback((node: GraphNode) => {
    setSelectedNodeId((prev) => (prev === node.id ? null : node.id))
  }, [])

  // 清除选择
  const onClearSelection = useCallback(() => {
    setSelectedNodeId(null)
  }, [])

  // 选中的节点数据
  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null
    return nodes.find((n) => n.id === selectedNodeId) || null
  }, [nodes, selectedNodeId])

  // 高亮的边（与选中节点相关）
  const highlightEdges = useMemo(() => {
    if (!selectedNodeId) return []
    return edges
      .filter((e) => e.source === selectedNodeId || e.target === selectedNodeId)
      .map((e) => e.id)
  }, [edges, selectedNodeId])

  return {
    nodes,
    edges,
    selectedNode,
    onNodeClick,
    onClearSelection,
    searchQuery,
    setSearchQuery,
    filterTypes,
    setFilterTypes,
    highlightEdges,
  }
}
