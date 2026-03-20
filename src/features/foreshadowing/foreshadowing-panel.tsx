import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Eye } from 'lucide-react'
import { listForeshadowings } from '@/shared/api/foreshadowing'
import { listAllChapters } from '@/shared/api/chapters'
import { queryKeys } from '@/shared/api/queries'
import type { Foreshadowing } from '@/shared/api/types'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import { LoadingState, ErrorState } from '@/shared/ui/feedback'
import { EmptyState } from '@/shared/ui/empty-state'
import { getErrorMessage } from '@/shared/lib/error-message'
import { ForeshadowingTimeline } from './foreshadowing-timeline'
import { ForeshadowingForm } from './foreshadowing-form'

type ForeshadowingPanelProps = {
  projectId: string
}

export function ForeshadowingPanel({ projectId }: ForeshadowingPanelProps) {
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<Foreshadowing | null>(null)

  const foreshadowingsQuery = useQuery({
    queryKey: queryKeys.foreshadowings(projectId),
    queryFn: () => listForeshadowings(projectId),
  })

  const chaptersQuery = useQuery({
    queryKey: queryKeys.chaptersAll(projectId),
    queryFn: () => listAllChapters(projectId),
  })

  const foreshadowings = foreshadowingsQuery.data ?? []
  const chapters = chaptersQuery.data ?? []
  const isLoading = foreshadowingsQuery.isLoading || chaptersQuery.isLoading
  const error = foreshadowingsQuery.error || chaptersQuery.error

  function handleSelect(fs: Foreshadowing) {
    setEditingItem(fs)
    setShowForm(true)
  }

  function handleClose() {
    setShowForm(false)
    setEditingItem(null)
  }

  function handleCreate() {
    setEditingItem(null)
    setShowForm(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">伏笔时间线</h3>
        <Button
          size="sm"
          onClick={handleCreate}
          disabled={chapters.length === 0}
          leftIcon={<Plus className="h-3.5 w-3.5" />}
        >
          新增伏笔
        </Button>
      </div>

      {isLoading && <LoadingState text="加载伏笔数据..." />}
      {error && <ErrorState text={getErrorMessage(error)} />}

      {!isLoading && !error && foreshadowings.length === 0 && (
        <EmptyState
          icon={<Eye className="h-5 w-5" />}
          title="暂无伏笔"
          description={
            chapters.length === 0
              ? '请先创建章节，再添加伏笔线索'
              : '添加伏笔来追踪故事线索的埋设与揭示'
          }
        />
      )}

      {!isLoading && !error && foreshadowings.length > 0 && chapters.length > 0 && (
        <Card>
          <ForeshadowingTimeline
            foreshadowings={foreshadowings}
            chapters={chapters}
            onSelect={handleSelect}
          />
        </Card>
      )}

      <ForeshadowingForm
        projectId={projectId}
        chapters={chapters}
        foreshadowing={editingItem}
        open={showForm}
        onClose={handleClose}
      />
    </div>
  )
}
