const rawBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined

export const appEnv = {
  apiBaseUrl: (rawBaseUrl ?? 'http://127.0.0.1:8080/api/v1').replace(/\/$/, ''),
}
