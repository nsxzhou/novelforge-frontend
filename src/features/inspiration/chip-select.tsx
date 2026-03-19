import { useState } from 'react'
import { cn } from '@/shared/lib/cn'

type ChipSelectProps = {
  label: string
  options: string[]
  value: string
  onChange: (value: string) => void
  allowCustom?: boolean
  customPlaceholder?: string
}

export function ChipSelect({
  label,
  options,
  value,
  onChange,
  allowCustom = false,
  customPlaceholder = '输入自定义选项...',
}: ChipSelectProps) {
  const [isCustomMode, setIsCustomMode] = useState(false)
  const [customInput, setCustomInput] = useState('')
  const [extraOptions, setExtraOptions] = useState<string[]>([])

  const allOptions = [...options, ...extraOptions]

  function handleCustomConfirm() {
    const trimmed = customInput.trim()
    if (trimmed && !allOptions.includes(trimmed)) {
      setExtraOptions((prev) => [...prev, trimmed])
    }
    if (trimmed) {
      onChange(trimmed)
    }
    setCustomInput('')
    setIsCustomMode(false)
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">
        {allOptions.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm transition-all duration-150',
              value === option
                ? 'border-[#0F172A] bg-[#0F172A] text-white'
                : 'border-[#E2E8F0] text-foreground hover:border-[#94A3B8]',
            )}
          >
            {option}
          </button>
        ))}
        {allowCustom && !isCustomMode && (
          <button
            type="button"
            onClick={() => setIsCustomMode(true)}
            className="rounded-full border border-dashed border-[#CBD5E1] px-3 py-1.5 text-sm text-muted-foreground transition-all duration-150 hover:border-[#94A3B8] hover:text-foreground"
          >
            + 自定义
          </button>
        )}
        {isCustomMode && (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleCustomConfirm()
                }
                if (e.key === 'Escape') {
                  setIsCustomMode(false)
                  setCustomInput('')
                }
              }}
              placeholder={customPlaceholder}
              autoFocus
              className="h-8 rounded-full border border-[#CBD5E1] bg-white px-3 text-sm text-foreground outline-none focus:border-[#0F172A]"
            />
            <button
              type="button"
              onClick={handleCustomConfirm}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[#0F172A] bg-[#0F172A] text-white transition-all duration-150 hover:bg-[#1E293B]"
            >
              ✓
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
