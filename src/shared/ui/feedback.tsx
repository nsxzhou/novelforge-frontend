import { AlertTriangle, LoaderCircle } from 'lucide-react'

export function LoadingState({ text = '加载中...' }: { text?: string }) {
  return (
    <div className="inline-flex items-center gap-2.5 rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-muted-foreground shadow-sm">
      <LoaderCircle className="h-4 w-4 animate-spin text-accent" />
      {text}
    </div>
  )
}

export function ErrorState({ text }: { text: string }) {
  return (
    <div className="inline-flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      {text}
    </div>
  )
}
