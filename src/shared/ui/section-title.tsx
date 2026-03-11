import type { ReactNode } from 'react'

export function SectionTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="space-y-1">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">{eyebrow}</p>
        ) : null}
        <h2 className="text-2xl font-extrabold tracking-tight text-foreground">{title}</h2>
        {description ? <p className="text-sm leading-6 text-gray-600">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
