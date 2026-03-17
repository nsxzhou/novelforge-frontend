export function wordCount(text: string): number {
  return text.replace(/\s/g, '').length
}

export function formatRelativeTime(iso: string) {
  try {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return '刚刚'
    if (mins < 60) return `${mins} 分钟前`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours} 小时前`
    const days = Math.floor(hours / 24)
    return `${days} 天前`
  } catch {
    return iso
  }
}

export function getProjectStatusLabel(status: string): string {
  switch (status) {
    case 'draft':
      return '草稿'
    case 'active':
      return '进行中'
    case 'archived':
      return '已归档'
    default:
      return status
  }
}

export function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch {
    return iso
  }
}
