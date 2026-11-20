import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export function WorkspaceHeader({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon
  title: string
  description: string
  children?: ReactNode
}) {
  return (
    <header className="workspace-hero">
      <div className="flex items-center gap-4">
        <span className="hero-icon">
          <Icon aria-hidden="true" />
        </span>
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </div>
      {children}
    </header>
  )
}

export function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon
  label: string
  value: number | string
}) {
  return (
    <div className="metric">
      <Icon aria-hidden="true" />
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </div>
  )
}

export function dataCivil(valor?: string | null) {
  return valor ? valor.slice(0, 10).split('-').reverse().join('/') : '—'
}
