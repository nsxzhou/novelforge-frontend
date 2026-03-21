import { HttpError } from '@/shared/api/http-client'

const INTERNAL_ERROR_PREFIX_PATTERNS = [
  /^service:\s*/i,
  /^(conflict|invalid input|not found|dependency unavailable):\s*/i,
  /^(project\/outline validation|chapter loading|context loading|prompt rendering|generation record creation|llm stream setup):\s*/i,
  /^(generate chapter content|stream chapter content):\s*/i,
]

function stripInternalErrorPrefixes(message: string): string {
  let normalized = message.trim()

  for (;;) {
    let next = normalized
    for (const pattern of INTERNAL_ERROR_PREFIX_PATTERNS) {
      next = next.replace(pattern, '').trim()
    }
    if (next === normalized) {
      return normalized
    }
    normalized = next
  }
}

export function normalizeServiceErrorMessage(message: string): string {
  const normalized = stripInternalErrorPrefixes(message)

  if (/llm client is not configured/i.test(normalized)) {
    return 'AI Provider 未配置，请先在模型设置中启用可用 Provider。'
  }
  if (/prompt store is not configured|prompt template .* not found/i.test(normalized)) {
    return '章节提示词配置不可用，请检查提示词模板配置。'
  }
  if (/load project prompt override|render prompt template/i.test(normalized)) {
    return '章节提示词配置无效，请检查项目 Prompt 覆写或模板内容。'
  }
  if (/llm response content must not be empty/i.test(normalized)) {
    return 'AI 未返回有效内容，请重试。'
  }
  if (/context deadline exceeded|timed out|ai request timed out/i.test(normalized)) {
    return 'AI 请求超时，请增大 Provider 超时时间后重试。'
  }

  return normalized
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
    return normalizeServiceErrorMessage(error.message) || error.message
  }
  return '发生未知错误，请稍后重试。'
}
