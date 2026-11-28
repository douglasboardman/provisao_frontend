import type { ReactNode } from 'react'

export function BlocoOrgao({ titulo, descricao, children, className = '' }: { titulo: string; descricao?: string; children: ReactNode; className?: string }) {
  return <section className={`org-bloco ${className}`}>
    <header><h3 className="text-base font-semibold">{titulo}</h3>{descricao && <p className="mt-1 text-sm text-muted-foreground">{descricao}</p>}</header>
    {children}
  </section>
}

export function TabelaOrgao({ rotulo, colunas, children }: { rotulo: string; colunas: string[]; children: ReactNode }) {
  return <div className="org-table-wrap"><table className="record-table org-table" aria-label={rotulo}>
    <thead><tr>{colunas.map(c => <th scope="col" key={c}>{c}</th>)}</tr></thead><tbody>{children}</tbody>
  </table></div>
}
