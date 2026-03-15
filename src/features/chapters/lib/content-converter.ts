import type { JSONContent } from '@tiptap/react'

/**
 * 将纯文本转换为 Tiptap JSON 内容。
 * 按 \n\n 分段落，段落内 \n 转为 hardBreak。
 */
export function plainTextToTiptapContent(text: string): JSONContent {
  if (!text) {
    return { type: 'doc', content: [{ type: 'paragraph' }] }
  }

  const paragraphs = text.split('\n\n')

  const content: JSONContent[] = paragraphs.map((para) => {
    if (para === '') {
      return { type: 'paragraph' }
    }

    const lines = para.split('\n')
    const children: JSONContent[] = []

    for (let i = 0; i < lines.length; i++) {
      if (i > 0) {
        children.push({ type: 'hardBreak' })
      }
      if (lines[i] !== '') {
        children.push({ type: 'text', text: lines[i] })
      }
    }

    return children.length > 0
      ? { type: 'paragraph', content: children }
      : { type: 'paragraph' }
  })

  return { type: 'doc', content }
}

/**
 * 将 Tiptap JSON 内容转换为纯文本。
 * 段落间以 \n\n 分隔，hardBreak 转为 \n。
 */
export function tiptapContentToPlainText(doc: JSONContent): string {
  if (!doc.content || doc.content.length === 0) {
    return ''
  }

  const paragraphs = doc.content.map((node) => {
    if (!node.content || node.content.length === 0) {
      return ''
    }

    return node.content
      .map((child) => {
        if (child.type === 'hardBreak') return '\n'
        return child.text ?? ''
      })
      .join('')
  })

  return paragraphs.join('\n\n')
}
