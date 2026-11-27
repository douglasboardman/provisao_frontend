import { useEffect, useId, useRef, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

export interface Aba {
  id: string
  nome: string
  conteudo: ReactNode
  manter?: boolean
  icone?: LucideIcon
}

export function Abas({ titulo, abas, ativa, selecionar, rolagemInterna = false, ocultarSeUnica = false }: {
  titulo: string; abas: Aba[]; ativa: string; selecionar: (id: string) => void; rolagemInterna?: boolean; ocultarSeUnica?: boolean
}) {
  const grupo = useId()
  const lista = useRef<HTMLDivElement>(null)
  const anterior = useRef(ativa)
  useEffect(() => {
    if (anterior.current === ativa) return
    anterior.current = ativa
    const botao = lista.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]')
    if (botao && document.activeElement === document.body) botao.focus({ preventScroll: true })
    if (!rolagemInterna && botao && botao.getBoundingClientRect().top < 64) botao.scrollIntoView?.({ block: 'start' })
  }, [ativa, rolagemInterna])
  if (ocultarSeUnica && abas.length === 1) return abas[0].conteudo
  return <div className={rolagemInterna ? 'flex min-h-0 min-w-0 flex-1 flex-col' : 'min-w-0 space-y-4'}>
    <div ref={lista} role="tablist" aria-label={titulo}
      className={rolagemInterna ? 'abas-pagina border-b px-2 pb-2 sm:px-6' : 'abas-pagina'} onKeyDown={e => {
      const indice = abas.findIndex(a => a.id === ativa)
      if (indice < 0) return
      const proxima = { ArrowRight: (indice + 1) % abas.length, ArrowLeft: (indice + abas.length - 1) % abas.length, Home: 0, End: abas.length - 1 }[e.key]
      if (proxima === undefined) return
      e.preventDefault()
      document.getElementById(grupo + '-aba-' + abas[proxima].id)?.focus()
      selecionar(abas[proxima].id)
    }}>
      {abas.map(({ icone: Icone, ...a }) => <button type="button" key={a.id} id={grupo + '-aba-' + a.id} role="tab" aria-selected={ativa === a.id}
        aria-controls={grupo + '-painel-' + a.id} tabIndex={ativa === a.id ? 0 : -1} onClick={() => selecionar(a.id)}
        className="aba-pagina">{Icone && <Icone aria-hidden="true" className="size-4 shrink-0" />}{a.nome}</button>)}
    </div>
    {abas.map(a => <div role="tabpanel" data-aba={a.id} key={a.id} id={grupo + '-painel-' + a.id} aria-labelledby={grupo + '-aba-' + a.id}
      className={rolagemInterna ? 'min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6' : undefined}
      tabIndex={rolagemInterna && ativa === a.id ? 0 : undefined} hidden={ativa !== a.id}>
      {(a.manter || ativa === a.id) && a.conteudo}
    </div>)}
  </div>
}
