import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlignLeft, ArrowLeft, CheckCircle2, Save, Square, Undo2,
} from 'lucide-react'
import {
  confirmChapter,
  createChapterStream,
  getChapter,
  unconfirmChapter,
  updateChapter,
} from '@/shared/api/chapters'
import type { ChapterGenerationResponse } from '@/shared/api/chapters'
import { getProject } from '@/shared/api/projects'
import { queryKeys } from '@/shared/api/queries'
import { invalidateProjectChapters } from '@/shared/api/query-invalidation'
import { Button } from '@/shared/ui/button'
import { LoadingState, ErrorState } from '@/shared/ui/feedback'
import { StreamingText } from '@/shared/ui/streaming-text'
import { useToast } from '@/shared/ui/toast'
import { cn } from '@/shared/lib/cn'
import { wordCount } from '@/shared/lib/format'
import { getErrorMessage } from '@/shared/lib/error-message'
import { TiptapEditor } from '@/features/chapters/components/tiptap-editor'
import { WritingSidebar } from '@/features/chapters/writing-sidebar'
import { ChapterListSidebar } from '@/features/chapters/components/chapter-list-sidebar'
import { CreateChapterDialog, type CreateChapterFormValue } from '@/features/chapters/components/create-chapter-dialog'

type GenerateState = {
  projectId: string
  ordinal: number
  instruction?: string
  pov_character?: string
}

export function WritePage() {
  const { chapterId = '' } = useParams<{ chapterId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const genState = chapterId === 'new' ? (location.state as GenerateState | null) : null
  const isGenerateMode = genState !== null && Boolean(genState.projectId) && Boolean(genState.ordinal)

  const [editedContent, setEditedContent] = useState<string | null>(null)
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [genContent, setGenContent] = useState('')
  const [genError, setGenError] = useState<string | null>(null)
  const genAbortRef = useRef<AbortController | null>(null)
  const [ghostTextOn, setGhostTextOn] = useState(
    () => localStorage.getItem('ghostTextEnabled') !== 'false',
  )
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const chapterQuery = useQuery({
    queryKey: queryKeys.chapter(chapterId),
    queryFn: () => getChapter(chapterId),
    enabled: Boolean(chapterId) && chapterId !== 'new',
  })

  const projectId = genState?.projectId ?? chapterQuery.data?.project_id ?? ''

  const projectQuery = useQuery({
    queryKey: queryKeys.project(projectId),
    queryFn: () => getProject(projectId),
    enabled: Boolean(projectId),
  })

  const chapter = chapterQuery.data ?? null
  const isDraft = chapter?.status === 'draft'
  const hasUnsavedChanges = editedContent !== null && editedContent !== chapter?.content

  const refreshChapters = useCallback(async () => {
    await invalidateProjectChapters(queryClient, projectId, chapterId)
  }, [queryClient, projectId, chapterId])

  const saveMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      updateChapter(id, { content }),
    onSuccess: async () => {
      setEditedContent(null)
      await refreshChapters()
      toast('已保存')
    },
    onError: (err) => toast(getErrorMessage(err), 'error'),
  })

  const confirmMutation = useMutation({
    mutationFn: (id: string) => confirmChapter(id),
    onSuccess: async () => {
      await refreshChapters()
      toast('章节已确认')
    },
    onError: (err) => toast(getErrorMessage(err), 'error'),
  })

  const unconfirmMutation = useMutation({
    mutationFn: (id: string) => unconfirmChapter(id),
    onSuccess: async () => {
      setEditedContent(null)
      await refreshChapters()
      toast('已取消确认')
    },
    onError: (err) => toast(getErrorMessage(err), 'error'),
  })

  function handleSave() {
    if (!chapterId || editedContent === null) return
    saveMutation.mutate({ id: chapterId, content: editedContent })
  }

  function handleContentChange(plainText: string) {
    setEditedContent(plainText)
  }

  function handleContentUpdated() {
    setEditedContent(null)
  }

  function toggleGhostText() {
    setGhostTextOn((prev) => {
      const next = !prev
      localStorage.setItem('ghostTextEnabled', String(next))
      return next
    })
  }

  function goBack() {
    if (projectId) {
      navigate(`/projects/${projectId}?tab=chapters`)
    } else {
      navigate('/')
    }
  }

  function handleChapterSelect(id: string) {
    navigate(`/write/${id}`, { replace: true })
  }

  function handleCreateSubmit(value: CreateChapterFormValue) {
    if (!projectId) return
    setShowCreateDialog(false)
    navigate('/write/new', {
      state: { projectId, ...value },
      replace: isGenerateMode,
    })
  }

  function cancelGenerate() {
    genAbortRef.current?.abort()
    genAbortRef.current = null
    goBack()
  }

  // Auto-save debounced (3 seconds)
  useEffect(() => {
    if (!hasUnsavedChanges || !isDraft) return

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)

    saveTimerRef.current = setTimeout(() => {
      if (editedContent !== null && chapterId) {
        saveMutation.mutate({ id: chapterId, content: editedContent })
      }
    }, 3000)

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editedContent, hasUnsavedChanges, isDraft, chapterId])

  // Escape key to go back
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !leftSidebarOpen && !showCreateDialog) {
        goBack()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, leftSidebarOpen, showCreateDialog])

  // Reset edited content when chapter changes
  useEffect(() => {
    setEditedContent(null)
  }, [chapterId])

  // Start generation when entering generate mode
  useEffect(() => {
    if (!isGenerateMode || !genState) return

    setGenContent('')
    setGenError(null)

    const abort = new AbortController()
    genAbortRef.current = abort

    createChapterStream(genState.projectId, {
      ordinal: genState.ordinal,
      instruction: genState.instruction,
      pov_character: genState.pov_character,
    }, {
      onContent: (chunk: string) => {
        if (!abort.signal.aborted) setGenContent((prev) => prev + chunk)
      },
      onDone: async (result: ChapterGenerationResponse) => {
        if (abort.signal.aborted) return
        genAbortRef.current = null
        await invalidateProjectChapters(queryClient, genState.projectId, null)
        toast('章节已生成')
        navigate(`/write/${result.chapter.id}`, { replace: true })
      },
      onError: (errMsg: string) => {
        if (abort.signal.aborted) return
        genAbortRef.current = null
        setGenError(errMsg)
      },
    }, abort.signal)

    return () => {
      abort.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGenerateMode, location.key])

  // Cleanup on unmount
  useEffect(() => () => {
    genAbortRef.current?.abort()
  }, [])

  if (chapterQuery.isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingState text="加载章节中..." />
      </div>
    )
  }

  if (chapterQuery.error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <ErrorState text={getErrorMessage(chapterQuery.error)} />
      </div>
    )
  }

  if (isGenerateMode) {
    return (
      <div className="flex h-screen flex-col bg-background">
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-card px-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={goBack}
              className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">返回</span>
            </button>
            <span className="text-border">|</span>
            <h1 className="text-sm font-medium text-foreground">
              正在生成新章节...
            </h1>
          </div>
          <Button variant="danger" size="sm" onClick={cancelGenerate} leftIcon={<Square className="h-3.5 w-3.5" />}>
            取消生成
          </Button>
        </header>

        <main
          className={cn(
            'flex-1 overflow-y-auto transition-all duration-200',
            leftSidebarOpen ? 'ml-[260px]' : 'ml-0',
          )}
        >
          <div className="mx-auto max-w-3xl px-6 py-8">
            {genError ? (
              <div className="space-y-4">
                <ErrorState text={genError} />
                <div className="text-center">
                  <Button variant="secondary" onClick={goBack} leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}>
                    返回项目
                  </Button>
                </div>
              </div>
            ) : (
              <div className="px-2">
                <StreamingText content={genContent} isStreaming />
              </div>
            )}
          </div>
        </main>

        <ChapterListSidebar
          projectId={projectId}
          currentChapterId={null}
          onChapterSelect={handleChapterSelect}
          onCreateChapter={() => setShowCreateDialog(true)}
          isOpen={leftSidebarOpen}
          onToggle={() => setLeftSidebarOpen((prev) => !prev)}
        />

        <CreateChapterDialog
          projectId={projectId}
          open={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          onSubmit={handleCreateSubmit}
          isSubmitting={false}
        />
      </div>
    )
  }

  if (chapterId === 'new') {
    return (
      <div className="flex h-screen items-center justify-center">
        <ErrorState text="无效的生成请求" />
      </div>
    )
  }

  if (!chapter) {
    return (
      <div className="flex h-screen items-center justify-center">
        <ErrorState text="未找到章节" />
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Top bar */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-card px-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={goBack}
            className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">
              {projectQuery.data?.title ?? '返回'}
            </span>
          </button>
          <span className="text-border">|</span>
          <h1 className="text-sm font-medium text-foreground truncate max-w-[300px]">
            第{chapter.ordinal}章 · {chapter.title}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <AlignLeft className="h-3 w-3" />
            {wordCount(editedContent ?? chapter.content)} 字
          </span>

          {hasUnsavedChanges && isDraft && (
            <Button
              variant="secondary"
              size="sm"
              loading={saveMutation.isPending}
              onClick={handleSave}
              leftIcon={<Save className="h-3.5 w-3.5" />}
            >
              保存
            </Button>
          )}

          {isDraft ? (
            <Button
              variant="secondary"
              size="sm"
              loading={confirmMutation.isPending}
              disabled={hasUnsavedChanges}
              title={hasUnsavedChanges ? '请先保存编辑内容' : undefined}
              onClick={() => confirmMutation.mutate(chapter.id)}
              leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
            >
              确认
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              loading={unconfirmMutation.isPending}
              onClick={() => unconfirmMutation.mutate(chapter.id)}
              leftIcon={<Undo2 className="h-3.5 w-3.5" />}
            >
              取消确认
            </Button>
          )}
        </div>
      </header>

      {/* Editor area */}
      <main
        className={cn(
          'flex-1 overflow-y-auto transition-all duration-200',
          leftSidebarOpen ? 'ml-[260px]' : 'ml-0',
        )}
      >
        <div className="mx-auto max-w-3xl px-6 py-8">
          <div className="px-2">
            <TiptapEditor
              key={chapterId}
              content={chapter.content}
              readOnly={!isDraft}
              chapterId={chapterId}
              ghostTextEnabled={isDraft && ghostTextOn}
              onToggleGhostText={isDraft ? toggleGhostText : undefined}
              onContentChange={handleContentChange}
            />
          </div>
          {isDraft && (
            <p className="mt-3 text-center text-xs text-slate-300">
              输入后稍候，AI 将自动提供续写建议（Tab 接受 / Esc 取消）
            </p>
          )}
        </div>
      </main>

      {/* Left sidebar: Chapter list */}
      {projectId && (
        <ChapterListSidebar
          projectId={projectId}
          currentChapterId={chapterId}
          onChapterSelect={handleChapterSelect}
          onCreateChapter={() => setShowCreateDialog(true)}
          isOpen={leftSidebarOpen}
          onToggle={() => setLeftSidebarOpen((prev) => !prev)}
        />
      )}

      {/* Right sidebar: Navigation + AI */}
      {projectId && (
        <WritingSidebar
          projectId={projectId}
          currentChapterId={chapterId}
          chapterContent={editedContent ?? chapter.content}
          isDraft={isDraft}
          onContentUpdated={handleContentUpdated}
        />
      )}

      {/* Create chapter dialog */}
      {projectId && (
        <CreateChapterDialog
          projectId={projectId}
          open={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          onSubmit={handleCreateSubmit}
          isSubmitting={false}
        />
      )}
    </div>
  )
}
