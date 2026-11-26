import { Search } from 'lucide-react'
import { Input } from '../ui/input'

export function CampoBusca({ rotulo, placeholder, valor, mudar }: {
  rotulo: string
  placeholder: string
  valor: string
  mudar: (valor: string) => void
}) {
  return <label className="grid min-w-0 gap-1.5 text-sm font-medium">
    {rotulo}
    <span className="relative">
      <Search aria-hidden className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
      <Input type="search" className="pl-9" placeholder={placeholder} value={valor} onChange={e => mudar(e.target.value)} />
    </span>
  </label>
}
