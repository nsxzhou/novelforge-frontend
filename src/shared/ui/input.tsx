import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/shared/lib/cn'

// 统一转发 ref，确保 react-hook-form register 注入的 ref 能正确挂载到原生表单控件。
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  props,
  ref,
) {
  return (
    <input
      {...props}
      ref={ref}
      className={cn(
        'h-12 w-full rounded-md bg-muted px-3 text-sm text-foreground placeholder:text-gray-500',
        'border-2 border-transparent transition-colors duration-200 focus:border-primary focus:bg-white focus:outline-none',
        props.className,
      )}
    />
  )
})

Input.displayName = 'Input'

// Select 组件同样需要转发 ref，避免在表单注册时触发函数组件 ref 警告。
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  props,
  ref,
) {
  return (
    <select
      {...props}
      ref={ref}
      className={cn(
        'h-12 w-full rounded-md bg-muted px-3 text-sm text-foreground',
        'border-2 border-transparent transition-colors duration-200 focus:border-primary focus:bg-white focus:outline-none',
        props.className,
      )}
    />
  )
})

Select.displayName = 'Select'

// Textarea 组件转发 ref，保持和 Input/Select 一致的表单行为。
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  props,
  ref,
) {
  return (
    <textarea
      {...props}
      ref={ref}
      className={cn(
        'w-full rounded-md bg-muted px-3 py-2 text-sm text-foreground placeholder:text-gray-500',
        'border-2 border-transparent transition-colors duration-200 focus:border-primary focus:bg-white focus:outline-none',
        props.className,
      )}
    />
  )
})

Textarea.displayName = 'Textarea'
