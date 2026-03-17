import { forwardRef, useState, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

const baseInputClasses =
  'w-full rounded-lg border border-border bg-transparent text-sm text-foreground placeholder:text-[#94A3B8] transition-all duration-150 focus:border-[#0F172A] focus:outline-none'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  props,
  ref,
) {
  return (
    <input
      {...props}
      ref={ref}
      className={cn(baseInputClasses, 'h-10 px-3', props.className)}
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
        baseInputClasses,
        'h-10 px-3 appearance-none bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748B%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E")] bg-[length:16px] bg-[right_8px_center] bg-no-repeat pr-8',
        props.className,
      )}
    />
  )
})

Select.displayName = 'Select'

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { showCount?: boolean; maxLength?: number }
>(function Textarea({ showCount, maxLength, ...props }, ref) {
  const [length, setLength] = useState((props.value as string)?.length ?? (props.defaultValue as string)?.length ?? 0)

  return (
    <div className="relative">
      <textarea
        {...props}
        ref={ref}
        maxLength={maxLength}
        onChange={(e) => {
          setLength(e.target.value.length)
          props.onChange?.(e)
        }}
        className={cn(baseInputClasses, 'px-3 py-2.5 leading-relaxed', props.className)}
      />
      {showCount && maxLength && (
        <span className="absolute bottom-2 right-3 text-xs text-muted-foreground">
          {length}/{maxLength}
        </span>
      )}
    </div>
  )
})

Textarea.displayName = 'Textarea'

export function FormField({
  label,
  description,
  error,
  required,
  children,
  className,
}: {
  label: string
  description?: string
  error?: string
  required?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label className="block text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      {children}
      {error && (
        <p className="text-xs font-medium text-red-600">{error}</p>
      )}
    </div>
  )
}
