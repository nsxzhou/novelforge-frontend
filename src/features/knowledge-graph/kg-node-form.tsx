import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createKGNode, updateKGNode } from '@/shared/api/knowledge-graph'
import type { CreateKGNodeInput, UpdateKGNodeInput } from '@/shared/api/knowledge-graph'
import { invalidateKnowledgeGraph } from '@/shared/api/query-invalidation'
import type { KGNode, KGNodeType } from '@/shared/api/types'
import { Dialog, DialogFooter } from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Input, Textarea, Select, FormField } from '@/shared/ui/input'
import { ErrorState } from '@/shared/ui/feedback'
import { useToast } from '@/shared/ui/toast'
import { getErrorMessage } from '@/shared/lib/error-message'

type KGNodeFormProps = {
  projectId: string
  node: KGNode | null
  open: boolean
  onClose: () => void
}

const NODE_TYPES: { value: KGNodeType; label: string }[] = [
  { value: 'character', label: '角色' },
  { value: 'location', label: '地点' },
  { value: 'event', label: '事件' },
  { value: 'item', label: '物品' },
]

export function KGNodeForm({ projectId, node, open, onClose }: KGNodeFormProps) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const isEdit = Boolean(node)

  const [type, setType] = useState<KGNodeType>('character')
  const [name, setName] = useState('')
  const [properties, setProperties] = useState('')
  const [sourceRef, setSourceRef] = useState('')

  useEffect(() => {
    if (node) {
      setType(node.type)
      setName(node.name)
      setProperties(node.properties ?? '')
      setSourceRef(node.source_ref ?? '')
    } else {
      setType('character')
      setName('')
      setProperties('')
      setSourceRef('')
    }
  }, [node, open])

  const createMutation = useMutation({
    mutationFn: (input: CreateKGNodeInput) => createKGNode(projectId, input),
    onSuccess: async () => {
      await invalidateKnowledgeGraph(queryClient, projectId)
      toast('节点已创建')
      onClose()
    },
    onError: (err) => toast(getErrorMessage(err), 'error'),
  })

  const updateMutation = useMutation({
    mutationFn: (input: UpdateKGNodeInput) => updateKGNode(projectId, node!.id, input),
    onSuccess: async () => {
      await invalidateKnowledgeGraph(queryClient, projectId)
      toast('节点已更新')
      onClose()
    },
    onError: (err) => toast(getErrorMessage(err), 'error'),
  })

  const isPending = createMutation.isPending || updateMutation.isPending
  const mutationError = createMutation.error || updateMutation.error

  function handleSubmit() {
    if (!name.trim()) return
    const input = {
      type,
      name: name.trim(),
      properties: properties.trim() || undefined,
      source_ref: sourceRef.trim() || undefined,
    }
    if (isEdit) {
      updateMutation.mutate(input)
    } else {
      createMutation.mutate(input)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? '编辑节点' : '新增节点'}
      size="md"
    >
      <div className="space-y-4">
        <FormField label="类型">
          <Select value={type} onChange={(e) => setType(e.target.value as KGNodeType)}>
            {NODE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="名称">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="节点名称"
          />
        </FormField>
        <FormField label="属性 (JSON)">
          <Textarea
            value={properties}
            onChange={(e) => setProperties(e.target.value)}
            rows={4}
            placeholder='{"key": "value"}'
          />
        </FormField>
        <FormField label="来源引用">
          <Input
            value={sourceRef}
            onChange={(e) => setSourceRef(e.target.value)}
            placeholder="可选，如章节ID或设定资产ID"
          />
        </FormField>
        {mutationError && <ErrorState text={getErrorMessage(mutationError)} />}
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>取消</Button>
        <Button onClick={handleSubmit} loading={isPending} disabled={!name.trim()}>
          {isEdit ? '保存' : '创建'}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
