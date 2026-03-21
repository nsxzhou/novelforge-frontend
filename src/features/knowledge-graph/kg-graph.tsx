import { useRef, useCallback, useEffect, useMemo, useState } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import type { ForceGraphMethods, NodeObject, LinkObject } from 'react-force-graph-2d'
import type { KGNode, KGEdge, KGNodeType } from '@/shared/api/types'

const NODE_COLORS: Record<KGNodeType, string> = {
  character: '#3B82F6',
  location: '#10B981',
  event: '#F59E0B',
  item: '#8B5CF6',
}

type GraphNode = {
  id: string
  name: string
  type: KGNodeType
  val: number
  x?: number
  y?: number
}

type GraphLink = {
  source: string
  target: string
  label: string
}

type KGGraphProps = {
  nodes: KGNode[]
  edges: KGEdge[]
  onNodeClick?: (node: KGNode) => void
  selectedNodeId?: string
}

export function KGGraph({ nodes, edges, onNodeClick, selectedNodeId }: KGGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const fgRef = useRef<ForceGraphMethods<NodeObject<GraphNode>, LinkObject<GraphNode, GraphLink>> | undefined>(undefined)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        })
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const graphData = {
    nodes: nodes.map((n): GraphNode => ({
      id: n.id,
      name: n.name,
      type: n.type,
      val: 1,
    })),
    links: edges
      .filter(e => nodes.some(n => n.id === e.source_id) && nodes.some(n => n.id === e.target_id))
      .map((e): GraphLink => ({
        source: e.source_id,
        target: e.target_id,
        label: e.label || e.type,
      })),
  }

  const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes])

  const handleNodeClick = useCallback((node: NodeObject<GraphNode>) => {
    const kgNode = nodeMap.get(node.id ?? '')
    if (kgNode && onNodeClick) {
      onNodeClick(kgNode)
    }
  }, [nodeMap, onNodeClick])

  const paintNode = useCallback((node: NodeObject<GraphNode>, ctx: CanvasRenderingContext2D) => {
    const size = 6
    const color = NODE_COLORS[node.type] ?? '#6B7280'
    const isSelected = node.id === selectedNodeId
    const x = node.x ?? 0
    const y = node.y ?? 0

    ctx.beginPath()

    if (node.type === 'character') {
      // Circle
      ctx.arc(x, y, size, 0, 2 * Math.PI)
    } else if (node.type === 'event') {
      // Triangle
      ctx.moveTo(x, y - size)
      ctx.lineTo(x - size, y + size * 0.7)
      ctx.lineTo(x + size, y + size * 0.7)
      ctx.closePath()
    } else {
      // Square (location, item)
      ctx.rect(x - size, y - size, size * 2, size * 2)
    }

    ctx.fillStyle = color
    ctx.fill()

    if (isSelected) {
      ctx.strokeStyle = '#0F172A'
      ctx.lineWidth = 2
      ctx.stroke()
    }

    // Label
    ctx.fillStyle = '#374151'
    ctx.font = '3.5px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText(node.name, x, y + size + 2)
  }, [selectedNodeId])

  useEffect(() => {
    if (fgRef.current) {
      fgRef.current.d3Force('charge')?.strength(-80)
      fgRef.current.d3Force('link')?.distance(40)
    }
  }, [])

  return (
    <div ref={containerRef} className="h-full w-full overflow-hidden">
      {dimensions.width > 0 && dimensions.height > 0 && (
        <ForceGraph2D
          ref={fgRef}
          graphData={graphData}
          nodeCanvasObject={paintNode}
          nodePointerAreaPaint={(node: NodeObject<GraphNode>, color: string, ctx: CanvasRenderingContext2D) => {
            const size = 8
            const x = node.x ?? 0
            const y = node.y ?? 0
            ctx.fillStyle = color
            ctx.fillRect(x - size, y - size, size * 2, size * 2)
          }}
          onNodeClick={handleNodeClick}
          linkColor={() => '#D1D5DB'}
          linkWidth={1}
          linkDirectionalArrowLength={4}
          linkDirectionalArrowRelPos={1}
          linkLabel={(link: LinkObject<GraphNode, GraphLink>) => link.label ?? ''}
          backgroundColor="transparent"
          width={dimensions.width}
          height={dimensions.height}
        />
      )}
    </div>
  )
}
