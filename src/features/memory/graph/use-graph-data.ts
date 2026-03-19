import { useMemo, useState, useCallback, useRef } from 'react'
import type { ForceGraphMethods } from 'react-force-graph-2d'
import type {
  CharacterRelation,
  CharacterState,
  RelationTypeConfig,
  RelationType,
} from '@/shared/api/types'
import { getRelationColor, getRelationLabel } from '@/shared/api/types'

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
  data: { relation: CharacterRelation }
}

interface UseGraphDataParams {
  scopedStates: CharacterState[]
  knownCharacterNames: Set<string>
  relationTypes: RelationTypeConfig[]
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
  graphRef: React.MutableRefObject<ForceGraphMethods<ForceGraphNode, ForceGraphLink> | null>
}

export function useGraphData({
  scopedStates,
  knownCharacterNames,
  relationTypes,
}: UseGraphDataParams): UseGraphDataResult {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTypes, setFilterTypes] = useState<Set<RelationType>>(new Set())
  const graphRef = useRef<ForceGraphMethods<ForceGraphNode, ForceGraphLink> | null>(null)

  // 生成图数据
  const { nodes, links } = useMemo(() => {
    // 收集所有角色名称
    const stateNames = new Set(scopedStates.map((s) => s.character_name))
    const relatedNames = new Set(
      scopedStates.flatMap((s) =>
        s.relationships.map((r) => r.target),
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
      state.relationships
        .filter((r) => filterTypes.size === 0 || filterTypes.has(r.type))
        .map((relation) => {
          const color = getRelationColor(relation.type, relationTypes)
          return {
            source: state.character_name,
            target: relation.target,
            label: getRelationLabel(relation, relationTypes),
            color,
            data: { relation },
          }
        }),
    )

    return { nodes, links }
  }, [scopedStates, knownCharacterNames, relationTypes, searchQuery, filterTypes])

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
