import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '@/shared/lib/cn'

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        'h-12 w-full rounded-md bg-muted px-3 text-sm text-foreground placeholder:text-gray-500',
        'border-2 border-transparent focus:border-primary focus:bg-white focus:outline-none',
        props.className,
      )}
    />
  )
}


export function Select(props: InputHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        'h-12 w-full rounded-md bg-muted px-3 text-sm text-foreground',
        'border-2 border-transparent focus:border-primary focus:bg-white focus:outline-none',
        props.className,
      )}
    />
  )
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        'w-full rounded-md bg-muted px-3 py-2 text-sm text-foreground placeholder:text-gray-500',
        'border-2 border-transparent focus:border-primary focus:bg-white focus:outline-none',
        props.className,
      )}
    />
  )
}
