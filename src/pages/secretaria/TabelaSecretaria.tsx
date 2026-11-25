import { useId, useState, type ReactNode } from 'react'

export const colunaDetalhe = 'hidden md:table-cell group-data-[detalhada=true]:table-cell'

export function TabelaSecretaria({ nome, colunas, principais, children }: {
  nome: string; colunas: string[]; principais?: string[]; children: ReactNode
}) {
  const [detalhada, detalhar] = useState(false)
  const id = useId()
  return <div className="group min-w-0 max-w-full overflow-hidden rounded-xl border bg-card" data-detalhada={detalhada}>
    {principais && <div className="border-b px-3 py-1 text-right md:hidden">
      <button type="button" aria-controls={id} aria-expanded={detalhada} onClick={() => detalhar(!detalhada)}
        className="min-h-9 text-sm font-medium text-purple underline-offset-4 hover:underline">
        {detalhada ? 'Mostrar resumo' : 'Ver todas as colunas'}
      </button>
    </div>}
    <div className="overflow-x-auto">
      <table id={id} aria-label={nome} className="w-full border-collapse text-left text-sm [&_td]:border-t [&_td]:px-2 [&_td]:py-2 md:[&_td]:px-3">
        <thead className="bg-muted/60 text-xs text-muted-foreground"><tr>
          {colunas.map(coluna => <th key={coluna} scope="col" className={'whitespace-nowrap px-2 py-2.5 font-semibold md:px-3 ' +
            (principais && !principais.includes(coluna) ? colunaDetalhe : '')}>{coluna}</th>)}
        </tr></thead>
        <tbody className="[&_tr:hover]:bg-muted/25">{children}</tbody>
      </table>
    </div>
  </div>
}
