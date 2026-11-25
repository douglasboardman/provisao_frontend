import { useEffect, useId, useRef, type ReactNode } from 'react'

export interface AbaSecretaria {
  id: string
  nome: string
  conteudo: ReactNode
  manter?: boolean
}

export function PaineisSecretaria({ titulo, abas, ativa, selecionar }: {
  titulo: string; abas: AbaSecretaria[]; ativa: string; selecionar: (id: string) => void
}) {
  const grupo = useId()
  const lista = useRef<HTMLDivElement>(null)
  const anterior = useRef(ativa)
  useEffect(() => {
    if (anterior.current === ativa) return
    anterior.current = ativa
    const botao = lista.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]')
    if (botao && document.activeElement === document.body) botao.focus({ preventScroll: true })
    if (botao && botao.getBoundingClientRect().top < 64) botao.scrollIntoView?.({ block: 'start' })
  }, [ativa])
  return <div className="min-w-0 space-y-4">
    <div ref={lista} role="tablist" aria-label={titulo} className="flex flex-wrap gap-x-3 border-b" onKeyDown={e => {
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
    {abas.map(a => <div role="tabpanel" data-aba={a.id} key={a.id} id={grupo + '-painel-' + a.id} aria-labelledby={grupo + '-aba-' + a.id} hidden={ativa !== a.id}>
      {(a.manter || ativa === a.id) && a.conteudo}
    </div>)}
  </div>
}
