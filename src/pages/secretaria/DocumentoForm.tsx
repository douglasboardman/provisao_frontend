import { useReatribuicaoAtos } from './ReatribuirAtos'
import type { ReatribuicaoAtos } from '../../api/referencias-ata'
import { CamposEfetivosAta } from './CamposEfetivosAta'
import { AtualizarFontes } from './AtualizarFontes'
import { dadosLeitura } from './editor/dadosLeitura'
import { ConferirDataConvocada, DocumentoAnterior, valoresSemOrigem } from './DocumentoAnterior'
import { distinguirHomonimos, origensDoDocumento, origensPrevistas } from './procedenciaCampos'
import { EntradaCampo } from './ValoresCampos'
import { valorDoContexto, apresentar, ehCampoNumeracao, ehCampoDataHoraReuniao, origensCampo, type Valores } from '../../api/campos'
import { pessoasApi } from '../../api/pessoas'
import { igrejaApi } from '../../api/igreja'
import { ApiRequestError } from '../../api/client'
import { useImagensPagina } from './editor/useImagensPagina'
import { EditorPagina } from './editor/EditorPagina'
import { EspacoEditor, revelarCampo, type SessaoEditor } from './editor/EspacoEditor'
import { flushSync } from 'react-dom'
import { imagensAncoradas, novaPagina, paragrafosPagina, preencherPagina } from '../../api/pagina'
import { SeletorAta, descreverAta } from '../../components/shared/SeletorAta'
import { SeletorPessoa } from '../../components/shared/SeletorPessoa'
import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '../../components/ui/button'
import { nomeModalidade, secretariaApi, numeroDocumento, finalidadeTermo, livrosHabilitados, nomeLivro, politicaLivro, type EstadoLivro, type ReuniaoSecretaria, type ContextoSecretaria, type ModeloDocumento, type DocumentoResumo, type DocumentoDetalhe, type VersaoInput } from '../../api/secretaria'
import { Area, Campo, CampoPapeis, Escolha, Check, Salvar, hoje, useComando } from './formulario'
import { Compositor, LeituraEstrutura } from './Compositor'
import type { NovoTermo } from './LivrosContexto'
import { textosDeliberacoes } from './deliberacoes'
import { EditarResolucoes, prepararResolucoes } from './ResolucoesDocumento'

const camposLivro = new Set(['NUMERO_LIVRO', 'CAPACIDADE_FOLHAS', 'TITULAR', 'SERIE_LIVRO', 'MODALIDADE_LIVRO'])
const camposEncerramento = new Set(['FOLHAS_UTILIZADAS', 'PAGINAS_UTILIZADAS', 'TOTAL_ATAS', 'SALDO_FOLHAS', 'SALDO_FACES', 'INTERVALO_REGISTROS', 'MOTIVO_ENCERRAMENTO'])
export function DocumentoForm({ contexto, documento, reuniaoInicial, retificar = false, modelos, atualizarModelos, documentos, pessoas, cargos, pronto, identidade, novoTermo, conferir, destino, sessao }: {
  sessao?: SessaoEditor; reuniaoInicial?: ReuniaoSecretaria;
  conferir?: (revisao: number) => void; destino?: string; contexto: ContextoSecretaria; documento?: DocumentoDetalhe; identidade?: string; novoTermo?: NovoTermo; retificar?: boolean; modelos: ModeloDocumento[]; atualizarModelos: () => void; documentos: DocumentoResumo[]; pessoas: { id: string; nome_completo: string }[]; cargos: { id: string; nome: string }[]; pronto: (id: string) => void
}) {
  const preparando = !documento && !novoTermo && contexto.editor_pagina !== false
  const [editarPreparacao, abrirPagina] = useState(false)
  const [revisaoInicial] = useState(documento?.revisao)
  const atual = documento?.versoes.find(v => v.numero === documento.versao_atual)
  const [v, set] = useState<VersaoInput>(atual ? { modelo_versao_id: atual.modelo_versao_id ?? '', livro_id: atual.livro_id, reuniao_id: atual.reuniao_id, motivador_id: atual.motivador_id, assunto: atual.assunto, data_documento: atual.data_documento.slice(0, 10), conteudo: atual.conteudo, resolucoes: prepararResolucoes(atual.resolucoes) } : novoTermo?.previa?.versao ?? novoTermo?.versaoEncerramento ?? { modelo_versao_id: '', ...(novoTermo ? { livro_id: novoTermo.livro.id } : {}), reuniao_id: reuniaoInicial?.id ?? null, motivador_id: null, assunto: novoTermo?.finalidade === 'TERMO_ABERTURA' ? 'Abertura do livro de atas' : novoTermo ? 'Encerramento do livro de atas' : reuniaoInicial ? 'Ata de ' + nomeModalidade(contexto, reuniaoInicial.modalidade) : '', data_documento: reuniaoInicial?.data.slice(0,10) ?? hoje(), conteudo: { teor: '', campos: {}, arrolados: [], anexos: [] } })
  const [inicial] = useState(v)
  const form = useRef<HTMLFormElement>(null)
  const aposSalvar = useRef(false)
  useEffect(() => {
    if (!destino) return
    const secao = document.getElementById(destino)
    const alvo = destino === 'teor'
      ? secao?.querySelector<HTMLElement>('[data-editor="corpo"] [contenteditable=true], textarea')
      : secao?.querySelector<HTMLElement>('input:not([type=hidden]), select, textarea, button')
    if (!secao) return
    const painelFechado = !!secao.closest('aside[hidden]')
    revelarCampo(secao)
    const focar = () => (alvo ?? secao).focus()
    if (painelFechado) {
      const frame = requestAnimationFrame(focar)
      return () => cancelAnimationFrame(frame)
    }
    focar()
  }, [destino])
  const [nomeMotivador, setNomeMotivador] = useState('')
  const motivador = documentos.find(d => d.versoes.some(r => r.id === v.motivador_id))
  const [restrito, setRestrito] = useState(documento?.restrito ?? novoTermo?.livro.restrito ?? reuniaoInicial?.dados.restrito ?? false)
  const [pessoa, setPessoa] = useState(''), [autoridade, setAutoridade] = useState(''), [evidencia, setEvidencia] = useState('')
  const [upload, setUpload] = useState(false), [erroUpload, setErroUpload] = useState('')
  const novoAto = !documento || retificar && ['EXPEDIDO', 'ANULADO'].includes(documento.estado)
  const todasVersoes = modelos.flatMap(m => {
    const vigente = Math.max(...m.versoes.map(r => r.numero))
    const emEdicao = m.estado === 'EM_EDICAO'
    const autorizado = !m.permissoes || m.permissoes.criar || m.permissoes.preparar
    return m.versoes.filter(r => (novoAto ? autorizado && r.numero === vigente : r.id === atual?.modelo_versao_id || autorizado && m.permissoes?.criar !== false && r.numero === vigente) && (!emEdicao || !novoAto && r.id === atual?.modelo_versao_id) &&
      (!preparando || r.numero === vigente) && (!novoAto || contexto.editor_pagina !== false || !r.configuracao.composicao_padrao))
      .map(r => ({ ...r, nome: m.nome, permissoes: m.permissoes }))
  })
    .filter(m => !reuniaoInicial || m.tipo === 'ATA')
    .filter(m => novoTermo ? m.tipo === 'OUTRO' && m.finalidade === novoTermo.finalidade
      : atual?.modelo && finalidadeTermo(atual.modelo.finalidade) ? m.finalidade === atual.modelo.finalidade
        : m.id === atual?.modelo_versao_id || !finalidadeTermo(m.finalidade))
  const [paginaLivros, setPaginaLivros] = useState(0)
  const modelo = todasVersoes.find(m => m.id === v.modelo_versao_id)
  const prepararAta = !documento && !novoTermo && (!!reuniaoInicial || modelo?.tipo === 'ATA')
  const politicaReuniao = modelo?.tipo === 'ATA' ? 'OBRIGATORIO' : modelo?.configuracao.vinculo_reuniao ?? (modelo?.finalidade === 'CONVOCACAO' ? 'OPCIONAL' : 'NAO_PERMITE')
  const usaReuniao = !!modelo && politicaReuniao !== 'NAO_PERMITE'
  const soMinuta = modelo?.permissoes?.criar === false && modelo.permissoes.preparar
  const politicaResolucoes = modelo?.configuracao.resolucoes ?? 'NAO_PERMITE'
  const resolucoes = v.resolucoes ?? []
  const [paginaReunioes, setPaginaReunioes] = useState(0)
  const opcoesReuniao = useQuery({ queryKey: ['secretaria', identidade, contexto.id, 'reunioes', paginaReunioes],
    queryFn: () => secretariaApi.reunioes(contexto.id, paginaReunioes), enabled: usaReuniao, gcTime: 0 })
  const reunioes = opcoesReuniao.data ?? []
  const naPagina = reunioes.find(r => r.id === v.reuniao_id)
  const vinculada = useQuery({ queryKey: ['secretaria', identidade, contexto.id, 'reuniao-vinculada', v.reuniao_id],
    queryFn: () => secretariaApi.reuniao(v.reuniao_id!), enabled: !!v.reuniao_id && !naPagina && usaReuniao, gcTime: 0 })
  const reuniao = naPagina ?? vinculada.data
  const igreja = useQuery({ queryKey: ['secretaria', identidade, 'nome-igreja'], queryFn: igrejaApi.getMe,
    enabled: preparando && Object.values(modelo?.configuracao.definicoes ?? {}).some(c => c.origem === 'igreja'), gcTime: 0 })

  const participantes = new Map(reuniao?.dados.participantes.map(p => [p.pessoa_id, p]))
  const nomeArrolado = (id: string) => pessoas.find(p => p.id === id)?.nome_completo
    ?? reuniao?.participantes.find(p => p.pessoa_id === id)?.retrato.nome
    ?? atual?.arrolados.find(p => p.pessoa_id === id)?.retrato.nome ?? 'Pessoa'
  const pessoasResolucoes = v.conteudo.arrolados.map(p => {
    const participante = participantes.get(p.pessoa_id)
    const fundamento = !!p.fundamento.trim()
    const podePropor = modelo?.tipo === 'ATA'
      ? !!v.reuniao_id && (!reuniao || !!participante?.presente && (participante.pode_propor ?? fundamento))
      : fundamento
    return { id: p.pessoa_id, nome: nomeArrolado(p.pessoa_id), podePropor }
  })
  const termo = finalidadeTermo(modelo?.finalidade) ? modelo?.finalidade : undefined
  const campoAutomatico = (k: string) => !!termo && (camposLivro.has(k) || (termo === 'TERMO_ABERTURA' && ['NOME_PREPARADOR','NOME_SECRETARIO_LIVRO','TITULAR_LIVRO','CAPACIDADE_FOLHAS_LIVRO'].includes(k)) || (termo === 'TERMO_ENCERRAMENTO' && camposEncerramento.has(k)))
  const politica = modelo ? politicaLivro(modelo.configuracao) : 'NAO_PERMITE'
  const escolherLivro = livrosHabilitados() && !novoTermo && !termo && politica !== 'NAO_PERMITE'
  const filtroLivros = { restrito, serie: modelo?.tipo === 'ATA' ? modelo.configuracao.perfil : undefined, estado: 'ABERTO' as EstadoLivro }
  const livros = useQuery({
    queryKey: ['secretaria', identidade, 'livros-para-documento', contexto.id, paginaLivros, filtroLivros],
    queryFn: () => secretariaApi.livros(contexto.id, paginaLivros, filtroLivros),
    enabled: escolherLivro, gcTime: 0,
  })
  const [livroSelecionado, setLivroSelecionado] = useState<{ id: string; perfil: string }>()
  const livroDaPagina = v.livro_id === atual?.livro_id ? atual?.livro : v.livro_id === novoTermo?.livro.id ? novoTermo?.livro :
    livros.data?.find(l => l.id === v.livro_id) ?? (livroSelecionado?.id === v.livro_id ? livroSelecionado : undefined)
  const textos = v.conteudo.estrutura ? Object.values(v.conteudo.estrutura).flat().flatMap(b => b.tipo === 'TEXTO' ? [b.texto] : b.tipo === 'LISTA' ? b.itens : b.tipo === 'TABELA' ? b.linhas.flat() : []) : []
  const obrigatorios = new Set(modelo?.configuracao.campos_obrigatorios ?? [])
  const pagina = v.conteudo.composicao
  const textosPagina = pagina ? paragrafosPagina([...pagina.cabecalho, ...pagina.corpo, ...pagina.rodape]).map(p => p.trechos.map(t => t.tipo === 'texto' ? t.texto : '').join('')) : []
  const usados = [v.conteudo.teor, ...textos, ...textosPagina].flatMap(t => [...t.matchAll(/\{\{([^{}]*)\}\}/g)].map(m => m[1]))
  const campos = [...new Set([...obrigatorios, ...Object.keys(modelo?.configuracao.tipos_campos ?? {}), ...usados.filter(k => /^[A-Z][A-Z0-9_]{0,79}$/.test(k))])]
  const usarAssunto = preparando && campos.includes('ASSUNTO') && (!modelo?.configuracao.tipos_campos?.ASSUNTO || modelo.configuracao.tipos_campos.ASSUNTO === 'TEXTO')
  const aguardaAnterior = preparando && modelo?.configuracao.motivador === 'OBRIGATORIO' && !v.motivador_id
  const pendentes = [...new Set([...obrigatorios, ...usados])].filter(k => !campoAutomatico(k) && (!/^[A-Z][A-Z0-9_]{0,79}$/.test(k) || !(usarAssunto && k === 'ASSUNTO' ? v.assunto : v.conteudo.campos[k])?.trim()))
  const secretariosMesa = reuniao?.participantes.filter(p => p.presente && p.papeis.includes('SECRETARIO')) ?? []
  const eleito = contexto.tipo === 'ASSEMBLEIA_GERAL' && secretariosMesa.length === 1 ? secretariosMesa[0] : null
  const redatorDaMesa = eleito ? { pessoa_id: eleito.pessoa_id, nome: eleito.retrato.nome } : null
  const redator = reuniao?.instalacao_formal ? redatorDaMesa : v.conteudo.redator_ata
  const pessoasRedator = useQuery({ queryKey: ['secretaria', identidade, 'pessoas-opcoes'], queryFn: pessoasApi.list,
    enabled: !documento && modelo?.tipo === 'ATA' && !reuniao?.instalacao_formal, gcTime: 0 })
  const opcoesRedator = (pessoasRedator.data ?? pessoas).map(p => ({ id: p.id, nome: p.nome_completo }))
  if (redator?.nome && !opcoesRedator.some(p => p.id === redator.pessoa_id)) opcoesRedator.push({ id: redator.pessoa_id, nome: redator.nome })
  const exigeRedator = Object.entries(modelo?.configuracao.definicoes ?? {}).some(([id, campo]) =>
    campo.origem === 'redator_ata' && modelo?.configuracao.obrigatorios_biblioteca?.includes(id))
  const sugeridos = atual?.reuniao_id === v.reuniao_id && atual?.modelo_versao_id === v.modelo_versao_id &&
    atual?.data_documento.slice(0,10) === v.data_documento ? documento?.sugestoes_arrolados ?? [] : []
  function incluirPresentes() {
    const porPessoa = new Map(v.conteudo.arrolados.map(p => [p.pessoa_id, p]))
    for (const sugestao of sugeridos) {
      const atual = porPessoa.get(sugestao.pessoa_id)
      porPessoa.set(sugestao.pessoa_id, atual ? { ...atual,
        papeis: [...new Set([...atual.papeis, ...sugestao.papeis])],
        cargos_ids: [...new Set([...atual.cargos_ids ?? [], ...sugestao.cargos_ids])],
        assina: atual.assina || sugestao.assina, obrigatorio: atual.obrigatorio || sugestao.obrigatorio,
        fundamento: atual.fundamento || sugestao.fundamento } : sugestao)
    }
    conteudo('arrolados', [...porPessoa.values()])
  }
  const valores: Valores = { ...v.conteudo.valores }
  const reuniaoAtual = reuniao
  for (const [id, d] of Object.entries(modelo?.configuracao.definicoes ?? {})) {
    if (d.origem.startsWith('contexto_')) {
      const valor = valorDoContexto(d.origem, contexto)
      if (!valores[id] && valor !== undefined) valores[id] = { ...d, valor, origem: { tipo: 'sistema', chave: d.origem, cadastro: 'contexto', registro_id: contexto.id }, ajustado_manualmente: false }
      continue
    }
    const endereco = (modelo?.finalidade !== 'CONVOCACAO' ? reuniaoAtual?.local_efetivo_retrato : null) ?? reuniaoAtual?.local_retrato
    const calculado = d.origem === 'deliberacoes_reuniao' ? textosDeliberacoes(resolucoes, nomeArrolado) : d.origem === 'data_prevista_reuniao' ? reuniaoAtual?.data.slice(0,10) : d.origem === 'horario_previsto_reuniao' ? reuniaoAtual?.dados.horario_previsto :
      d.origem === 'redator_ata' ? redator?.nome ?? null : ehCampoDataHoraReuniao(d.origem) ? reuniaoAtual?.[d.origem] ?? null : d.origem.startsWith('endereco_') ? endereco?.[d.origem as keyof NonNullable<typeof endereco>] || null : d.origem === 'igreja' ? igreja.data?.nome : d.origem === 'assunto' ? v.assunto : d.origem === 'data_documento' ? v.data_documento :
      d.origem === 'pauta_reuniao' ? reuniaoAtual?.itens_pauta?.map(i => i.descricao) : d.origem === 'local_reuniao' ? (endereco?.descritivo ?? reuniaoAtual?.dados.local) : d.origem === 'presentes' ? reuniaoAtual?.dados.participantes.filter(p => p.presente).flatMap(p => reuniaoAtual.participantes.filter(x => x.pessoa_id === p.pessoa_id).map(x => x.retrato.nome)) : undefined
    if (calculado !== undefined && (!valores[id] || (ehCampoDataHoraReuniao(d.origem) && d.origem.startsWith('horario_') && valores[id].valor === null) || ['assunto','data_documento','deliberacoes_reuniao'].includes(d.origem) || (d.origem === 'redator_ata' && redator?.pessoa_id !== atual?.conteudo.redator_ata?.pessoa_id) || atual?.reuniao_id !== v.reuniao_id)) valores[id] = { ...d, valor: calculado, origem: { tipo: 'sistema', chave: d.origem }, ajustado_manualmente: false }
    if (d.origem === 'manual' && modelo?.configuracao.obrigatorios_biblioteca?.includes(id) && ![valores[id]?.valor].flat().some(x => x != null && String(x).trim())) pendentes.push(d.nome)
  }
  const procedencias = distinguirHomonimos(origensDoDocumento(origensPrevistas(modelo?.configuracao.antecedentes, modelos),
    valores, v.conteudo.antecedente, !!v.motivador_id, modelo?.configuracao.motivador === 'OPCIONAL'), modelo?.configuracao.definicoes)
  const editar = <K extends keyof VersaoInput>(k: K, valor: VersaoInput[K]) => set(s => ({ ...s, [k]: valor }))
  function classificarMinuta(valor: boolean) {
    if (!valor && v.motivador_id && !window.confirm('Alterar o sigilo e selecionar novamente o documento anterior?')) return
    setRestrito(valor)
    setPaginaLivros(0)
    set(s => ({ ...s, livro_id: null, ...(!valor && {
      reuniao_id: reuniao?.dados.restrito ? null : s.reuniao_id,
      motivador_id: null, confirmar_troca_origem: true, conteudo: { ...s.conteudo, efetivos:undefined, antecedente: undefined, valores: valoresSemOrigem(s.conteudo.valores) }
    }) }))
  }
  const conteudo = <K extends keyof VersaoInput['conteudo']>(k: K, valor: VersaoInput['conteudo'][K]) => set(s => ({ ...s, conteudo: { ...s.conteudo, [k]: valor } }))
  const reatribuicao = useReatribuicaoAtos()
  const enviar = useComando((dados: { versao: VersaoInput; reatribuicao_atos?: ReatribuicaoAtos }) => documento ? (retificar ? secretariaApi.comando(documento.id, 'retificar', { ...dados, revisao: revisaoInicial!, autoridade, evidencia }) : secretariaApi.editarDocumento(documento.id, { ...dados, revisao: revisaoInicial! })) : secretariaApi.criarDocumento({ ...dados, ...(novoTermo?.previa && { conferencia_abertura: novoTermo.previa.conferencia }), ...(soMinuta && { acao: 'preparar' }), ...(preparando && { usar_modelo_vigente: true }), contexto_id: contexto.id, restrito }), r => {
    const concluir = () => { if (aposSalvar.current && conferir && r.revisao) conferir(r.revisao); else pronto(r.id) }
    if (sessao) sessao.gravou(concluir)
    else concluir()
  }, `${documento?.id}:${documento?.revisao}:${contexto.id}:${retificar}:${restrito}:${autoridade}:${evidencia}`)
  async function anexar(file: File) {
    setUpload(true); setErroUpload('')
    try { const f = await secretariaApi.upload(file); set(s => ({ ...s, conteudo: { ...s.conteudo, anexos: [...s.conteudo.anexos, { arquivo_id: f.id, nome: file.name }] } })) }
    catch (error) { setErroUpload(error instanceof Error ? error.message : 'Falha ao enviar anexo.') }
    finally { setUpload(false) }
  }
  const imagensPagina = useImagensPagina(documento && atual ? (id: string) => secretariaApi.anexoUrl(documento.id, atual.id, id) + '?visualizacao=imagem' : modelo ? (id: string) => secretariaApi.imagemModeloUrl(modelo.id, id) : undefined)
  const imagemUrl = imagensPagina.url
  const menu = documento && !retificar && conferir && <button type="button" disabled={imagensPagina.enviando || upload || enviar.isPending || documento.revisao !== revisaoInicial} onClick={() => {
    if (v === inicial) conferir(documento.revisao)
    else {
      const botao = form.current?.querySelector<HTMLButtonElement>('button[name="salvar-conferir"]')
      if (botao) form.current?.requestSubmit(botao)
    }
  }}>{v === inicial ? 'Conferir tramitação' : 'Salvar e conferir tramitação'}</button>
  const folha = (!preparando || editarPreparacao) && pagina && <div id="teor" tabIndex={-1}><EditorPagina enviarImagem={imagensPagina.enviar} mostrarEstadoLocal={!sessao} imagemUrl={imagemUrl} definicoes={modelo?.configuracao.definicoes} procedencias={procedencias}
    acoesDocumento={sessao && menu ? <button type="button" onClick={() => {
      const alvo = document.getElementById('conferir-minuta')
      if (alvo) { flushSync(() => revelarCampo(alvo)); alvo.focus() }
    }}>Tramitação</button> : menu} margensConcilio={livroDaPagina?.perfil === 'CONCILIO_IPB_2025'} valor={pagina} valores={valores} editarValor={id => {
      const origem = modelo?.configuracao.definicoes?.[id]?.origem
      const campo = document.getElementById(origem === 'deliberacoes_reuniao' ? 'resolucoes' : origem === 'redator_ata' ? 'redator-ata' : 'valor-'+id)
      if (campo && sessao) flushSync(() => revelarCampo(campo))
      ;(campo?.querySelector<HTMLElement>('input,select,button') ?? campo)?.focus()
    }} alterar={p => conteudo('composicao', p)} /></div>
  const cargosDaPessoa = (id:string) => {
    const p = v.conteudo.arrolados.find(a=>a.pessoa_id===id)
    const gravados = atual?.arrolados.find(a=>a.pessoa_id===id)?.retrato.cargos ?? []
    return [...new Set([...(p?.cargos_ids ?? []),...(p?.cargo_id ? [p.cargo_id] : [])])].map(c=>
      cargos.find(a=>a.id===c)?.nome ?? gravados.find(a=>a.id===c)?.nome ?? '').filter(Boolean)
  }
  const previa = pagina ? <EditorPagina dadosLeitura={dadosLeitura(v.conteudo.arrolados,resolucoes,nomeArrolado,cargosDaPessoa,termo,v.conteudo.campos)} imagemUrl={imagemUrl} valor={preencherPagina(pagina, usarAssunto ? { ...v.conteudo.campos, ASSUNTO: v.assunto } : v.conteudo.campos, modelo?.configuracao.tipos_campos)} valores={valores} margensConcilio={livroDaPagina?.perfil === 'CONCILIO_IPB_2025'}/> :
    <article className="doc-sheet">{!modelo ? 'Selecione um modelo para visualizar a página.' : <>{v.conteudo.teor}{v.conteudo.estrutura && <LeituraEstrutura valor={v.conteudo.estrutura} campos={v.conteudo.campos} tipos={modelo.configuracao.tipos_campos} versaoModelo={modelo.id} documentoId={documento?.id} versao={atual}/>}</>}</article>
  const editorClassico = !preparando && !pagina && <div className="doc-sheet space-y-4">
    {contexto.editor_pagina !== false && !pagina && !v.conteudo.estrutura && <Button type="button" variant="outline" onClick={() => set(s => ({ ...s, conteudo: { ...s.conteudo, composicao: novaPagina(s.conteudo.teor), teor: '' } }))}>Usar editor de página</Button>}
    {!pagina && <div id="teor"><Area label="Teor" value={v.conteudo.teor} onChange={s => conteudo('teor', s)} required={false} /></div>}
    {!pagina && !v.conteudo.estrutura && <Button type="button" variant="outline" onClick={() => conteudo('estrutura', { cabecalho: [], corpo: [], rodape: [] })}>Adicionar compositor estruturado</Button>}
    {v.conteudo.estrutura && <Compositor valor={v.conteudo.estrutura} alterar={estrutura => conteudo('estrutura', estrutura)} anexos={v.conteudo.anexos} />}
  </div>
  const selecionarModelo = <div className="space-y-4">
    {novoTermo && <p>{nomeLivro(novoTermo.livro)} · {novoTermo.livro.titular}</p>}
    {novoTermo && todasVersoes.length === 0 && <p role="status">Cadastre um modelo de termo para esta finalidade na aba Modelos antes de continuar.</p>}
    {!sessao && !pagina && menu}
    {novoTermo?.previa && <div className="space-y-1">
      <p>Preparado por: {novoTermo.previa.preparador?.nome ?? 'Pessoa não vinculada'}</p>
      <p>Secretário responsável: {novoTermo.previa.secretario?.nome ?? 'Pendente'}</p>
      {novoTermo.previa.presidente && <p>Presidente signatário: {novoTermo.previa.presidente.nome}</p>}
      {novoTermo.previa.pendencias.map(p => <p key={p} role="status">{p}</p>)}
    </div>}
    <Escolha disabled={!!novoTermo?.previa || !!novoTermo?.versaoEncerramento} label="Modelo e versão" value={v.modelo_versao_id} onChange={s => {
      const escolhido = todasVersoes.find(x => x.id === s)
      const trocar = !!modelo?.configuracao.antecedentes?.length || !!escolhido?.configuracao.antecedentes?.length
      if (trocar && Object.values(v.conteudo.valores ?? {}).some(c => c.origem.tipo === 'documento_anterior' && c.ajustado_manualmente) &&
          !window.confirm('Trocar de modelo removerá o vínculo anterior e seus valores ajustados. Confirmar?')) return
      if (!documento && !novoTermo && !reuniaoInicial && !(escolhido?.tipo === 'ATA' ? contexto.pode_classificar_ata : contexto.pode_consultar_restritos)) setRestrito(false)
      setPaginaLivros(0)
      setPaginaReunioes(0)
      set(atual => {
        const anterior = modelos.flatMap(m => m.versoes).find(x => x.id === atual.modelo_versao_id)?.configuracao
        const inicial = anterior?.estrutura_padrao
        const substituirModelo = preparando || !documento && !atual.conteudo.teor && JSON.stringify(atual.conteudo.estrutura) === JSON.stringify(inicial)
          && JSON.stringify(atual.conteudo.composicao) === JSON.stringify(anterior?.composicao_padrao)
        const composicao = substituirModelo ? escolhido?.configuracao.composicao_padrao : atual.conteudo.composicao
        const estrutura = substituirModelo ? escolhido?.configuracao.estrutura_padrao : atual.conteudo.estrutura
        const arquivosAnteriores = Object.values(inicial ?? {}).flat().filter(b => b.tipo === 'IMAGEM').map(b => b.arquivo_id)
        const anexos = atual.conteudo.anexos.filter(a => !substituirModelo || !arquivosAnteriores.includes(a.arquivo_id))
        if (substituirModelo) {
          for (const bloco of Object.values(estrutura ?? {}).flat()) {
            if (bloco.tipo === 'IMAGEM' && !anexos.some(a => a.arquivo_id === bloco.arquivo_id)) anexos.push({ arquivo_id: bloco.arquivo_id, nome: bloco.descricao || 'Imagem do modelo' })
          }
        }
        return {
          ...atual, modelo_versao_id: s,
          livro_id: novoTermo || termo || escolhido?.configuracao.perfil === modelo?.configuracao.perfil ? atual.livro_id : null,
          reuniao_id: escolhido?.tipo === 'ATA' || escolhido?.finalidade === 'CONVOCACAO' || escolhido?.configuracao.vinculo_reuniao && escolhido.configuracao.vinculo_reuniao !== 'NAO_PERMITE' ? atual.reuniao_id : null,
          confirmar_troca_origem: trocar || atual.confirmar_troca_origem,
          motivador_id: trocar || escolhido?.configuracao.motivador === 'NAO_PERMITE' ? null : atual.motivador_id,
          conteudo: { ...atual.conteudo, redator_ata: escolhido?.tipo === 'ATA' ? atual.conteudo.redator_ata : undefined, ...(preparando && { campos: Object.fromEntries(Object.entries(atual.conteudo.campos).filter(([k]) => escolhido?.configuracao.campos_obrigatorios.includes(k) && anterior?.tipos_campos?.[k] === escolhido.configuracao.tipos_campos?.[k])) }), antecedente: undefined, estrutura, anexos, composicao, valores: Object.fromEntries(Object.entries(atual.conteudo.valores ?? {}).filter(([id, v]) => {
            const d = escolhido?.configuracao.definicoes?.[id]
            return d && d.tipo === v.tipo && d.multiplo === v.multiplo && d.origem === 'manual' && v.origem.tipo === 'manual'
          })) },
        }
      })
    }}><option value="">Selecione um modelo</option>{todasVersoes.map(m => <option key={m.id} value={m.id}>{m.nome} — v{m.numero}{m.permissoes && !m.permissoes.criar && m.permissoes.preparar ? ' · Preparar minuta' : ''}</option>)}</Escolha>
    {!documento && contexto.editor_pagina === false && <p>Novos documentos usam o formulário anterior neste contexto. Selecione uma versão de modelo nesse formato.</p>}
    {preparando && !todasVersoes.length && <p>Nenhum modelo disponível para criar documentos neste contexto.</p>}
  </div>
  const selecionarAnterior = (!preparando || modelo) && <>
    <div id="motivador" tabIndex={-1}>{modelo?.configuracao.antecedentes?.length ? <DocumentoAnterior key={modelo.id + String(restrito) + v.reuniao_id} v={v} modelo={modelo} contexto={contexto.id} identidade={identidade} restrito={restrito} documento={documento?.id}
      aplicar={previa => set(s => ({ ...s, confirmar_troca_origem: true, motivador_id: previa?.antecedente.versao_id ?? null,
        conteudo: { ...s.conteudo, antecedente: previa?.antecedente, valores: { ...valoresSemOrigem(s.conteudo.valores), ...previa?.valores } } }))}/>
      : modelo?.configuracao.motivador !== 'NAO_PERMITE' && <SeletorAta documento label="Documento motivador" chave={[identidade, 'motivador', documento?.id, restrito]}
      contextoInicial={contexto.id} valor={v.motivador_id ? nomeMotivador || (motivador ? numeroDocumento(motivador) + ' · ' + motivador.versoes.find(r => r.id === v.motivador_id)?.assunto : 'Referência histórica preservada') : ''}
      buscar={f => secretariaApi.selecaoMotivadores({ ...f, restrito: String(restrito), ...(documento ? { excluir: documento.id } : {}) })}
      selecionar={a => { setNomeMotivador(descreverAta(a)); editar('motivador_id', a.versao_id) }}
      limpar={() => { setNomeMotivador(''); editar('motivador_id', null) }} />}</div>
    {reuniaoAtual && v.conteudo.antecedente && <ConferirDataConvocada valores={valores} dataReuniao={reuniaoAtual.data}/>}
    </>
  const vinculos = <>{selecionarModelo}{selecionarAnterior}</>
  const seletorReuniao = usaReuniao && <div id="reuniao" className="space-y-2"><Escolha required={politicaReuniao === 'OBRIGATORIO'} disabled={!!reuniaoInicial || modelo?.finalidade === 'CONVOCACAO' && !!atual?.reuniao_id} label={modelo?.tipo === 'ATA' ? 'Reunião da ata' : 'Reunião vinculada'} value={v.reuniao_id ?? ''} onChange={id => {
      const selecionada = reunioes.find(r => r.id === id)
      if (Object.values(v.conteudo.valores ?? {}).some(c => c.origem.tipo === 'documento_anterior' && c.ajustado_manualmente) &&
          !window.confirm('Trocar a reunião e remover os campos recepcionados ajustados?')) return
      set(s => ({ ...s, reuniao_id: id || null, resolucoes: s.resolucoes?.map(r => ({ ...r, item_pauta_id: null })), ...(modelo?.tipo === 'ATA' && {
        ...(prepararAta && selecionada && { data_documento: selecionada.data.slice(0,10), assunto: 'Ata de ' + nomeModalidade(contexto, selecionada.modalidade) }),
        motivador_id: null, confirmar_troca_origem: true, conteudo: { ...s.conteudo, efetivos:undefined, antecedente: undefined, valores: valoresSemOrigem(s.conteudo.valores) }
      }) }))
    }}>
      <option value="">Selecione a reunião</option>
      {v.reuniao_id && !naPagina && <option value={v.reuniao_id}>{reuniao ? reuniao.data.slice(0, 10) + ' · ' + reuniao.dados.local : 'Reunião vinculada'}</option>}
      {reunioes.filter(r => restrito || !r.dados.restrito || r.id === v.reuniao_id).map(r => <option key={r.id} value={r.id}>{r.data.slice(0, 10)} · {nomeModalidade(contexto, r.modalidade)} · {r.dados.local}</option>)}</Escolha>
      {opcoesReuniao.error && <p role="alert">{opcoesReuniao.error.message}</p>}
      {(paginaReunioes > 0 || reunioes.length === 30) && <div className="flex gap-2"><Button type="button" variant="outline" disabled={!paginaReunioes} onClick={() => setPaginaReunioes(paginaReunioes-1)}>Reuniões anteriores</Button>
        <Button type="button" variant="outline" disabled={reunioes.length !== 30} onClick={() => setPaginaReunioes(paginaReunioes+1)}>Mais reuniões</Button></div>}</div>
  const seletorLivro = escolherLivro && <div id="livro" className="space-y-2">
      <Escolha label="Livro de registro" required={politica === 'OBRIGATORIO'} value={v.livro_id ?? ''} onChange={id => {
        const transferir = !!documento?.identificacao_livro && id !== atual?.livro_id
        if (transferir && (!id || !window.confirm('Transferir a ata para este livro? Ao salvar, o número anterior será cancelado e um novo será reservado.'))) return
        setLivroSelecionado(livros.data?.find(l => l.id === id))
        set(s => ({ ...s, livro_id: id || null, confirmar_troca_livro: transferir }))
      }}>
        <option value="">{politica === 'OBRIGATORIO' ? 'Selecione um livro aberto' : 'Sem registro em livro'}</option>
        {v.livro_id && !livros.data?.some(item => item.id === v.livro_id) && <option value={v.livro_id}>Livro vinculado à versão</option>}
        {livros.data?.map(item => <option key={item.id} value={item.id}>{nomeLivro(item)} · {item.capacidade_folhas} folhas</option>)}
      </Escolha>
      {livros.isError && <p role="alert">{livros.error.message}</p>}
      {livros.data?.length === 0 && !v.livro_id && <p>Não há livro aberto compatível neste contexto.</p>}
      {(paginaLivros > 0 || livros.data?.length === 30) && <div className="flex gap-2">
        <Button type="button" variant="outline" disabled={paginaLivros === 0} onClick={() => setPaginaLivros(paginaLivros - 1)}>Livros anteriores</Button>
        <Button type="button" variant="outline" disabled={livros.data?.length !== 30} onClick={() => setPaginaLivros(paginaLivros + 1)}>Mais livros</Button>
      </div>}
    </div>
  const seletorRedator = modelo?.tipo === 'ATA' && <div id="redator-ata" className="grid gap-1 text-sm">
      {reuniao?.instalacao_formal ? <p>{eleito ? 'Redator eleito pela assembleia · ' + eleito.retrato.nome : 'O secretário eleito será identificado como redator ao instalar a mesa.'}</p> : <>
      <label htmlFor="seletor-redator-ata">Redator da ata{exigeRedator && ' (obrigatório)'}</label>
      <SeletorPessoa id="seletor-redator-ata" value={redator?.pessoa_id ?? ''} opcoes={opcoesRedator}
        carregando={pessoasRedator.isFetching} required={false} onChange={id => conteudo('redator_ata', id ? { pessoa_id: id, nome: opcoesRedator.find(p => p.id === id)?.nome } : null)} />
      {!redator && eleito && <Button type="button" variant="outline" onClick={() => conteudo('redator_ata', { pessoa_id: eleito.pessoa_id, nome: eleito.retrato.nome })}>Confirmar {eleito.retrato.nome} como redator</Button>}
      {pessoasRedator.isError && <p role="alert">Não foi possível carregar as pessoas da igreja.</p>}</>}
    </div>
  const dados = <div className="space-y-4">
    {(!preparando || modelo) && <>
    {seletorReuniao}
    {documento && !retificar && modelo && (v.reuniao_id || v.livro_id || Object.keys(modelo.configuracao.definicoes ?? {}).length > 0) && <AtualizarFontes documento={documento.id} revisao={revisaoInicial!} versao={v} definicoes={modelo.configuracao.definicoes ?? {}} aplicar={(automaticos, assinatura, planejamento) => set(s => ({ ...s, atualizar_fontes: assinatura, conteudo: { ...s.conteudo, planejamento_origem: planejamento, valores: { ...s.conteudo.valores, ...automaticos } } }))}/>}
    {seletorRedator}
    {modelo?.tipo==='ATA' && <CamposEfetivosAta minimoDeclarado={!reuniao?.dados.modelo_reuniao || reuniao.dados.modelo_reuniao.configuracao.primeira==='Pendente'} valor={v.conteudo.efetivos ?? {}} alterar={valor=>conteudo('efetivos',valor)} conselho={contexto.orgao?.tipo==='CONSELHO'}/>}
    {!documento && !novoTermo && modelo && (modelo.tipo === 'ATA' ? contexto.pode_classificar_ata : contexto.pode_consultar_restritos) && <Check label={modelo.tipo === 'ATA' ? 'Ata restrita' : 'Documento restrito'} checked={restrito} onChange={classificarMinuta} />}
    {seletorLivro}
    {termo === 'TERMO_ENCERRAMENTO' && <p>Os totais do encerramento vêm do inventário do livro.</p>}
    {!aguardaAnterior && <>
    <div className="grid gap-4 md:grid-cols-2"><Campo label="Assunto" value={v.assunto} onChange={s => editar('assunto', s)} />{novoTermo?.previa ? <p className="text-sm">Data do termo · {v.data_documento.split('-').reverse().join('/')}</p> : <Campo label={modelo?.tipo === 'ATA' ? 'Data do ato' : 'Data do documento'} type="date" value={v.data_documento} onChange={s => editar('data_documento', s)} />}</div>
    {documento?.criado_em && modelo?.tipo === 'ATA' && <p className="text-sm">Minuta preparada em {new Date(documento.criado_em).toLocaleDateString('pt-BR')} · {numeroDocumento(documento)}</p>}
    {campos.filter(k => !campoAutomatico(k) && (!preparando || obrigatorios.has(k) && !(usarAssunto && k === 'ASSUNTO'))).map(k => {
      const tipo = modelo?.configuracao.tipos_campos?.[k]
      const label = `Campo: ${k.toLowerCase().replace(/_/g, ' ')}`
      const valor = v.conteudo.campos[k] ?? ''
      const alterar = (s: string) => conteudo('campos', { ...v.conteudo.campos, [k]: s })
      if (tipo === 'SIM_NAO') return <div key={k} id={'campo-'+k}><Escolha label={label} required={false} value={valor} onChange={alterar}><option value="">A preencher</option><option value="SIM">Sim</option><option value="NAO">Não</option></Escolha></div>
      if (tipo === 'NUMERO') return <label key={k} id={'campo-'+k} className="grid gap-1 text-sm">{label}<input className="rounded border p-2" type="number" step="any" value={valor} onChange={e => alterar(e.target.value)} /></label>
      return <div key={k} id={'campo-'+k}><Campo label={label} required={false} type={tipo === 'DATA' ? 'date' : 'text'} value={valor} onChange={alterar} /></div>
    })}
    {Object.entries(modelo?.configuracao.definicoes ?? {}).map(([id,c]) => {
      if (c.origem === 'redator_ata' || c.origem === 'deliberacoes_reuniao') return null
      const valor = valores[id]
      if (preparando && c.origem !== 'manual') {
        const origem = origensCampo[c.origem]
        return <p key={id} className="text-sm"><strong>{c.nome}</strong> · {apresentar({ tipo: 'campo', campo_id: id, apresentacao: 'em_linha' }, valor) || (ehCampoNumeracao(c.origem) ? 'Atribuído no primeiro encaminhamento' : 'A preencher')} <small>({origem})</small></p>
      }
      if (preparando && !procedencias[id] && !modelo?.configuracao.obrigatorios_biblioteca?.includes(id)) return null
      return <EntradaCampo key={id} id={id} campo={c} indicacao={procedencias[id]} obrigatorio={!!modelo?.configuracao.obrigatorios_biblioteca?.includes(id)} valor={valores[id]} alterar={valor => conteudo('valores', { ...v.conteudo.valores, [id]: valor })}/>
    })}
    {pendentes.length > 0 && <p className="text-sm">Preencha antes de encaminhar: {pendentes.join(', ')}.</p>}
    </>}
    </>}
  </div>
  const painelResolucoes = !preparando && (politicaResolucoes !== 'NAO_PERMITE' || resolucoes.length > 0) && <div id="resolucoes" tabIndex={-1}><EditarResolucoes
      valor={resolucoes} pauta={reuniao?.itens_pauta} pessoas={pessoasResolucoes} permitido={politicaResolucoes !== 'NAO_PERMITE'}
      obrigatorio={politicaResolucoes === 'OBRIGATORIO'} alterar={r => editar('resolucoes', r)}
    /></div>
  const participantesEAtos = !preparando && <div className="space-y-4">
    <fieldset id="arrolados" tabIndex={-1} className="space-y-3"><legend className="font-semibold">Arrolados, responsáveis e signatários</legend><p className="text-sm">Uma pessoa pode exercer vários papéis. Participar não implica assinar. Documente o fundamento de quem assina ou responde pelo documento.</p>
      {sugeridos.length > 0 && <Button type="button" variant="outline" onClick={incluirPresentes}>Incluir presentes e signatários da reunião</Button>}
      <div className="flex items-end gap-2"><label className="min-w-0 flex-1 text-sm">Adicionar arrolado<SeletorPessoa rotulo="Adicionar arrolado" value={pessoa} onChange={setPessoa} opcoes={pessoas.filter(p => !v.conteudo.arrolados.some(r => r.pessoa_id === p.id)).map(p => ({ id: p.id, nome: p.nome_completo }))} /></label><Button type="button" variant="outline" disabled={!pessoa} onClick={() => { conteudo('arrolados', [...v.conteudo.arrolados, { pessoa_id: pessoa, papeis: ['PARTICIPANTE'], cargo_id: null, cargos_ids: [], assina: false, obrigatorio: false, responsavel: false, fundamento: '' }]); setPessoa('') }}>Arrolar pessoa</Button></div>
      {v.conteudo.arrolados.map((p, i) => {
        const atualizar = (patch: Partial<typeof p>) => conteudo('arrolados', v.conteudo.arrolados.map((x, n) => n === i ? { ...x, ...patch } : x))
        const vinculado = resolucoes.some(r => r.proponentes_pessoas_ids.includes(p.pessoa_id) || r.dissidentes_pessoas_ids.includes(p.pessoa_id))
        return <div key={p.pessoa_id} className="space-y-3 rounded border p-3"><p className="font-medium">{nomeArrolado(p.pessoa_id)}</p><div className="grid gap-3 md:grid-cols-2"><CampoPapeis label="Papéis no documento (separados por vírgula)" value={p.papeis} onChange={s => atualizar({ papeis: s })} /><fieldset className="space-y-2"><legend>Cargos institucionais</legend>{!cargos.length && <p className="text-sm">Sem cargos configurados neste contexto.</p>}{cargos.map(c => <Check key={c.id} label={c.nome} checked={[...(p.cargo_id ? [p.cargo_id] : []), ...(p.cargos_ids ?? [])].includes(c.id)} onChange={b => atualizar({ cargo_id: null, cargos_ids: b ? [...new Set([...(p.cargo_id ? [p.cargo_id] : []), ...(p.cargos_ids ?? []), c.id])] : [...(p.cargo_id ? [p.cargo_id] : []), ...(p.cargos_ids ?? [])].filter(id => id !== c.id) })} />)}</fieldset></div><div className="flex flex-wrap gap-4"><Check label="Signatário" checked={p.assina} onChange={b => atualizar({ assina: b, obrigatorio: b && p.obrigatorio })} /><Check label="Assinatura obrigatória" checked={p.obrigatorio} onChange={b => atualizar({ obrigatorio: b, assina: b || p.assina })} /><Check label="Responsável pelo documento" checked={p.responsavel} onChange={b => atualizar({ responsavel: b })} /></div><Campo label="Fundamento do papel e da competência" required={p.assina || p.responsavel} value={p.fundamento} onChange={s => atualizar({ fundamento: s })} /><Button type="button" variant="outline" disabled={vinculado} onClick={() => conteudo('arrolados', v.conteudo.arrolados.filter((_, n) => n !== i))}>Remover arrolado</Button>{vinculado && <p className="text-sm text-muted-foreground">Retire os vínculos com resoluções para remover este arrolado.</p>}</div>
      })}
    </fieldset>
    <fieldset className="space-y-2"><legend className="font-semibold">Anexos privados</legend><label className="grid gap-1 text-sm">Enviar anexo (até 10 MB)<input type="file" disabled={upload} onChange={e => { const f = e.target.files?.[0]; if (f) void anexar(f); e.target.value = '' }} /></label>{upload && <p role="status">Enviando anexo…</p>}{erroUpload && <p role="alert">{erroUpload}</p>}{v.conteudo.anexos.map((f, i) => <div className="flex items-center gap-3" key={f.arquivo_id}><span>{f.nome}</span><Button type="button" variant="outline" onClick={() => conteudo('anexos', v.conteudo.anexos.filter((_, n) => n !== i))}>Retirar anexo</Button></div>)}</fieldset>
  </div>
  const fundamentoRetificacao = retificar && <div className="space-y-3">
    <Campo label="Autoridade da retificação" value={autoridade} onChange={setAutoridade} />
    <Area label="Fundamento e evidência da retificação" value={evidencia} onChange={setEvidencia} />
    <p>A versão anterior permanece preservada. Documento já expedido gera um novo ato.</p>
  </div>
  const avisos = <>
    {documento && documento.revisao !== revisaoInicial && <p role="alert">Outra revisão foi salva. Copie as suas alterações antes de recarregar o documento.</p>}
    {sessao && documento && (documento.revisao !== revisaoInicial || enviar.error instanceof ApiRequestError && enviar.error.statusCode === 409) &&
      <Button type="button" variant="outline" onClick={() => window.location.reload()}>Recarregar documento</Button>}
    {preparando && enviar.error instanceof ApiRequestError && enviar.error.statusCode === 409 && <Button type="button" variant="outline" onClick={atualizarModelos}>Atualizar modelos</Button>}
  </>
  const preparacaoAta = prepararAta ? <div className="surface mx-auto my-6 max-w-2xl space-y-4">
    {selecionarModelo}
    {modelo && <>{seletorReuniao}
      {contexto.pode_classificar_ata && !reuniaoInicial?.dados.restrito && <Check label="Ata restrita" checked={restrito} onChange={classificarMinuta}/>}
      {reuniaoInicial?.dados.restrito && !contexto.pode_classificar_ata && <p role="status">A ata desta reunião restrita deve ser preparada por quem pode classificá-la.</p>}
      {seletorLivro}{selecionarAnterior}
      {v.reuniao_id && <><details><summary>Redator da ata (opcional na preparação)</summary>{seletorRedator}</details><Campo label="Assunto" value={v.assunto} onChange={s => editar('assunto', s)}/>
        <Campo label="Data do ato" type="date" value={v.data_documento} onChange={s => editar('data_documento', s)}/>
        {v.livro_id && <p>Ao confirmar, a ata receberá o próximo número deste livro.</p>}</>}
    </>}
  </div> : undefined
  const acoes = <>
    {preparando && !prepararAta && pagina && !editarPreparacao && <Button type="button" variant="outline" onClick={() => abrirPagina(true)}>Editar página antes de criar</Button>}
    {avisos}
    <Salvar pending={reatribuicao.carregando || reatribuicao.aberto || enviar.isPending || upload || imagensPagina.enviando} disabled={!!documento && documento.revisao !== revisaoInicial || !modelo || !documento && modelo?.tipo === 'ATA' && restrito && !contexto.pode_classificar_ata || prepararAta && (!v.reuniao_id || escolherLivro && politica === 'OBRIGATORIO' && !v.livro_id) || !!novoTermo && todasVersoes.length === 0 || modelo?.configuracao.motivador === 'OBRIGATORIO' && !v.motivador_id} error={enviar.error} success={enviar.isSuccess} label={retificar ? 'Criar retificação' : prepararAta ? 'Preparar ata' : !documento && soMinuta ? 'Preparar minuta' : preparando ? 'Criar documento' : 'Salvar documento'} />
    {menu && <button hidden type="submit" name="salvar-conferir" />}
  </>
  return <form ref={form} inert={enviar.isPending} aria-busy={enviar.isPending} className={sessao ? undefined : "space-y-4 rounded border p-4"} onInvalidCapture={e => {
    if (sessao && e.target instanceof HTMLElement) flushSync(() => revelarCampo(e.target as HTMLElement))
  }} onSubmit={e => { e.preventDefault(); if (!upload && !imagensPagina.enviando && modelo) {
    if (documento && documento.revisao !== revisaoInicial || prepararAta && !v.reuniao_id) return
    aposSalvar.current = (e.nativeEvent as SubmitEvent).submitter?.getAttribute('name') === 'salvar-conferir'
    const versao = { ...v, livro_id: escolherLivro || termo || !livrosHabilitados() ? v.livro_id : null }
    if (atual?.conteudo.composicao && pagina) {
      const imagensAntigas = imagensAncoradas(atual.conteudo.composicao)
      const blocos = [...pagina.cabecalho, ...pagina.corpo, ...pagina.rodape]
      const utilizadas = imagensAncoradas(pagina)
      for (const b of blocos) if (b.tipo === 'imagem') utilizadas.add(b.arquivo_id)
      versao.conteudo = { ...versao.conteudo, anexos: versao.conteudo.anexos.filter(a => !imagensAntigas.has(a.arquivo_id) || utilizadas.has(a.arquivo_id)) }
    }
    if (usarAssunto) versao.conteudo = { ...versao.conteudo, campos: { ...versao.conteudo.campos, ASSUNTO: v.assunto } }
    if (preparando && !versao.conteudo.composicao && !versao.conteudo.estrutura) versao.conteudo = { ...versao.conteudo, composicao: novaPagina() }
    if (retificar && documento?.tipo === 'ATA') {
      void reatribuicao.confirmar(documento.id, reatribuicao_atos => enviar.mutate({ versao, reatribuicao_atos }, { onError: sessao?.falhou }))
    } else enviar.mutate({ versao }, { onError: sessao?.falhou })
  } }}>
    {sessao ? <EspacoEditor sessao={sessao} preparacao={preparacaoAta} mostrarPainelInicial={!!novoTermo?.previa} funcao={documento ? 'Editando documento' : 'Criando documento'} nome={prepararAta ? 'Preparar ata' : v.assunto || 'Novo documento'}
      alterado={v !== inicial || !!(retificar && (autoridade || evidencia)) || restrito !== (documento?.restrito ?? novoTermo?.livro.restrito ?? reuniaoInicial?.dados.restrito ?? false)}
      situacao={documento ? 'Minuta salva' : 'Em preparação'} editor={folha || editorClassico} previa={previa} acoes={acoes}
      painel={<>
        {retificar && <details className="espaco-grupo" open><summary>Retificação</summary>{fundamentoRetificacao}</details>}
        <details className="espaco-grupo" open={!documento}><summary>Modelo e documento anterior</summary>{vinculos}</details>
        {(!preparando || modelo) && <details className="espaco-grupo" open><summary>Dados e campos</summary>{dados}</details>}
        {painelResolucoes && <details className="espaco-grupo"><summary>Deliberações da reunião</summary>{painelResolucoes}</details>}
        {participantesEAtos && <details className="espaco-grupo"><summary>Participantes e anexos</summary>{participantesEAtos}</details>}
        {menu && <details className="espaco-grupo"><summary>Tramitação e assinaturas</summary><div id="conferir-minuta" tabIndex={-1}>{menu}</div></details>}
      </>}/> :
      <><h3 className="font-semibold">{retificar ? 'Retificar documento' : documento ? 'Editar documento' : 'Novo documento'}</h3>{folha || editorClassico}{vinculos}{dados}{painelResolucoes}{participantesEAtos}{fundamentoRetificacao}{acoes}</>}
    {reatribuicao.modal}
  </form>
}
