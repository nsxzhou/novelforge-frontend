import { useState, type PropsWithChildren, type ReactNode } from 'react'
import { Menu, X } from 'lucide-react'

type ProjectLayoutProps = PropsWithChildren<{
  sidebar: ReactNode
}>

export function ProjectLayout({ sidebar, children }: ProjectLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden w-[220px] shrink-0 border-r border-border bg-card overflow-y-auto md:block">
        {sidebar}
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-[260px] border-r border-border bg-card overflow-y-auto md:hidden">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="text-sm font-medium text-foreground">导航</span>
              <button
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"
                onClick={() => setMobileOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div onClick={() => setMobileOpen(false)}>
              {sidebar}
            </div>
          </aside>
        </>
      )}

      {/* Mobile sidebar toggle */}
      <button
        className="fixed bottom-4 left-4 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card shadow-lg md:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="打开导航"
      >
        <Menu className="h-4 w-4" />
      </button>

      {/* Main content — independent scroll container */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
