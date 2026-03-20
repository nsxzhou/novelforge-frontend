import { useRef, useCallback, useEffect } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
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
  const fgRef = useRef<any>(null)

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

  const nodeMap = new Map(nodes.map(n => [n.id, n]))

  const handleNodeClick = useCallback((node: GraphNode) => {
    const kgNode = nodeMap.get(node.id)
    if (kgNode && onNodeClick) {
      onNodeClick(kgNode)
    }
  }, [nodeMap, onNodeClick])

  const paintNode = useCallback((node: GraphNode, ctx: CanvasRenderingContext2D) => {
    const size = 6
    const color = NODE_COLORS[node.type] ?? '#6B7280'
    const isSelected = node.id === selectedNodeId
    const x = (node as any).x ?? 0
    const y = (node as any).y ?? 0

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
      fgRef.current.d3Force('charge')?.strength(-120)
      fgRef.current.d3Force('link')?.distance(60)
    }
  }, [])

  return (
    <div ref={containerRef} className="h-full w-full">
      <ForceGraph2D
        ref={fgRef}
        graphData={graphData}
        nodeCanvasObject={paintNode}
        nodePointerAreaPaint={(node: GraphNode, color: string, ctx: CanvasRenderingContext2D) => {
          const size = 8
          const x = (node as any).x ?? 0
          const y = (node as any).y ?? 0
          ctx.fillStyle = color
          ctx.fillRect(x - size, y - size, size * 2, size * 2)
        }}
        onNodeClick={handleNodeClick as any}
        linkColor={() => '#D1D5DB'}
        linkWidth={1}
        linkDirectionalArrowLength={4}
        linkDirectionalArrowRelPos={1}
        linkLabel={(link: any) => link.label}
        backgroundColor="transparent"
        width={containerRef.current?.clientWidth}
        height={containerRef.current?.clientHeight ?? 500}
      />
    </div>
  )
}
