import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Sparkles, Plus, Settings, PanelLeftClose, PanelLeft, Menu, X, Search } from 'lucide-react'
import { motion } from 'framer-motion'
import { listProjects } from '@/shared/api/projects'
import { queryKeys } from '@/shared/api/queries'
import { cn } from '@/shared/lib/cn'
import { Badge } from '@/shared/ui/badge'

const STORAGE_KEY = 'inkmuse-sidebar-collapsed'

function getStatusVariant(status: string) {
  switch (status) {
    case 'active':
      return 'success' as const
    case 'draft':
      return 'warning' as const
    case 'archived':
      return 'default' as const
    default:
      return 'default' as const
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'active':
      return '进行中'
    case 'draft':
      return '草稿'
    case 'archived':
      return '已归档'
    default:
      return status
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
  const [search, setSearch] = useState('')

  const projectsQuery = useQuery({
    queryKey: queryKeys.projects,
    queryFn: () => listProjects({ limit: 100, offset: 0 }),
  })

  const projects = projectsQuery.data ?? []
  const filteredProjects = search.trim()
    ? projects.filter((p) => p.title.toLowerCase().includes(search.toLowerCase()))
    : projects

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
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-ink-500 to-ink-400 text-white transition-opacity hover:opacity-90"
            title="InkMuse"
          >
            <Sparkles className="h-4 w-4" />
          </Link>
        ) : (
          <Link
            to="/"
            className="inline-flex items-center gap-2.5 transition-opacity hover:opacity-90"
          >
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-ink-500 to-ink-400 text-white">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="font-display text-lg tracking-tight">
              Ink<span className="gradient-text">Muse</span>
            </span>
          </Link>
        )}
      </div>

      {/* New Inspiration Button */}
      <div className={cn('p-3', collapsed && 'px-2')}>
        <button
          onClick={() => navigate('/')}
          className={cn(
            'flex w-full items-center gap-2 rounded-lg bg-ink-500 px-3 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-ink-600 hover:shadow-glow',
            collapsed && 'justify-center px-0',
          )}
          title={collapsed ? '新灵感' : undefined}
        >
          <Plus className="h-4 w-4 shrink-0" />
          {!collapsed && '新灵感'}
        </button>
      </div>

      {/* Search */}
      {!collapsed && (
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="搜索项目..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-full rounded-md border border-border bg-stone-50 pl-8 pr-3 text-xs text-foreground placeholder:text-stone-400 transition-colors focus:border-ink-300 focus:outline-none focus:ring-1 focus:ring-ink-500/15"
            />
          </div>
        </div>
      )}

      {/* Project List */}
      <div className="flex-1 overflow-y-auto px-3">
        {!collapsed && (
          <div className="mb-2 px-2 pt-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-stone-400">
              项目
            </span>
          </div>
        )}
        <div className="space-y-0.5">
          <div>
            {filteredProjects.map((project) => {
              const isActive = location.pathname === `/projects/${project.id}`
              return (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Link
                    to={`/projects/${project.id}`}
                    className={cn(
                      'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-all duration-150',
                      isActive
                        ? 'bg-ink-50 font-medium text-ink-700'
                        : 'text-stone-600 hover:bg-stone-100 hover:text-foreground',
                      collapsed && 'justify-center px-0',
                    )}
                    title={collapsed ? project.title : undefined}
                  >
                    <span
                      className={cn(
                        'h-2 w-2 shrink-0 rounded-full',
                        project.status === 'active' && 'bg-emerald-500',
                        project.status === 'draft' && 'bg-amber-400',
                        project.status === 'archived' && 'bg-stone-400',
                      )}
                    />
                    {!collapsed && (
                      <span className="flex-1 truncate">{project.title}</span>
                    )}
                    {!collapsed && (
                      <Badge variant={getStatusVariant(project.status)} className="ml-auto text-[10px]">
                        {getStatusLabel(project.status)}
                      </Badge>
                    )}
                  </Link>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Bottom: Settings + Collapse Toggle */}
      <div className="space-y-0.5 border-t border-border p-3">
        <Link
          to="/settings"
          className={cn(
            'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-all duration-150',
            location.pathname === '/settings'
              ? 'bg-ink-50 font-medium text-ink-700'
              : 'text-stone-600 hover:bg-stone-100 hover:text-foreground',
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
            'hidden w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-stone-500 transition-all duration-150 hover:bg-stone-100 hover:text-foreground md:flex',
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
      <div className="fixed left-0 right-0 top-0 z-30 flex items-center gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur-card md:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-foreground"
          aria-label="打开侧栏"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link
          to="/"
          className="inline-flex items-center gap-2 transition-opacity hover:opacity-90"
        >
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-ink-500 to-ink-400 text-white">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <span className="font-display text-base tracking-tight">
            Ink<span className="gradient-text">Muse</span>
          </span>
        </Link>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-stone-900/30 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="relative h-full w-64 bg-card shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute right-3 top-4 z-10 inline-flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
              <SidebarContent collapsed={false} onToggle={toggle} />
            </motion.aside>
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
