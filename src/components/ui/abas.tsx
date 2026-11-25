import { useEffect, useId, useRef, type ReactNode } from 'react'

export interface Aba {
  id: string
  nome: string
  conteudo: ReactNode
  manter?: boolean
}

export function Abas({ titulo, abas, ativa, selecionar, rolagemInterna = false }: {
  titulo: string; abas: Aba[]; ativa: string; selecionar: (id: string) => void; rolagemInterna?: boolean
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
  return <div className={rolagemInterna ? 'flex min-h-0 min-w-0 flex-1 flex-col' : 'min-w-0 space-y-4'}>
    <div ref={lista} role="tablist" aria-label={titulo}
      className={rolagemInterna ? 'flex shrink-0 flex-wrap border-b px-2 sm:gap-x-3 sm:px-6' : 'flex flex-wrap gap-x-3 border-b'} onKeyDown={e => {
      const indice = abas.findIndex(a => a.id === ativa)
      const proxima = { ArrowRight: (indice + 1) % abas.length, ArrowLeft: (indice + abas.length - 1) % abas.length, Home: 0, End: abas.length - 1 }[e.key]
      if (proxima === undefined) return
      e.preventDefault()
      document.getElementById(grupo + '-aba-' + abas[proxima].id)?.focus()
      selecionar(abas[proxima].id)
    }}>
      {abas.map(a => <button type="button" key={a.id} id={grupo + '-aba-' + a.id} role="tab" aria-selected={ativa === a.id}
        aria-controls={grupo + '-painel-' + a.id} tabIndex={ativa === a.id ? 0 : -1} onClick={() => selecionar(a.id)}
        className={'scroll-mt-20 border-b-2 px-2 py-2 text-sm ' + (ativa === a.id ? 'border-purple font-semibold text-purple' : 'border-transparent text-muted-foreground hover:text-foreground')}>{a.nome}</button>)}
    </div>
    {abas.map(a => <div role="tabpanel" data-aba={a.id} key={a.id} id={grupo + '-painel-' + a.id} aria-labelledby={grupo + '-aba-' + a.id}
      className={rolagemInterna ? 'min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6' : undefined}
      tabIndex={rolagemInterna && ativa === a.id ? 0 : undefined} hidden={ativa !== a.id}>
      {(a.manter || ativa === a.id) && a.conteudo}
    </div>)}
  </div>
}
