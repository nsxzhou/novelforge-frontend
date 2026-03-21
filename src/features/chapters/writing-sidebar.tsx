import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { LucideIcon } from 'lucide-react'
import {
  ClipboardCheck, Heart, MapPin,
  RefreshCcw, Sparkles, Users, WandSparkles, X,
} from 'lucide-react'
import { listLatestCharacterStates } from '@/shared/api/character-states'
import { queryKeys } from '@/shared/api/queries'
import { cn } from '@/shared/lib/cn'
import { AIOperationsPanel } from './components/ai-operations-panel'

type PanelKey = 'characters' | 'continue' | 'rewrite' | 'review' | 'polish'

type WritingSidebarProps = {
  projectId: string
  currentChapterId: string
  chapterContent: string
  isDraft: boolean
  onContentUpdated?: () => void
}

const PANEL_TITLES: Record<PanelKey, string> = {
  characters: '角色状态',
  continue: '续写',
  rewrite: '改写',
  review: '评审',
  polish: '润色',
}

const AI_PANELS: PanelKey[] = ['continue', 'rewrite', 'review', 'polish']

function ToolbarIcon({
  icon: Icon,
  label,
  panel,
  activePanel,
  onClick,
}: {
  icon: LucideIcon
  label: string
  panel: PanelKey
  activePanel: PanelKey | null
  onClick: (panel: PanelKey) => void
}) {
  const isActive = activePanel === panel
  return (
    <button
      type="button"
      title={label}
      onClick={() => onClick(panel)}
      className={cn(
        'flex h-10 w-10 items-center justify-center rounded-full border bg-white shadow-sm transition-all',
        isActive
          ? 'border-primary/30 bg-primary/10 text-primary shadow-md'
          : 'border-border text-muted-foreground hover:bg-muted hover:shadow-md',
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  )
}

export function WritingSidebar({
  projectId,
  currentChapterId,
  chapterContent,
  isDraft,
  onContentUpdated,
}: WritingSidebarProps) {
  const [activePanel, setActivePanel] = useState<PanelKey | null>(null)

  function togglePanel(panel: PanelKey) {
    setActivePanel((prev) => prev === panel ? null : panel)
  }

  const characterStatesQuery = useQuery({
    queryKey: queryKeys.characterStatesLatest(projectId),
    queryFn: () => listLatestCharacterStates(projectId),
  })

  const characterStates = characterStatesQuery.data ?? []
  const isAIPanel = AI_PANELS.includes(activePanel as PanelKey)

  return (
    <>
      {/* Popup panel — visible when activePanel is set */}
      {activePanel && (
        <aside className="fixed right-[4.5rem] top-1/2 z-20 w-[340px] -translate-y-1/2 rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
          <div className="max-h-[70vh] overflow-y-auto p-5">
            <div className="sticky top-0 z-10 mb-4 flex items-center justify-between border-b border-border bg-card pb-3">
              <h3 className="text-sm font-semibold text-foreground">
                {PANEL_TITLES[activePanel]}
              </h3>
              <button
                type="button"
                onClick={() => togglePanel(activePanel)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Characters panel */}
            {activePanel === 'characters' && (
              <div className="space-y-2">
                {characterStates.length > 0 ? (
                  characterStates.map((cs) => (
                    <div
                      key={cs.id}
                      className="rounded-lg border border-border bg-white p-2.5 text-sm"
                    >
                      <p className="font-medium text-foreground">{cs.character_name}</p>
                      <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                        {cs.location && (
                          <p className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {cs.location}
                          </p>
                        )}
                        {cs.emotional_state && (
                          <p className="flex items-center gap-1">
                            <Heart className="h-3 w-3" />
                            {cs.emotional_state}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    暂无角色状态数据
                  </p>
                )}
              </div>
            )}

            {/* AI panels */}
            {isAIPanel && currentChapterId && (
              <AIOperationsPanel
                activeOperation={activePanel as 'continue' | 'rewrite' | 'review' | 'polish'}
                chapterId={currentChapterId}
                projectId={projectId}
                chapterContent={chapterContent}
                isDraft={isDraft}
                onContentUpdated={onContentUpdated}
              />
            )}
            {isAIPanel && !currentChapterId && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                请先选择一个章节
              </p>
            )}
          </div>
        </aside>
      )}

      {/* Persistent toolbar — always visible */}
      <div className="fixed right-6 top-1/2 z-30 flex -translate-y-1/2 flex-col items-center gap-2">
        <ToolbarIcon icon={Users} label="角色" panel="characters" activePanel={activePanel} onClick={togglePanel} />
        <div className="h-px w-6 bg-border/60" />
        <ToolbarIcon icon={RefreshCcw} label="续写" panel="continue" activePanel={activePanel} onClick={togglePanel} />
        <ToolbarIcon icon={WandSparkles} label="改写" panel="rewrite" activePanel={activePanel} onClick={togglePanel} />
        <ToolbarIcon icon={ClipboardCheck} label="评审" panel="review" activePanel={activePanel} onClick={togglePanel} />
        <ToolbarIcon icon={Sparkles} label="润色" panel="polish" activePanel={activePanel} onClick={togglePanel} />
      </div>
    </>
  )
}
