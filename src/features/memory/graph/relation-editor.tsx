import { Trash2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input, Select } from '@/shared/ui/input'
import {
  getRelationColor,
  type CharacterRelation,
  type RelationTypeConfig,
  type RelationType,
} from '@/shared/api/types'

interface RelationEditorProps {
  relations: CharacterRelation[]
  onChange: (relations: CharacterRelation[]) => void
  availableTargets: string[]
  relationTypes: RelationTypeConfig[]
}

export function RelationEditor({
  relations,
  onChange,
  availableTargets,
  relationTypes,
}: RelationEditorProps) {
  const addRelation = () => {
    onChange([...relations, { target: '', type: 'ally' }])
  }

  const updateRelation = (
    index: number,
    updates: Partial<CharacterRelation>,
  ) => {
    const updated = [...relations]
    updated[index] = { ...updated[index], ...updates }
    onChange(updated)
  }

  const removeRelation = (index: number) => {
    onChange(relations.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">角色关系</label>
        <Button variant="ghost" size="sm" onClick={addRelation}>
          + 添加关系
        </Button>
      </div>

      {relations.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          暂无关系，点击上方按钮添加
        </p>
      ) : (
        <div className="space-y-2">
          {relations.map((relation, index) => (
            <div key={index} className="flex items-center gap-2">
              {/* 目标角色选择 */}
              <Select
                value={relation.target}
                onChange={(e) =>
                  updateRelation(index, { target: e.target.value })
                }
              >
                <option value="">选择角色</option>
                {availableTargets.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </Select>

              {/* 关系类型选择 */}
              <Select
                value={relation.type}
                onChange={(e) =>
                  updateRelation(index, {
                    type: e.target.value as RelationType,
                  })
                }
              >
                {relationTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </Select>

              {/* 自定义标签（仅 custom 类型） */}
              {relation.type === 'custom' && (
                <Input
                  value={relation.custom_label || ''}
                  onChange={(e) =>
                    updateRelation(index, { custom_label: e.target.value })
                  }
                  placeholder="自定义关系"
                  className="w-24"
                />
              )}

              {/* 关系类型颜色指示 */}
              <div
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: getRelationColor(relation.type, relationTypes) }}
              />

              {/* 删除按钮 */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeRelation(index)}
                className="shrink-0 text-red-500 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
