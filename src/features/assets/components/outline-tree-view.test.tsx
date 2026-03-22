import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { OutlineTreeView } from './outline-tree-view'
import type { OutlineData } from '../schemas/outline-schema'

function renderTreeView(defaultValues: OutlineData, onChange = vi.fn()) {
  render(<OutlineTreeView defaultValues={defaultValues} onChange={onChange} />)
  return { onChange }
}

describe('OutlineTreeView', () => {
  it('allows deleting the only chapter in a volume and keeps the volume editable', async () => {
    const user = userEvent.setup()
    const { onChange } = renderTreeView({
      _schema: 'outline_v2',
      premise: '卷级规划优先',
      themes: [],
      central_conflict: '',
      volumes: [{
        title: '第一卷',
        summary: '',
        key_events: [],
        chapters: [{
          ordinal: 1,
          title: '第一章',
          summary: '',
          purpose: '',
          must_include: [],
        }],
      }],
      ending: '',
      notes: '',
    })

    await user.click(screen.getByRole('button', { name: '第 1 章 第一章' }))
    const deleteButton = screen.getByRole('button', { name: '删除章节' })
    expect(deleteButton.hasAttribute('disabled')).toBe(false)

    await user.click(deleteButton)

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: '第 1 章 第一章' })).toBeNull()
    })
    expect(screen.getByRole('button', { name: '添加章节' })).toBeTruthy()
    expect(onChange).toHaveBeenCalled()
    expect(vi.mocked(onChange).mock.lastCall?.[0]).toMatchObject({
      volumes: [{
        title: '第一卷',
        chapters: [],
      }],
    })
  })

  it('re-sequences chapter ordinals after deleting the first planned chapter', async () => {
    const user = userEvent.setup()
    const { onChange } = renderTreeView({
      _schema: 'outline_v2',
      premise: '连续序号校验',
      themes: [],
      central_conflict: '',
      volumes: [
        {
          title: '第一卷',
          summary: '',
          key_events: [],
          chapters: [{
            ordinal: 1,
            title: '第一章',
            summary: '',
            purpose: '',
            must_include: [],
          }],
        },
        {
          title: '第二卷',
          summary: '',
          key_events: [],
          chapters: [
            {
              ordinal: 2,
              title: '第二章',
              summary: '',
              purpose: '',
              must_include: [],
            },
            {
              ordinal: 3,
              title: '第三章',
              summary: '',
              purpose: '',
              must_include: [],
            },
          ],
        },
      ],
      ending: '',
      notes: '',
    })

    await user.click(screen.getByRole('button', { name: '第 1 章 第一章' }))
    await user.click(screen.getByRole('button', { name: '删除章节' }))

    await waitFor(() => {
      expect(onChange).toHaveBeenCalled()
    })

    expect(vi.mocked(onChange).mock.lastCall?.[0].volumes).toEqual([
      {
        title: '第一卷',
        summary: '',
        key_events: [],
        chapters: [],
      },
      {
        title: '第二卷',
        summary: '',
        key_events: [],
        chapters: [
          {
            ordinal: 1,
            title: '第二章',
            summary: '',
            purpose: '',
            must_include: [],
          },
          {
            ordinal: 2,
            title: '第三章',
            summary: '',
            purpose: '',
            must_include: [],
          },
        ],
      },
    ])
  })
})
