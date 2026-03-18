const STORAGE_KEY = 'inkmuse.client-user-id'

function createUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.random() * 16 | 0
    const value = char === 'x' ? random : (random & 0x3) | 0x8
    return value.toString(16)
  })
}

export function getClientUserId() {
  if (typeof window === 'undefined') {
    return createUUID()
  }

  const existing = window.localStorage.getItem(STORAGE_KEY)
  if (existing) return existing

  const next = createUUID()
  window.localStorage.setItem(STORAGE_KEY, next)
  return next
}
