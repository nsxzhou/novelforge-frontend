import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, RefreshCw, Trash2 } from 'lucide-react'
import {
  listKGNodes, listKGEdges, syncKnowledgeGraph,
  deleteKGNode,
} from '@/shared/api/knowledge-graph'
import { queryKeys } from '@/shared/api/queries'
import { invalidateKnowledgeGraph } from '@/shared/api/query-invalidation'
import type { KGNode, KGNodeType } from '@/shared/api/types'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import { Badge } from '@/shared/ui/badge'
import { LoadingState, ErrorState } from '@/shared/ui/feedback'
import { EmptyState } from '@/shared/ui/empty-state'
import { Dialog, DialogFooter } from '@/shared/ui/dialog'
import { useToast } from '@/shared/ui/toast'
import { getErrorMessage } from '@/shared/lib/error-message'
import { cn } from '@/shared/lib/cn'
import { KGGraph } from './kg-graph'
import { KGNodeForm } from './kg-node-form'

const NODE_TYPE_LABELS: Record<KGNodeType, string> = {
  character: '角色',
  location: '地点',
  event: '事件',
  item: '物品',
}

const NODE_TYPE_COLORS: Record<KGNodeType, string> = {
  character: 'bg-blue-50 text-blue-600',
  location: 'bg-emerald-50 text-emerald-600',
  event: 'bg-orange-50 text-orange-600',
  item: 'bg-purple-50 text-purple-600',
}

type FilterType = 'all' | KGNodeType

type KGPanelProps = {
  projectId: string
}

export function KGPanel({ projectId }: KGPanelProps) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [filter, setFilter] = useState<FilterType>('all')
  const [selectedNode, setSelectedNode] = useState<KGNode | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingNode, setEditingNode] = useState<KGNode | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<KGNode | null>(null)

  const nodesQuery = useQuery({
    queryKey: queryKeys.kgNodes(projectId),
    queryFn: () => listKGNodes(projectId),
  })

  const edgesQuery = useQuery({
    queryKey: queryKeys.kgEdges(projectId),
    queryFn: () => listKGEdges(projectId),
  })

  const syncMutation = useMutation({
    mutationFn: () => syncKnowledgeGraph(projectId),
    onSuccess: async (data) => {
      await invalidateKnowledgeGraph(queryClient, projectId)
      toast(`同步完成：创建 ${data.nodes_created} 个节点，${data.edges_created} 条边`)
    },
    onError: (err) => toast(getErrorMessage(err), 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: (nodeId: string) => deleteKGNode(projectId, nodeId),
    onSuccess: async () => {
      await invalidateKnowledgeGraph(queryClient, projectId)
      setDeleteTarget(null)
      setSelectedNode(null)
      toast('节点已删除')
    },
    onError: (err) => toast(getErrorMessage(err), 'error'),
  })

  const nodes = nodesQuery.data ?? []
  const edges = edgesQuery.data ?? []
  const isLoading = nodesQuery.isLoading || edgesQuery.isLoading
  const error = nodesQuery.error || edgesQuery.error

  const filteredNodes = filter === 'all' ? nodes : nodes.filter(n => n.type === filter)

  function handleNodeClick(node: KGNode) {
    setSelectedNode(node)
  }

  function handleEdit(node: KGNode) {
    setEditingNode(node)
    setShowForm(true)
  }

  function handleCreate() {
    setEditingNode(null)
    setShowForm(true)
  }

  function handleFormClose() {
    setShowForm(false)
    setEditingNode(null)
  }

  // Find edges connected to selected node
  const selectedEdges = selectedNode
    ? edges.filter(e => e.source_id === selectedNode.id || e.target_id === selectedNode.id)
    : []

  function getNodeName(id: string) {
    return nodes.find(n => n.id === id)?.name ?? id
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-foreground">知识图谱</h3>
          <div className="flex items-center gap-1">
            {(['all', 'character', 'location', 'event', 'item'] as FilterType[]).map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={cn(
                  'rounded-md px-2 py-1 text-xs transition-colors',
                  filter === t
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:bg-muted',
                )}
              >
                {t === 'all' ? '全部' : NODE_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => syncMutation.mutate()}
            loading={syncMutation.isPending}
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            同步图谱
          </Button>
          <Button
            size="sm"
            onClick={handleCreate}
            leftIcon={<Plus className="h-3.5 w-3.5" />}
          >
            新增节点
          </Button>
        </div>
      </div>

      {isLoading && <LoadingState text="加载知识图谱..." />}
      {error && <ErrorState text={getErrorMessage(error)} />}

      {!isLoading && !error && nodes.length === 0 && (
        <EmptyState
          icon={<RefreshCw className="h-5 w-5" />}
          title="暂无图谱数据"
          description="点击「同步图谱」从已有设定中自动提取实体，或手动添加节点"
        />
      )}

      {!isLoading && !error && nodes.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
          <Card padding="none">
            <div className="h-[500px]">
              <KGGraph
                nodes={filteredNodes}
                edges={edges}
                onNodeClick={handleNodeClick}
                selectedNodeId={selectedNode?.id}
              />
            </div>
          </Card>

          {/* Detail sidebar */}
          <div className="space-y-3">
            {selectedNode ? (
              <Card>
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-foreground">{selectedNode.name}</h4>
                      <Badge className={cn('mt-1', NODE_TYPE_COLORS[selectedNode.type])}>
                        {NODE_TYPE_LABELS[selectedNode.type]}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(selectedNode)}>
                        编辑
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => setDeleteTarget(selectedNode)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {selectedNode.properties && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">属性</p>
                      <pre className="text-xs text-foreground bg-muted rounded-md p-2 overflow-auto max-h-32">
                        {selectedNode.properties}
                      </pre>
                    </div>
                  )}

                  {selectedNode.source_ref && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">来源引用</p>
                      <p className="text-xs text-foreground">{selectedNode.source_ref}</p>
                    </div>
                  )}

                  {selectedEdges.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        关系 ({selectedEdges.length})
                      </p>
                      <div className="space-y-1">
                        {selectedEdges.map((edge) => {
                          const isSource = edge.source_id === selectedNode.id
                          const otherName = isSource
                            ? getNodeName(edge.target_id)
                            : getNodeName(edge.source_id)
                          return (
                            <div
                              key={edge.id}
                              className="flex items-center gap-1.5 text-xs text-foreground"
                            >
                              <span className="text-muted-foreground">
                                {isSource ? '-->' : '<--'}
                              </span>
                              <span>{otherName}</span>
                              <Badge variant="default">{edge.label || edge.type}</Badge>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            ) : (
              <Card>
                <p className="text-xs text-muted-foreground text-center py-4">
                  点击图谱中的节点查看详情
                </p>
              </Card>
            )}

            <Card padding="sm">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>节点 {filteredNodes.length}</span>
                <span>边 {edges.length}</span>
              </div>
            </Card>
          </div>
        </div>
      )}

      <KGNodeForm
        projectId={projectId}
        node={editingNode}
        open={showForm}
        onClose={handleFormClose}
      />

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="删除节点"
        description={`确定要删除节点「${deleteTarget?.name}」吗？相关的边也会被删除。`}
        size="sm"
      >
        <DialogFooter>
          <Button variant="ghost" onClick={() => setDeleteTarget(null)}>取消</Button>
          <Button
            variant="danger"
            loading={deleteMutation.isPending}
            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            leftIcon={<Trash2 className="h-3.5 w-3.5" />}
          >
            确认删除
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
