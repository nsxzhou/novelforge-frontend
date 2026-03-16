import type { PropsWithChildren } from 'react'
import { Sidebar } from '@/shared/ui/sidebar'

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="mx-auto w-full px-6 pt-16 pb-8 md:py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
