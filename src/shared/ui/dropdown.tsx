import { useState, useRef, useEffect, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/shared/lib/cn'

export function Dropdown({
  trigger,
  children,
  align = 'end',
  className,
}: {
  trigger: ReactNode
  children: ReactNode
  align?: 'start' | 'end'
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div ref={containerRef} className={cn('relative inline-block', className)}>
      <div onClick={() => setOpen((v) => !v)}>{trigger}</div>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -4, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.12 }}
          className={cn(
            'absolute top-full z-40 mt-1.5 min-w-[160px] rounded-lg border border-border bg-card py-1 shadow-lg',
            align === 'end' ? 'right-0' : 'left-0',
          )}
        >
          {children}
        </motion.div>
      )}
    </div>
  )
}

export function DropdownItem({
  children,
  onClick,
  icon,
  variant = 'default',
  disabled,
}: {
  children: ReactNode
  onClick?: () => void
  icon?: ReactNode
  variant?: 'default' | 'danger'
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors',
        'disabled:pointer-events-none disabled:opacity-50',
        variant === 'default' && 'text-foreground hover:bg-stone-50',
        variant === 'danger' && 'text-red-600 hover:bg-red-50',
      )}
    >
      {icon && <span className="shrink-0 text-stone-400">{icon}</span>}
      {children}
    </button>
  )
}

export function DropdownSeparator() {
  return <div className="my-1 h-px bg-border" />
}
