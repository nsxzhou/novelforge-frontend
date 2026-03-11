import { Link } from 'react-router-dom'
import type { PropsWithChildren } from 'react'
import { Sparkles } from 'lucide-react'

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="bg-primary px-4 py-5 text-white">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between">
          <Link to="/projects" className="inline-flex items-center gap-2 text-xl font-extrabold tracking-tight">
            <Sparkles className="h-6 w-6" />
            NovelForge
          </Link>
          <p className="text-sm font-medium uppercase tracking-wider text-blue-100">V1 Frontend</p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6">{children}</main>
    </div>
  )
}
