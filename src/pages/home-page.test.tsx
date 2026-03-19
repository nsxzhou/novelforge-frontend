import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HomePage } from './home-page'

const listProjectsMock = vi.fn()
const getStatsMock = vi.fn()
const listChaptersMock = vi.fn()

vi.mock('@/shared/api/projects', () => ({
  listProjects: (...args: unknown[]) => listProjectsMock(...args),
}))

vi.mock('@/shared/api/stats', () => ({
  getStats: (...args: unknown[]) => getStatsMock(...args),
}))

vi.mock('@/shared/api/chapters', () => ({
  listChapters: (...args: unknown[]) => listChaptersMock(...args),
}))

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <HomePage />
      </QueryClientProvider>
    </MemoryRouter>,
  )
}

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listProjectsMock.mockResolvedValue([
      {
        id: 'project-1',
        title: '轨道回声',
        summary: '一部太空悬疑小说。',
        status: 'draft',
        created_at: '2026-03-18T00:00:00Z',
        updated_at: '2026-03-18T00:00:00Z',
        chapter_count: 3,
        word_count: 1234,
      },
    ])
    getStatsMock.mockResolvedValue({
      project_count: 1,
      chapter_count: 3,
      total_word_count: 1234,
      projects: [{ project_id: 'project-1', chapter_count: 3, word_count: 1234 }],
    })
  })

  it('renders aggregated stats without fetching chapter lists', async () => {
    renderPage()

    await waitFor(() => {
      expect(listProjectsMock).toHaveBeenCalledWith({ limit: 200, offset: 0 })
      expect(getStatsMock).toHaveBeenCalled()
    })

    expect(await screen.findByText('轨道回声')).toBeTruthy()
    expect(screen.getByText('1234')).toBeTruthy()
    expect(screen.getByText('3 章节')).toBeTruthy()
    expect(listChaptersMock).not.toHaveBeenCalled()
  })
})
