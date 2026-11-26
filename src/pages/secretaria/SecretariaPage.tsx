import { DocumentoLeitura } from './DocumentoLeitura'
import { useAbrirEditor } from './editor/navegacao'
import { ConvocacaoForm, modelosConvocatorios } from './ConvocacaoForm'
import { ReunioesContexto } from './ReunioesContexto'
import { ModelosContexto } from './ModelosContexto'
import { ListaDocumentos } from './ListaDocumentos'
import { PendenciasDocumentais, RegistrosVinculados } from './RegistrosDocumentais'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { Archive, Files, FileText, CalendarDays, PencilLine, ArrowLeft, BookOpen } from 'lucide-react'
import { WorkspaceHeader, Metric } from '../../components/shared/Workspace'
import { Metadados } from './FichaDocumento'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { secretariaApi, finalidadeTermo, livrosHabilitados, type ContextoSecretaria, type ItemAtuacao } from '../../api/secretaria'
import { pessoasApi } from '../../api/pessoas'
import { useAuthStore } from '../../stores/auth'
import { Perfil } from '../../types/enums'
import { ApiRequestError } from '../../api/client'
import { Button } from '../../components/ui/button'
import { Escolha } from './formulario'
import { ReuniaoForm } from './ReuniaoForm'
import { DocumentoForm } from './DocumentoForm'
import { AtaLegadaForm, AtaLegadaLeitura, VinculoLivroLegado } from './AtaLegadaForm'
import { AssinaturasDocumento } from './AssinaturasDocumento'
import { assinaturasHabilitadas } from '../../api/assinaturas'
import { TramitacaoDocumento } from './TramitacaoDocumento'
import { ArtefatosDocumento } from './ArtefatosDocumento'
import { AdministracaoSecretaria } from './AdministracaoSecretaria'
import { LivrosContexto, type NovoTermo } from './LivrosContexto'
import { ConsultaAtuacao } from './ConsultaAtuacao'

export function SecretariaPage() {
  const user = useAuthStore(s => s.user)
  const identidade = `${user?.igreja_id}:${user?.sub}`
  return <SecretariaConteudo key={identidade} identidade={identidade} admin={user?.perfil === Perfil.ADMINISTRADOR} />
}
function SecretariaConteudo({ identidade, admin }: { identidade: string; admin: boolean }) {
  const comum = useAuthStore(s => s.user?.perfil === Perfil.COMUM)
  const params = useParams()
  const [busca, setBusca] = useSearchParams()
  const navegar = useNavigate()
  const local = useLocation()
  const contextoId = params.contextoId ?? busca.get('contexto')
  const documentoId = params.documentoId
  const setContexto = (id: string) => documentoId ? navegar('/secretaria?contexto=' + encodeURIComponent(id)) : setBusca({ contexto: id, aba: busca.get('aba') ?? 'documentos' })
  const abrir = (contexto: string, id: string, versao?: string, editar = false) => navegar(`/secretaria/${encodeURIComponent(contexto)}/documentos/${encodeURIComponent(id)}${versao ? '?versao=' + encodeURIComponent(versao) : ''}`, { state: { retorno: documentoId ? local.state?.retorno : local.search, editar } })
  const [area, setArea] = useState<'contexto' | 'atuacao' | 'pendencias' | 'admin'>('contexto')
  const abrirVersao = (item: ItemAtuacao) => abrir(item.contexto_id, item.documento_id, item.versao_id)
  const contextos = useQuery({ queryKey: ['secretaria', identidade, 'contextos'], queryFn: secretariaApi.contextos, staleTime: 0, gcTime: 0 })
  const contexto = contextos.data?.find(c => c.id === contextoId) ?? (!contextoId ? contextos.data?.[0] : undefined)
  const acessoGeral = !comum && !!contextos.data?.some(c => !c.somente_atas)
  if (documentoId && contexto) return <div className="workspace"><WorkspaceHeader icon={FileText} title="Documento" description={contexto.nome} /><Button variant="outline" onClick={() => navegar('/secretaria' + (local.state?.retorno || '?contexto=' + encodeURIComponent(contexto.id)))}><ArrowLeft />Voltar ao contexto</Button><ContextoConteudo key={documentoId} documentoId={documentoId} versaoAberta={busca.get('versao') ?? undefined} identidade={identidade} contexto={contexto} admin={admin} abrir={(id, editar) => abrir(contexto.id, id, undefined, editar)} /></div>
  return <div className="workspace"><WorkspaceHeader icon={Archive} title="Secretaria" description="Atas, reuniões e livros de cada contexto documental." />
    {contextos.data?.length ? <div className="surface flex flex-wrap items-center gap-3"><span className="rounded-xl bg-purple-muted/55 p-3 text-purple"><Archive size={23} /></span><div className="min-w-0 flex-1"><Escolha label="Contexto documental" value={contexto?.id ?? ''} onChange={id => { setContexto(id); setArea('contexto') }} required={false}>{contextos.data.map(c => <option key={c.id} value={c.id}>{c.nome} ({c.sigla}){c.orgao?.ativo === false && ' · Inativo'}</option>)}</Escolha></div></div> : null}
    {contextoId && contextos.isSuccess && !contexto && <p role="alert">Contexto indisponível. Selecione outro contexto.</p>}
    {contextos.isPending && <p>Carregando contextos…</p>}{contextos.isError && <p role="alert">Não foi possível consultar a secretaria. <Button variant="outline" onClick={() => void contextos.refetch()}>Tentar novamente</Button></p>}
    <div className="flex flex-wrap gap-2">{acessoGeral && <Button variant="outline" onClick={() => { setArea(area === 'atuacao' ? 'contexto' : 'atuacao') }}>
      {area === 'atuacao' ? 'Voltar aos documentos' : 'Consultar atuação'}
    </Button>}
    {acessoGeral && <Button variant="outline" aria-expanded={area === 'pendencias'} onClick={() => { setArea(area === 'pendencias' ? 'contexto' : 'pendencias') }}>
      {area === 'pendencias' ? 'Voltar aos documentos' : 'Pendências documentais'}
    </Button>}
    {admin && contextos.data && <Button variant="outline" aria-expanded={area === 'admin'} onClick={() => setArea(area === 'admin' ? 'contexto' : 'admin')}>
      {area === 'admin' ? 'Voltar ao contexto' : 'Administração da secretaria'}</Button>}
    </div>
    {acessoGeral && area === 'pendencias'  && <PendenciasDocumentais identidade={identidade} />}
    {acessoGeral && area === 'atuacao' && contextos.data && <ConsultaAtuacao contextos={contextos.data} identidade={identidade} abrir={abrirVersao} />}
    {contextos.data?.length === 0 && (comum
      ? <p>O acesso depende da conta selecionada e de cargo em exercício no órgão. <a className="underline" href="/dashboard">Consultar minha atuação</a></p>
      : <p>Nenhum contexto preparado. Um administrador pode vinculá-lo a um órgão existente ou preparar a Assembleia Geral.</p>)}
    {area === 'contexto' && contexto && <ContextoConteudo key={contexto.id} identidade={identidade} contexto={contexto} admin={admin} abrir={(id, editar) => abrir(contexto.id, id, undefined, editar)} />}
    {area === 'admin' && admin && contextos.data && <section className="surface"><AdministracaoSecretaria identidade={identidade} contextos={contextos.data} /></section>}
  </div>
}
function ContextoConteudo({ identidade, contexto, admin, documentoId, versaoAberta, abrir }: { identidade: string; contexto: ContextoSecretaria; admin: boolean; documentoId?: string; versaoAberta?: string; abrir: (id: string, editar?: boolean) => void }) {
  const [correcaoSalva, setCorrecaoSalva] = useState(false)
  const comum = useAuthStore(s => s.user?.perfil === Perfil.COMUM)
  const secretario = useAuthStore(s => s.user?.perfil === Perfil.SECRETARIO)
  const [filtros, definirFiltros] = useSearchParams()
  const abaPedida = contexto.somente_atas ? 'documentos' : filtros.get('aba')
  const aba = abaPedida === 'reunioes' || abaPedida === 'modelos' || (abaPedida === 'livros' && livrosHabilitados())
    ? abaPedida : 'documentos'
  const setAba = (valor: string) => definirFiltros(anterior => { const p = new URLSearchParams(anterior); p.set('contexto', contexto.id); p.set('aba', valor); p.delete('livro'); return p })
  const abrirEditor = useAbrirEditor(contexto.id)
  const local = useLocation()
  const [form, setForm] = useState<'ata-legada' | 'reuniao' | 'edital' | null>(documentoId && contexto.pode_preparar && local.state?.acaoEditor === 'mesa' ? 'reuniao' : null)
  const [modo, setModo] = useState<'institucional' | null>(documentoId && contexto.pode_aprovar && local.state?.acaoEditor === 'retificar' ? 'institucional' : null)
  const docId = documentoId ?? ''
  const versaoLida = versaoAberta
  function mudarVersao(id?: string) {
    const busca = new URLSearchParams(filtros)
    if (id) busca.set('versao', id)
    else busca.delete('versao')
    definirFiltros(busca, { replace: true, state: local.state })
  }
  const resumo = useQuery({ queryKey: ['secretaria', identidade, contexto.id, 'resumo'], queryFn: () => secretariaApi.resumo(contexto.id), enabled: !docId, gcTime: 0 })
  const modelos = useQuery({ queryKey: ['secretaria', identidade, contexto.id, 'modelos'], queryFn: () => secretariaApi.modelos(contexto.id), enabled: !contexto.somente_atas, gcTime: 0 })
  const detalhe = useQuery({ queryKey: ['secretaria', identidade, contexto.id, 'documento', docId], queryFn: () => secretariaApi.documento(docId), enabled: !!docId, gcTime: 0 })
  const acessoRevogado = detalhe.error instanceof ApiRequestError && [401, 403, 404].includes(detalhe.error.statusCode)
  const d = !acessoRevogado && detalhe.data?.contexto_id === contexto.id ? detalhe.data : undefined
  const atual = d?.versoes.find(v => v.numero === d.versao_atual)
  const selecionada = d?.versoes.find(v => v.id === versaoLida) ?? atual
  const lendoAtual = selecionada?.id === atual?.id
  function editar(destino = '') {
    if (destino === 'mesa' && atual?.reuniao_id) { setForm('reuniao'); return }
    abrirEditor('documentos', docId, destino ? { campo: destino } : undefined)
  }
  const editando = modo === 'institucional' && !!d && (d.estado === 'LEGADA_CONFERIDA'
    ? secretario : contexto.pode_aprovar && ['APROVADO', 'EXPEDIDO', 'ANULADO'].includes(d.estado) && !finalidadeTermo(atual?.modelo?.finalidade))
  const reunioes = useQuery({ queryKey: ['secretaria', identidade, contexto.id, 'reunioes', 0], queryFn: () => secretariaApi.reunioes(contexto.id, 0), enabled: !contexto.somente_atas && (d?.tipo === 'ATA' || form === 'ata-legada'), gcTime: 0 })
  const corrigindoMesa = !!docId && form === 'reuniao'
  const mesa = useQuery({ queryKey: ['secretaria', identidade, contexto.id, 'reuniao-vinculada', atual?.reuniao_id],
    enabled: corrigindoMesa && !!atual?.reuniao_id && !!d && contexto.pode_preparar, queryFn: () => secretariaApi.reuniao(atual!.reuniao_id!), gcTime: 0 })
  const documentos = useQuery({ queryKey: ['secretaria', identidade, contexto.id, 'documentos'], queryFn: () => secretariaApi.documentos(contexto.id), enabled: !!editando && !!d?.versoes.find(v => v.numero === d.versao_atual)?.motivador_id, gcTime: 0 })
  const cargos = useQuery({ queryKey: ['secretaria', identidade, contexto.id, 'cargos'], queryFn: () => secretariaApi.cargos(contexto.id), enabled: !!editando, gcTime: 0 })
  const pessoas = useQuery({ queryKey: ['secretaria', identidade, 'pessoas-opcoes'], queryFn: pessoasApi.list, enabled: (!!editando || form === 'reuniao' || form === 'ata-legada') && (contexto.pode_preparar || contexto.pode_aprovar || admin), gcTime: 0 })
  const pronto = () => { setForm(null); setModo(null) }
  const selecionar = (id: string) => { pronto(); if (id) abrir(id); else setAba('documentos') }
  const criarTermo = (termo: NovoTermo) => abrirEditor('documentos', 'novo', { livro: termo.livro.id, termo: termo.finalidade, ...(termo.modelo && { modelo: termo.modelo }), ...(termo.data && { data: termo.data }) })
  const abas = [{ id: 'documentos', nome: 'Documentos' }, { id: 'reunioes', nome: 'Reuniões' }, { id: 'modelos', nome: 'Modelos' }, { id: 'livros', nome: 'Livros' }] as const
  return <section className="space-y-4">{!docId && <>{aba === 'documentos' && !form && <div className="metric-grid">
    {!contexto.somente_atas && <Metric icon={Files} label="Documentos" value={resumo.data?.documentos ?? '—'} />}<Metric icon={FileText} label="Atas" value={resumo.data?.atas ?? '—'} /><Metric icon={PencilLine} label="Em edição" value={resumo.data?.em_edicao ?? '—'} />{!contexto.somente_atas && <Metric icon={CalendarDays} label="Reuniões" value={resumo.data?.reunioes ?? '—'} />}</div>}
    {resumo.isError && <p role="alert">Indicadores indisponíveis. <button onClick={() => resumo.refetch()}>Tentar novamente</button></p>}
    <h2 className="text-xl font-semibold">{contexto.nome}</h2>
    {!contexto.somente_atas && <div className="flex flex-wrap gap-2" role="tablist" aria-label="Secretaria">{abas.filter(a => a.id !== 'livros' || livrosHabilitados()).map(a => <Button role="tab" aria-selected={aba === a.id} key={a.id} variant={aba === a.id ? 'default' : 'outline'} onClick={() => { setAba(a.id); pronto() }}>{a.nome}</Button>)}</div>}
    {[modelos, reunioes, documentos, cargos].some(q => q.isError) && <p role="alert">Não foi possível carregar todos os dados do contexto. Recarregue a página para continuar.</p>}
    {pessoas.isError && <p role="alert">Não foi possível carregar as pessoas para os formulários.</p>}
    {aba === 'modelos' && <ModelosContexto contexto={contexto} gerencia={!comum && contexto.orgao?.ativo !== false && (contexto.pode_preparar || admin)} modelos={modelos.data}/>}
    {aba === 'reunioes' && <ReunioesContexto contexto={contexto} identidade={identidade} modelos={modelos.data}/>}
    {aba === 'livros' && <LivrosContexto contexto={contexto} identidade={identidade} abrirDocumento={selecionar} novoTermo={criarTermo} />}
    {aba === 'documentos' && !form && <div className="surface space-y-3"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-heading text-lg font-semibold">{contexto.somente_atas ? 'Atas do contexto' : 'Documentos do contexto'}</h3><div className="flex flex-wrap gap-2">
      {contexto.pode_preparar && modelos.data?.some(m => m.estado !== 'EM_EDICAO' && (!m.permissoes || m.permissoes.criar || m.permissoes.preparar)) && <Button onClick={() => abrirEditor('documentos')}>{modelos.data.some(m => !m.permissoes || m.permissoes.criar) ? 'Novo documento' : 'Preparar minuta'}</Button>}
      {!comum && contexto.pode_preparar && !!modelosConvocatorios(modelos.data ?? []).length && <Button variant="outline" onClick={() => setForm('edital')}>Criar edital</Button>}
      {contexto.pode_aprovar && <Button variant="outline" onClick={() => setForm('ata-legada')}>Cadastrar ata legada</Button>}</div></div>
      <ListaDocumentos contexto={contexto} identidade={identidade} modelos={modelos.data ?? []} abrir={(id, editar) => editar ? abrirEditor('documentos', id) : abrir(id)}/></div>}
    </>}
    {form && <Button variant="outline" onClick={pronto}>Fechar formulário</Button>}
    {form === 'edital' && <ConvocacaoForm contexto={contexto} identidade={identidade} modelos={modelos.data ?? []}/>}
    {form === 'ata-legada' && pessoas.isPending && <p>Carregando pessoas…</p>}
    {form === 'ata-legada' && pessoas.data && <AtaLegadaForm contexto={contexto} reunioes={reunioes.data ?? []} pessoas={pessoas.data} pronto={selecionar} />}
    {corrigindoMesa && contexto.pode_preparar && d && mesa.data && pessoas.data && <ReuniaoForm key={mesa.data.id + ':' + mesa.data.revisao} contexto={contexto} reuniao={mesa.data} pessoas={pessoas.data} pronto={pronto} />}
    {corrigindoMesa && (mesa.isError || pessoas.isError) && <p role="alert">Não foi possível abrir os dados da reunião.</p>}
    {aba === 'documentos' && docId && !corrigindoMesa && <section className="space-y-4 rounded border p-4">{detalhe.isPending && <p>Carregando documento…</p>}{detalhe.isError && <p role="alert">Não foi possível consultar este documento.</p>}<Button variant="outline" onClick={() => { setModo(null); void detalhe.refetch() }}>Recarregar documento</Button>{detalhe.data && detalhe.data.contexto_id !== contexto.id && <p role="alert">Documento fora do contexto selecionado.</p>}{!acessoRevogado && detalhe.data?.contexto_id === contexto.id && <>
      {detalhe.data.estado === 'LEGADA_CONFERIDA' && <>
        {detalhe.data.versoes.length > 1 && !editando && <Escolha label="Versão da ata" value={versaoLida ?? detalhe.data.versoes.find(v => v.numero === detalhe.data?.versao_atual)?.id ?? ''} onChange={mudarVersao}>
          {detalhe.data.versoes.map(v => <option value={v.id} key={v.id}>Versão {v.numero}{v.numero === detalhe.data?.versao_atual ? ' (atual)' : ''}</option>)}
        </Escolha>}
        {correcaoSalva && !editando && <p role="status">Alterações salvas em uma nova versão da ata.</p>}
        {!contexto.somente_atas && secretario && !editando && <Button onClick={() => { setCorrecaoSalva(false); mudarVersao(undefined); setModo('institucional') }}>Editar ata legada</Button>}
        {secretario && editando && (pessoas.data && reunioes.data
          ? <AtaLegadaForm documento={detalhe.data} contexto={contexto} pessoas={pessoas.data} reunioes={reunioes.data}
              cancelar={() => setModo(null)} pronto={() => { setModo(null); mudarVersao(undefined); setCorrecaoSalva(true) }} />
          : <p role="status">{pessoas.isError || reunioes.isError ? 'Falha ao carregar pessoas ou reuniões.' : 'Carregando formulário…'}</p>)}
      </>}
      {!contexto.somente_atas && !editando && selecionada && <Button variant="outline" onClick={() => abrirEditor('documentos', docId, { versao: selecionada.id })}>Abrir prévia</Button>}
      {d && local.state?.revisaoSalva > d.revisao && <p role="status">Carregando a revisão salva para conferência…</p>}
      {!contexto.somente_atas && d && !(local.state?.revisaoSalva > d.revisao) && atual && lendoAtual && !editando && d.estado !== 'LEGADA_CONFERIDA' && <TramitacaoDocumento key={d.id+':'+d.revisao} documento={d} contexto={contexto} identidade={identidade} corrigir={editar} retificar={() => setModo('institucional')}/>}
      {!editando && <><div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]"><div className="min-w-0">
      {detalhe.data.estado === 'LEGADA_CONFERIDA'
        ? <article className="doc-sheet"><AtaLegadaLeitura documento={detalhe.data} versaoId={versaoLida} /></article>
        : <DocumentoLeitura documento={detalhe.data} versaoAberta={versaoLida} mudarVersao={mudarVersao} menuAtivo={!contexto.somente_atas && lendoAtual && !editando} />}</div><aside className="doc-aside"><h2 className="flex items-center gap-2 font-semibold"><BookOpen size={18} />Dados do documento</h2><Metadados documento={detalhe.data} identidade={identidade} versaoId={versaoLida} contexto={contexto} camposAdicionais /></aside></div>
      {detalhe.data.estado === 'LEGADA_CONFERIDA' && livrosHabilitados() && contexto.pode_aprovar
        && <VinculoLivroLegado key={`VinculoLivroLegado:${detalhe.data.id}`} documento={detalhe.data} identidade={identidade} />}
      {!contexto.somente_atas && !comum && detalhe.data.tipo === 'ATA' && <RegistrosVinculados key={`RegistrosVinculados:${detalhe.data.id}`} id={detalhe.data.id} identidade={identidade} />}
      {selecionada && !editando && detalhe.data.estado !== 'LEGADA_CONFERIDA' && <ArtefatosDocumento key={`artefatos:${detalhe.data.id}`} documento={detalhe.data} contexto={contexto} identidade={identidade} versaoId={selecionada.id} />}
      {!contexto.somente_atas && !comum && selecionada?.congelado_em && detalhe.data.tramitacao?.assinaturas !== false && detalhe.data.estado !== 'LEGADA_CONFERIDA' && assinaturasHabilitadas() && !editando && <AssinaturasDocumento versaoId={selecionada.id} key={`AssinaturasDocumento:${selecionada.id}:${detalhe.data.revisao}`} documento={detalhe.data} contexto={contexto} identidade={identidade} />}
      <HistoricoDocumento key={`HistoricoDocumento:${detalhe.data.id}`} id={detalhe.data.id} identidade={identidade} revisao={detalhe.data.revisao} />
      </>}
      {lendoAtual && detalhe.data.estado === 'EM_EDICAO' && contexto.pode_preparar && (!detalhe.data.atuacao || detalhe.data.atuacao.criar || detalhe.data.atuacao.preparar) && <Button variant="outline" onClick={() => editando ? setModo(null) : editar()}>{editando ? 'Sair da edição' : 'Editar conteúdo'}</Button>}
      {editando && modo === 'institucional' && <Button variant="outline" onClick={() => setModo(null)}>Sair da correção</Button>}
    </>}</section>}
    {editando && d?.estado !== 'LEGADA_CONFERIDA' && (
      modelos.data && pessoas.data && cargos.data
      ? <DocumentoForm key={d.id} contexto={contexto} identidade={identidade} documento={d}
          retificar modelos={modelos.data} documentos={documentos.data ?? []}
          pessoas={pessoas.data} cargos={cargos.data} atualizarModelos={() => void modelos.refetch()}
          pronto={id => { if (id === docId) pronto(); else selecionar(id) }} />
      : <p role="status">{modelos.error || pessoas.error || cargos.error ? 'Falha ao carregar o editor.' : 'Carregando formulário…'}</p>)}
  </section>
}
function Paginacao({ pagina, set, proxima }: { pagina: number; set: (n: number) => void; proxima: boolean }) { return <div className="flex gap-2"><Button variant="outline" disabled={pagina === 0} onClick={() => set(pagina - 1)}>Anterior</Button><span className="self-center text-sm">Página {pagina + 1}</span><Button variant="outline" disabled={!proxima} onClick={() => set(pagina + 1)}>Próxima</Button></div> }
function HistoricoDocumento({ id, identidade, revisao }: { id: string; identidade: string; revisao: number }) {
  const [pagina, setPagina] = useState(0)
  const q = useQuery({ queryKey: ['secretaria', identidade, 'historico', id, revisao, pagina], queryFn: () => secretariaApi.historico(id, pagina), gcTime: 0 })
  return <details className="space-y-2 rounded border p-3"><summary className="cursor-pointer font-semibold">Histórico de ações</summary>{q.isError && <p role="alert">Não foi possível consultar o histórico.</p>}{q.data?.map(a => <article className="border-b py-2" key={a.id}><p>{a.operacao.toLowerCase().replace(/_/g, ' ')} · {new Date(a.criado_em).toLocaleString('pt-BR')} · {a.operador}</p>{a.autoridade && <p>Autoridade: {a.autoridade}</p>}{a.evidencia && <p>Evidência: {a.evidencia}</p>}</article>)}<Paginacao pagina={pagina} set={setPagina} proxima={q.data?.length === 30} /></details>
}
