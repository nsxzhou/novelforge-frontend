import { useState, type PropsWithChildren } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { PenTool, Menu, X } from 'lucide-react'
import { cn } from '@/shared/lib/cn'

const navLinks = [
  { to: '/', label: '仪表盘' },
  { to: '/settings', label: '设置' },
]

function NavLinks({ onClick }: { onClick?: () => void }) {
  const location = useLocation()

  return (
    <>
      {navLinks.map((link) => {
        const isActive =
          link.to === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(link.to)
        return (
          <Link
            key={link.to}
            to={link.to}
            onClick={onClick}
            className={cn(
              'text-sm transition-colors duration-150',
              isActive
                ? 'font-medium text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {link.label}
          </Link>
        )
      })}
    </>
  )
}

export function AppShell({ children }: PropsWithChildren) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-8 py-6">
          {/* Logo */}
          <Link
            to="/"
            className="inline-flex items-center gap-2 transition-opacity hover:opacity-80"
          >
            <PenTool className="h-5 w-5 text-foreground" />
            <span className="text-lg font-light tracking-tight text-foreground">
              InkMuse
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-6 md:flex">
            <NavLinks />
          </nav>

          {/* Mobile hamburger */}
          <button
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="菜单"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <nav className="flex flex-col gap-4 border-t border-border px-8 py-4 md:hidden">
            <NavLinks onClick={() => setMobileOpen(false)} />
          </nav>
        )}
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-5xl px-8 pb-16 pt-8">
        {children}
      </main>
    </div>
  )
}
