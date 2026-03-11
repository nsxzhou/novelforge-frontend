import { Link } from 'react-router-dom'
import type { PropsWithChildren } from 'react'
import { Sparkles } from 'lucide-react'

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-muted text-foreground">
      <header className="relative overflow-hidden bg-primary px-4 py-6 text-white">
        <div className="flat-deco-dot -right-8 -top-8 h-24 w-24" />
        <div className="flat-deco-square left-1/3 top-0 h-12 w-12" />
        <div className="flat-deco-dot bottom-0 left-2 h-10 w-10" />
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4">
          <Link
            to="/projects"
            className="inline-flex items-center gap-2 text-2xl font-extrabold tracking-tight transition-transform duration-200 hover:scale-105"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-primary">
              <Sparkles className="h-5 w-5" />
            </span>
            NovelForge
          </Link>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100">V1 Frontend</p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-8">{children}</main>
    </div>
  )
}
