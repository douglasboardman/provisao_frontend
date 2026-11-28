import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useBlocker, useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { useIsMutating, useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../../stores/auth'
import { Perfil } from '../../../types/enums'
import { estadosDocumento, finalidadeTermo, livrosHabilitados, numeroDocumento, secretariaApi, type ContextoSecretaria } from '../../../api/secretaria'
import { modelosPublicadosDeTermo, habilitadoParaTermo, finalidadeDisponivel } from '../LivrosContexto'
import { ApiRequestError } from '../../../api/client'
import { pessoasApi } from '../../../api/pessoas'
import { Button } from '../../../components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '../../../components/ui/dialog'
import { ModeloForm } from '../ModeloForm'
import { DocumentoForm } from '../DocumentoForm'
import { LeituraEstrutura } from '../Compositor'
import { AtaLegadaLeitura } from '../AtaLegadaForm'
import { TramitacaoDocumento } from '../TramitacaoDocumento'
import { ArtefatosDocumento } from '../ArtefatosDocumento'
import { AssinaturasDocumento } from '../AssinaturasDocumento'
import { assinaturasHabilitadas } from '../../../api/assinaturas'
import { Metadados } from '../FichaDocumento'
import { DocumentoLeitura } from '../DocumentoLeitura'
import { useComando } from '../formulario'
import { EditorPagina } from './EditorPagina'
import { EspacoEditor, revelarCampo, type SessaoEditor } from './EspacoEditor'
import { caminhoEditor } from './navegacao'

export default function EditorSecretariaPage() {
  const { contextoId, entidade, id } = useParams()
  const user = useAuthStore(s => s.user)
  const identidade = user?.igreja_id + ':' + user?.sub
  const contextos = useQuery({ queryKey: ['secretaria', identidade, 'contextos'], queryFn: secretariaApi.contextos, staleTime: 0, gcTime: 0 })
  const contexto = contextos.data?.find(c => c.id === contextoId)
  const local = useLocation()
  const navegar = useNavigate()
  const origem = local.state?.origem
  const voltar = () => navegar(typeof origem === 'string' && /^\/secretaria(?:[/?]|$)/.test(origem) ? origem :
    '/secretaria?' + new URLSearchParams({ contexto: contextoId ?? '', aba: entidade === 'modelos' ? 'modelos' : 'documentos' }), { replace: true, state: local.state?.estadoOrigem })
  const alterado = useRef(false)
  const ocupado = useIsMutating() > 0
  const trava = useBlocker(() => alterado.current)
  const deSaida = useRef(false)
  const raiz = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const avisar = (e: BeforeUnloadEvent) => { if (alterado.current) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', avisar)
    return () => window.removeEventListener('beforeunload', avisar)
  }, [])
  const sessao: SessaoEditor = { voltar, alterado, falhou: cancelarSaida, gravou: continuar => {
    alterado.current = false
    if (deSaida.current && trava.state === 'blocked') { deSaida.current = false; trava.proceed() }
    else continuar()
  } }
  function cancelarSaida() {
    deSaida.current = false
    trava.reset?.()
  }
  function salvarESair() {
    const form = raiz.current?.querySelector('form')
    const salvar = form?.querySelector<HTMLButtonElement>('.espaco-acoes button[type=submit]')
    if (!form || !salvar) return
    const invalido = form.querySelector<HTMLElement>('input:invalid, select:invalid, textarea:invalid')
    if (invalido || salvar.disabled) {
      flushSync(() => { cancelarSaida(); revelarCampo(invalido ?? salvar) })
      form.reportValidity()
      return
    }
    deSaida.current = true
    salvar.click()
  }
  return <div ref={raiz}>
    {contexto && !contextos.isError && id && (entidade === 'modelos' || entidade === 'documentos')
      ? <Conteudo key={[identidade, contexto.id, entidade, id].join(':')} contexto={contexto} identidade={identidade} id={id} entidade={entidade} sessao={sessao}/>
      : <div className="surface"><p role="status">{contextos.isPending ? 'Carregando editor…' : 'Contexto ou endereço indisponível.'}</p><Button onClick={voltar}>Voltar à Secretaria</Button></div>}
    {trava.state === 'blocked' && <Dialog open onOpenChange={aberto => { if (!aberto && !ocupado) cancelarSaida() }}><DialogContent aria-describedby={undefined}>
      <DialogTitle>Salvar as alterações antes de sair?</DialogTitle>
      <div className="flex flex-wrap gap-2"><Button disabled={ocupado} onClick={salvarESair}>Salvar e sair</Button>
        <Button disabled={ocupado} variant="outline" onClick={() => { alterado.current = false; trava.proceed() }}>Descartar</Button>
        <Button disabled={ocupado} variant="outline" onClick={cancelarSaida}>Continuar editando</Button></div>
    </DialogContent></Dialog>}
  </div>
}

function Conteudo({ contexto, identidade, id, entidade, sessao }: {
  contexto: ContextoSecretaria; identidade: string; id: string; entidade: 'modelos' | 'documentos'; sessao: SessaoEditor
}) {
  const comum = useAuthStore(s => s.user?.perfil === Perfil.COMUM)
  const novo = id === 'novo'
  const deModelo = entidade === 'modelos'
  const [busca, setBusca] = useSearchParams()
  const versao = busca.get('versao')
  const conferencia = busca.get('painel') === 'tramitacao' && !novo && !deModelo && versao === null
  const ler = versao !== null || conferencia
  const reuniaoId = novo && !deModelo ? busca.get('reuniao') : null
  const livroId = busca.get('livro')
  const termo = busca.get('termo')
  const local = useLocation()
  const navegar = useNavigate()
  const podeEscrever = contexto.orgao?.ativo !== false && (deModelo ? contexto.pode_gerir_modelos === true : contexto.pode_preparar)
  const autorizado = ler || podeEscrever
  const base = ['secretaria', identidade, contexto.id]
  const modelos = useQuery({ queryKey: [...base, 'modelos'], queryFn: () => secretariaApi.modelos(contexto.id), enabled: autorizado && (deModelo || !ler), gcTime: 0 })
  const reuniao = useQuery({ queryKey: [...base, 'reuniao-vinculada', reuniaoId], queryFn: () => secretariaApi.reuniao(reuniaoId!), enabled: autorizado && !!reuniaoId, gcTime: 0 })
  const cadastro = modelos.data?.find(m => m.id === id)
  const detalhe = useQuery({ queryKey: [...base, 'documento', id], queryFn: () => secretariaApi.documento(id), enabled: autorizado && !deModelo && !novo, gcTime: 0 })
  const d = detalhe.data?.contexto_id === contexto.id ? detalhe.data : undefined
  const editavel = autorizado && !ler && (deModelo || novo || d?.estado === 'EM_EDICAO' || sessao.alterado.current)
  const cargos = useQuery({ queryKey: [...base, 'cargos'], queryFn: () => secretariaApi.cargos(contexto.id), enabled: editavel && (deModelo || !novo || !!livroId), gcTime: 0 })
  const pessoas = useQuery({ queryKey: ['secretaria', identidade, 'pessoas-opcoes', contexto.id], queryFn: () => comum ? secretariaApi.pessoasDoContexto(contexto.id) : pessoasApi.list(), enabled: editavel && !deModelo && (!novo || !!livroId), gcTime: 0 })
  const livro = useQuery({ queryKey: ['secretaria', identidade, 'livro', livroId], queryFn: () => secretariaApi.livro(livroId!), enabled: !!livroId && autorizado && !deModelo && novo && livrosHabilitados(), gcTime: 0 })
  const preparandoTermo = !!livroId && finalidadeTermo(termo ?? undefined) && novo && !deModelo
  const opcoesTermo = termo && preparandoTermo ? modelosPublicadosDeTermo(modelos.data ?? [], termo, contexto).filter(habilitadoParaTermo) : []
  const candidato = busca.get('modelo')
  const escolhido = candidato ? opcoesTermo.find(m => m.versoes[0].id === candidato) : opcoesTermo.length === 1 ? opcoesTermo[0] : undefined
  const dataTermo = busca.get('data') || undefined
  const previaTermo = useQuery({ queryKey: [...base, 'previa-termo', termo, livroId, escolhido?.versoes[0].id, dataTermo],
    queryFn: async () => {
      const args = [livroId!, escolhido!.versoes[0].id, escolhido!.permissoes?.criar === false ? 'preparar' : 'criar', dataTermo] as const
      return termo === 'TERMO_ABERTURA'
        ? { previa: await secretariaApi.previaAbertura(...args) }
        : { versaoEncerramento: (await secretariaApi.previaEncerramento(...args)).versao }
    },
    enabled: autorizado && preparandoTermo && !!escolhido && livro.data?.contexto_id === contexto.id && finalidadeDisponivel(livro.data) === termo,
    staleTime: Infinity, gcTime: 0, retry: false })
  const anterior = d?.versoes.find(v => v.numero === d.versao_atual)?.motivador_id
  const documentos = useQuery({ queryKey: [...base, 'documentos'], queryFn: () => secretariaApi.documentos(contexto.id), enabled: !!anterior && editavel, gcTime: 0 })
  const iniciar = useComando<{ revisao: number }>(dados => secretariaApi.iniciarEdicaoModelo(id, dados), () => {
    if (ler) trocar(caminhoEditor(contexto.id, entidade, id))
    void modelos.refetch()
  })
  const [salvandoRevisao, definirRevisao] = useState(0)
  const trocar = (destino: string) => navegar(destino, { replace: true, state: local.state })
  const aviso = (mensagem: string) => <div className="surface space-y-3"><p role="status">{mensagem}</p><Button variant="outline" onClick={sessao.voltar}>Voltar à Secretaria</Button></div>
  const consultas = [modelos, detalhe, livro, cargos, pessoas, reuniao]
  if (!autorizado) return aviso('Você não tem permissão para editar neste contexto.')
  if (consultas.some(q => q.isEnabled && q.isError && (!q.data || q.error instanceof ApiRequestError && [401,403,404].includes(q.error.statusCode)))) return aviso('Não foi possível carregar os dados do editor.')
  if (consultas.some(q => q.isEnabled && q.isPending)) return aviso('Carregando editor…')
  if (deModelo) {
    if (!novo && !cadastro) return aviso('Modelo indisponível neste contexto.')
    if (ler) {
      const v = cadastro?.versoes.find(v => v.id === versao)
      if (!v || !cadastro) return aviso('Versão do modelo indisponível.')
      return <EspacoEditor sessao={sessao} nome={cadastro.nome} funcao="Consultando modelo" situacao={'Versão publicada ' + v.numero}
        painel={<label className="grid gap-1">Versão publicada<select value={versao!} onChange={e => setBusca({ versao: e.target.value }, { replace: true, state: local.state })}>
          {cadastro.versoes.map(r => <option key={r.id} value={r.id}>Versão {r.numero}</option>)}</select></label>}
        acoes={podeEscrever && v.id === cadastro.versoes[0]?.id && <>
          <Button disabled={iniciar.isPending} onClick={() => cadastro.estado === 'EM_EDICAO' ? trocar(caminhoEditor(contexto.id, entidade, id)) : iniciar.mutate({ revisao: cadastro.revisao })}>Editar modelo</Button>
          {iniciar.error && <p role="alert">{iniciar.error.message}</p>}</>}
        previa={v.configuracao.composicao_padrao ? <EditorPagina key={v.id} valor={v.configuracao.composicao_padrao} definicoes={v.configuracao.definicoes} imagemUrl={id => secretariaApi.imagemModeloUrl(v.id,id)}/> :
          <article className="doc-sheet">{v.configuracao.estrutura_padrao ? <LeituraEstrutura valor={v.configuracao.estrutura_padrao} campos={{}} versaoModelo={v.id}/> : 'Modelo de teor livre.'}</article>}/>
    }
    if (cadastro && cadastro.estado !== 'EM_EDICAO' && !sessao.alterado.current && !modelos.isFetching) return <div className="surface space-y-3"><h1>{cadastro.nome}</h1><p>Durante a edição, o modelo fica indisponível para criar documentos até a próxima publicação.</p>
      <Button disabled={iniciar.isPending} onClick={() => iniciar.mutate({ revisao: cadastro.revisao })}>Iniciar edição</Button>
      <Button variant="outline" onClick={sessao.voltar}>Voltar à Secretaria</Button>{iniciar.error && <p role="alert">{iniciar.error.message}</p>}</div>
    if (cadastro && cadastro.estado !== 'EM_EDICAO' && !sessao.alterado.current) return aviso('Carregando rascunho…')
    return <ModeloForm contexto={contexto} modelo={cadastro} modelos={modelos.data} cargos={cargos.data ?? []} sessao={sessao} pronto={sessao.voltar}
      confirmarSalvoAte={local.state?.confirmarSalvoAte}
      aoSalvar={(salvo, ate) => { if (novo) navegar(caminhoEditor(contexto.id, entidade, salvo), {
        replace: true, state: { ...local.state, confirmarSalvoAte: ate },
      }) }}/>
  }
  if (!novo && !d) return aviso('Documento indisponível neste contexto.')
  if (!ler && d?.atuacao && !d.atuacao.criar && !d.atuacao.preparar) return aviso('Seu cargo não está habilitado para editar este documento.')
  const retornoLista = local.state?.estadoOrigem?.retorno ??
    (local.state?.origem?.startsWith('/secretaria?') ? local.state.origem.slice('/secretaria'.length) : '?contexto=' + encodeURIComponent(contexto.id))
  const ficha = '/secretaria/' + encodeURIComponent(contexto.id) + '/documentos/' + encodeURIComponent(id)
  if (ler && d) {
    const v = d.versoes.find(r => conferencia ? r.numero === d.versao_atual : r.id === versao)
    if (conferencia && local.state?.revisaoSalva > d.revisao) return <div className="surface space-y-3">
      <p role="status">{detalhe.isFetching ? 'Carregando a revisão salva…' : 'A revisão salva ainda está indisponível para conferência.'}</p>
      <Button disabled={detalhe.isFetching} onClick={() => void detalhe.refetch()}>Recarregar revisão</Button>
      <Button variant="outline" onClick={sessao.voltar}>Voltar à Secretaria</Button>
    </div>
    if (!v) return aviso('Versão do documento indisponível.')
    const irParaFicha = (acaoEditor: string) => navegar(ficha, { state: { retorno: retornoLista, acaoEditor } })
    return <EspacoEditor key={conferencia ? 'tramitacao' : v.id} sessao={sessao} mostrarPainelInicial={conferencia} nome={v.assunto} funcao={'Consultando documento · ' + (v.fonte_congelada?.numero || numeroDocumento(d))} situacao={estadosDocumento[d.estado]}
      painel={<>
        <details className="espaco-grupo" open={!conferencia}><summary>Dados da versão</summary>
          <Metadados contexto={contexto} documento={d} identidade={identidade} versaoId={v.id} camposAdicionais/>
        </details>
        {conferencia && d.estado !== 'LEGADA_CONFERIDA' && <details className="espaco-grupo" open><summary>Tramitação e assinaturas</summary>
          {v.numero === d.versao_atual && <TramitacaoDocumento key={d.id + ':' + d.revisao} documento={d} contexto={contexto} identidade={identidade}
            corrigir={campo => campo === 'mesa' && v.reuniao_id ? irParaFicha('mesa') : trocar(caminhoEditor(contexto.id, entidade, id, { campo }))}
            retificar={() => irParaFicha('retificar')}/>}
          <ArtefatosDocumento documento={d} contexto={contexto} identidade={identidade} versaoId={v.id}/>
          {v.congelado_em && d.tramitacao?.assinaturas !== false && assinaturasHabilitadas() && <AssinaturasDocumento key={v.id + ':' + d.revisao}
            versaoId={v.id} documento={d} contexto={contexto} identidade={identidade}/>}
        </details>}
      </>}
      acoes={conferencia
        ? contexto.pode_preparar && (!d.atuacao || d.atuacao.criar || d.atuacao.preparar) && d.estado === 'EM_EDICAO' && <Button onClick={() => trocar(caminhoEditor(contexto.id, entidade, id))}>Retomar edição</Button>
        : v.numero === d.versao_atual && d.estado !== 'LEGADA_CONFERIDA' && <Button onClick={() => trocar(caminhoEditor(contexto.id, entidade, id, { painel: 'tramitacao' }))}>Conferir tramitação</Button>}
      previa={d.estado === 'LEGADA_CONFERIDA' ? <article className="doc-sheet"><AtaLegadaLeitura documento={d} versaoId={v.id}/></article> :
        <DocumentoLeitura documento={d} versaoAberta={v.id} mudarVersao={versao => setBusca({ versao }, { replace: true, state: local.state })} menuAtivo={false}/>}/>
  }
  if (!editavel || ler) return aviso('Esta versão está disponível somente para consulta.')
  const l = livro.data
  const finalidade = l && finalidadeDisponivel(l)
  if ((livroId || termo) && (!novo || !l || l.contexto_id !== contexto.id || !finalidade || termo !== finalidade)) return aviso('Este termo está indisponível para o livro selecionado.')
  if (preparandoTermo && !escolhido) return aviso('Selecione um modelo de termo publicado e habilitado na ficha do livro.')
  if (preparandoTermo && previaTermo.isError) return <section className="surface space-y-3"><p role="alert">{previaTermo.error.message}</p><Button onClick={() => void previaTermo.refetch()}>Tentar novamente</Button><Button variant="outline" onClick={sessao.voltar}>Voltar à Secretaria</Button></section>
  if (preparandoTermo && !previaTermo.data) return aviso('Carregando os dados do livro e os responsáveis pelo termo…')
  if (reuniaoId && reuniao.data?.contexto_id !== contexto.id) return aviso('Reunião indisponível neste contexto.')
  return <DocumentoForm reuniaoInicial={reuniao.data} key={id + ':' + salvandoRevisao} contexto={contexto} identidade={identidade} modelos={modelos.data ?? []} documento={d}
    novoTermo={l && finalidade ? { livro: l, finalidade, ...previaTermo.data } : undefined} atualizarModelos={() => void modelos.refetch()} sessao={sessao}
    destino={busca.get('campo') ?? undefined} documentos={documentos.data ?? []} pessoas={pessoas.data ?? []} cargos={cargos.data ?? []}
    conferir={d ? revisao => navegar(caminhoEditor(contexto.id, entidade, id, { painel: 'tramitacao' }), { replace: true, state: { ...local.state, revisaoSalva: revisao } }) : undefined}
    pronto={async salvo => {
      if (novo) trocar(caminhoEditor(contexto.id, entidade, salvo))
      else { const resultado = await detalhe.refetch(); if (resultado.isSuccess) definirRevisao(n => n + 1) }
    }}/>
}
