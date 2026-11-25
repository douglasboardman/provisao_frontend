import type { ItemPauta } from '../../api/secretaria'

export function PautaReuniao({ itens, texto }: { itens?: ItemPauta[]; texto?: string | null }) {
  if (!itens?.length) return <p className="whitespace-pre-line">{texto || 'Sem pauta informada.'}</p>
  return <ol className="list-decimal space-y-1 pl-5">{itens.map(item =>
    <li key={item.id ?? item.ordem}><span className="whitespace-pre-wrap">{item.descricao}</span>
      {item.proponente && <span className="block text-sm text-muted-foreground">Proponente: {item.proponente.nome_completo}</span>}
    </li>)}</ol>
}
