import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { ArrowLeft, PanelRight } from 'lucide-react'
import { Button } from '../../../components/ui/button'
import logo from '../../../assets/logo-assinatura-horizontal.png'
import { PainelImagem } from './painelImagem'
import './espaco.css'

export interface SessaoEditor {
  voltar: () => void
  alterado: RefObject<boolean>
  falhou: () => void
  gravou: (continuar: () => void) => void
}

export function revelarCampo(campo: HTMLElement) {
  for (let pai = campo.parentElement; pai; pai = pai.parentElement) {
    if (pai instanceof HTMLDetailsElement) pai.open = true
  }
  campo.closest('aside')?.dispatchEvent(new Event('abrir-painel'))
}

export function EspacoEditor({ sessao, funcao, nome, situacao, alterado = false, mostrarPainelInicial = false, editor, previa, painel, acoes, preparacao }: {
  sessao: SessaoEditor; funcao: string; nome: string; situacao?: string; alterado?: boolean; mostrarPainelInicial?: boolean
  preparacao?: ReactNode; editor?: ReactNode; previa: ReactNode; painel: ReactNode; acoes?: ReactNode
}) {
  const [visualizar, setVisualizar] = useState(false)
  const [compacto, setCompacto] = useState(() => window.matchMedia?.('(max-width: 800px)').matches ?? false)
  const [aberto, setAberto] = useState(mostrarPainelInicial || !compacto)
  const [painelImagem, definirPainelImagem] = useState<HTMLDivElement | null>(null)
  const lateral = useRef<HTMLElement>(null)
  const botaoDados = useRef<HTMLButtonElement>(null)
  const emPreparacao = Boolean(preparacao)
  const folha = useRef<HTMLElement>(null)
  const rolagem = useRef(0)
  function alternarPrevia(abrir: boolean) {
    if (abrir === visualizar) return
    if (abrir) rolagem.current = folha.current?.scrollTop ?? 0
    setVisualizar(abrir)
  }
  useLayoutEffect(() => {
    if (folha.current) folha.current.scrollTop = visualizar ? 0 : rolagem.current
  }, [visualizar])
  const alteracaoPendente = sessao.alterado
  useLayoutEffect(() => {
    alteracaoPendente.current = alterado
    return () => { alteracaoPendente.current = false }
  }, [alteracaoPendente, alterado])
  useEffect(() => {
    const tela = window.matchMedia?.('(max-width: 800px)')
    const adaptar = () => { setCompacto(!!tela?.matches); setAberto(!tela?.matches) }
    tela?.addEventListener('change', adaptar)
    const alvo = lateral.current
    const abrir = () => setAberto(true)
    alvo?.addEventListener('abrir-painel', abrir)
    return () => {
      alvo?.removeEventListener('abrir-painel', abrir)
      tela?.removeEventListener('change', adaptar)
    }
  }, [emPreparacao])
  function alternarPainel() {
    setAberto(!aberto)
    if (!aberto && compacto) requestAnimationFrame(() => lateral.current?.querySelector('button')?.focus())
  }
  function fecharPainel() { setAberto(false); botaoDados.current?.focus({ preventScroll: true }) }
  return <main className="espaco-editor">
    <header className="espaco-marca"><img src={logo} alt="ProVisão"/><span>Secretaria</span>
      <Button type="button" variant="outline" onClick={sessao.voltar}><ArrowLeft/>Voltar à Secretaria</Button></header>
    <div className="espaco-titulo"><div><small>{funcao}</small><h1>{nome}</h1></div>
      <span role="status">{alterado ? 'Alterações não salvas' : situacao}</span>
      {editor && !preparacao && <div aria-label="Visualização" className="espaco-modos">
        <button type="button" aria-pressed={!visualizar} onClick={() => alternarPrevia(false)}>Editar</button>
        <button type="button" aria-pressed={visualizar} onClick={() => alternarPrevia(true)}>Prévia</button>
      </div>}
      {!preparacao && <Button ref={botaoDados} type="button" variant="outline" aria-controls="editor-dados" aria-expanded={aberto} onClick={alternarPainel}><PanelRight/>Dados</Button>}
    </div>
    {preparacao ? <section className="espaco-trabalho block overflow-auto"><div className="min-w-0 flex-1 overflow-auto px-4">{preparacao}</div></section> :
    <div className="espaco-trabalho" data-aberto={aberto}>
      <section ref={folha} inert={compacto && aberto} tabIndex={-1} className="espaco-folha" aria-label="Página de trabalho">
        {editor && <div hidden={visualizar}><PainelImagem.Provider value={painelImagem}>{editor}</PainelImagem.Provider></div>}
        {(!editor || visualizar) && previa}
      </section>
      {aberto && <button className="espaco-fundo" tabIndex={-1} aria-label="Fechar painel de dados" type="button" onClick={fecharPainel}/>}
      <aside ref={lateral} id="editor-dados" aria-label="Dados do editor" hidden={!aberto} onKeyDown={e => {
        if (e.key === 'Escape') { e.stopPropagation(); fecharPainel() }
      }}>
        <div className="espaco-painel-topo"><strong>Dados</strong><button type="button" onClick={fecharPainel}>Recolher</button></div>
        <div hidden={visualizar} ref={definirPainelImagem}/>
        {painel}
      </aside>
    </div>}
    {acoes && <footer className="espaco-acoes" aria-label="Ações do editor">{acoes}</footer>}
  </main>
}
