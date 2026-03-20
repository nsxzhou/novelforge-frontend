import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { updateCharacterState } from '@/shared/api/character-states'
import { invalidateCharacterStates } from '@/shared/api/query-invalidation'
import type {
  CharacterRelation,
  CharacterState,
  RelationType,
  RelationTypeConfig,
} from '@/shared/api/types'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogFooter } from '@/shared/ui/dialog'
import { FormField, Input, Select, Textarea } from '@/shared/ui/input'
import { useToast } from '@/shared/ui/toast'

interface RelationModalProps {
  open: boolean
  onClose: () => void
  projectId: string
  scopedStates: CharacterState[]
  knownCharacterNames: Set<string>
  relationTypes: RelationTypeConfig[]
  sourceName: string
  existingRelation?: CharacterRelation
  existingRelationIndex?: number
}

export function RelationModal({
  open,
  onClose,
  projectId,
  scopedStates,
  knownCharacterNames,
  relationTypes,
  sourceName,
  existingRelation,
  existingRelationIndex,
}: RelationModalProps) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const isEditing = existingRelation !== undefined && existingRelationIndex !== undefined

  const [target, setTarget] = useState('')
  const [type, setType] = useState<RelationType>('ally')
  const [customLabel, setCustomLabel] = useState('')
  const [description, setDescription] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Reset form when modal opens or existingRelation changes
  useEffect(() => {
    if (open) {
      if (existingRelation) {
        setTarget(existingRelation.target)
        setType(existingRelation.type)
        setCustomLabel(existingRelation.custom_label || '')
        setDescription(existingRelation.description || '')
      } else {
        setTarget('')
        setType('ally')
        setCustomLabel('')
        setDescription('')
      }
      setConfirmDelete(false)
    }
  }, [open, existingRelation])

  const sourceState = scopedStates.find((s) => s.character_name === sourceName)

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!sourceState) throw new Error('找不到源角色状态')
      if (!target) throw new Error('请选择目标角色')

      const newRelation: CharacterRelation = {
        target,
        type,
        ...(type === 'custom' && customLabel ? { custom_label: customLabel } : {}),
        ...(description ? { description } : {}),
      }

      const newRelations = [...sourceState.relationships]
      if (isEditing) {
        newRelations[existingRelationIndex] = newRelation
      } else {
        newRelations.push(newRelation)
      }

      return updateCharacterState(projectId, sourceState.id, {
        character_name: sourceState.character_name,
        location: sourceState.location,
        emotional_state: sourceState.emotional_state,
        relationships: newRelations,
        notes: sourceState.notes,
      })
    },
    onSuccess: () => {
      invalidateCharacterStates(queryClient, projectId)
      toast(isEditing ? '关系已更新' : '关系已添加', 'success')
      onClose()
    },
    onError: (err) => {
      toast(err instanceof Error ? err.message : '操作失败', 'error')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!sourceState || existingRelationIndex === undefined) return
      const newRelations = sourceState.relationships.filter(
        (_, i) => i !== existingRelationIndex,
      )
      return updateCharacterState(projectId, sourceState.id, {
        character_name: sourceState.character_name,
        location: sourceState.location,
        emotional_state: sourceState.emotional_state,
        relationships: newRelations,
        notes: sourceState.notes,
      })
    },
    onSuccess: () => {
      invalidateCharacterStates(queryClient, projectId)
      toast('关系已删除', 'success')
      onClose()
    },
    onError: (err) => {
      toast(err instanceof Error ? err.message : '删除失败', 'error')
    },
  })

  // Build target options: all known character names except sourceName
  const targetOptions = Array.from(knownCharacterNames)
    .concat(scopedStates.map((s) => s.character_name))
    .filter((name, idx, arr) => arr.indexOf(name) === idx && name !== sourceName)
    .sort()

  const isSaving = saveMutation.isPending
  const isDeleting = deleteMutation.isPending

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEditing ? '编辑关系' : '添加关系'}
      description={`${sourceName} 的角色关系`}
    >
      <div className="space-y-4">
        <FormField label="目标角色" required>
          <Select value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="">选择角色</option>
            {targetOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="关系类型" required>
          <Select
            value={type}
            onChange={(e) => setType(e.target.value as RelationType)}
          >
            {relationTypes.map((rt) => (
              <option key={rt.value} value={rt.value}>
                {rt.label}
              </option>
            ))}
          </Select>
        </FormField>

        {type === 'custom' && (
          <FormField label="自定义标签">
            <Input
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              placeholder="输入自定义关系名称"
            />
          </FormField>
        )}

        <FormField label="描述">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="关系描述（可选）"
            rows={2}
          />
        </FormField>
      </div>

      <DialogFooter className={isEditing ? 'justify-between' : undefined}>
        {isEditing && (
          <div>
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-red-600">确认删除？</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmDelete(false)}
                  disabled={isDeleting}
                >
                  取消
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => deleteMutation.mutate()}
                  disabled={isDeleting}
                >
                  {isDeleting ? '删除中...' : '确认'}
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-600"
                onClick={() => setConfirmDelete(true)}
                disabled={isSaving}
              >
                <Trash2 className="mr-1.5 h-4 w-4" />
                删除关系
              </Button>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>
            取消
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!target || isSaving}
          >
            {isSaving ? '保存中...' : '保存'}
          </Button>
        </div>
      </DialogFooter>
    </Dialog>
  )
}
