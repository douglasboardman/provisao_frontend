import { useQuery } from '@tanstack/react-query'
import { RegrasAtuacaoModelo } from './RegrasAtuacaoModelo'
import { CamposObrigatoriosModelo } from './CamposObrigatoriosModelo'
import { PaineisSecretaria, type AbaSecretaria } from './PaineisSecretaria'
import { flushSync } from 'react-dom'
import { distinguirHomonimos, origensPrevistas } from './procedenciaCampos'
import { Margens } from './editor/Margens'
import { EncadeamentoModelo } from './EncadeamentoModelo'
import { useBiblioteca } from './BibliotecaCampos'
import { amostra } from '../../api/campos'
import type { Trecho } from '../../api/pagina'
import { useImagensPagina } from './editor/useImagensPagina'
import { EditorPagina } from './editor/EditorPagina'
import { converterModelo } from '../../api/converter-modelo'
import { novaPagina, paragrafosPagina } from '../../api/pagina'
import { useEffect, useId, useState } from 'react'
import { secretariaApi, finalidadeTermo, livrosHabilitados, politicaLivro, type ContextoSecretaria, type ModeloDocumento, type PoliticaDocumento, type EstruturaDocumento, type TipoCampo } from '../../api/secretaria'
import { Campo, Escolha, Check, Salvar, codigos, useComando } from './formulario'
import { EspacoEditor, revelarCampo, type SessaoEditor } from './editor/EspacoEditor'
import { Compositor, LeituraEstrutura } from './Compositor'
import { Button } from '../../components/ui/button'

import { biblioteca, tiposEspecificos } from './catalogoModelos'

const sugestaoUsaCampo = (chaves: readonly string[], codigo: string | null) => codigo !== null && chaves.includes(codigo)
const tipos: Record<TipoCampo, string> = { TEXTO: 'Texto', DATA: 'Data', NUMERO: 'Número', SIM_NAO: 'Sim ou não' }
const tiposBiblioteca: Record<string, TipoCampo> = { DATA_REUNIAO: 'DATA', CAPACIDADE_FOLHAS: 'NUMERO', FOLHAS_UTILIZADAS: 'NUMERO', TOTAL_ATAS: 'NUMERO' }

function Politica({ titulo, valor, alterar, desabilitarNao, permiteOpcional = true }: {
  titulo: string; valor: PoliticaDocumento; alterar: (p: PoliticaDocumento) => void; desabilitarNao?: boolean; permiteOpcional?: boolean
}) {
  const grupo = useId()
  const opcoes = { NAO_PERMITE: 'Não se aplica', OPCIONAL: 'Opcional', OBRIGATORIO: 'Obrigatório' } as const
  return <fieldset className="space-y-1"><legend className="font-medium">{titulo}</legend>
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {(Object.keys(opcoes) as PoliticaDocumento[]).filter(p => permiteOpcional || p !== 'OPCIONAL').map(p =>
        <label key={p} className="flex items-center gap-1.5"><input type="radio" name={grupo} checked={valor === p}
          disabled={p === 'NAO_PERMITE' && desabilitarNao} onChange={() => alterar(p)}/>{opcoes[p]}</label>)}
    </div>
  </fieldset>
}

export function ModeloForm({ contexto, modelo, modelos = [], cargos, pronto, aoSalvar, sessao, confirmarSalvoAte = 0 }: { sessao?: SessaoEditor; confirmarSalvoAte?: number; aoSalvar?: (id: string, ate: number) => void; modelos?: ModeloDocumento[]; contexto: ContextoSecretaria; modelo?: ModeloDocumento; cargos: { id: string; nome: string }[]; pronto: () => void }) {
  const [anterior] = useState(modelo?.rascunho ?? modelo?.versoes[0])
  const [cadastro, setCadastro] = useState(modelo ? { id: modelo.id, revisao: modelo.revisao } : undefined)
  const [conversao, mostrarConversao] = useState(false)
  const imagensPagina = useImagensPagina(cadastro ? (id: string) => secretariaApi.imagemModeloUrl(cadastro.id, id, true) : undefined)
  const imagemUrl = imagensPagina.url
  const [nome, setNome] = useState(modelo?.rascunho?.nome ?? modelo?.nome ?? '')
  const [tipo, setTipo] = useState<'ATA' | 'OUTRO'>(anterior?.tipo ?? 'ATA')
  const [finalidade, setFinalidade] = useState(anterior?.finalidade ?? 'ATA_REUNIAO')
  const [perfil, setPerfil] = useState(anterior?.configuracao.perfil ?? 'ATA_PADRAO')
  const [motivador, setMotivador] = useState<PoliticaDocumento>(anterior?.configuracao.motivador ?? 'OPCIONAL')
  const [antecedentes, definirAntecedentes] = useState(anterior?.configuracao.antecedentes ?? [])
  const [configurarPagina, abrirConfiguracao] = useState(false)
  const [vinculo, setVinculo] = useState<PoliticaDocumento | undefined>(anterior?.configuracao.vinculo_reuniao)
  const politicaReuniao = tipo === 'ATA' ? 'OBRIGATORIO' : vinculo ?? (finalidade === 'CONVOCACAO' ? 'OBRIGATORIO' : 'NAO_PERMITE')
  const [assinaturasReuniao, setAssinaturasReuniao] = useState(anterior?.configuracao.assinaturas_reuniao ?? 'CARGOS')
  const [resolucoes, setResolucoes] = useState<PoliticaDocumento>(anterior?.configuracao.resolucoes ?? 'OPCIONAL')
  const [livro, setLivro] = useState<PoliticaDocumento>(anterior ? politicaLivro(anterior.configuracao) : 'NAO_PERMITE')
  const [campos, setCampos] = useState(anterior?.configuracao.campos_obrigatorios.join(', ') ?? '')
  const opcoesAtuacao = useQuery({ queryKey: ['secretaria','papeis-modelo',contexto.id], queryFn: () => secretariaApi.papeisModelo(contexto.id), gcTime: 0 })
  const [atuacao, setAtuacao] = useState(anterior?.configuracao.atuacao ?? { criar: [], preparar: [], assinar: [] })
  const [papeis, setPapeis] = useState(anterior?.configuracao.papeis_obrigatorios.join(', ') ?? '')
  const [exigidos, setExigidos] = useState(anterior?.configuracao.cargos_obrigatorios ?? [])
  const [pagina, setPagina] = useState(anterior ? anterior.configuracao.composicao_padrao : contexto.editor_pagina !== false ? novaPagina() : undefined)
  const b = useBiblioteca()
  const definicoes = { ...anterior?.configuracao.definicoes, ...Object.fromEntries((b.data ?? []).map(c => [c.id,c])) }
  const procedencias = distinguirHomonimos(origensPrevistas(antecedentes, modelos), definicoes)
  const usados = [...new Set(paragrafosPagina([...(pagina?.cabecalho ?? []), ...(pagina?.corpo ?? []), ...(pagina?.rodape ?? [])]).flatMap(p => p.trechos.flatMap(t => t.tipo === 'campo' ? [t.campo_id] : [])))]
  const [obrigatorios, exigir] = useState<string[]>(anterior?.configuracao.obrigatorios_biblioteca ?? [])
  const camposModelo = [...new Set([...usados, ...obrigatorios])]
  const [aba, selecionar] = useState(modelo ? 'editor' : 'dados')
  const [estrutura, setEstrutura] = useState<EstruturaDocumento | undefined>(anterior?.configuracao.estrutura_padrao)
  const podeAbrirBlocos = pagina
    ? !!estrutura || [pagina.cabecalho, pagina.corpo, pagina.rodape].every(regiao => !regiao.length)
    : !estrutura
  const [anexos, setAnexos] = useState(() => {
    const imagens = Object.values(anterior?.configuracao.estrutura_padrao ?? {}).flat().filter(b => b.tipo === 'IMAGEM')
    return [...new Map(imagens.map(b => [b.arquivo_id, { arquivo_id: b.arquivo_id, nome: b.descricao || 'Imagem do modelo' }])).values()]
  })
  const [enviandoImagem, setEnviandoImagem] = useState(false)
  const [erroImagem, setErroImagem] = useState('')
  async function anexarImagem(file: File) {
    setErroImagem('')
    if (file.size > 2 * 1024 * 1024) {
      setErroImagem('Cada imagem deve ter até 2 MB.')
      return
    }
    setEnviandoImagem(true)
    try {
      const arquivo = await secretariaApi.upload(file)
      setAnexos(atuais => [...atuais, { arquivo_id: arquivo.id, nome: file.name }])
    } catch (erro) {
      setErroImagem(erro instanceof Error ? erro.message : 'Não foi possível enviar a imagem.')
    } finally { setEnviandoImagem(false) }
  }
  const [tiposCampos, setTiposCampos] = useState<Record<string, TipoCampo>>(anterior?.configuracao.tipos_campos ?? {})
  const conteudoAtual = JSON.stringify([nome, tipo, finalidade, perfil, motivador, antecedentes, politicaReuniao, assinaturasReuniao, resolucoes, livro, campos, papeis, exigidos, atuacao, pagina, obrigatorios, estrutura, tiposCampos])
  const [avisoAte, definirAvisoAte] = useState(() => confirmarSalvoAte > Date.now() ? confirmarSalvoAte : 0)
  useEffect(() => {
    if (!avisoAte) return
    const timer = window.setTimeout(() => definirAvisoAte(0), Math.max(0, avisoAte - Date.now()))
    return () => window.clearTimeout(timer)
  }, [avisoAte])
  const [salvo, marcarSalvo] = useState(conteudoAtual)
  const enviar = useComando<{ publicar: boolean; tipo: 'ATA' | 'OUTRO'; finalidade: string; configuracao: NonNullable<typeof anterior>['configuracao'] }>(dados => {
    const { publicar, ...conteudo } = dados
    if (!cadastro) return secretariaApi.criarModelo({ ...conteudo, nome, publicar, contexto_id: contexto.id })
    const gravar = publicar ? secretariaApi.publicarModelo : secretariaApi.salvarRascunhoModelo
    return gravar(cadastro.id, { ...conteudo, nome, revisao: cadastro.revisao })
  }, r => {
    marcarSalvo(conteudoAtual)
    const concluir = () => {
      if (r.estado === 'PUBLICADO') pronto()
      else {
        const ate = Date.now() + 3000
        definirAvisoAte(ate)
        setCadastro({ id: r.id, revisao: r.revisao! })
        aoSalvar?.(r.id, ate)
      }
    }
    if (sessao) sessao.gravou(concluir)
    else concluir()
  }, `${cadastro?.id}:${cadastro?.revisao}:${contexto.id}:${nome}`)
  const revisaoMudou = !!cadastro && (modelos.find(m => m.id === cadastro.id)?.revisao ?? 0) > cadastro.revisao
  const abas: AbaSecretaria[] = [
    { id: 'dados', nome: 'Identificação', manter: true, conteudo: <div className="space-y-4">
    <p className="text-sm">Contexto do modelo · <strong>{contexto.nome}</strong></p>
    {!cadastro && <><Escolha label="Sugestão da biblioteca" value="" required={false} onChange={valor => {
      const sugestao = biblioteca.find(item => item.finalidade === valor)
      if (!sugestao) return
      setNome(sugestao.nome)
      setTipo(sugestao.tipo)
      setFinalidade(sugestao.finalidade)
      setPerfil(sugestao.perfil)
      setLivro(sugestao.livro ? 'OBRIGATORIO' : sugestao.finalidade === 'TERMO_EXAME' ? 'OPCIONAL' : 'NAO_PERMITE')
      setPapeis(sugestao.finalidade === 'TERMO_ABERTURA' ? 'SECRETARIO' : '')
      setExigidos([])
      setCampos(sugestao.campos.join(', '))
      setTiposCampos(Object.fromEntries(sugestao.campos.map(chave => [chave, tiposBiblioteca[chave] ?? 'TEXTO'])))
      if (pagina) {
        const nova = novaPagina(sugestao.corpo)
        const ids: string[] = [], antigos = new Set<string>()
        for (const p of paragrafosPagina(nova.corpo)) {
          p.trechos = p.trechos.flatMap((t): Trecho[] => {
            if (t.tipo !== 'texto') return [t]
            return t.texto.split(/(\{\{[A-Z_]+\}\})/g).filter(Boolean).map(parte => {
              const chave = parte.match(/^\{\{([A-Z_]+)\}\}$/)?.[1]
              const campo = chave && b.data?.find(c => c.ativo && c.codigo === chave)
              if (!campo) { if (chave) antigos.add(chave); return { tipo: 'texto', texto: parte } }
              ids.push(campo.id)
              return { tipo: 'campo', campo_id: campo.id, apresentacao: campo.multiplo ? 'em_linha' : 'individual' }
            })
          })
        }
        exigir(ids)
        setCampos([...antigos].join(', '))
        setTiposCampos(Object.fromEntries([...antigos].map(k => [k, tiposBiblioteca[k] ?? 'TEXTO'])))
        setPagina(nova)
      }
      setEstrutura({ cabecalho: [], corpo: [
        { tipo: 'TEXTO', texto: sugestao.corpo, alinhamento: 'JUSTIFICADO', estilo: 'NORMAL' }, { tipo: 'ASSINATURAS' },
      ], rodape: [] })
    }}><option value="">Escolher uma sugestão</option>{biblioteca.filter(item => item.finalidade === 'ATA_REUNIAO' ? contexto.tipo === 'ORGAO' : item.tipo !== 'ATA' || contexto.tipo === 'ASSEMBLEIA_GERAL').map(item => <option key={item.finalidade} disabled={!!pagina && (b.isLoading || b.isError || !!b.data?.some(c => !c.ativo && sugestaoUsaCampo(item.campos,c.codigo)))} value={item.finalidade}>{item.nome}</option>)}</Escolha><p className="text-sm">A sugestão preenche dados iniciais; confira a aplicabilidade e as regras de assinatura antes de salvar.</p></>}
    <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
      <Campo label="Nome do modelo" value={nome} onChange={setNome} />
      <Escolha label="Tipo documental" value={tipo === 'OUTRO' && tiposEspecificos.some(([codigo]) => codigo === finalidade) ? finalidade : tipo}
        onChange={valor => {
          setTipo(valor === 'ATA' ? 'ATA' : 'OUTRO')
          setFinalidade(valor === 'ATA' ? 'ATA_REUNIAO' : valor)
        }}>
        <option value="ATA">Ata</option><option value="OUTRO">Outro</option>
        {tiposEspecificos.map(([codigo, rotulo]) => <option key={codigo} value={codigo}>{rotulo}</option>)}
      </Escolha>
    </div>
    </div> },
    { id: 'encadeamento', nome: 'Encadeamento', conteudo: (
    <EncadeamentoModelo modelos={modelos.filter(m => m.id !== cadastro?.id)} destinos={Object.fromEntries(camposModelo.filter(id => definicoes[id]).map(id => [id,definicoes[id]]))} regras={antecedentes} alterar={definirAntecedentes} politica={motivador} definirPolitica={setMotivador}/>
    ) },
    { id: 'regras', nome: 'Regras', manter: true, conteudo: <div className="space-y-5">
      <RegrasAtuacaoModelo regra={atuacao} alterar={setAtuacao} opcoes={opcoesAtuacao.data ?? []} finalidade={finalidade} assembleia={contexto.tipo === 'ASSEMBLEIA_GERAL'}/>
      {opcoesAtuacao.isError && <p role="alert">Falha ao carregar os cargos. <button type="button" onClick={() => void opcoesAtuacao.refetch()}>Tentar novamente</button></p>}
      <CamposObrigatoriosModelo procedencias={procedencias} ids={obrigatorios} codigosAntigos={codigos(campos)} definicoes={definicoes}
        incluir={id => exigir(atuais => [...new Set([...atuais, id])])} remover={id => exigir(atuais => atuais.filter(k => k !== id))}
        removerCodigo={codigo => setCampos(codigos(campos).filter(k => k !== codigo).join(', '))}/>
      <section className="grid gap-4 rounded-lg border p-3 text-sm lg:grid-cols-3" aria-label="Vínculos do documento">
        <div>{tipo !== 'ATA' && <Politica titulo="Vínculo com reunião" valor={politicaReuniao} alterar={setVinculo}/>}<Politica titulo="Documento motivador" valor={motivador} alterar={setMotivador} desabilitarNao={!!antecedentes.length}/>
          {!!antecedentes.length && <p className="mt-1 text-muted-foreground">Há modelos anteriores vinculados na aba Encadeamento.</p>}</div>
        <Politica titulo="Resoluções" valor={resolucoes} alterar={setResolucoes}/>
        {finalidadeTermo(finalidade) ? <p>O termo será vinculado ao livro na aba Livros.</p> :
          <Politica titulo="Registro em livro" valor={livro} alterar={setLivro} permiteOpcional={livrosHabilitados() || livro === 'OPCIONAL'}/>}
      </section>
      {tipo === 'ATA' && <Escolha label="Quem deve assinar a ata" value={assinaturasReuniao} onChange={v => setAssinaturasReuniao(v as typeof assinaturasReuniao)}>
        <option value="CARGOS">Signatários indicados nas regras do modelo</option>
        <option value="MESA">Presidente e secretário da mesa</option>
        <option value="PRESENTES">Todos os presentes</option>
      </Escolha>}
      <details className="rounded-lg border p-3"><summary className="cursor-pointer font-medium">{tipo === 'ATA' ? 'Assinaturas e série' : 'Assinaturas'}</summary>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          {tipo === 'ATA' && <div><Campo label="Série de numeração das atas" value={perfil} onChange={setPerfil}/>
            <p className="mt-1 text-sm text-muted-foreground">As atas desta série compartilham a sequência anual no contexto e podem ser registradas em livros da mesma série.</p></div>}
          <div><Campo label="Papéis de assinatura obrigatórios (separados por vírgula)" required={false} value={papeis} onChange={setPapeis}/>
            <p className="mt-1 text-sm text-muted-foreground">Cada papel exige um signatário obrigatório, por exemplo PRESIDENTE ou SECRETARIO.</p></div>
          {!!cargos.length && <fieldset><legend>Cargos obrigatórios neste órgão</legend>{cargos.map(c => <Check key={c.id} label={c.nome} checked={exigidos.includes(c.id)} onChange={v => setExigidos(x => v ? [...x, c.id] : x.filter(id => id !== c.id))}/>)}</fieldset>}
        </div>
      </details>
      {!!Object.keys(tiposCampos).length && <details className="rounded-lg border p-3"><summary className="cursor-pointer">Tipos de campos por código</summary>
        {Object.entries(tiposCampos).map(([chave, tipo]) => <div className="mt-2 flex items-end gap-2" key={chave}>
          <Escolha label={chave} value={tipo} onChange={v => setTiposCampos(t => ({ ...t, [chave]: v as TipoCampo }))}>
            {Object.entries(tipos).map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
          </Escolha>
          <Button type="button" variant="outline" onClick={() => setTiposCampos(t => Object.fromEntries(Object.entries(t).filter(([id]) => id !== chave)))}>Remover tipo de {chave}</Button>
        </div>)}
      </details>}
    </div> },
    { id: 'editor', nome: 'Editor', manter: true, conteudo: <div className="space-y-4">
    {pagina && <>
      <EditorPagina enviarImagem={imagensPagina.enviar} procedencias={procedencias} mostrarEstadoLocal={!sessao} imagemUrl={imagemUrl} valor={pagina} modelo definicoes={definicoes} alterar={p => { setPagina(p); setEstrutura(undefined) }}/>
    </>}
    {!pagina && anterior && contexto.editor_pagina !== false && <div className="space-y-2">
      <Button type="button" variant="outline" aria-expanded={conversao} onClick={() => mostrarConversao(!conversao)}>{conversao ? 'Fechar prévia de conversão' : 'Conferir conversão para o editor de página'}</Button>
      {conversao && <><p>Confira as três regiões antes de aplicar a conversão ao rascunho.</p>
        <EditorPagina imagemUrl={imagemUrl} valor={converterModelo(estrutura)} />
        <Button type="button" onClick={() => { setPagina(converterModelo(estrutura)); setEstrutura(undefined); mostrarConversao(false) }}>Usar conversão no rascunho</Button></>}
    </div>}
    {!pagina && !estrutura && !anterior && contexto.editor_pagina !== false && <Button type="button" variant="outline" onClick={() => setPagina(novaPagina())}>Usar editor de página</Button>}
    {podeAbrirBlocos && <Button type="button" variant="outline" onClick={() => {
      const referencias = usados.flatMap(id => b.data?.find(c => c.id === id)?.codigo ?? [])
      const convertidos = obrigatorios.filter(id => usados.includes(id) && definicoes[id] && b.data?.some(c => c.id === id && c.codigo))
      setCampos([...new Set([...codigos(campos), ...convertidos.flatMap(id => b.data?.find(c => c.id === id)?.codigo ?? [])])].join(', '))
      exigir(ids => ids.filter(id => !convertidos.includes(id)))
      setTiposCampos({ ...tiposCampos, ...Object.fromEntries(referencias.map(chave => [chave, tiposBiblioteca[chave] ?? 'TEXTO'])) })
      setPagina(undefined)
      setEstrutura(estrutura ?? { cabecalho: [], corpo: [], rodape: [] })
    }}>Definir estrutura do modelo</Button>}
    {!pagina && estrutura && !conversao && <>
      <label className="grid gap-1 text-sm">Enviar imagem para o modelo (PNG, JPEG ou WebP)
        <input type="file" accept="image/png,image/jpeg,image/webp" disabled={enviandoImagem} onChange={e => {
          const arquivo = e.target.files?.[0]
          if (arquivo) void anexarImagem(arquivo)
          e.target.value = ''
        }} />
      </label>
      {erroImagem && <p role="alert">{erroImagem}</p>}
      <Compositor valor={estrutura} alterar={setEstrutura} anexos={anexos} />
    </>}

    </div> },
  ]
  if (pagina) abas.push({ id: 'previa', nome: 'Prévia', conteudo: <EditorPagina imagemUrl={imagemUrl} valor={pagina}
    definicoes={definicoes} valores={Object.fromEntries(usados.filter(id => definicoes[id]).map(id => [id, amostra(definicoes[id], 3, contexto)]))}/> })
  const acoes = <>
    <p className="text-sm text-muted-foreground">{atuacao.criar.length ? 'Publique o modelo para disponibilizá-lo na criação de documentos.' : 'Em Regras, selecione quem pode criar este documento para publicar o modelo.'}</p>
    {revisaoMudou && <p role="alert">Outro usuário atualizou este modelo. Reabra o editor para carregar as alterações.</p>}
    <div className="flex max-w-full items-center gap-2 sm:gap-3 max-[400px]:gap-1 max-[400px]:[&_button]:px-0.5 max-[400px]:[&_button]:text-xs">
      <span role="status" className="whitespace-nowrap text-sm font-medium text-emerald-800 max-[400px]:text-xs">
        {avisoAte > 0 && conteudoAtual === salvo && !enviar.isPending && !enviar.isError && 'Registro salvo.'}
      </span>
      <Salvar disabled={conversao || revisaoMudou} pending={enviar.isPending || imagensPagina.enviando || enviandoImagem} error={enviar.error} success={false} label="Salvar rascunho" />
      <Button type="submit" name="publicar" variant="outline" disabled={!atuacao.criar.length || conversao || revisaoMudou || enviar.isPending || imagensPagina.enviando || enviandoImagem}>Publicar modelo</Button>
    </div>
  </>
  return <form noValidate inert={enviar.isPending} aria-busy={enviar.isPending} className={sessao ? undefined : "space-y-4 rounded border p-4"} onSubmit={e => { e.preventDefault()
    const invalido = Array.from(e.currentTarget.elements).find((el): el is HTMLInputElement =>
      'willValidate' in el && (el as HTMLInputElement).willValidate && !(el as HTMLInputElement).validity.valid)
    if (invalido) {
      const painel = invalido.closest<HTMLElement>('[role=tabpanel]')?.dataset.aba
      if (painel) flushSync(() => selecionar(painel))
      if (sessao) flushSync(() => revelarCampo(invalido))
      invalido.reportValidity()
      return
    }
    if (conversao || revisaoMudou || imagensPagina.enviando || enviandoImagem || enviar.isPending) return; enviar.mutate({ publicar: (e.nativeEvent as SubmitEvent).submitter?.getAttribute('name') === 'publicar', tipo, finalidade, configuracao: { atuacao, ...(tipo === 'ATA' && { assinaturas_reuniao: assinaturasReuniao }), vinculo_reuniao: politicaReuniao, perfil: codigos(perfil)[0], contexto: contexto.tipo, tipos_orgao: anterior?.configuracao.tipos_orgao ?? (contexto.tipo === 'ORGAO' && contexto.orgao ? [contexto.orgao.tipo] : []), constituicoes: anterior?.configuracao.constituicoes ?? (contexto.tipo === 'ORGAO' && contexto.orgao ? [contexto.orgao.constituicao] : []), motivador, antecedentes: antecedentes.map(r => ({ ...r, campos: Object.fromEntries(Object.entries(r.campos).filter(([id]) => camposModelo.includes(id) && definicoes[id]?.origem === 'manual')) })), resolucoes, registro_livro: !finalidadeTermo(finalidade) && livro === 'OBRIGATORIO', ...(livrosHabilitados() || anterior?.configuracao.registro_em_livro ? { registro_em_livro: finalidadeTermo(finalidade) ? 'NAO_PERMITE' : livro } : {}), campos_obrigatorios: codigos(campos), obrigatorios_biblioteca: obrigatorios, papeis_obrigatorios: codigos(papeis), cargos_obrigatorios: exigidos, tipos_campos: tiposCampos, ...(pagina ? { composicao_padrao: pagina } : estrutura ? { estrutura_padrao: estrutura } : {}) } }, { onError: sessao?.falhou }) }}>
    {sessao ? <EspacoEditor sessao={sessao} funcao={cadastro ? 'Editando modelo' : 'Criando modelo'} nome={nome || 'Novo modelo'}
      situacao={cadastro ? 'Rascunho salvo' : 'Novo rascunho'} alterado={conteudoAtual !== salvo}
      editor={abas.find(a => a.id === 'editor')?.conteudo} previa={abas.find(a => a.id === 'previa')?.conteudo ??
        (estrutura ? <article className="doc-sheet"><LeituraEstrutura valor={estrutura} campos={{}}/></article> : <p>Modelo de teor livre.</p>)}
      painel={<>{abas.filter(a => ['dados','encadeamento','regras'].includes(a.id)).map(a =>
        <details className="espaco-grupo" key={a.id} open={a.id === 'dados'}><summary>{a.nome}</summary><div>{a.conteudo}</div></details>)}{pagina && <details className="espaco-grupo"><summary>Configuração da página</summary>
          <Button type="button" variant="outline" onClick={() => abrirConfiguracao(true)}>Ajustar margens e espaçamentos</Button>
          {configurarPagina && <Margens atual={pagina.pagina} fechar={() => abrirConfiguracao(false)} aplicar={config => { setPagina({ ...pagina, versao_formato: config.altura_minima_cm ? 2 : pagina.versao_formato, pagina: config }); abrirConfiguracao(false) }}/>}
        </details>}</>} acoes={acoes}/> : <>
    <h3 className="font-semibold">{cadastro ? `Editar modelo · ${nome}` : 'Novo modelo'}</h3>
    <PaineisSecretaria titulo="Configuração do modelo" abas={abas} ativa={aba} selecionar={selecionar}/>
    {acoes}</>}
  </form>
}
