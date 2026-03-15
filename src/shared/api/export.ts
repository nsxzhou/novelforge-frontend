import { appEnv } from '@/shared/config/env'

export async function exportProject(projectId: string, format: 'md' | 'txt' = 'md'): Promise<void> {
  const response = await fetch(
    `${appEnv.apiBaseUrl}/projects/${projectId}/export?format=${format}`,
  )

  if (!response.ok) {
    const text = await response.text().catch(() => `HTTP ${response.status}`)
    throw new Error(text)
  }

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
