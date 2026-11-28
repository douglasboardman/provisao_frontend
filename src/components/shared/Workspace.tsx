import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'

export function AlternarConteudo<T extends string>({ titulo, opcoes, ativa, selecionar }: {
  titulo: string
  opcoes: readonly { id: T; nome: string }[]
  ativa: T
  selecionar: (id: T) => void
}) {
  return <div role="group" aria-label={titulo} className="alternar-conteudo">
    {opcoes.map(({ id, nome }) => <Button key={id} type="button" size="sm" aria-pressed={id === ativa}
      variant={id === ativa ? 'secondary' : 'ghost'} onClick={() => selecionar(id)}>{nome}</Button>)}
  </div>
}

export function DataReferencia({ id, data, mudar }: {
  id: string
  data: string
  mudar: (data: string) => void
}) {
  return <label htmlFor={id} className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1.5 text-sm font-medium">
    Data de referência
    <Input id={id} type="date" value={data} className="w-auto bg-card" onChange={e => mudar(e.target.value)} />
  </label>
}

export function CabecalhoPainel({ icone: Icone, titulo, children }: {
  icone?: LucideIcon
  titulo: string
  children?: ReactNode
}) {
  return <div className="flex flex-wrap items-center justify-between gap-3">
    <h2 className="flex items-center gap-2 text-lg font-semibold">
      {Icone && <Icone aria-hidden="true" className="size-5 shrink-0 text-purple" />}
      {titulo}
    </h2>
    {children}
  </div>
}

export function ModificadorContexto({ icone: Icone, children }: { icone: LucideIcon; children: ReactNode }) {
  return <div className="surface flex items-center gap-3">
    <span className="rounded-xl bg-purple-muted/55 p-3 text-purple"><Icone aria-hidden="true" className="size-6" /></span>
    <div className="min-w-0 flex-1">{children}</div>
  </div>
}

export function WorkspaceHeader({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon
  title: string
  description?: string
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
          {description && <p>{description}</p>}
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
