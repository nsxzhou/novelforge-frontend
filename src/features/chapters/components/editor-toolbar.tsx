import type { Editor } from '@tiptap/react'
import { Undo2, Redo2, Sparkles } from 'lucide-react'

type ToolbarButtonProps = {
  onClick: () => void
  disabled?: boolean
  title: string
  children: React.ReactNode
}

function ToolbarButton({ onClick, disabled, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="rounded p-1.5 transition-colors text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
    >
      {children}
    </button>
  )
}

type EditorToolbarProps = {
  editor: Editor | null
  ghostTextEnabled?: boolean
  onToggleGhostText?: () => void
}

export function EditorToolbar({ editor, ghostTextEnabled, onToggleGhostText }: EditorToolbarProps) {
  if (!editor) return null

  const iconSize = 'h-4 w-4'

  return (
    <div className="flex items-center gap-0.5 border-b border-border pb-2 mb-3">
      {onToggleGhostText !== undefined && (
        <button
          type="button"
          onClick={onToggleGhostText}
          title={ghostTextEnabled ? '关闭 AI 续写建议' : '开启 AI 续写建议'}
          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
            ghostTextEnabled
              ? 'bg-ink-50 text-ink-600 hover:bg-ink-100'
              : 'bg-muted text-muted-foreground hover:bg-stone-200'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          {ghostTextEnabled ? 'AI 续写 开' : 'AI 续写 关'}
        </button>
      )}

      <div className="mx-1.5 h-4 w-px bg-border" />

      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="撤销"
      >
        <Undo2 className={iconSize} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="重做"
      >
        <Redo2 className={iconSize} />
      </ToolbarButton>
    </div>
  )
}
