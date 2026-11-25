import { PreviaPaginada } from './PreviaPaginada'
import type { DadosLeitura } from './dadosLeitura'
import { createPortal } from 'react-dom'
import type { ImagemPaginaV2 } from '../../../api/pagina-v2'
import { medirImagens, pxPorCm, vistaImagem } from './disposicaoImagem'
import { PropriedadesImagem, redimensionar } from './PropriedadesImagem'
import { PainelImagem } from './painelImagem'
import { useContext, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ImagemPagina, type EnviarImagem, type SelecaoImagem } from './ImagemPagina'
import { paginarNotas, estiloParteNota, type FolhaNotas } from './paginar-notas'
import { fimDaPalavra, notasDoCorpo, referenciasNoCorpo } from './notas'
import { Dialog, DialogContent, DialogTitle } from '../../../components/ui/dialog'
import { Button } from '../../../components/ui/button'
import { InserirCampo } from './InserirCampo'
import type { DefinicaoCampo, ReferenciaCampo, Valores } from '../../../api/campos'
import type { Procedencias } from '../procedenciaCampos'
import { EditorState, NodeSelection, Plugin, TextSelection } from 'prosemirror-state'
import { Decoration, DecorationSet, EditorView } from 'prosemirror-view'
import { keymap } from 'prosemirror-keymap'
import { baseKeymap, toggleMark } from 'prosemirror-commands'
import { closeHistory, history, undo, redo } from 'prosemirror-history'
import { AlignLeft, AlignCenter, AlignRight, AlignJustify, Bold, Italic, Underline, Undo2, Redo2, Settings2, Save, ImagePlus } from 'lucide-react'
import { fontes, paragrafosPagina, type PaginaTexto, type Regiao, type Alinhamento, type BlocoPagina } from '../../../api/pagina'
import { carregar, schemaTexto, serializar } from './texto'
import { sincronizarRegiao } from './sincronizarRegiao'
import { Margens, rotulos } from './Margens'
import 'prosemirror-view/style/prosemirror.css'
import './editor.css'

interface Props { dadosLeitura?: DadosLeitura; enviarImagem?: EnviarImagem; procedencias?: Procedencias; mostrarEstadoLocal?: boolean; imagemUrl?: (id: string) => string | undefined; acoesDocumento?: React.ReactNode; margensConcilio?: boolean; modelo?: boolean; definicoes?: Record<string, DefinicaoCampo>; valores?: Valores; editarValor?: (id: string) => void; valor: PaginaTexto; alterar?: (p: PaginaTexto) => void }
const regioes: Regiao[] = ['cabecalho', 'corpo', 'rodape']
type Vistas = Partial<Record<Regiao, EditorView>>
export function EditorPagina(props: Props) {
  if (!props.alterar && props.valor.versao_formato === 2) return <PreviaPaginada {...props}/>
  return <PaginaInterativa {...props}/>
}
function PaginaInterativa({ enviarImagem, procedencias, mostrarEstadoLocal = true, imagemUrl, valor, alterar, modelo, definicoes, valores, editarValor, margensConcilio, acoesDocumento }: Props) {
  const raiz = useRef<HTMLDivElement>(null)
  const palco = useRef<HTMLDivElement>(null)
  const folha = useRef<HTMLDivElement>(null)
  const visor = useRef<HTMLDivElement>(null)
  const vistas = useRef<Vistas>({})
  const ativa = useRef<Regiao>('corpo')
  const ultimo = useRef({ valor, alterar, modelo, definicoes, valores, editarValor, imagemUrl, procedencias, enviarImagem })
  useLayoutEffect(() => { ultimo.current = { valor, alterar, modelo, definicoes, valores, editarValor, imagemUrl, procedencias, enviarImagem } })
  const [insercao, reservar] = useState<{ view: EditorView; from: number; to: number; atual?: ReferenciaCampo } | null>(null)
  function abrirCampo(view: EditorView, from: number, to: number, atual?: ReferenciaCampo) {
    if (!ultimo.current.modelo || !ultimo.current.alterar) return false
    if (!atual) {
      const par = Decoration.widget(from, () => {
        const span = document.createElement('span')
        span.className = 'campo-modelo'; span.textContent = '{│}'; return span
      })
      view.setProps({ decorations: state => DecorationSet.create(state.doc, [par]) })
    }
    reservar({ view, from, to, atual })
    return true
  }
  function fecharCampo() {
    if (insercao) {
      const { view, from, to } = insercao
      view.setProps({ decorations: () => null })
      view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, from, to)))
    }
    reservar(null)
  }
  const [imagem, editarImagem] = useState<(SelecaoImagem & { view: EditorView; from: number; to: number }) | null>(null)
  const lateralImagens = useContext(PainelImagem)
  const [selecionada, selecionar] = useState('')
  const ocorrencias = regioes.flatMap(regiao => paragrafosPagina(valor[regiao]).flatMap(p => p.trechos.flatMap(t =>
    t.tipo === 'imagem' ? [{ regiao, imagem: t }] : [])))
  function localizar(id: string) {
    for (const r of regioes) {
      const view = vistas.current[r]
      if (!view) continue
      let pos = -1
      view.state.doc.descendants((no, n) => {
        if (no.type === schemaTexto.nodes.imagemAncorada && no.attrs.imagem.ocorrencia_id === id) pos = n
      })
      if (pos >= 0) return { view, pos, regiao: r }
    }
  }
  function mudarImagem(i: ImagemPaginaV2) {
    const alvo = localizar(i.ocorrencia_id)
    if (!alvo) return
    const { view, pos } = alvo
    const no = view.state.doc.nodeAt(pos)!
    view.dispatch(closeHistory(view.state.tr).setNodeMarkup(pos, undefined, { ...no.attrs, imagem: i }))
  }
  function abrirPropriedades(id: string) {
    selecionar(id)
    const grupo = (raiz.current?.closest('.espaco-editor') ?? raiz.current)?.querySelector<HTMLDetailsElement>('.propriedades-imagem')
    if (grupo) { grupo.open = true; grupo.closest('aside')?.dispatchEvent(new Event('abrir-painel')) }
  }
  function caixaSelecionada() {
    return folha.current?.querySelector<HTMLElement>('[data-imagem-id="' + CSS.escape(selecionada) + '"]')
  }
  const arraste = useRef<{ id: number; caixa: HTMLElement; inicial: ImagemPaginaV2; tamanho: boolean; zoom: number; x: number; y: number } | null>(null)
  function iniciarArraste(e: React.PointerEvent<HTMLDivElement>) {
    if (!enviarImagem || !editavel || e.button !== 0 || !(e.target instanceof Element)) return
    const alvo = e.target.closest<HTMLElement>('[data-imagem-id],[data-manipular-id]')
    const id = alvo?.dataset.imagemId ?? alvo?.dataset.manipularId
    const ocorrencia = ocorrencias.find(o => o.imagem.ocorrencia_id === id)
    const inicial = ocorrencia?.imagem
    const caixa = id && folha.current?.querySelector<HTMLElement>('[data-imagem-id="' + CSS.escape(id) + '"]')
    if (!ocorrencia || !inicial || !caixa) return
    ativa.current = ocorrencia.regiao
    const tamanho = !!e.target.closest('.imagem-alca')
    e.preventDefault()
    abrirPropriedades(inicial.ocorrencia_id)
    if (!tamanho && inicial.relacao === 'em_linha') return
    const zoom = folha.current!.getBoundingClientRect().width / (21 * pxPorCm)
    arraste.current = { id: e.pointerId, caixa, inicial, tamanho, zoom, x:e.clientX, y:e.clientY }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  function moverArraste(e: React.PointerEvent<HTMLDivElement>, fim = false) {
    const a = arraste.current
    if (!a || a.id !== e.pointerId) return
    const dx = (e.clientX - a.x) / a.zoom / pxPorCm, dy = (e.clientY - a.y) / a.zoom / pxPorCm
    const i = a.inicial
    let atual: ImagemPaginaV2
    if (a.tamanho) {
      const eixo = Math.abs(dx / i.largura_cm) >= Math.abs(dy / i.altura_cm) ? 'largura_cm' : 'altura_cm'
      atual = i.manter_proporcao ? redimensionar(i, eixo, i[eixo] + (eixo === 'largura_cm' ? dx : dy)) :
        redimensionar(redimensionar(i, 'largura_cm', i.largura_cm + dx), 'altura_cm', i.altura_cm + dy)
      a.caixa.style.transform = 'scale(' + atual.largura_cm / i.largura_cm + ',' + atual.altura_cm / i.altura_cm + ')'
    } else {
      atual = { ...i, x_cm: Math.max(-21, Math.min(21, i.x_cm + dx)), y_cm: Math.max(-29.7, Math.min(29.7, i.y_cm + dy)) }
      a.caixa.style.transform = 'translate(' + (atual.x_cm - i.x_cm) + 'cm,' + (atual.y_cm - i.y_cm) + 'cm)'
    }
    if (fim) {
      arraste.current = null
      a.caixa.style.transform = ''
      if (dx || dy) mudarImagem(atual)
    }
  }
  function escolherImagem(view: EditorView, colada?: File) {
    const { from, to } = view.state.selection
    const selecionada = view.state.selection instanceof NodeSelection && view.state.selection.node
    const atual = selecionada && selecionada.type === schemaTexto.nodes.imagemAncorada ? selecionada.attrs.imagem : undefined
    editarImagem({ view, from, to, atual, colada })
  }
  const temNotas = Object.keys(valor.notas).length > 0
  const notasAtivas = valor.notas_ativas ?? temNotas
  const medidor = useRef<HTMLParagraphElement>(null)
  const seguirCursor = useRef(false)
  const [folhasNotas, setFolhasNotas] = useState<FolhaNotas[]>([])
  const [erroNotas, setErroNotas] = useState('')
  const [avisoNota, avisar] = useState('')
  const [nota, abrirNota] = useState<{ pos: number; id: string; numero: number; texto: string; nova: boolean } | null>(null)

  function inserirNota() {
    const v = vistas.current.corpo!
    const pos = ativa.current === 'corpo' ? fimDaPalavra(v) : null
    if (pos === null) { avisar('Posicione o cursor em uma palavra do corpo para inserir a nota.'); return }
    let numero = 1
    v.state.doc.nodesBetween(0, pos, n => { if (n.type === schemaTexto.nodes.nota) numero++ })
    const marcador = Decoration.widget(pos, () => {
      const sup = document.createElement('sup')
      sup.textContent = String(numero)
      return sup
    })
    v.setProps({ decorations: state => DecorationSet.create(state.doc, [marcador]) })
    avisar('')
    abrirNota({ pos, id: crypto.randomUUID(), numero, texto: '', nova: true })
  }
  function concluirNota(acao: 'gravar' | 'excluir' | 'cancelar') {
    const v = vistas.current.corpo
    if (!nota || !v) return
    v.setProps({ decorations: () => null })
    if (acao !== 'cancelar') {
      const tr = closeHistory(v.state.tr)
      if (acao === 'excluir') tr.delete(nota.pos, nota.pos + 1)
      else tr.replaceWith(nota.pos, nota.pos + (nota.nova ? 0 : 1),
        schemaTexto.nodes.nota.create({ id: nota.id, texto: nota.texto.trim() }))
      v.dispatch(tr.setSelection(TextSelection.create(tr.doc, nota.pos + (acao === 'excluir' ? 0 : 1))))
    }
    abrirNota(null)
  }
  const [margens, setMargens] = useState(false)
  const [pag, setPag] = useState(1), [total, setTotal] = useState(1)
  const [ajustar, setAjustar] = useState(true)
  const [escala, setEscala] = useState(1), [excesso, setExcesso] = useState(false)
  const [marcas, setMarcas] = useState<Record<string,string | boolean>>({})
  const [sujo, setSujo] = useState(false)
  const editavel = !!alterar
  const config = valor.pagina, m = margensConcilio ? { superior: 3, direita: 3, inferior: 3, esquerda: 3 } : config.margens_cm
  function atualizar(r: Regiao, blocos: BlocoPagina[]) {
    setSujo(true)
    const props = ultimo.current
    const temImagem = props.valor.versao_formato === 1 && paragrafosPagina(blocos).some(p => p.trechos.some(t => t.tipo === 'imagem'))
    const pagina = temImagem ? { ...props.valor, versao_formato: 2 as const,
      pagina: { ...props.valor.pagina, altura_minima_cm: { cabecalho: 0, rodape: 0 } } } : props.valor
    props.alterar?.({ ...pagina, [r]: blocos, ...(r === 'corpo' && { notas: notasDoCorpo(vistas.current.corpo!.state.doc) }) })
  }

  useLayoutEffect(() => {
    const views: Vistas = {}
    function indicar(view: EditorView) {
      const { selection, storedMarks } = view.state
      const atuais = storedMarks ?? selection.$from.marks()
      setMarcas({ ...Object.fromEntries(atuais.map(m => [m.type.name, m.attrs.valor ?? true])), alinhamento: selection.$from.parent.attrs.alinhamento })
    }
    for (const r of regioes) {
      const host = folha.current!.querySelector<HTMLElement>('[data-editor="' + r + '"]')!
      const view = new EditorView(host, {
        nodeViews: { imagemAncorada: n => vistaImagem(n.attrs.imagem, n.attrs.src, host, editavel) },
        state: EditorState.create({ doc: carregar(ultimo.current.valor[r], ultimo.current.definicoes, ultimo.current.valores, !editavel, ultimo.current.valor.notas, ultimo.current.imagemUrl), plugins: [
          new Plugin({ props: { decorations(state) {
            if (!editavel || !ultimo.current.procedencias) return null
            const decoracoes: Decoration[] = []
            state.doc.descendants((node, pos) => {
              if (node.type !== schemaTexto.nodes.campo) return
              const origem = ultimo.current.procedencias?.[node.attrs.campo_id]
              if (origem) decoracoes.push(Decoration.node(pos, pos + node.nodeSize, {
                class: 'campo-com-origem', 'data-procedencia': origem.selo, title: origem.detalhe,
                'aria-label': [ultimo.current.definicoes?.[node.attrs.campo_id]?.nome ?? node.attrs.rotulo, origem.detalhe].join(' · '),
              }))
            })
            return DecorationSet.create(state.doc, decoracoes)
          } } }),
          referenciasNoCorpo(r === 'corpo', editavel),
          history(), keymap({ 'Mod-z': undo, 'Mod-Shift-z': redo, 'Mod-y': redo,
            'Mod-b': toggleMark(schemaTexto.marks.negrito), 'Mod-i': toggleMark(schemaTexto.marks.italico),
            'Mod-u': toggleMark(schemaTexto.marks.sublinhado),
          }), keymap(baseKeymap),
        ] }),
        editable: () => editavel,
        attributes: { role: editavel ? 'textbox' : 'region', 'aria-label': rotulos[r], 'aria-multiline': 'true' },
        handlePaste(v, evento) {
          if (!editavel || !ultimo.current.enviarImagem) return false
          const arquivo = Array.from(evento.clipboardData?.files ?? []).find(f => f.type.startsWith('image/'))
          if (!arquivo) return false
          escolherImagem(v, arquivo)
          return true
        },
        handleTextInput: (v, from, to, texto) => texto === '{' && abrirCampo(v, from, to),
        handleKeyDown: (v, e) => {
          if (e.key === 'Enter' && editavel && ultimo.current.enviarImagem && v.state.selection instanceof NodeSelection &&
              v.state.selection.node.type === schemaTexto.nodes.imagemAncorada) {
            escolherImagem(v)
            return true
          }
          const alvo = e.target instanceof HTMLElement ? e.target : undefined
          if (editavel && alvo?.dataset.nota && (e.key === 'Enter' || e.key === ' ')) {
            const pos = v.posAtDOM(alvo, 0)
            const n = v.state.doc.nodeAt(pos)
            if (n?.type === schemaTexto.nodes.nota) {
              abrirNota({ pos, id: n.attrs.id, texto: n.attrs.texto, nova: false, numero: Number(alvo.dataset.numero) })
              return true
            }
          }
          return e.key === '{' && abrirCampo(v, v.state.selection.from, v.state.selection.to)
        },
        handleClickOn: (v, _pos, n, pos) => {
          if (editavel && n.type === schemaTexto.nodes.nota) {
            const numero = Number((v.nodeDOM(pos) as HTMLElement).dataset.numero)
            abrirNota({ pos, id: n.attrs.id, texto: n.attrs.texto, nova: false, numero })
            return true
          }
          if (n.type !== schemaTexto.nodes.campo) return false
          if (ultimo.current.editarValor) { ultimo.current.editarValor(n.attrs.campo_id); return true }
          return abrirCampo(v, pos, pos + n.nodeSize, { tipo: 'campo', campo_id: n.attrs.campo_id, apresentacao: n.attrs.apresentacao, indice: n.attrs.indice })
        },
        handleDOMEvents: {
          focus: v => { ativa.current = r; indicar(v); return false },
          click: (v, e) => {
            const el = e.target instanceof Element ? e.target.closest<HTMLElement>('[data-ocorrencia]') : null
            if (!el || !editavel || !ultimo.current.enviarImagem) return false
            const pos = v.posAtDOM(el.parentNode!, Array.prototype.indexOf.call(el.parentNode!.childNodes, el))
            if (v.state.doc.nodeAt(pos)?.type !== schemaTexto.nodes.imagemAncorada) return false
            ativa.current = r
            v.dispatch(v.state.tr.setSelection(NodeSelection.create(v.state.doc, pos)))
            abrirPropriedades(el.dataset.ocorrencia!)
            e.preventDefault()
            return true
          },
        },
        dispatchTransaction(tr) {
          view.updateState(view.state.apply(tr))
          if (tr.docChanged) atualizar(r, serializar(view.state.doc))
          if (editavel) indicar(view)
          if (r === 'corpo' && (tr.selectionSet || tr.docChanged)) {
            seguirCursor.current = true
            requestAnimationFrame(() => {
              const el = visor.current
              if (!el || view.isDestroyed || !view.hasFocus() || !el.clientWidth) return
              if (Object.keys(ultimo.current.valor.notas).length) {
                el.dispatchEvent(new Event('cursor-nota'))
                return
              }
              const area = el.getBoundingClientRect()
              const cursor = view.coordsAtPos(view.state.selection.head).left
              const x = el.scrollLeft + (cursor - area.left) * el.clientWidth / area.width
              el.scrollLeft = Math.max(0, Math.floor(x / el.clientWidth)) * el.clientWidth
            })
          }
        },
      })
      views[r] = view
    }
    vistas.current = views
    return () => { Object.values(views).forEach(v => v.destroy()); vistas.current = {} }
  }, [editavel])

  useLayoutEffect(() => {
    if (editavel) Object.values(vistas.current).forEach(view => view.setProps({}))
  }, [editavel, procedencias])

  // Mudança externa de modelo ou versão. Uma transação local conserva seleção e histórico.
  useLayoutEffect(() => {
    for (const r of regioes) {
      const view = vistas.current[r]
      if (!view) continue
      const doc = carregar(valor[r], definicoes, valores, !editavel, valor.notas, imagemUrl)
      const proximo = sincronizarRegiao(view.state, doc)
      if (proximo !== view.state) view.updateState(proximo)
    }
  }, [valor, definicoes, valores, editavel, imagemUrl])

  useEffect(() => {
    const root = raiz.current!, corpo = visor.current!, pagina = folha.current!
    const pm = vistas.current.corpo!.dom
    let frame = 0, vivo = true
    function medir() {
      if (!vivo) return
      const w = corpo.clientWidth
      if (!w) return
      medirImagens(pagina)
      const escalaPagina = pagina.getBoundingClientRect().width / parseFloat(getComputedStyle(pagina).width)
      setEscala(Math.min(1, palco.current!.clientWidth / parseFloat(getComputedStyle(pagina).width)))
      setExcesso(corpo.clientHeight < valor.pagina.tamanho_pt * 96/72 * 1.45 - 1)
      if (!temNotas) {
        setTotal(Math.max(1, Math.ceil((pm.scrollWidth - 1) / w)))
        setPag(Math.round(corpo.scrollLeft / w) + 1)
        setErroNotas('')
        return
      }
      try {
        const paginas = paginarNotas({ corpo: pm, medidor: medidor.current!, altura: corpo.getBoundingClientRect().height / escalaPagina, notas: ultimo.current.valor.notas })
        setFolhasNotas(paginas)
        setTotal(paginas.length)
        const view = vistas.current.corpo!
        let destino = -1
        if (seguirCursor.current && (view.hasFocus() || !editavel)) {
          const cursor = view.coordsAtPos(view.state.selection.head)
          const y = ((cursor.top + cursor.bottom) / 2 - pm.getBoundingClientRect().top) / escalaPagina
          destino = paginas.findIndex(p => y >= p.inicio && y < p.fim)
        }
        seguirCursor.current = false
        setPag(n => destino >= 0 ? destino + 1 : Math.min(n, paginas.length))
        setErroNotas('')
      } catch (erro) {
        setErroNotas(erro instanceof Error ? erro.message : 'Não foi possível paginar as notas.')
        setFolhasNotas([])
      }
    }
    const agendar = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(medir) }
    const resize = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(agendar) : null
    for (const el of [root, corpo, pagina]) resize?.observe(el)
    const observer = new MutationObserver(agendar)
    for (const view of Object.values(vistas.current)) observer.observe(view.dom, { subtree: true, childList: true, characterData: true, attributes: true })
    corpo.addEventListener('cursor-nota', agendar)
    root.addEventListener('load', agendar, true)
    corpo.addEventListener('scroll', agendar)
    void document.fonts?.ready.then(agendar)
    agendar()
    return () => { vivo = false; root.removeEventListener('load', agendar, true); cancelAnimationFrame(frame); resize?.disconnect(); observer.disconnect(); corpo.removeEventListener('scroll', agendar); corpo.removeEventListener('cursor-nota', agendar) }
  }, [valor.pagina, temNotas, editavel, margensConcilio])

  useLayoutEffect(() => { if (folha.current) medirImagens(folha.current) }, [valor, pag, escala, ajustar, folhasNotas])
  useLayoutEffect(() => {
    folha.current?.querySelectorAll<HTMLElement>('.imagem-caixa,.imagem-manipulador').forEach(el => {
      el.classList.toggle('imagem-selecionada', (el.dataset.imagemId ?? el.dataset.manipularId) === selecionada)
    })
  }, [valor, selecionada, imagemUrl])
  function comando(fn: (v: EditorView) => void) {
    const v = vistas.current[ativa.current]
    if (v) { fn(v); v.focus() }
  }
  function marca(nome: string, valor?: string | number) {
    comando(v => {
      const tipo = schemaTexto.marks[nome]
      if (valor === undefined) { toggleMark(tipo)(v.state, v.dispatch); return }
      const { from, to, empty } = v.state.selection
      const tr = v.state.tr
      const mark = tipo.create({ valor })
      v.dispatch(empty ? tr.addStoredMark(mark) : tr.addMark(from, to, mark))
    })
  }
  function alinharPara(alinhamento: Alinhamento) {
    comando(v => {
      const { from, to } = v.state.selection
      const tr = v.state.tr
      v.state.doc.nodesBetween(from, to, (node, pos) => {
        if (node.type === schemaTexto.nodes.paragraph) tr.setNodeMarkup(pos, undefined, { ...node.attrs, alinhamento })
      })
      v.dispatch(tr)
    })
  }
  function mudarPagina(n: number) {
    const el = visor.current!
    if (!temNotas) el.scrollLeft = (n - 1) * el.clientWidth
    setPag(n)
  }
  function salvar() {
    const form = raiz.current?.closest('form')
    const submit = form?.querySelector<HTMLButtonElement>('button[type=submit]')
    if (form && submit && !submit.disabled) form.requestSubmit(submit)
  }
  const botao = (nome: string, icone: React.ReactNode, acao: () => void, ativo?: boolean) =>
    <button key={nome} type="button" title={nome} aria-label={nome} aria-pressed={ativo}
      onMouseDown={e => e.preventDefault()} onClick={acao}>{icone}</button>
  const espaco = (r: Regiao) => ({ paddingBlock: config.espacamento_cm[r].superior+'cm '+config.espacamento_cm[r].inferior+'cm' })
  const exibida = temNotas && !erroNotas ? folhasNotas[pag - 1] : undefined
  const fator = ajustar ? escala : 1
  return <div className="editor-pagina"  ref={raiz} onKeyDown={e => {
    if (editavel && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault()
      if (!nota && !imagem) salvar()
    }
  }}>
    {editavel && <div role="toolbar" aria-label="Edição da página" className="pagina-tools">
      {modelo && botao('Inserir campo', '{}', () => comando(v => { abrirCampo(v, v.state.selection.from, v.state.selection.to) }))}
      {enviarImagem && botao('Inserir imagem', <ImagePlus/>, () => comando(v => escolherImagem(v)))}
      {botao('Salvar', <Save/>, salvar)}
      {acoesDocumento}
      {botao('Notas de rodapé', 'N¹', () => { setSujo(true); alterar?.({ ...valor, notas_ativas: !notasAtivas }); avisar('') }, notasAtivas)}
      {notasAtivas && botao('Inserir nota', 'Inserir nota', inserirNota)}
      {botao('Configuração da página', <Settings2/>, () => setMargens(true))}
      {botao('Desfazer', <Undo2/>, () => comando(v => undo(v.state,v.dispatch)))}
      {botao('Refazer', <Redo2/>, () => comando(v => redo(v.state,v.dispatch)))}
      <select aria-label="Fonte" value={String(marcas.fonte || config.fonte)} onChange={e => marca('fonte',e.target.value)}>{fontes.map(f => <option key={f}>{f}</option>)}</select>
      <select aria-label="Tamanho da fonte" value={Number(marcas.tamanho_pt || config.tamanho_pt)} onChange={e => marca('tamanho_pt',Number(e.target.value))}>{[8,9,10,11,12,14,16,18,20,24,28,32,36,48,72].map(n => <option key={n} value={n}>{n} pt</option>)}</select>
      {botao('Negrito', <Bold/>, () => marca('negrito'), !!marcas.negrito)}
      {botao('Itálico', <Italic/>, () => marca('italico'), !!marcas.italico)}
      {botao('Sublinhado', <Underline/>, () => marca('sublinhado'), !!marcas.sublinhado)}
      {botao('Alinhar à esquerda', <AlignLeft/>, () => alinharPara('esquerda'), marcas.alinhamento === 'esquerda')}
      {botao('Centralizar', <AlignCenter/>, () => alinharPara('centro'), marcas.alinhamento === 'centro')}
      {botao('Alinhar à direita', <AlignRight/>, () => alinharPara('direita'), marcas.alinhamento === 'direita')}
      {botao('Justificar', <AlignJustify/>, () => alinharPara('justificado'), marcas.alinhamento === 'justificado')}
    </div>}
    {!editavel && acoesDocumento && <div className="pagina-tools" role="toolbar" aria-label="Ações da versão">{acoesDocumento}</div>}
    {avisoNota && <p role="status">{avisoNota}</p>}
    <div ref={palco} className={'pagina-palco ' + (editavel ? 'em-edicao' : '')}>
      <div className="pagina-enquadramento" style={{ width: (21 * fator)+'cm', height: (29.7 * fator)+'cm' }}>
      <div className="pagina-folha" ref={folha} data-pagina={pag} onPointerDownCapture={iniciarArraste}
        onPointerMove={e => moverArraste(e)} onPointerUp={e => moverArraste(e, true)} onLostPointerCapture={() => {
          if (arraste.current) { arraste.current.caixa.style.transform = ''; arraste.current = null }
        }} style={{ transform: 'scale('+fator+')', fontFamily: config.fonte, fontSize: config.tamanho_pt+'pt',
        padding: [m.superior,m.direita,m.inferior,m.esquerda].map(n => n+'cm').join(' ') }}>
        {regioes.map(r => <div key={r} className={'pagina-regiao '+r + (temNotas && r === 'corpo' ? (erroNotas ? ' com-notas sem-espaco' : ' com-notas') : '')} style={{ ...espaco(r),
          ...(exibida && r === 'corpo' && { '--inicio-folha': -exibida.inicio+'px', '--altura-folha': (exibida.fim-exibida.inicio)+'px' }) } as React.CSSProperties}>
          <div className="imagem-area">
            <div className="imagens-fundo"/>
            <div ref={r === 'corpo' ? visor : undefined} className="pagina-visor" data-editor={r}
              style={r !== 'corpo' && config.altura_minima_cm ? { minHeight: config.altura_minima_cm[r]+'cm' } : undefined}/>
            <div className="imagens-frente"/>
          </div>
          {r === 'corpo' && temNotas && <>
            <p ref={el => { medidor.current = el; if (el) el.style.cssText = estiloParteNota }} className="medidor-notas" aria-hidden="true"/>
            {!!exibida?.notas.length && <aside className="notas-da-folha" aria-label="Notas desta página">{exibida.notas.map(n =>
              <p key={n.id} ref={el => { if (el) el.style.cssText = estiloParteNota }}>{n.legenda}{n.texto}</p>)}</aside>}
          </>}
          {editavel && <span className="pagina-aba" aria-hidden="true">{rotulos[r]}</span>}
        </div>)}
      </div>
      </div>
    </div>
    <div className="pagina-navegacao"><button type="button" disabled={pag <= 1} onClick={() => mudarPagina(pag-1)}>Anterior</button>
      <span>Página {pag} de {total}</span><button type="button" disabled={pag >= total} onClick={() => mudarPagina(pag+1)}>Próxima</button>
      {escala < 0.98 && <button type="button" onClick={() => setAjustar(!ajustar)}>{ajustar ? 'Tamanho real' : 'Ajustar à tela'}</button>}
      {mostrarEstadoLocal && sujo && <span>Alterações por salvar</span>}</div>
    {erroNotas && <p role="alert">{erroNotas}</p>}
    {editavel && enviarImagem && ocorrencias.length > 0 && (() => {
      const painel = <PropriedadesImagem lista={ocorrencias} id={selecionada} selecionar={selecionar} mudar={mudarImagem}
        original={() => {
          const img = caixaSelecionada()?.querySelector('img')
          if (img?.naturalWidth) return { largura_cm: img.naturalWidth / pxPorCm, altura_cm: img.naturalHeight / pxPorCm }
        }} editar={() => {
          const alvo = localizar(selecionada)
          if (!alvo) return
          const { view, pos, regiao } = alvo
          ativa.current = regiao
          view.dispatch(view.state.tr.setSelection(NodeSelection.create(view.state.doc, pos)))
          escolherImagem(view)
        }}/>
      return lateralImagens ? createPortal(painel, lateralImagens) : painel
    })()}
    {imagem && enviarImagem && <ImagemPagina selecao={imagem} enviar={enviarImagem} resolver={imagemUrl} fechar={() => editarImagem(null)}
      restaurar={() => { if (!imagem.view.isDestroyed) imagem.view.focus() }} concluir={dados => {
        const { view, from, to } = imagem
        if (!view.isDestroyed) {
          const tr = closeHistory(view.state.tr)
          if (dados) {
            const node = schemaTexto.nodes.imagemAncorada.create({ imagem: dados, src: imagemUrl?.(dados.arquivo_id) })
            tr.replaceRangeWith(from, to, node)
          } else tr.delete(from, to)
          view.dispatch(tr)
          if (dados) { selecionar(dados.ocorrencia_id); requestAnimationFrame(() => abrirPropriedades(dados.ocorrencia_id)) }
        }
        editarImagem(null)
      }}/>}
    {nota && <Dialog open onOpenChange={aberto => { if (!aberto) concluirNota('cancelar') }}><DialogContent aria-describedby={undefined}
      onCloseAutoFocus={e => { e.preventDefault(); vistas.current.corpo?.focus() }}>
      <DialogTitle>{nota.nova ? 'Inserir nota' : 'Editar nota'} {nota.numero}</DialogTitle>
      <label className="grid gap-1">Texto da nota<textarea autoFocus rows={5} maxLength={20000} className="rounded border p-2" value={nota.texto} onChange={e => abrirNota({ ...nota, texto: e.target.value })}/></label>
      <div className="flex flex-wrap justify-end gap-2">{!nota.nova && <Button type="button" variant="outline" onClick={() => concluirNota('excluir')}>Excluir nota</Button>}
        <Button type="button" variant="outline" onClick={() => concluirNota('cancelar')}>Cancelar</Button>
        <Button type="button" disabled={!nota.texto.trim()} onClick={() => concluirNota('gravar')}>Gravar nota</Button></div>
    </DialogContent></Dialog>}
    {excesso && <p role="alert">Reduza as margens ou as regiões fixas para que o corpo caiba na página.</p>}
    {insercao && <InserirCampo procedencias={procedencias} atual={insercao.atual} fechar={fecharCampo} restaurar={() => { if (!insercao.view.isDestroyed) insercao.view.focus() }}
      inserir={(c, nome) => {
        const { view, from, to } = insercao
        const marks = insercao.atual ? view.state.doc.nodeAt(from)?.marks : view.state.storedMarks ?? view.state.doc.resolve(from).marks()
        const node = schemaTexto.nodes.campo.create({ ...c, rotulo: nome }, null, marks)
        fecharCampo()
        const tr = closeHistory(view.state.tr).replaceWith(from, to, node)
        view.dispatch(tr.setSelection(TextSelection.create(tr.doc, from + node.nodeSize)))
      }}/>}
    {margens && <Margens concilio={margensConcilio} atual={{ ...config, margens_cm: m }} fechar={() => setMargens(false)} aplicar={pagina => { setSujo(true); alterar?.({ ...valor, versao_formato: pagina.altura_minima_cm ? 2 : valor.versao_formato, pagina: margensConcilio ? { ...pagina, margens_cm: config.margens_cm } : pagina }) }}/>}
  </div>
}
