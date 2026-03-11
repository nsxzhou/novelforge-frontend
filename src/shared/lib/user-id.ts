const STORAGE_KEY = 'novelforge.user_id'

export function getUserId(): string {
  const existing = localStorage.getItem(STORAGE_KEY)
  if (existing) {
    return existing
  }

  const generated = crypto.randomUUID()
  localStorage.setItem(STORAGE_KEY, generated)
  return generated
}
