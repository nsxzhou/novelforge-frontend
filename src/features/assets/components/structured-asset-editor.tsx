import { useCallback, useEffect, useState } from 'react'
import type { AssetType } from '@/shared/api/types'
import { Textarea } from '@/shared/ui/input'
import { Button } from '@/shared/ui/button'
import {
  detectContentFormat,
  parseStructuredContent,
  serializeStructuredContent,
  createDefaultStructuredContent,
  migrateToStructured,
  ASSET_TYPE_TO_SCHEMA,
  type StructuredContent,
} from '../schemas/asset-content'
import { CharacterForm } from './character-form'
import { WorldbuildingForm } from './worldbuilding-form'
import { OutlineForm } from './outline-form'
import type { CharacterData } from '../schemas/character-schema'
import type { WorldbuildingData } from '../schemas/worldbuilding-schema'
import type { OutlineData } from '../schemas/outline-schema'

type StructuredAssetEditorProps = {
  assetType: AssetType
  content: string
  onChange: (content: string) => void
}

export function StructuredAssetEditor({ assetType, content, onChange }: StructuredAssetEditorProps) {
  const [mode, setMode] = useState<'structured' | 'raw'>('structured')
  const [rawContent, setRawContent] = useState(content)

  const supportsStructured = assetType in ASSET_TYPE_TO_SCHEMA
  const format = detectContentFormat(content, assetType)

  // Reset mode when asset type changes
  useEffect(() => {
    if (!supportsStructured) {
      setMode('raw')
    } else {
      setMode('structured')
    }
    setRawContent(content)
  }, [assetType, content, supportsStructured])

  const handleStructuredChange = useCallback(
    (data: StructuredContent) => {
      const serialized = serializeStructuredContent(data)
      setRawContent(serialized)
      onChange(serialized)
    },
    [onChange],
  )

  const handleRawChange = useCallback(
    (value: string) => {
      setRawContent(value)
      onChange(value)
    },
    [onChange],
  )

  function handleMigrate() {
    const migrated = migrateToStructured(content, assetType)
    if (migrated) {
      const serialized = serializeStructuredContent(migrated)
      setRawContent(serialized)
      onChange(serialized)
      setMode('structured')
    }
  }

  function handleConvertToNew() {
    const defaults = createDefaultStructuredContent(assetType)
    if (defaults) {
      const serialized = serializeStructuredContent(defaults)
      setRawContent(serialized)
      onChange(serialized)
      setMode('structured')
    }
  }

  // Unsupported type: always raw
  if (!supportsStructured) {
    return (
      <Textarea
        rows={6}
        value={rawContent}
        onChange={(e) => handleRawChange(e.target.value)}
        placeholder="资产正文内容"
      />
    )
  }

  // Structured mode
  if (mode === 'structured') {
    const structured = parseStructuredContent(rawContent, assetType)

    if (!structured && rawContent.trim() !== '' && format === 'plain') {
      // Old plain text content — offer migration
      return (
        <div className="space-y-3">
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm text-amber-700">
              当前内容为纯文本格式。
            </p>
            <div className="mt-2 flex gap-2">
              <Button type="button" size="sm" onClick={handleMigrate}>
                转换为结构化（原文移入备注）
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => setMode('raw')}>
                保持原始文本
              </Button>
            </div>
          </div>
        </div>
      )
    }

    if (!structured && rawContent.trim() !== '' && format === 'structured') {
      return (
        <div className="space-y-3">
          <div className="rounded-md border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-700">
              当前结构化内容无法被编辑器解析。
              {assetType === 'outline' ? ' outline_v2 必须使用 volumes[].chapters[] 且章节 ordinal 连续。' : ''}
            </p>
            <div className="mt-2 flex gap-2">
              <Button type="button" size="sm" onClick={() => setMode('raw')}>
                切换到原始文本修复
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={handleConvertToNew}>
                新建结构化内容
              </Button>
            </div>
          </div>
        </div>
      )
    }

    const defaultData = structured ?? createDefaultStructuredContent(assetType)!

    return (
      <div className="space-y-3">
        <div className="flex justify-end">
          <Button type="button" variant="secondary" size="sm" onClick={() => setMode('raw')}>
            切换为原始文本
          </Button>
        </div>
        {assetType === 'character' ? (
          <CharacterForm
            defaultValues={defaultData as CharacterData}
            onChange={handleStructuredChange}
          />
        ) : assetType === 'worldbuilding' ? (
          <WorldbuildingForm
            defaultValues={defaultData as WorldbuildingData}
            onChange={handleStructuredChange}
          />
        ) : (
          <OutlineForm
            defaultValues={defaultData as OutlineData}
            onChange={handleStructuredChange}
          />
        )}
      </div>
    )
  }

  // Raw mode
  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-2">
        {format === 'structured' ? (
          <Button type="button" variant="secondary" size="sm" onClick={() => setMode('structured')}>
            切换为结构化表单
          </Button>
        ) : (
          <Button type="button" variant="secondary" size="sm" onClick={handleConvertToNew}>
            新建结构化内容
          </Button>
        )}
      </div>
      <Textarea
        rows={8}
        value={rawContent}
        onChange={(e) => handleRawChange(e.target.value)}
        placeholder="资产 JSON 或纯文本内容"
      />
    </div>
  )
}
