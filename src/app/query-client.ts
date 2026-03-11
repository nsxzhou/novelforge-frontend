import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error instanceof Error && error.message.includes('4')) {
          return false
        }
        return failureCount < 2
      },
      staleTime: 10_000,
      refetchOnWindowFocus: false,
    },
  },
})
