import { QueryClient } from '@tanstack/react-query'
import { HttpError } from '@/shared/api/http-client'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error instanceof HttpError && error.status >= 400 && error.status < 500) {
          return false
        }
        return failureCount < 2
      },
      staleTime: 10_000,
      refetchOnWindowFocus: false,
    },
  },
})
