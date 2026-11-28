import type { UseFormRegisterReturn } from 'react-hook-form'
import { Input } from '../ui/input'
import { Label } from '../ui/label'

export function ReferenciaDocumentalMembresia({ id, campo, erro }: { id: string; campo: UseFormRegisterReturn; erro?: string }) {
  return <div className="space-y-2">
    <Label htmlFor={id}>Referência documental</Label>
    <Input id={id} {...campo} maxLength={1000} aria-required="true"
      aria-invalid={Boolean(erro)} aria-describedby={erro ? `${id}-erro` : `${id}-ajuda`} />
    {erro
      ? <p id={`${id}-erro`} className="text-xs text-destructive">{erro}</p>
      : <p id={`${id}-ajuda`} className="text-xs text-muted-foreground">Identifique o documento conferido. Exemplo: Ata nº 12/2024, Livro 3, folha 21.</p>}
  </div>
}
