import { AlertTriangle, LoaderCircle } from 'lucide-react'

export function LoadingState({ text = '加载中...' }: { text?: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm font-medium text-gray-700">
      <LoaderCircle className="h-4 w-4 animate-spin" />
      {text}
    </div>
  )
}

export function ErrorState({ text }: { text: string }) {
  return (
    <div className="inline-flex items-start gap-2 rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
      <AlertTriangle className="mt-0.5 h-4 w-4" />
      {text}
    </div>
  )
}
