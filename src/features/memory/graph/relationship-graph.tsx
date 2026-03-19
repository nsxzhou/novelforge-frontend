import { useCallback, useRef } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import type { LinkObject, NodeObject } from 'react-force-graph-2d'
import { Search, RotateCcw } from 'lucide-react'
import { Input } from '@/shared/ui/input'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { EmptyState } from '@/shared/ui/empty-state'
import type { CharacterState, RelationType, RelationTypeConfig } from '@/shared/api/types'
import { useGraphData, type ForceGraphLink, type ForceGraphNode } from './use-graph-data'
import { RelationLegend } from './relation-legend'

interface RelationshipGraphProps {
  scopedStates: CharacterState[]
  knownCharacterNames: Set<string>
  relationTypes: RelationTypeConfig[]
  isLoading?: boolean
}

type GraphCanvasNode = NodeObject<ForceGraphNode>
type GraphCanvasLink = LinkObject<ForceGraphNode, ForceGraphLink>

export function RelationshipGraph({
  scopedStates,
  knownCharacterNames,
  relationTypes,
  isLoading,
}: RelationshipGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const {
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
  } = useGraphData({ scopedStates, knownCharacterNames, relationTypes })

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

  // 自定义节点渲染
  const nodeCanvasObject = useCallback(
    (node: GraphCanvasNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const label = node.name
      const fontSize = 12 / globalScale
      const isSelected = selectedNodeId === node.id
      const hasState = node.data?.hasState ?? false
      const hasAsset = node.data?.hasAsset ?? false
      const x = node.x ?? 0
      const y = node.y ?? 0
      const val = node.val || 8

      // 绘制节点圆形
      const r = val / globalScale
      ctx.beginPath()
      ctx.arc(x, y, r, 0, 2 * Math.PI, false)
      ctx.fillStyle = isSelected ? '#0F172A' : hasState ? '#FFFFFF' : '#F8FAFC'
      ctx.fill()
      ctx.strokeStyle = isSelected ? '#0F172A' : '#CBD5E1'
      ctx.lineWidth = hasState ? 1.5 / globalScale : 1 / globalScale
      if (!hasState) {
        ctx.setLineDash([4 / globalScale, 4 / globalScale])
      }
      ctx.stroke()
      ctx.setLineDash([])

      // 绘制未建档标识
      if (!hasAsset) {
        ctx.fillStyle = '#F59E0B'
        ctx.font = `${10 / globalScale}px Sans-Serif`
        ctx.textAlign = 'center'
        ctx.fillText('!', x, y + r + 12 / globalScale)
      }

      // 绘制标签
      ctx.font = `${fontSize}px Sans-Serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = isSelected ? '#FFFFFF' : '#0F172A'
      ctx.fillText(label, x, y)
    },
    [selectedNodeId],
  )

  // 自定义边渲染
  const linkCanvasObject = useCallback(
    (link: GraphCanvasLink, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const start = typeof link.source === 'object' ? link.source : null
      const end = typeof link.target === 'object' ? link.target : null
      if (!start || !end || start.x == null || start.y == null || end.x == null || end.y == null) return

      const color = link.color || '#94A3B8'
      const label = link.label
      const isSelected = selectedNodeId && (start.id === selectedNodeId || end.id === selectedNodeId)
      const opacity = selectedNodeId && !isSelected ? 0.2 : 1

      // 绘制连线
      ctx.beginPath()
      ctx.moveTo(start.x, start.y)
      ctx.lineTo(end.x, end.y)
      ctx.strokeStyle = color
      ctx.globalAlpha = opacity
      ctx.lineWidth = (isSelected ? 2 : 1.5) / globalScale
      ctx.stroke()

      // 绘制箭头
      const dx = end.x - start.x
      const dy = end.y - start.y
      const angle = Math.atan2(dy, dx)
      const arrowLen = 8 / globalScale
      const endR = (end.val || 8) / globalScale
      const arrowX = end.x - Math.cos(angle) * endR
      const arrowY = end.y - Math.sin(angle) * endR

      ctx.beginPath()
      ctx.moveTo(arrowX, arrowY)
      ctx.lineTo(
        arrowX - arrowLen * Math.cos(angle - Math.PI / 6),
        arrowY - arrowLen * Math.sin(angle - Math.PI / 6),
      )
      ctx.lineTo(
        arrowX - arrowLen * Math.cos(angle + Math.PI / 6),
        arrowY - arrowLen * Math.sin(angle + Math.PI / 6),
      )
      ctx.closePath()
      ctx.fillStyle = color
      ctx.fill()

      // 绘制标签
      if (label && globalScale > 0.8) {
        const midX = (start.x + end.x) / 2
        const midY = (start.y + end.y) / 2
        const fontSize = 10 / globalScale

        ctx.font = `${fontSize}px Sans-Serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        // 背景
        const textWidth = ctx.measureText(label).width
        const padding = 4 / globalScale
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
        ctx.fillRect(
          midX - textWidth / 2 - padding,
          midY - fontSize / 2 - padding / 2,
          textWidth + padding * 2,
          fontSize + padding,
        )

        // 文字
        ctx.fillStyle = '#475569'
        ctx.fillText(label, midX, midY)
      }

      ctx.globalAlpha = 1
    },
    [selectedNodeId],
  )

  // 获取选中节点信息
  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null
  const selectedState = selectedNode?.data.state as CharacterState | undefined
  const hasAsset = selectedNode?.data.hasAsset

  // 相关关系
  const relatedLinks = links.filter((l) => {
    const sourceId = typeof l.source === 'string' ? l.source : l.source.id
    const targetId = typeof l.target === 'string' ? l.target : l.target.id
    return sourceId === selectedNodeId || targetId === selectedNodeId
  })

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
          {relationTypes.filter((t) => t.value !== 'custom').map((type) => (
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
            disabled={!selectedNodeId}
            title="清除选择"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          </div>
        </div>

        <RelationLegend relationTypes={relationTypes} />

        {/* 图表容器 */}
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div ref={containerRef} className="h-[450px] overflow-hidden rounded-xl border border-border bg-[#FAFAFA]">
          <ForceGraph2D
            ref={graphRef as never}
            graphData={{ nodes, links } as never}
            width={containerRef.current?.clientWidth || 800}
            height={450}
            backgroundColor="#FAFAFA"
            nodeCanvasObject={nodeCanvasObject}
            linkCanvasObject={linkCanvasObject}
            onNodeClick={(node) => onNodeClick(node as ForceGraphNode)}
            cooldownTicks={100}
            nodeRelSize={4}
            enablePointerInteraction={true}
          />
        </div>

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
                <Badge variant="default">{links.length} 条</Badge>
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
                    {selectedNode.name}
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
                {relatedLinks.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[11px] text-muted-foreground">
                      相关关系
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {relatedLinks.map((link, idx) => {
                        const sourceId = typeof link.source === 'string' ? link.source : link.source.id
                        const targetId = typeof link.target === 'string' ? link.target : link.target.id
                        return (
                          <Badge
                            key={`${sourceId}-${targetId}-${idx}`}
                            variant="default"
                            className="gap-1"
                          >
                            <div
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: link.color }}
                            />
                            {sourceId === selectedNodeId ? targetId : sourceId}
                            <span className="text-muted-foreground">·</span>
                            {link.label}
                          </Badge>
                        )
                      })}
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
        </div>
      </div>
    </div>
  )
}
