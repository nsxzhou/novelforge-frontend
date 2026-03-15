import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Sparkles, Plus, Settings, PanelLeftClose, PanelLeft, Menu, X } from 'lucide-react'
import { listProjects } from '@/shared/api/projects'
import { queryKeys } from '@/shared/api/queries'
import { cn } from '@/shared/lib/cn'

const STORAGE_KEY = 'novelforge-sidebar-collapsed'

function getStatusColor(status: string) {
  switch (status) {
    case 'active':
      return 'bg-green-500'
    case 'draft':
      return 'bg-amber-400'
    case 'archived':
      return 'bg-gray-400'
    default:
      return 'bg-gray-400'
  }
}

function SidebarContent({
  collapsed,
  onToggle,
}: {
  collapsed: boolean
  onToggle: () => void
}) {
  const location = useLocation()
  const navigate = useNavigate()

  const projectsQuery = useQuery({
    queryKey: queryKeys.projects,
    queryFn: () => listProjects({ limit: 100, offset: 0 }),
  })

  const projects = projectsQuery.data ?? []

  return (
    <div className="flex h-full flex-col">
      {/* Top: Logo */}
      <div
        className={cn(
          'flex items-center border-b border-border p-4',
          collapsed && 'justify-center px-2',
        )}
      >
        {collapsed ? (
          <Link
            to="/"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent-secondary text-white transition-opacity hover:opacity-80"
            title="NovelForge"
          >
            <Sparkles className="h-4 w-4" />
          </Link>
        ) : (
          <Link
            to="/"
            className="inline-flex items-center gap-2.5 transition-opacity hover:opacity-80"
          >
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent-secondary text-white">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="font-display text-lg tracking-tight">
              Novel<span className="gradient-text">Forge</span>
            </span>
          </Link>
        )}
      </div>

      {/* New Inspiration Button */}
      <div className={cn('p-3', collapsed && 'px-2')}>
        <button
          onClick={() => navigate('/')}
          className={cn(
            'flex w-full items-center gap-2 rounded-lg bg-gradient-to-r from-accent to-accent-secondary px-3 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5',
            collapsed && 'justify-center px-0',
          )}
          title={collapsed ? '新灵感' : undefined}
        >
          <Plus className="h-4 w-4 shrink-0" />
          {!collapsed && '新灵感'}
        </button>
      </div>

      {/* Project List */}
      <div className="flex-1 overflow-y-auto px-3">
        {!collapsed && (
          <div className="mb-2 px-2 pt-1">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              项目
            </span>
          </div>
        )}
        <div className="space-y-0.5">
          {projects.map((project) => {
            const isActive = location.pathname === `/projects/${project.id}`
            return (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-all duration-150',
                  isActive
                    ? 'bg-accent/10 font-medium text-accent'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  collapsed && 'justify-center px-0',
                )}
                title={collapsed ? project.title : undefined}
              >
                <span
                  className={cn(
                    'h-2 w-2 shrink-0 rounded-full',
                    getStatusColor(project.status),
                  )}
                />
                {!collapsed && (
                  <span className="truncate">{project.title}</span>
                )}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Bottom: Settings + Collapse Toggle */}
      <div className="space-y-1 border-t border-border p-3">
        <Link
          to="/settings"
          className={cn(
            'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-all duration-150',
            location.pathname === '/settings'
              ? 'bg-accent/10 font-medium text-accent'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            collapsed && 'justify-center px-0',
          )}
          title={collapsed ? '设置' : undefined}
        >
          <Settings className="h-4 w-4 shrink-0" />
          {!collapsed && '设置'}
        </Link>
        <button
          onClick={onToggle}
          className={cn(
            'hidden w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-all duration-150 hover:bg-muted hover:text-foreground md:flex',
            collapsed && 'justify-center px-0',
          )}
          title={collapsed ? '展开侧栏' : '收起侧栏'}
        >
          {collapsed ? (
            <PanelLeft className="h-4 w-4 shrink-0" />
          ) : (
            <PanelLeftClose className="h-4 w-4 shrink-0" />
          )}
          {!collapsed && '收起侧栏'}
        </button>
      </div>
    </div>
  )
}

export function Sidebar() {
  const location = useLocation()

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })

  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(collapsed))
    } catch {
      // ignore
    }
  }, [collapsed])

  // Close mobile sidebar on navigation
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  const toggle = () => setCollapsed((v) => !v)

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed left-0 right-0 top-0 z-30 flex items-center gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur-sm md:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="打开侧栏"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link
          to="/"
          className="inline-flex items-center gap-2 transition-opacity hover:opacity-80"
        >
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-accent to-accent-secondary text-white">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <span className="font-display text-base tracking-tight">
            Novel<span className="gradient-text">Forge</span>
          </span>
        </Link>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className="relative h-full w-64 bg-card shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 z-10 inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarContent collapsed={false} onToggle={toggle} />
          </aside>
        </div>
      )}

      {/* Desktop / Tablet sidebar */}
      <aside
        className={cn(
          'sticky top-0 hidden h-screen flex-col border-r border-border bg-card sidebar-transition md:flex',
          collapsed ? 'w-14' : 'w-60',
        )}
      >
        <SidebarContent collapsed={collapsed} onToggle={toggle} />
      </aside>
    </>
  )
}
