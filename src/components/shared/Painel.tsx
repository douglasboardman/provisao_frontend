import { createContext, useContext, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '../ui/button'

const Destino = createContext<HTMLDivElement | null | undefined>(undefined)

export function Painel({ children, className = 'space-y-3' }: { children: ReactNode; className?: string }) {
  const [destino, definirDestino] = useState<HTMLDivElement | null>(null)
  return <div className="min-w-0">
    <div className={className}><Destino.Provider value={destino}>{children}</Destino.Provider></div>
    <div ref={definirDestino} />
  </div>
}

// Widgets compartilhados usam o painel da ficha ou, quando isolados, o próprio painel.
export function PainelLocal({ children }: { children: ReactNode }) {
  const destino = useContext(Destino)
  return destino === undefined ? <div className="surface"><Painel>{children}</Painel></div> : children
}

export function SecaoPainel({ titulo, voltar, ocupado, children, rotuloVoltar = 'Voltar' }: {
  titulo: string; voltar: () => void; ocupado?: boolean; children: ReactNode; rotuloVoltar?: string
}) {
  const destino = useContext(Destino)
  const id = useId()
  const tituloRef = useRef<HTMLHeadingElement>(null)
  useLayoutEffect(() => {
    const origem = destino?.previousElementSibling
    if (!(origem instanceof HTMLElement)) return
    const acionador = document.activeElement
    origem.classList.remove('painel-retorno')
    origem.hidden = true
    tituloRef.current?.focus()
    return () => {
      origem.hidden = false
      origem.classList.add('painel-retorno')
      if (acionador instanceof HTMLElement && origem.contains(acionador)) acionador.focus()
    }
  }, [destino])
  if (!destino) return null
  return createPortal(<section aria-labelledby={id} className="painel-secao">
    <Painel>
      <header className="sticky top-0 z-10 flex bg-background pb-2 items-start justify-between gap-3">
        <h2 id={id} ref={tituloRef} tabIndex={-1} className="min-w-0 self-center break-words text-lg font-semibold">{titulo}</h2>
        <Button type="button" variant="outline" size="sm" className="shrink-0" disabled={ocupado} onClick={voltar}><ArrowLeft />{rotuloVoltar}</Button>
      </header>
      {children}
    </Painel>
  </section>, destino)
}
