import { HttpError } from '@/shared/api/http-client'

function normalizeServiceErrorMessage(message: string): string {
  return message
    .replace(/^service:\s*conflict:\s*/i, '')
    .replace(/^service:\s*invalid input:\s*/i, '')
    .replace(/^service:\s*not found:\s*/i, '')
    .trim()
}

// 统一把未知错误收敛成可展示的中文提示。
export function getErrorMessage(error: unknown): string {
  if (error instanceof HttpError) {
    const normalizedMessage = normalizeServiceErrorMessage(error.message)
    if (error.status === 409) {
      return normalizedMessage
        ? `并发冲突，请刷新后重试（${normalizedMessage}）。`
        : '并发冲突，请刷新后重试。'
    }
    return normalizedMessage || error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return '发生未知错误，请稍后重试。'
}
