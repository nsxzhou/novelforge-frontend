import { useState, useRef, useEffect, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/shared/lib/cn'

export function Tooltip({
  children,
  content,
  side = 'top',
  className,
}: {
  children: ReactNode
  content: string
  side?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()

  function handleEnter() {
    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setOpen(true), 300)
  }

  function handleLeave() {
    clearTimeout(timeoutRef.current)
    setOpen(false)
  }

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current)
  }, [])

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }

  return (
    <div
      className={cn('relative inline-flex', className)}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={handleEnter}
      onBlur={handleLeave}
    >
      {children}
      {open && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.1 }}
          className={cn(
            'pointer-events-none absolute z-50 whitespace-nowrap rounded-md bg-[#0F172A] px-2.5 py-1.5 text-xs font-medium text-white',
            positionClasses[side],
          )}
        >
          {content}
        </motion.div>
      )}
    </div>
  )
}
