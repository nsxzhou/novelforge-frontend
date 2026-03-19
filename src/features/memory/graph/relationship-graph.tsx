import { Suspense, useCallback, Component, type ReactNode } from 'react'
import { GraphCanvas, lightTheme } from 'reagraph'
import { Search, RotateCcw, AlertTriangle } from 'lucide-react'
import { Input } from '@/shared/ui/input'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { EmptyState } from '@/shared/ui/empty-state'
import { RELATION_TYPES, type CharacterState, type RelationType } from '@/shared/api/types'
import { useGraphData } from './use-graph-data'
import { RelationLegend } from './relation-legend'

interface RelationshipGraphProps {
  scopedStates: CharacterState[]
  knownCharacterNames: Set<string>
  isLoading?: boolean
}

// 错误边界组件
class GraphErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    console.error('Graph rendering error:', error)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback
    }
    return this.props.children
  }
}

// WebGL 降级显示组件
function GraphFallback() {
  return (
    <div className="flex h-[450px] flex-col items-center justify-center rounded-xl border border-border bg-[#FAFAFA]">
      <AlertTriangle className="h-8 w-8 text-amber-500" />
      <p className="mt-3 text-sm font-medium text-foreground">无法渲染关系图</p>
      <p className="mt-1 text-xs text-muted-foreground">
        当前环境不支持 WebGL，请使用支持 WebGL 的浏览器
      </p>
    </div>
  )
}

// 图表加载中组件
function GraphLoading() {
  return (
    <div className="flex h-[450px] items-center justify-center rounded-xl border border-border bg-[#FAFAFA]">
      <p className="text-sm text-muted-foreground">加载图表中...</p>
    </div>
  )
}

export function RelationshipGraph({
  scopedStates,
  knownCharacterNames,
  isLoading,
}: RelationshipGraphProps) {
  const {
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
  } = useGraphData({ scopedStates, knownCharacterNames })

  // 切换过滤类型
  const toggleFilterType = useCallback(
    (type: RelationType) => {
      setFilterTypes((prev: Set<RelationType>) => {
        const next = new Set(prev)
        if (next.has(type)) {
          next.delete(type)
        } else {
          next.add(type)
        }
        return next
      })
    },
    [setFilterTypes],
  )

  // 获取选中节点的详细信息
  const selectedState = selectedNode?.data?.state as CharacterState | undefined
  const hasAsset = selectedNode?.data?.hasAsset as boolean | undefined

  if (isLoading) {
    return (
      <div className="flex h-[500px] items-center justify-center">
        <p className="text-sm text-muted-foreground">加载关系概览中...</p>
      </div>
    )
  }

  if (nodes.length === 0) {
    return (
      <EmptyState
        title="暂无可视化数据"
        description="先在角色状态视图中沉淀角色与关系后，再回到这里检查整体连通性。"
        className="py-10"
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="flex flex-wrap items-center gap-3">
        {/* 搜索 */}
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索角色..."
            className="pl-9"
          />
        </div>

        {/* 关系类型过滤 */}
        <div className="flex flex-wrap items-center gap-1.5">
          {RELATION_TYPES.filter((t) => t.value !== 'custom').map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => toggleFilterType(type.value)}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all duration-150 ${
                filterTypes.has(type.value)
                  ? 'text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
              style={
                filterTypes.has(type.value)
                  ? { backgroundColor: type.color }
                  : undefined
              }
            >
              <div
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: type.color }}
              />
              {type.label}
            </button>
          ))}
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            disabled={!selectedNode}
            title="清除选择"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 图表容器 */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <GraphErrorBoundary fallback={<GraphFallback />}>
          <Suspense fallback={<GraphLoading />}>
            <div className="h-[450px] overflow-hidden rounded-xl border border-border bg-[#FAFAFA]">
              <GraphCanvas
                nodes={nodes}
                edges={edges}
                theme={{
                  ...lightTheme,
                  node: {
                    ...lightTheme.node,
                    fill: '#FFFFFF',
                    activeFill: '#F1F5F9',
                    label: {
                      ...lightTheme.node.label,
                      color: '#0F172A',
                      activeColor: '#0F172A',
                    },
                  },
                  edge: {
                    ...lightTheme.edge,
                    fill: '#94A3B8',
                    activeFill: '#0F172A',
                    label: {
                      ...lightTheme.edge.label,
                      color: '#475569',
                      activeColor: '#0F172A',
                      fontSize: 11,
                    },
                  },
                }}
                layoutType="forceDirected2d"
                layoutOverrides={{
                  nodeStrength: -300,
                  linkDistance: 150,
                }}
                selections={selectedNode ? [selectedNode.id] : []}
                actives={highlightEdges.length > 0 ? [selectedNode?.id || ''] : []}
                onNodeClick={onNodeClick}
                draggable
                animated
                labelType="all"
                minNodeSize={35}
                maxNodeSize={50}
              />
            </div>
          </Suspense>
        </GraphErrorBoundary>

        {/* 侧边信息面板 */}
        <div className="space-y-4">
          {/* 统计信息 */}
          <div className="rounded-xl border border-border bg-white p-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              图谱概览
            </p>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">角色节点</span>
                <Badge variant="default">{nodes.length} 个</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">关系边</span>
                <Badge variant="default">{edges.length} 条</Badge>
              </div>
            </div>
          </div>

          {/* 选中节点详情 */}
          {selectedNode ? (
            <div className="rounded-xl border border-border bg-white p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                选中角色
              </p>
              <div className="mt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-base font-medium text-foreground">
                    {selectedNode.label}
                  </span>
                  <Badge variant={hasAsset ? 'success' : 'warning'}>
                    {hasAsset ? '已建档' : '未建档'}
                  </Badge>
                </div>

                {selectedState ? (
                  <>
                    <div className="space-y-1">
                      <p className="text-[11px] text-muted-foreground">位置</p>
                      <p className="text-sm text-foreground">
                        {selectedState.location || '未记录'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] text-muted-foreground">情绪</p>
                      <p className="text-sm text-foreground">
                        {selectedState.emotional_state || '未记录'}
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    该角色仅有设定档案，暂无状态记录
                  </p>
                )}

                {/* 相关关系 */}
                {edges.filter(
                  (e) =>
                    e.source === selectedNode.id ||
                    e.target === selectedNode.id,
                ).length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[11px] text-muted-foreground">
                      相关关系
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {edges
                        .filter(
                          (e) =>
                            e.source === selectedNode.id ||
                            e.target === selectedNode.id,
                        )
                        .map((edge) => (
                          <Badge
                            key={edge.id}
                            variant="default"
                            className="gap-1"
                          >
                            <div
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: edge.data?.color }}
                            />
                            {edge.source === selectedNode.id
                              ? edge.target
                              : edge.source}
                            <span className="text-muted-foreground">·</span>
                            {edge.label}
                          </Badge>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-white p-4">
              <p className="text-sm text-muted-foreground">
                点击节点查看角色详情
              </p>
            </div>
          )}

          {/* 图例 */}
          <RelationLegend />
        </div>
      </div>
    </div>
  )
}
