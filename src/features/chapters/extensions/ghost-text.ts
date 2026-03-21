import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { suggestChapterStream } from '@/shared/api/chapters'

export const ghostTextPluginKey = new PluginKey('ghostText')

export interface GhostTextOptions {
  chapterId: string | null
  debounceMs: number
  enabled: boolean
}

interface GhostTextState {
  suggestion: string | null
  position: number | null
}

export const GhostText = Extension.create<GhostTextOptions>({
  name: 'ghostText',

  addOptions() {
    return {
      chapterId: null,
      debounceMs: 1500,
      enabled: true,
    }
  },

  addStorage() {
    return {
      chapterId: this.options.chapterId as string | null,
      enabled: this.options.enabled,
      debounceMs: this.options.debounceMs,
    }
  },

  addProseMirrorPlugins() {
    const editor = this.editor

    return [
      new Plugin<GhostTextState>({
        key: ghostTextPluginKey,

        state: {
          init(): GhostTextState {
            return { suggestion: null, position: null }
          },
          apply(tr, prev): GhostTextState {
            const meta = tr.getMeta(ghostTextPluginKey)
            if (meta) return { ...prev, ...meta }
            if (tr.docChanged) return { suggestion: null, position: null }
            return prev
          },
        },

        props: {
          decorations(state) {
            const pluginState = ghostTextPluginKey.getState(state) as GhostTextState
            if (!pluginState?.suggestion || pluginState.position === null) {
              return DecorationSet.empty
            }
            const widget = Decoration.widget(
              pluginState.position,
              () => {
                const span = document.createElement('span')
                span.className = 'ghost-text'
                span.textContent = pluginState.suggestion
                return span
              },
              { side: 1 },
            )
            return DecorationSet.create(state.doc, [widget])
          },

          handleKeyDown(view, event) {
            const pluginState = ghostTextPluginKey.getState(view.state) as GhostTextState
            if (!pluginState?.suggestion) return false

            if (event.key === 'Tab') {
              event.preventDefault()
              const { suggestion, position } = pluginState
              if (suggestion && position !== null) {
                const tr = view.state.tr.insertText(suggestion, position)
                tr.setMeta(ghostTextPluginKey, { suggestion: null, position: null })
                view.dispatch(tr)
              }
              return true
            }

            if (event.key === 'Escape') {
              event.preventDefault()
              const tr = view.state.tr.setMeta(ghostTextPluginKey, {
                suggestion: null,
                position: null,
              })
              view.dispatch(tr)
              return true
            }

            return false
          },
        },

        view() {
          let timer: ReturnType<typeof setTimeout> | null = null
          let abortController: AbortController | null = null

          function clearPending() {
            if (timer) {
              clearTimeout(timer)
              timer = null
            }
            if (abortController) {
              abortController.abort()
              abortController = null
            }
          }

          return {
            update(view, prevState) {
              const docChanged = !view.state.doc.eq(prevState.doc)

              // Clear suggestion and abort on selection change (cursor moved)
              if (!docChanged && !view.state.selection.eq(prevState.selection)) {
                const currentState = ghostTextPluginKey.getState(view.state) as GhostTextState
                if (currentState?.suggestion) {
                  clearPending()
                  view.dispatch(
                    view.state.tr.setMeta(ghostTextPluginKey, {
                      suggestion: null,
                      position: null,
                    }),
                  )
                }
                return
              }

              if (!docChanged) return

              clearPending()

              // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TipTap's editor.storage is typed as Record<string, any>; no narrower type is exported
              const storage = (editor.storage as any).ghostText as {
                chapterId: string | null
                enabled: boolean
                debounceMs: number
              }
              if (!storage.enabled || !storage.chapterId) return

              // Only trigger if cursor is at the end of its parent text block
              const { $head } = view.state.selection
              if ($head.parentOffset < $head.parent.content.size) return

              // Don't trigger for empty documents
              const contentBeforeCursor = view.state.doc.textBetween(
                0,
                view.state.selection.head,
                '\n\n',
                '\n',
              )
              if (!contentBeforeCursor.trim()) return

              timer = setTimeout(() => {
                // Re-check storage values (may have changed)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TipTap's editor.storage is typed as Record<string, any>; no narrower type is exported
                const currentStorage = (editor.storage as any).ghostText as {
                  chapterId: string | null
                  enabled: boolean
                }
                if (!currentStorage.enabled || !currentStorage.chapterId) return

                const currentPos = view.state.selection.head
                const fullText = view.state.doc.textBetween(0, currentPos, '\n\n', '\n')
                if (!fullText.trim()) return
                const MAX_CONTEXT_CHARS = 500
                const text = fullText.length > MAX_CONTEXT_CHARS
                  ? fullText.slice(-MAX_CONTEXT_CHARS)
                  : fullText

                abortController = new AbortController()
                let accumulated = ''

                suggestChapterStream(
                  currentStorage.chapterId,
                  { content_before_cursor: text },
                  {
                    onContent(chunk: string) {
                      accumulated += chunk
                      try {
                        view.dispatch(
                          view.state.tr.setMeta(ghostTextPluginKey, {
                            suggestion: accumulated,
                            position: currentPos,
                          }),
                        )
                      } catch {
                        // Editor may have been destroyed; ignore
                      }
                    },
                    onDone() {
                      abortController = null
                    },
                    onError() {
                      try {
                        view.dispatch(
                          view.state.tr.setMeta(ghostTextPluginKey, {
                            suggestion: null,
                            position: null,
                          }),
                        )
                      } catch {
                        // Editor may have been destroyed; ignore
                      }
                      abortController = null
                    },
                  },
                  abortController.signal,
                )
              }, storage.debounceMs)
            },

            destroy() {
              clearPending()
            },
          }
        },
      }),
    ]
  },
})
