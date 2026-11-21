import { Badge } from '../../components/ui/badge'
import { PendenciasDocumentais, RegistrosVinculados } from './RegistrosDocumentais'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { Info, Archive, Files, FileText, CalendarDays, PencilLine, Eye, ArrowUpRight, ArrowLeft, BookOpen } from 'lucide-react'
import { WorkspaceHeader, Metric, dataCivil } from '../../components/shared/Workspace'
import { FichaDocumento, Metadados, TeorDocumento } from './FichaDocumento'
import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { rotulosModalidadeReuniao, secretariaApi, numeroDocumento, estadosDocumento, finalidadeTermo, livrosHabilitados, politicaLivro, type ContextoSecretaria, type DocumentoDetalhe, type ReuniaoSecretaria, type ModeloDocumento, type ItemAtuacao } from '../../api/secretaria'
import { pessoasApi } from '../../api/pessoas'
import { useAuthStore } from '../../stores/auth'
import { Perfil } from '../../types/enums'
import { Button } from '../../components/ui/button'
import { Area, Campo, Escolha, Salvar, hoje, useComando } from './formulario'
import { ModeloForm } from './ModeloForm'
import { ReuniaoForm } from './ReuniaoForm'
import { DocumentoForm } from './DocumentoForm'
import { AtaLegadaForm, AtaLegadaLeitura, VinculoLivroLegado } from './AtaLegadaForm'
import { LeituraEstrutura } from './Compositor'
import { AssinaturasDocumento } from './AssinaturasDocumento'
import { assinaturasHabilitadas } from '../../api/assinaturas'
import { ArtefatosDocumento } from './ArtefatosDocumento'
import { AdministracaoSecretaria } from './AdministracaoSecretaria'
import { LivrosContexto, type NovoTermo } from './LivrosContexto'
import { ConsultaAtuacao } from './ConsultaAtuacao'
import { LerResolucoes } from './ResolucoesDocumento'

export function SecretariaPage() {
  const user = useAuthStore(s => s.user)
  const identidade = `${user?.igreja_id}:${user?.sub}`
  return <SecretariaConteudo key={identidade} identidade={identidade} admin={user?.perfil === Perfil.ADMINISTRADOR} />
}
function SecretariaConteudo({ identidade, admin }: { identidade: string; admin: boolean }) {
  const params = useParams()
  const [busca, setBusca] = useSearchParams()
  const navegar = useNavigate()
  const local = useLocation()
  const contextoId = params.contextoId ?? busca.get('contexto')
  const documentoId = params.documentoId
  const setContexto = (id: string) => documentoId ? navegar('/secretaria?contexto=' + encodeURIComponent(id)) : setBusca({ contexto: id })
  const abrir = (contexto: string, id: string, versao?: string) => navegar(`/secretaria/${encodeURIComponent(contexto)}/documentos/${encodeURIComponent(id)}${versao ? '?versao=' + encodeURIComponent(versao) : ''}`, { state: { retorno: local.search } })
  const [mostrarAtuacao, setMostrarAtuacao] = useState(false)
  const [mostrarPendencias, setMostrarPendencias] = useState(false)
  const abrirVersao = (item: ItemAtuacao) => abrir(item.contexto_id, item.documento_id, item.versao_id)
  const contextos = useQuery({ queryKey: ['secretaria', identidade, 'contextos'], queryFn: secretariaApi.contextos, staleTime: 0, gcTime: 0 })
  const contexto = contextos.data?.find(c => c.id === contextoId) ?? (!contextoId ? contextos.data?.[0] : undefined)
  if (documentoId && contexto) return <div className="workspace"><WorkspaceHeader icon={FileText} title="Documento" description={contexto.nome} /><Button variant="outline" onClick={() => navegar('/secretaria' + (local.state?.retorno || '?contexto=' + encodeURIComponent(contexto.id)))}><ArrowLeft />Voltar ao contexto</Button><ContextoConteudo key={documentoId} documentoId={documentoId} versaoAberta={busca.get('versao') ?? undefined} identidade={identidade} contexto={contexto} admin={admin} abrir={id => abrir(contexto.id,id)} /></div>
  return <div className="workspace"><WorkspaceHeader icon={Archive} title="Secretaria" description="Atas, reuniões e livros de cada contexto documental." />
    {contextos.data?.length ? <div className="surface flex flex-wrap items-center gap-3"><span className="rounded-xl bg-purple-muted/55 p-3 text-purple"><Archive size={23} /></span><div className="min-w-0 flex-1"><Escolha label="Contexto documental" value={contexto?.id ?? ''} onChange={id => { setContexto(id); setMostrarAtuacao(false); setMostrarPendencias(false) }} required={false}>{contextos.data.map(c => <option key={c.id} value={c.id}>{c.nome} ({c.sigla})</option>)}</Escolha></div></div> : null}
    {contextoId && contextos.isSuccess && !contexto && <p role="alert">Contexto indisponível. Selecione outro contexto.</p>}
    {contextos.isPending && <p>Carregando contextos…</p>}{contextos.isError && <p role="alert">Não foi possível consultar a secretaria. <Button variant="outline" onClick={() => void contextos.refetch()}>Tentar novamente</Button></p>}
    <div className="flex flex-wrap gap-2">{contextos.data && <Button variant="outline" onClick={() => { setMostrarAtuacao(!mostrarAtuacao); setMostrarPendencias(false) }}>
      {mostrarAtuacao ? 'Voltar aos documentos' : 'Consultar atuação'}
    </Button>}
    <Button variant="outline" aria-expanded={mostrarPendencias} onClick={() => { setMostrarPendencias(!mostrarPendencias); setMostrarAtuacao(false) }}>
      {mostrarPendencias ? 'Voltar aos documentos' : 'Pendências documentais'}
    </Button>
    </div>
    {mostrarPendencias && <PendenciasDocumentais identidade={identidade} />}
    {mostrarAtuacao && contextos.data && <ConsultaAtuacao contextos={contextos.data} identidade={identidade} abrir={abrirVersao} />}
    {contextos.data?.length === 0 && <p>Nenhum contexto preparado. Um administrador pode vinculá-lo a um órgão existente ou preparar a Assembleia Geral.</p>}
    {!mostrarAtuacao && !mostrarPendencias && contexto && <ContextoConteudo key={contexto.id} identidade={identidade} contexto={contexto} admin={admin} abrir={id => abrir(contexto.id,id)} />}
    {!mostrarAtuacao && !mostrarPendencias && admin && contextos.data && <details className="surface"><summary className="font-semibold">Administração da secretaria</summary><AdministracaoSecretaria identidade={identidade} contextos={contextos.data} /></details>}
  </div>
}
function ContextoConteudo({ identidade, contexto, admin, documentoId, versaoAberta, abrir }: { identidade: string; contexto: ContextoSecretaria; admin: boolean; documentoId?: string; versaoAberta?: string; abrir: (id: string) => void }) {
  const [correcaoSalva, setCorrecaoSalva] = useState(false)
  const secretario = useAuthStore(s => s.user?.perfil === Perfil.SECRETARIO)
  const [filtros, definirFiltros] = useSearchParams()
  const abaPedida = filtros.get('aba')
  const aba = abaPedida === 'reunioes' || abaPedida === 'modelos' || (abaPedida === 'livros' && livrosHabilitados())
    ? abaPedida : 'documentos'
  const setAba = (valor: string) => definirFiltros(anterior => { const p = new URLSearchParams(anterior); p.set('contexto', contexto.id); p.set('aba', valor); p.delete('livro'); return p })
  const [termoNovo, setTermoNovo] = useState<NovoTermo>()
  const [form, setForm] = useState<'documento' | 'ata-legada' | 'modelo' | 'reuniao' | null>(null)
  const [modeloEditado, setModelo] = useState<ModeloDocumento | undefined>(), [reuniaoEditada, setReuniao] = useState<ReuniaoSecretaria | undefined>()
  const [paginaDocs, setPaginaDocs] = useState(0), [paginaReunioes, setPaginaReunioes] = useState(0), [editando, setEditando] = useState(false)
  const docId = documentoId ?? ''
  const [versaoLida, mudarVersao] = useState(versaoAberta)
  const [ficha, setFicha] = useState('')
  const origemFicha = useRef<HTMLElement | null>(null)
  const resumo = useQuery({ queryKey: ['secretaria', identidade, contexto.id, 'resumo'], queryFn: () => secretariaApi.resumo(contexto.id), enabled: !docId, gcTime: 0 })
  const modelos = useQuery({ queryKey: ['secretaria', identidade, contexto.id, 'modelos'], queryFn: () => secretariaApi.modelos(contexto.id), gcTime: 0 })
  const reunioes = useQuery({ queryKey: ['secretaria', identidade, contexto.id, 'reunioes', paginaReunioes], queryFn: () => secretariaApi.reunioes(contexto.id, paginaReunioes), gcTime: 0 })
  const documentos = useQuery({ queryKey: ['secretaria', identidade, contexto.id, 'documentos', paginaDocs], queryFn: () => secretariaApi.documentos(contexto.id, paginaDocs), gcTime: 0 })
  const cargos = useQuery({ queryKey: ['secretaria', identidade, contexto.id, 'cargos'], queryFn: () => secretariaApi.cargos(contexto.id), gcTime: 0 })
  const pessoas = useQuery({ queryKey: ['secretaria', identidade, 'pessoas-opcoes'], queryFn: pessoasApi.list, enabled: contexto.pode_preparar || contexto.pode_aprovar || admin, gcTime: 0 })
  const detalhe = useQuery({ queryKey: ['secretaria', identidade, contexto.id, 'documento', docId], queryFn: () => secretariaApi.documento(docId), enabled: !!docId, gcTime: 0 })
  const pronto = () => { setForm(null); setModelo(undefined); setReuniao(undefined); setEditando(false); setTermoNovo(undefined) }
  const selecionar = (id: string) => { pronto(); if (id) abrir(id); else setAba('documentos') }
  const criarTermo = (termo: NovoTermo) => { selecionar(''); setForm('documento'); setTermoNovo(termo) }
  const abas = [{ id: 'documentos', nome: 'Documentos' }, { id: 'reunioes', nome: 'Reuniões' }, { id: 'modelos', nome: 'Modelos' }, { id: 'livros', nome: 'Livros' }] as const
  const basesOk = (!docId || detalhe.data?.contexto_id === contexto.id) && !!modelos.data && !!reunioes.data && !!documentos.data && !!pessoas.data && !!cargos.data
  return <section className="space-y-4">{!docId && <>{aba === 'documentos' && <div className="metric-grid">
    <Metric icon={Files} label="Documentos" value={resumo.data?.documentos ?? '—'} /><Metric icon={FileText} label="Atas" value={resumo.data?.atas ?? '—'} /><Metric icon={PencilLine} label="Em edição" value={resumo.data?.em_edicao ?? '—'} /><Metric icon={CalendarDays} label="Reuniões" value={resumo.data?.reunioes ?? '—'} /></div>}
    {resumo.isError && <p role="alert">Indicadores indisponíveis. <button onClick={() => resumo.refetch()}>Tentar novamente</button></p>}
    <h2 className="text-xl font-semibold">{contexto.nome}</h2>
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Secretaria">{abas.filter(a => a.id !== 'livros' || livrosHabilitados()).map(a => <Button role="tab" aria-selected={aba === a.id} key={a.id} variant={aba === a.id ? 'default' : 'outline'} onClick={() => { setAba(a.id); pronto() }}>{a.nome}</Button>)}</div>
    {[modelos, reunioes, documentos, cargos].some(q => q.isError) && <p role="alert">Não foi possível carregar todos os dados do contexto. Recarregue a página para continuar.</p>}
    {pessoas.isError && <p role="alert">Não foi possível carregar as pessoas para os formulários.</p>}
    {aba === 'modelos' && <div className="space-y-3">{(contexto.pode_preparar || admin) && <Button onClick={() => { setModelo(undefined); setForm('modelo') }}>Novo modelo</Button>}{modelos.data?.length === 0 && <p>Nenhum modelo cadastrado.</p>}{modelos.data?.map(m => <article className="space-y-2 rounded border p-3" key={m.id}><h3 className="font-semibold">{m.nome}</h3>{m.versoes.map(v => <p key={v.id}>Versão {v.numero} · {v.tipo === 'ATA' ? 'Ata' : 'Outro'} · {v.finalidade} · {finalidadeTermo(v.finalidade) ? 'Termo de livro' : ({ OBRIGATORIO: 'Registro obrigatório', OPCIONAL: 'Registro opcional', NAO_PERMITE: 'Sem registro em livro' })[politicaLivro(v.configuracao)]}</p>)}{(contexto.pode_preparar || admin) && <Button variant="outline" onClick={() => { setModelo(m); setForm('modelo') }}>Criar nova versão</Button>}</article>)}</div>}
    {aba === 'reunioes' && <div className="space-y-3">{contexto.pode_preparar && <Button onClick={() => { setReuniao(undefined); setForm('reuniao') }}>Nova reunião</Button>}{reunioes.data?.length === 0 && <p>Nenhuma reunião nesta página.</p>}{reunioes.data?.map(r => <details className="space-y-2 rounded border p-3" key={r.id}><summary className="cursor-pointer">{r.data.slice(0, 10)} · {rotulosModalidadeReuniao[r.modalidade]} · {r.dados.local}</summary><p>Pauta: {r.dados.pauta}</p><p>Competência: {r.dados.competencia}</p><p>Quórum: {r.participantes.filter(p => p.presente).length} presentes / mínimo {r.dados.quorum_minimo} · {r.dados.quorum_conferido ? 'Conferido' : 'Pendente de conferência'}</p><p>Resultado: {r.dados.resultado || 'Não informado'}</p>{r.participantes.map(p => <p key={p.pessoa_id}>{p.retrato.nome} · {p.presente ? 'Presente' : 'Ausente'} · {p.papeis.join(', ')}</p>)}{contexto.pode_preparar && <Button variant="outline" onClick={() => { setReuniao(r); setForm('reuniao') }}>Editar reunião</Button>}</details>)}<Paginacao pagina={paginaReunioes} set={setPaginaReunioes} proxima={reunioes.data?.length === 30} /></div>}
    {aba === 'livros' && <LivrosContexto contexto={contexto} identidade={identidade} abrirDocumento={selecionar} novoTermo={criarTermo} />}
    {aba === 'documentos' && <div className="surface space-y-3"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-heading text-lg font-semibold">Documentos do contexto</h3><div className="flex flex-wrap gap-2">{contexto.pode_preparar && <Button onClick={() => { selecionar(''); setForm('documento') }}>Novo documento</Button>}{contexto.pode_aprovar && <Button variant="outline" onClick={() => { selecionar(''); setForm('ata-legada') }}>Cadastrar ata legada</Button>}</div></div>{documentos.data?.length === 0 && <p>Nenhum documento nesta página.</p>}{!!documentos.data?.length && <div className="overflow-x-auto rounded-xl border bg-white"><table className="record-table"><thead><tr><th>Documento</th><th aria-sort="descending">Data</th><th>Situação</th><th>Ações</th></tr></thead><tbody>{documentos.data.map(d => <tr key={d.id}><td data-label="Documento"><strong>{d.versoes[0]?.assunto}</strong><p className="text-xs text-muted-foreground">{numeroDocumento(d)} · v{d.versao_atual}{d.restrito && ' · Restrito'}</p></td><td data-label="Data">{dataCivil(d.versoes[0]?.data_documento)}</td><td data-label="Situação"><Badge variant={d.estado === 'EM_EDICAO' ? 'warning' : ['CANCELADO','ANULADO'].includes(d.estado) ? 'outline' : 'success'}>{estadosDocumento[d.estado]}</Badge></td><td data-label="Ações"><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={e => { origemFicha.current=e.currentTarget; setFicha(d.id) }}><Eye />Visualizar ficha</Button><Button size="sm" variant="secondary" onClick={() => selecionar(d.id)}><ArrowUpRight />Abrir documento</Button></div></td></tr>)}</tbody></table></div>}
    {ficha && <FichaDocumento id={ficha} identidade={identidade} fechar={() => setFicha('')} origem={origemFicha.current} />}
    <Paginacao pagina={paginaDocs} set={setPaginaDocs} proxima={documentos.data?.length === 30} /></div>}
    </>}
    {form && <Button variant="outline" onClick={pronto}>Fechar formulário</Button>}
    {form === 'ata-legada' && pessoas.isPending && <p>Carregando pessoas…</p>}
    {form === 'ata-legada' && pessoas.data && <AtaLegadaForm contexto={contexto} reunioes={reunioes.data ?? []} pessoas={pessoas.data} pronto={id => { setPaginaDocs(0); selecionar(id) }} />}
    {form === 'modelo' && cargos.data && <ModeloForm key={modeloEditado?.id ?? 'novo'} contexto={contexto} modelo={modeloEditado} cargos={cargos.data} pronto={pronto} />}
    {form === 'reuniao' && pessoas.data && <ReuniaoForm key={`${reuniaoEditada?.id}:${reuniaoEditada?.revisao}`} contexto={contexto} reuniao={reuniaoEditada} pessoas={pessoas.data} pronto={pronto} />}
    {aba === 'documentos' && docId && <section className="space-y-4 rounded border p-4">{detalhe.isPending && <p>Carregando documento…</p>}{detalhe.isError && <p role="alert">Não foi possível consultar este documento.</p>}<Button variant="outline" onClick={() => { setEditando(false); void detalhe.refetch() }}>Recarregar documento</Button>{detalhe.data && detalhe.data.contexto_id !== contexto.id && <p role="alert">Documento fora do contexto selecionado.</p>}{detalhe.data?.contexto_id === contexto.id && <>
      {detalhe.data.estado === 'LEGADA_CONFERIDA' && <>
        {detalhe.data.versoes.length > 1 && !editando && <Escolha label="Versão da ata" value={versaoLida ?? detalhe.data.versoes.find(v => v.numero === detalhe.data?.versao_atual)?.id ?? ''} onChange={mudarVersao}>
          {detalhe.data.versoes.map(v => <option value={v.id} key={v.id}>Versão {v.numero}{v.numero === detalhe.data?.versao_atual ? ' (atual)' : ''}</option>)}
        </Escolha>}
        {correcaoSalva && !editando && <p role="status">Alterações salvas em uma nova versão da ata.</p>}
        {secretario && !editando && <Button onClick={() => { setCorrecaoSalva(false); mudarVersao(undefined); setEditando(true) }}>Editar ata legada</Button>}
        {secretario && editando && (pessoas.data && reunioes.data
          ? <AtaLegadaForm documento={detalhe.data} contexto={contexto} pessoas={pessoas.data} reunioes={reunioes.data}
              cancelar={() => setEditando(false)} pronto={() => { setEditando(false); mudarVersao(undefined); setCorrecaoSalva(true) }} />
          : <p role="status">{pessoas.isError || reunioes.isError ? 'Falha ao carregar pessoas ou reuniões.' : 'Carregando formulário…'}</p>)}
      </>}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]"><div className="min-w-0">
      {detalhe.data.estado === 'LEGADA_CONFERIDA'
        ? <article className="doc-sheet"><AtaLegadaLeitura documento={detalhe.data} versaoId={versaoLida} /></article>
        : <DocumentoLeitura documento={detalhe.data} versaoAberta={versaoLida} mudarVersao={mudarVersao} />}</div><aside className="doc-aside"><h2 className="flex items-center gap-2 font-semibold"><BookOpen size={18} />Dados do documento</h2><Metadados documento={detalhe.data} identidade={identidade} versaoId={versaoLida} camposAdicionais /></aside></div>
      {detalhe.data.estado === 'LEGADA_CONFERIDA' && livrosHabilitados() && contexto.pode_aprovar
        && <VinculoLivroLegado key={detalhe.data.id} documento={detalhe.data} identidade={identidade} />}
      {detalhe.data.tipo === 'ATA' && <RegistrosVinculados key={detalhe.data.id} id={detalhe.data.id} identidade={identidade} />}
      {detalhe.data.estado !== 'LEGADA_CONFERIDA' && <ArtefatosDocumento key={`artefatos:${detalhe.data.id}`} documento={detalhe.data} contexto={contexto} identidade={identidade} editando={editando} />}
      {detalhe.data.estado !== 'LEGADA_CONFERIDA' && assinaturasHabilitadas() && !editando && <AssinaturasDocumento key={detalhe.data.id} documento={detalhe.data} contexto={contexto} identidade={identidade} />}
      <HistoricoDocumento key={detalhe.data.id} id={detalhe.data.id} identidade={identidade} revisao={detalhe.data.revisao} />
      {detalhe.data.estado === 'EM_EDICAO' && contexto.pode_preparar && <Button variant="outline" onClick={() => setEditando(x => !x)}>Editar conteúdo</Button>}
      {['APROVADO', 'EXPEDIDO', 'ANULADO'].includes(detalhe.data.estado) && contexto.pode_aprovar && !finalidadeTermo(detalhe.data.versoes.find(v => v.numero === detalhe.data?.versao_atual)?.modelo?.finalidade) && <Button variant="outline" onClick={() => setEditando(x => !x)}>Preparar retificação</Button>}
      {detalhe.data.tipo === 'ATA' && detalhe.data.estado === 'EM_EDICAO' && <aside className="flex gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950"><Info className="size-5 shrink-0" /><div><h3 className="font-semibold">Aprovação da ata</h3><p>Registre a deliberação da reunião antes da aprovação técnica que congela a versão. {assinaturasHabilitadas() ? 'A expedição depende das assinaturas obrigatórias.' : 'Assinatura e expedição estão desabilitadas.'}</p></div></aside>}
      {detalhe.data.estado !== 'LEGADA_CONFERIDA' && !editando && <ComandosDocumento key={`${detalhe.data.id}:${detalhe.data.revisao}`} documento={detalhe.data} contexto={contexto} reunioes={reunioes.data ?? []} />}
    </>}</section>}
    {basesOk && ((form === 'documento') || (aba === 'documentos' && editando && detalhe.data && detalhe.data.estado !== 'LEGADA_CONFERIDA')) && <DocumentoForm key={`${detalhe.data?.id ?? 'novo'}:${detalhe.data?.revisao ?? 0}`} contexto={contexto} identidade={identidade} novoTermo={termoNovo} documento={editando ? detalhe.data : undefined} retificar={editando && !!detalhe.data && detalhe.data.estado !== 'EM_EDICAO'} modelos={modelos.data!} reunioes={reunioes.data!} documentos={documentos.data!} pessoas={pessoas.data!} cargos={cargos.data!} pronto={selecionar} />}
  </section>
}
function Paginacao({ pagina, set, proxima }: { pagina: number; set: (n: number) => void; proxima: boolean }) { return <div className="flex gap-2"><Button variant="outline" disabled={pagina === 0} onClick={() => set(pagina - 1)}>Anterior</Button><span className="self-center text-sm">Página {pagina + 1}</span><Button variant="outline" disabled={!proxima} onClick={() => set(pagina + 1)}>Próxima</Button></div> }
function DocumentoLeitura({ documento: d, versaoAberta, mudarVersao }: { documento: DocumentoDetalhe; versaoAberta?: string; mudarVersao: (id: string) => void }) {
  const selecionada = d.versoes.find(v => v.id === versaoAberta) ?? d.versoes.find(v => v.numero === d.versao_atual)
  return <div className="space-y-3">{d.versoes.map(v => <details key={v.id} open={v.id === selecionada?.id} className="doc-version">
    <summary onClick={e => { e.preventDefault(); mudarVersao(v.id) }} className="rounded-xl border bg-white px-4 py-3 text-sm font-semibold">Versão {v.numero}: {v.assunto}{v.congelado_em ? ' · Conteúdo congelado' : ''}</summary>
    {v.id === selecionada?.id && <article className="doc-sheet mt-3">
      <header className="doc-heading"><div className="mx-auto mb-3 h-1 w-10 bg-purple" />{v.fonte_congelada?.igreja?.nome && <p className="font-semibold">{v.fonte_congelada.igreja.nome}</p>}
        <p className="text-sm">{v.fonte_congelada?.contexto.nome}</p><p className="mt-3 text-sm">{v.fonte_congelada?.numero || numeroDocumento(d)}</p>
        <h3 className="my-2 text-2xl font-bold">{v.assunto}</h3><time className="text-sm">{dataCivil(v.data_documento)}</time>
      </header>
      {v.conteudo.estrutura && <LeituraEstrutura documentoId={d.id} versao={v} secaoUnica="cabecalho" valor={v.conteudo.estrutura} campos={v.conteudo.campos} tipos={v.modelo?.configuracao.tipos_campos} />}
      <TeorDocumento texto={v.conteudo.teor} />
      {v.conteudo.estrutura && <LeituraEstrutura documentoId={d.id} versao={v} secaoUnica="corpo" valor={v.conteudo.estrutura} campos={v.conteudo.campos} tipos={v.modelo?.configuracao.tipos_campos} />}
      <LerResolucoes resolucoes={v.resolucoes ?? []} />
      {v.conteudo.estrutura && <LeituraEstrutura documentoId={d.id} versao={v} secaoUnica="rodape" valor={v.conteudo.estrutura} campos={v.conteudo.campos} tipos={v.modelo?.configuracao.tipos_campos} />}
      {v.arrolados.length > 0 && <footer className="border-t pt-4"><h4 className="font-semibold">Pessoas e responsabilidades</h4>{v.arrolados.map(p => <p key={p.pessoa_id}>{p.retrato.nome}{p.retrato.cargos?.length ? ' (' + p.retrato.cargos.map(c => c.nome).join(', ') + ')' : p.retrato.cargo ? ' (' + p.retrato.cargo.nome + ')' : ''} · {p.papeis.join(', ')}{p.responsavel && ' · Responsável'}{p.assina ? p.obrigatorio ? ' · Signatário obrigatório' : ' · Signatário' : ' · Sem assinatura'}</p>)}</footer>}
      {v.anexos.map(f => <p key={f.arquivo_id}><a className="underline" href={secretariaApi.anexoUrl(d.id, v.id, f.arquivo_id)}>{f.nome}</a> · {f.arquivo.tamanho} bytes</p>)}
    </article>}
  </details>)}</div>
}
function ComandosDocumento({ documento: d, contexto: c, reunioes }: { documento: DocumentoDetalhe; contexto: ContextoSecretaria; reunioes: ReuniaoSecretaria[] }) {
  const acoes = [d.estado === 'EM_EDICAO' && c.pode_preparar && ['encaminhar', 'Encaminhar para aprovação'], d.estado === 'EM_EDICAO' && c.pode_aprovar && ['aprovar', 'Aprovar tecnicamente'], d.estado === 'EM_EDICAO' && d.tipo === 'ATA' && c.pode_deliberar && ['deliberar', 'Registrar deliberação da ata'], ['EM_EDICAO', 'APROVADO'].includes(d.estado) && c.pode_aprovar && ['cancelar', 'Cancelar documento'], d.estado === 'EXPEDIDO' && c.pode_aprovar && ['anular', 'Anular documento']].filter((v): v is string[] => !!v)
  const [acao, setAcao] = useState(''), [autoridade, setAutoridade] = useState(''), [evidencia, setEvidencia] = useState(''), [reuniao, setReuniao] = useState(''), [resultado, setResultado] = useState('APROVADA'), [data, setData] = useState(hoje())
  const [modalidade, setModalidade] = useState('')
  const escolherModalidade = acao === 'aprovar' && assinaturasHabilitadas()
  const enviar = useComando((dados: { revisao: number; autoridade: string; evidencia: string; reuniao_id?: string; resultado?: string; data?: string; modalidade?: string }) => secretariaApi.comando(d.id, acao, dados), undefined, `${d.id}:${acao}`)
  if (!acoes.length) return null
  return <form className="space-y-3 rounded border p-4" onSubmit={e => { e.preventDefault(); enviar.mutate({ revisao: d.revisao, autoridade, evidencia, ...(escolherModalidade ? { modalidade } : {}), ...(acao === 'deliberar' ? { reuniao_id: reuniao, resultado, data } : {}) }) }}><Escolha label="Ação documental" value={acao} onChange={setAcao}><option value="">Selecione uma ação</option>{acoes.map(([v, label]) => <option key={v} value={v}>{label}</option>)}</Escolha>{escolherModalidade && <Escolha label="Modalidade de assinatura" value={modalidade} onChange={setModalidade}><option value="">Selecione a modalidade</option><option value="ELETRONICA">Eletrônica por convite individual</option><option value="FISICA">Física com digitalização conferida</option></Escolha>}{acao === 'deliberar' && <><Escolha label="Reunião da deliberação" value={reuniao} onChange={s => { setReuniao(s); setData(reunioes.find(r => r.id === s)?.data.slice(0, 10) ?? hoje()) }}><option value="">Selecione a reunião</option>{reunioes.map(r => <option key={r.id} value={r.id}>{r.data.slice(0, 10)} · {rotulosModalidadeReuniao[r.modalidade]}</option>)}</Escolha><Campo label="Data da deliberação" value={data} type="date" onChange={setData} /><Escolha label="Resultado deliberativo" value={resultado} onChange={setResultado}><option value="APROVADA">Aprovada</option><option value="REJEITADA">Rejeitada</option><option value="ADIADA">Adiada</option></Escolha><p>A reunião aprovadora pode ocorrer depois da reunião da ata. Ela não precisa ter ata expedida.</p></>}<Campo label="Autoridade da ação" value={autoridade} onChange={setAutoridade} /><Area label="Fundamento e evidência da ação" value={evidencia} onChange={setEvidencia} /><Salvar pending={enviar.isPending} disabled={!acao} error={enviar.error} success={enviar.isSuccess} label="Registrar ação" /></form>
}

function HistoricoDocumento({ id, identidade, revisao }: { id: string; identidade: string; revisao: number }) {
  const [pagina, setPagina] = useState(0)
  const q = useQuery({ queryKey: ['secretaria', identidade, 'historico', id, revisao, pagina], queryFn: () => secretariaApi.historico(id, pagina), gcTime: 0 })
  return <details className="space-y-2 rounded border p-3"><summary className="cursor-pointer font-semibold">Histórico de ações</summary>{q.isError && <p role="alert">Não foi possível consultar o histórico.</p>}{q.data?.map(a => <article className="border-b py-2" key={a.id}><p>{a.operacao.toLowerCase().replace(/_/g, ' ')} · {new Date(a.criado_em).toLocaleString('pt-BR')} · {a.operador}</p>{a.autoridade && <p>Autoridade: {a.autoridade}</p>}{a.evidencia && <p>Evidência: {a.evidencia}</p>}</article>)}<Paginacao pagina={pagina} set={setPagina} proxima={q.data?.length === 30} /></details>
}
