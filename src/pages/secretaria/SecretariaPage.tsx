import { PendenciasDocumentais, RegistrosVinculados } from './RegistrosDocumentais'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { secretariaApi, numeroDocumento, estadosDocumento, finalidadeTermo, livrosHabilitados, politicaLivro, type ContextoSecretaria, type DocumentoDetalhe, type ReuniaoSecretaria, type ModeloDocumento, type ItemAtuacao } from '../../api/secretaria'
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
  const [contextoId, setContexto] = useState('')
  const [mostrarAtuacao, setMostrarAtuacao] = useState(false)
  const [mostrarPendencias, setMostrarPendencias] = useState(false)
  const [origemConsulta, setOrigemConsulta] = useState<ItemAtuacao>()
  const abrirVersao = (item: ItemAtuacao) => {
    setOrigemConsulta(item)
    setContexto(item.contexto_id)
    setMostrarAtuacao(false)
    setMostrarPendencias(false)
  }
  const contextos = useQuery({ queryKey: ['secretaria', identidade, 'contextos'], queryFn: secretariaApi.contextos, staleTime: 0, gcTime: 0 })
  const contexto = contextos.data?.find(c => c.id === contextoId)
  return <main className="space-y-6 p-6"><div><h1 className="text-2xl font-semibold">Secretaria</h1><p className="text-sm text-muted-foreground">Reuniões, modelos e documentos com histórico de versões.</p></div>
    <p className="rounded border bg-muted/30 p-3 text-sm">Para atas novas, a aprovação técnica congela o conteúdo e o fluxo exige aprovação deliberativa. {assinaturasHabilitadas() ? ' A expedição começa após a coleta de todas as assinaturas obrigatórias.' : ' Assinatura e expedição estão desabilitadas.'}</p>
    {contextos.isPending && <p>Carregando contextos…</p>}{contextos.isError && <p role="alert">Não foi possível consultar a secretaria. <Button variant="outline" onClick={() => void contextos.refetch()}>Tentar novamente</Button></p>}
    {contextos.data && <Button variant="outline" onClick={() => { setMostrarAtuacao(!mostrarAtuacao); setMostrarPendencias(false) }}>
      {mostrarAtuacao ? 'Voltar aos documentos' : 'Consultar atuação'}
    </Button>}
    <Button variant="outline" aria-expanded={mostrarPendencias} onClick={() => { setMostrarPendencias(!mostrarPendencias); setMostrarAtuacao(false) }}>
      {mostrarPendencias ? 'Voltar aos documentos' : 'Pendências documentais'}
    </Button>
    {mostrarPendencias && <PendenciasDocumentais identidade={identidade} />}
    {mostrarAtuacao && contextos.data && <ConsultaAtuacao contextos={contextos.data} identidade={identidade} abrir={abrirVersao} />}
    {!mostrarAtuacao && !mostrarPendencias && admin && contextos.data && <AdministracaoSecretaria identidade={identidade} contextos={contextos.data} />}
    {!mostrarAtuacao && !mostrarPendencias && contextos.data && <Escolha label="Contexto documental" value={contextoId} onChange={id => { setOrigemConsulta(undefined); setContexto(id) }} required={false}><option value="">Selecione um contexto</option>{contextos.data.map(c => <option key={c.id} value={c.id}>{c.nome} ({c.sigla})</option>)}</Escolha>}
    {contextos.data?.length === 0 && <p>Nenhum contexto preparado. Um administrador pode vinculá-lo a um órgão existente ou preparar a Assembleia Geral.</p>}
    {!mostrarAtuacao && !mostrarPendencias && contexto && <ContextoConteudo key={contexto.id} identidade={identidade} contexto={contexto} admin={admin} origemConsulta={origemConsulta} />}
  </main>
}
function ContextoConteudo({ identidade, contexto, admin, origemConsulta }: { identidade: string; contexto: ContextoSecretaria; admin: boolean; origemConsulta?: ItemAtuacao }) {
  const [aba, setAba] = useState<'documentos' | 'modelos' | 'reunioes' | 'livros'>('documentos')
  const [termoNovo, setTermoNovo] = useState<NovoTermo>()
  const [form, setForm] = useState<'documento' | 'ata-legada' | 'modelo' | 'reuniao' | null>(null)
  const [modeloEditado, setModelo] = useState<ModeloDocumento | undefined>(), [reuniaoEditada, setReuniao] = useState<ReuniaoSecretaria | undefined>()
  const [paginaDocs, setPaginaDocs] = useState(0), [paginaReunioes, setPaginaReunioes] = useState(0), [docId, setDocId] = useState(origemConsulta?.documento_id ?? ''), [versaoAberta, setVersaoAberta] = useState(origemConsulta?.versao_id), [editando, setEditando] = useState(false)
  const modelos = useQuery({ queryKey: ['secretaria', identidade, contexto.id, 'modelos'], queryFn: () => secretariaApi.modelos(contexto.id), gcTime: 0 })
  const reunioes = useQuery({ queryKey: ['secretaria', identidade, contexto.id, 'reunioes', paginaReunioes], queryFn: () => secretariaApi.reunioes(contexto.id, paginaReunioes), gcTime: 0 })
  const documentos = useQuery({ queryKey: ['secretaria', identidade, contexto.id, 'documentos', paginaDocs], queryFn: () => secretariaApi.documentos(contexto.id, paginaDocs), gcTime: 0 })
  const cargos = useQuery({ queryKey: ['secretaria', identidade, contexto.id, 'cargos'], queryFn: () => secretariaApi.cargos(contexto.id), gcTime: 0 })
  const pessoas = useQuery({ queryKey: ['secretaria', identidade, 'pessoas-opcoes'], queryFn: pessoasApi.list, enabled: contexto.pode_preparar || contexto.pode_aprovar || admin, gcTime: 0 })
  const detalhe = useQuery({ queryKey: ['secretaria', identidade, contexto.id, 'documento', docId], queryFn: () => secretariaApi.documento(docId), enabled: !!docId, gcTime: 0 })
  const pronto = () => { setForm(null); setModelo(undefined); setReuniao(undefined); setEditando(false); setTermoNovo(undefined) }
  const selecionar = (id: string) => { pronto(); setDocId(id); setVersaoAberta(undefined); setAba('documentos') }
  const criarTermo = (termo: NovoTermo) => { selecionar(''); setForm('documento'); setTermoNovo(termo) }
  const abas = [{ id: 'documentos', nome: 'Documentos' }, { id: 'reunioes', nome: 'Reuniões' }, { id: 'modelos', nome: 'Modelos' }, { id: 'livros', nome: 'Livros' }] as const
  const basesOk = !!modelos.data && !!reunioes.data && !!documentos.data && !!pessoas.data && !!cargos.data
  return <section className="space-y-4"><h2 className="text-xl font-semibold">{contexto.nome}</h2>
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Secretaria">{abas.filter(a => a.id !== 'livros' || livrosHabilitados()).map(a => <Button role="tab" aria-selected={aba === a.id} key={a.id} variant={aba === a.id ? 'default' : 'outline'} onClick={() => { setAba(a.id); pronto() }}>{a.nome}</Button>)}</div>
    {[modelos, reunioes, documentos, cargos].some(q => q.isError) && <p role="alert">Não foi possível carregar todos os dados do contexto. Recarregue a página para continuar.</p>}
    {pessoas.isError && <p role="alert">Não foi possível carregar as pessoas para os formulários.</p>}
    {aba === 'modelos' && <div className="space-y-3">{(contexto.pode_preparar || admin) && <Button onClick={() => { setModelo(undefined); setForm('modelo') }}>Novo modelo</Button>}{modelos.data?.length === 0 && <p>Nenhum modelo cadastrado.</p>}{modelos.data?.map(m => <article className="space-y-2 rounded border p-3" key={m.id}><h3 className="font-semibold">{m.nome}</h3>{m.versoes.map(v => <p key={v.id}>Versão {v.numero} · {v.tipo === 'ATA' ? 'Ata' : 'Outro'} · {v.finalidade} · {finalidadeTermo(v.finalidade) ? 'Termo de livro' : ({ OBRIGATORIO: 'Registro obrigatório', OPCIONAL: 'Registro opcional', NAO_PERMITE: 'Sem registro em livro' })[politicaLivro(v.configuracao)]}</p>)}{(contexto.pode_preparar || admin) && <Button variant="outline" onClick={() => { setModelo(m); setForm('modelo') }}>Criar nova versão</Button>}</article>)}</div>}
    {aba === 'reunioes' && <div className="space-y-3">{contexto.pode_preparar && <Button onClick={() => { setReuniao(undefined); setForm('reuniao') }}>Nova reunião</Button>}{reunioes.data?.length === 0 && <p>Nenhuma reunião nesta página.</p>}{reunioes.data?.map(r => <details className="space-y-2 rounded border p-3" key={r.id}><summary className="cursor-pointer">{r.data.slice(0, 10)} · {r.modalidade} · {r.dados.local}</summary><p>Pauta: {r.dados.pauta}</p><p>Competência: {r.dados.competencia}</p><p>Quórum: {r.participantes.filter(p => p.presente).length} presentes / mínimo {r.dados.quorum_minimo} · {r.dados.quorum_conferido ? 'Conferido' : 'Pendente de conferência'}</p><p>Resultado: {r.dados.resultado || 'Não informado'}</p>{r.participantes.map(p => <p key={p.pessoa_id}>{p.retrato.nome} · {p.presente ? 'Presente' : 'Ausente'} · {p.papeis.join(', ')}</p>)}{contexto.pode_preparar && <Button variant="outline" onClick={() => { setReuniao(r); setForm('reuniao') }}>Editar reunião</Button>}</details>)}<Paginacao pagina={paginaReunioes} set={setPaginaReunioes} proxima={reunioes.data?.length === 30} /></div>}
    {aba === 'livros' && <LivrosContexto contexto={contexto} identidade={identidade} abrirDocumento={selecionar} novoTermo={criarTermo} />}
    {aba === 'documentos' && <div className="space-y-3">{contexto.pode_preparar && <Button onClick={() => { selecionar(''); setForm('documento') }}>Novo documento</Button>}{contexto.pode_aprovar && <Button className="ml-2" variant="outline" onClick={() => { selecionar(''); setForm('ata-legada') }}>Cadastrar ata legada</Button>}{documentos.data?.length === 0 && <p>Nenhum documento nesta página.</p>}{documentos.data?.map(d => <div className="flex flex-wrap items-center justify-between gap-3 rounded border p-3" key={d.id}><div><p className="font-semibold">{d.versoes[0]?.assunto}</p><p>{numeroDocumento(d)} · {estadosDocumento[d.estado]} · v{d.versao_atual}{d.restrito ? ' · Restrito' : ''}</p></div><Button variant="outline" onClick={() => selecionar(d.id)}>Abrir documento</Button></div>)}<Paginacao pagina={paginaDocs} set={setPaginaDocs} proxima={documentos.data?.length === 30} /></div>}
    {form && <Button variant="outline" onClick={pronto}>Fechar formulário</Button>}
    {form === 'ata-legada' && pessoas.isPending && <p>Carregando pessoas…</p>}
    {form === 'ata-legada' && pessoas.data && <AtaLegadaForm contexto={contexto} reunioes={reunioes.data ?? []} pessoas={pessoas.data} pronto={id => { setPaginaDocs(0); selecionar(id) }} />}
    {form === 'modelo' && cargos.data && <ModeloForm key={modeloEditado?.id ?? 'novo'} contexto={contexto} modelo={modeloEditado} cargos={cargos.data} pronto={pronto} />}
    {form === 'reuniao' && pessoas.data && <ReuniaoForm key={`${reuniaoEditada?.id}:${reuniaoEditada?.revisao}`} contexto={contexto} reuniao={reuniaoEditada} pessoas={pessoas.data} pronto={pronto} />}
    {aba === 'documentos' && docId && <section className="space-y-4 rounded border p-4">{detalhe.isPending && <p>Carregando documento…</p>}{detalhe.isError && <p role="alert">Não foi possível consultar este documento.</p>}<Button variant="outline" onClick={() => { setEditando(false); void detalhe.refetch() }}>Recarregar documento</Button>{detalhe.data && <>
      {detalhe.data.estado === 'LEGADA_CONFERIDA'
        ? <AtaLegadaLeitura documento={detalhe.data} />
        : <DocumentoLeitura documento={detalhe.data} versaoAberta={versaoAberta} />}
      {detalhe.data.estado === 'LEGADA_CONFERIDA' && livrosHabilitados() && contexto.pode_aprovar
        && <VinculoLivroLegado key={detalhe.data.id} documento={detalhe.data} identidade={identidade} />}
      {detalhe.data.tipo === 'ATA' && <RegistrosVinculados key={detalhe.data.id} id={detalhe.data.id} identidade={identidade} />}
      {detalhe.data.estado !== 'LEGADA_CONFERIDA' && <ArtefatosDocumento key={`artefatos:${detalhe.data.id}`} documento={detalhe.data} contexto={contexto} identidade={identidade} editando={editando} />}
      {detalhe.data.estado !== 'LEGADA_CONFERIDA' && assinaturasHabilitadas() && !editando && <AssinaturasDocumento key={detalhe.data.id} documento={detalhe.data} contexto={contexto} identidade={identidade} />}
      <HistoricoDocumento key={detalhe.data.id} id={detalhe.data.id} identidade={identidade} revisao={detalhe.data.revisao} />
      {detalhe.data.estado === 'EM_EDICAO' && contexto.pode_preparar && <Button variant="outline" onClick={() => setEditando(x => !x)}>Editar conteúdo</Button>}
      {['APROVADO', 'EXPEDIDO', 'ANULADO'].includes(detalhe.data.estado) && contexto.pode_aprovar && !finalidadeTermo(detalhe.data.versoes.find(v => v.numero === detalhe.data?.versao_atual)?.modelo?.finalidade) && <Button variant="outline" onClick={() => setEditando(x => !x)}>Preparar retificação</Button>}
      {detalhe.data.estado !== 'LEGADA_CONFERIDA' && !editando && <ComandosDocumento key={`${detalhe.data.id}:${detalhe.data.revisao}`} documento={detalhe.data} contexto={contexto} reunioes={reunioes.data ?? []} />}
    </>}</section>}
    {basesOk && ((form === 'documento') || (aba === 'documentos' && editando && detalhe.data)) && <DocumentoForm key={`${detalhe.data?.id ?? 'novo'}:${detalhe.data?.revisao ?? 0}`} contexto={contexto} identidade={identidade} novoTermo={termoNovo} documento={editando ? detalhe.data : undefined} retificar={editando && !!detalhe.data && detalhe.data.estado !== 'EM_EDICAO'} modelos={modelos.data!} reunioes={reunioes.data!} documentos={documentos.data!} pessoas={pessoas.data!} cargos={cargos.data!} pronto={selecionar} />}
  </section>
}
function Paginacao({ pagina, set, proxima }: { pagina: number; set: (n: number) => void; proxima: boolean }) { return <div className="flex gap-2"><Button variant="outline" disabled={pagina === 0} onClick={() => set(pagina - 1)}>Anterior</Button><span className="self-center text-sm">Página {pagina + 1}</span><Button variant="outline" disabled={!proxima} onClick={() => set(pagina + 1)}>Próxima</Button></div> }
function DocumentoLeitura({ documento: d, versaoAberta }: { documento: DocumentoDetalhe; versaoAberta?: string }) {
  return <><h3 className="text-lg font-semibold">{numeroDocumento(d)} · {estadosDocumento[d.estado]}</h3>{d.versoes.map(v => <details key={v.id} open={versaoAberta ? v.id === versaoAberta : v.numero === d.versao_atual} className="space-y-3 rounded border p-3"><summary className="cursor-pointer font-semibold">Versão {v.numero}: {v.assunto}{v.congelado_em ? ' · Conteúdo congelado' : ''}</summary><p>Data: {v.data_documento.slice(0, 10)}{v.modelo && ` · Modelo v${v.modelo.numero} · ${v.modelo.finalidade}`}</p>{v.fonte_congelada && <p>{v.fonte_congelada.igreja?.nome} · {v.fonte_congelada.contexto.nome} · {v.fonte_congelada.numero}</p>}{v.fonte_congelada?.registro_livro && <p>Livro nº {v.fonte_congelada.registro_livro.numero_livro} · {v.fonte_congelada.registro_livro.serie_livro} · ordem {v.fonte_congelada.registro_livro.ordem} · posições {v.fonte_congelada.registro_livro.posicao_inicio} a {v.fonte_congelada.registro_livro.posicao_fim}</p>}<p className="whitespace-pre-wrap">{v.conteudo.teor}</p>{v.conteudo.estrutura && <LeituraEstrutura valor={v.conteudo.estrutura} campos={v.conteudo.campos} tipos={v.modelo?.configuracao.tipos_campos} />}{Object.entries(v.conteudo.campos).map(([k, val]) => <p key={k}>{k}: {val}</p>)}<LerResolucoes resolucoes={v.resolucoes ?? []} /><h4 className="font-semibold">Pessoas e responsabilidades</h4>{v.arrolados.map(p => <p key={p.pessoa_id}>{p.retrato.nome}{p.retrato.cargos?.length ? ` (${p.retrato.cargos.map(c => c.nome).join(', ')})` : p.retrato.cargo ? ` (${p.retrato.cargo.nome})` : ''} · {p.papeis.join(', ')}{p.responsavel ? ' · Responsável' : ''}{p.assina ? p.obrigatorio ? ' · Signatário obrigatório' : ' · Signatário' : ' · Sem assinatura'}</p>)}{v.anexos.map(f => <p key={f.arquivo_id}><a className="underline" href={secretariaApi.anexoUrl(d.id, v.id, f.arquivo_id)}>{f.nome}</a> · {f.arquivo.tamanho} bytes</p>)}<h4 className="font-semibold">Deliberações da ata</h4>{v.deliberacoes.length === 0 && <p>Nenhuma deliberação registrada.</p>}{v.deliberacoes.map((r, i) => <p key={i}>{r.data.slice(0, 10)} · {r.resultado} · {r.autoridade} · {r.evidencia}{r.revisao_conteudo !== v.revisao_conteudo ? ' · Refere-se a conteúdo anterior' : ''}</p>)}</details>)}</>
}
function ComandosDocumento({ documento: d, contexto: c, reunioes }: { documento: DocumentoDetalhe; contexto: ContextoSecretaria; reunioes: ReuniaoSecretaria[] }) {
  const acoes = [d.estado === 'EM_EDICAO' && c.pode_preparar && ['encaminhar', 'Encaminhar para aprovação'], d.estado === 'EM_EDICAO' && c.pode_aprovar && ['aprovar', 'Aprovar tecnicamente'], d.estado === 'EM_EDICAO' && d.tipo === 'ATA' && c.pode_deliberar && ['deliberar', 'Registrar deliberação da ata'], ['EM_EDICAO', 'APROVADO'].includes(d.estado) && c.pode_aprovar && ['cancelar', 'Cancelar documento'], d.estado === 'EXPEDIDO' && c.pode_aprovar && ['anular', 'Anular documento']].filter((v): v is string[] => !!v)
  const [acao, setAcao] = useState(''), [autoridade, setAutoridade] = useState(''), [evidencia, setEvidencia] = useState(''), [reuniao, setReuniao] = useState(''), [resultado, setResultado] = useState('APROVADA'), [data, setData] = useState(hoje())
  const [modalidade, setModalidade] = useState('')
  const escolherModalidade = acao === 'aprovar' && assinaturasHabilitadas()
  const enviar = useComando((dados: { revisao: number; autoridade: string; evidencia: string; reuniao_id?: string; resultado?: string; data?: string; modalidade?: string }) => secretariaApi.comando(d.id, acao, dados), undefined, `${d.id}:${acao}`)
  if (!acoes.length) return null
  return <form className="space-y-3 rounded border p-4" onSubmit={e => { e.preventDefault(); enviar.mutate({ revisao: d.revisao, autoridade, evidencia, ...(escolherModalidade ? { modalidade } : {}), ...(acao === 'deliberar' ? { reuniao_id: reuniao, resultado, data } : {}) }) }}><Escolha label="Ação documental" value={acao} onChange={setAcao}><option value="">Selecione uma ação</option>{acoes.map(([v, label]) => <option key={v} value={v}>{label}</option>)}</Escolha>{escolherModalidade && <Escolha label="Modalidade de assinatura" value={modalidade} onChange={setModalidade}><option value="">Selecione a modalidade</option><option value="ELETRONICA">Eletrônica por convite individual</option><option value="FISICA">Física com digitalização conferida</option></Escolha>}{acao === 'deliberar' && <><Escolha label="Reunião da deliberação" value={reuniao} onChange={s => { setReuniao(s); setData(reunioes.find(r => r.id === s)?.data.slice(0, 10) ?? hoje()) }}><option value="">Selecione a reunião</option>{reunioes.map(r => <option key={r.id} value={r.id}>{r.data.slice(0, 10)} · {r.modalidade}</option>)}</Escolha><Campo label="Data da deliberação" value={data} type="date" onChange={setData} /><Escolha label="Resultado deliberativo" value={resultado} onChange={setResultado}><option value="APROVADA">Aprovada</option><option value="REJEITADA">Rejeitada</option><option value="ADIADA">Adiada</option></Escolha><p>A reunião aprovadora pode ocorrer depois da reunião da ata. Ela não precisa ter ata expedida.</p></>}<Campo label="Autoridade da ação" value={autoridade} onChange={setAutoridade} /><Area label="Fundamento e evidência da ação" value={evidencia} onChange={setEvidencia} /><Salvar pending={enviar.isPending} disabled={!acao} error={enviar.error} success={enviar.isSuccess} label="Registrar ação" /></form>
}

function HistoricoDocumento({ id, identidade, revisao }: { id: string; identidade: string; revisao: number }) {
  const [pagina, setPagina] = useState(0)
  const q = useQuery({ queryKey: ['secretaria', identidade, 'historico', id, revisao, pagina], queryFn: () => secretariaApi.historico(id, pagina), gcTime: 0 })
  return <details className="space-y-2 rounded border p-3"><summary className="cursor-pointer font-semibold">Histórico de ações</summary>{q.isError && <p role="alert">Não foi possível consultar o histórico.</p>}{q.data?.map(a => <article className="border-b py-2" key={a.id}><p>{a.operacao.toLowerCase().replace(/_/g, ' ')} · {new Date(a.criado_em).toLocaleString('pt-BR')} · {a.operador}</p>{a.autoridade && <p>Autoridade: {a.autoridade}</p>}{a.evidencia && <p>Evidência: {a.evidencia}</p>}</article>)}<Paginacao pagina={pagina} set={setPagina} proxima={q.data?.length === 30} /></details>
}
