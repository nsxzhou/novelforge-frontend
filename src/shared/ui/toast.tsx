import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, AlertTriangle, X, Info } from 'lucide-react'
import { cn } from '@/shared/lib/cn'

type ToastVariant = 'success' | 'error' | 'warning' | 'info'

type Toast = {
  id: string
  message: string
  variant: ToastVariant
}

type ToastContextValue = {
  toast: (message: string, variant?: ToastVariant) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}

const icons: Record<ToastVariant, ReactNode> = {
  success: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  error: <AlertTriangle className="h-4 w-4 text-red-500" />,
  warning: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  info: <Info className="h-4 w-4 text-[#0F172A]" />,
}

const borderColors: Record<ToastVariant, string> = {
  success: 'border-l-emerald-500',
  error: 'border-l-red-500',
  warning: 'border-l-amber-500',
  info: 'border-l-[#0F172A]',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((message: string, variant: ToastVariant = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    setToasts((prev) => [...prev, { id, message, variant }])

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3500)
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={cn(
              'flex items-center gap-3 rounded-lg border border-border border-l-[3px] bg-card px-4 py-3',
              borderColors[t.variant],
            )}
          >
            {icons[t.variant]}
            <p className="text-sm font-medium text-foreground">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              className="ml-2 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
