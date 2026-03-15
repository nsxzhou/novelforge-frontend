import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/shared/lib/cn'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  props,
  ref,
) {
  return (
    <input
      {...props}
      ref={ref}
      className={cn(
        'h-12 w-full rounded-lg border border-border bg-transparent px-3 text-sm text-foreground',
        'placeholder:text-muted-foreground/50',
        'transition-colors duration-200',
        'focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none',
        props.className,
      )}
    />
  )
})

Input.displayName = 'Input'

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  props,
  ref,
) {
  return (
    <select
      {...props}
      ref={ref}
      className={cn(
        'h-12 w-full rounded-lg border border-border bg-transparent px-3 text-sm text-foreground',
        'transition-colors duration-200',
        'focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none',
        props.className,
      )}
    />
  )
})

Select.displayName = 'Select'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  props,
  ref,
) {
  return (
    <textarea
      {...props}
      ref={ref}
      className={cn(
        'w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground',
        'placeholder:text-muted-foreground/50',
        'transition-colors duration-200',
        'focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-none',
        props.className,
      )}
    />
  )
})

Textarea.displayName = 'Textarea'
