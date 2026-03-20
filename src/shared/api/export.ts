import { requestRaw } from '@/shared/api/http-client'

export async function exportProject(projectId: string, format: 'md' | 'txt' | 'epub' = 'md'): Promise<void> {
  const response = await requestRaw(`/projects/${projectId}/export?format=${format}`, {
    method: 'GET',
    headers: {
      Accept: 'text/plain, text/markdown, application/epub+zip, application/octet-stream',
    },
  })

  const blob = await response.blob()
  const disposition = response.headers.get('Content-Disposition') ?? ''
  const fileNameMatch = disposition.match(/filename="(.+)"/)
  const fileName = fileNameMatch?.[1] ?? `export.${format}`

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
