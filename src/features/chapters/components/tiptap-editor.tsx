import { useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { plainTextToTiptapContent, tiptapContentToPlainText } from '../lib/content-converter'
import { EditorToolbar } from './editor-toolbar'

export type TextSelection = {
  text: string
  from: number
  to: number
}

type TiptapEditorProps = {
  content: string
  readOnly: boolean
  onContentChange?: (text: string) => void
  onSelectionChange?: (sel: TextSelection | null) => void
}

export function TiptapEditor({
  content,
  readOnly,
  onContentChange,
  onSelectionChange,
}: TiptapEditorProps) {
  const skipUpdateRef = useRef(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: '开始写作...' }),
    ],
    content: plainTextToTiptapContent(content),
    editable: !readOnly,
    onUpdate: ({ editor: ed }) => {
      if (skipUpdateRef.current) return
      const text = tiptapContentToPlainText(ed.getJSON())
      onContentChange?.(text)
    },
    onSelectionUpdate: ({ editor: ed }) => {
      const { from, to } = ed.state.selection
      if (from !== to) {
        const text = ed.state.doc.textBetween(from, to, '\n')
        onSelectionChange?.({ text, from, to })
      } else {
        onSelectionChange?.(null)
      }
    },
  })

  // Sync external content changes into the editor
  useEffect(() => {
    if (!editor) return
    const currentText = tiptapContentToPlainText(editor.getJSON())
    if (content !== currentText) {
      skipUpdateRef.current = true
      editor.commands.setContent(plainTextToTiptapContent(content))
      skipUpdateRef.current = false
    }
  }, [content, editor])

  // Sync readOnly prop
  useEffect(() => {
    editor?.setEditable(!readOnly)
  }, [readOnly, editor])

  return (
    <div>
      {!readOnly ? <EditorToolbar editor={editor} /> : null}
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none text-foreground [&_.tiptap]:min-h-[120px] [&_.tiptap]:outline-none [&_.tiptap_p]:leading-7 [&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.tiptap_p.is-editor-empty:first-child::before]:text-muted-foreground [&_.tiptap_p.is-editor-empty:first-child::before]:float-left [&_.tiptap_p.is-editor-empty:first-child::before]:h-0 [&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none"
      />
    </div>
  )
}
