import './orgaos.css'
import { BlocoOrgao, TabelaOrgao } from './apresentacao'
import { usePermissions } from '../../hooks/use-permissions'
import { ModelosReuniao } from './ModelosReuniao'
import { Painel, SecaoPainel } from '../../components/shared/Painel'
import { CriarMinisterio, GestaoSociedadeMinisterio } from './SociedadesMinisterios'
import { ReferenciaAta } from '../../components/shared/ReferenciaAta'
import { ProvimentoCargo } from './ProvimentoCargo'
import { MandatosOrgao, OrientacaoVinculoParaRegistro } from './MandatosOrgao'
import { Badge } from '../../components/ui/badge'
import { Network, Landmark, UsersRound, Layers, CircleCheck, ArrowRight, BriefcaseBusiness, History, Settings } from 'lucide-react'
import { CabecalhoPainel, DataReferencia, WorkspaceHeader, Metric } from '../../components/shared/Workspace'
import { ManutencaoOrgao } from './ManutencaoOrgao'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { orgaosApi, type OrgaoResumo, type OcupacaoAtual, type VagaCargo } from '../../api/orgaos'
import { Button } from '../../components/ui/button'
import { Abas } from '../../components/ui/abas'
import { useAuthStore } from '../../stores/auth'
import { Perfil } from '../../types/enums'
import { InstituirOrgao } from './InstituirOrgao'
import { CompetenciaUnidades } from './CompetenciaUnidades'
import { ParticipacaoUnidade } from './ParticipacaoUnidade'
import { DesignacaoLideranca } from './DesignacaoLideranca'
import { GestaoAutoridades } from './GestaoAutoridades'
import { GestaoCargos } from './GestaoCargos'
import { PoliticaUnidade } from './PoliticaUnidade'
import { EleicaoCargo } from './EleicaoCargo'
import { EncerrarAto } from './EncerrarAto'
import { HistoricoAtos } from './HistoricoAtos'
import { PreviaImpactosMembresia } from './PreviaImpactosMembresia'
import { ConfiguracaoFuso } from './ConfiguracaoFuso'
import { ConfiguracaoInstitucional } from './ConfiguracaoInstitucional'
import { RelogioIgreja } from './RelogioIgreja'

const tipos: Record<OrgaoResumo['tipo'], string> = { ASSEMBLEIA_GERAL: 'Assembleia Geral', SOCIEDADE_INTERNA: 'Sociedade interna', CONSELHO: 'Conselho', JUNTA: 'Junta', UNIDADE_MINISTERIAL: 'Unidade ministerial' }
const constituicoes: Record<OrgaoResumo['constituicao'], string> = { OFICIAL: 'Órgão oficial', ELEICAO: 'Por eleição', DESIGNACAO: 'Por designação' }
const oficios: Record<string, string> = { DIACONO: 'Diácono', PRESBITERO_REGENTE: 'Presbítero regente', PRESBITERO_DOCENTE: 'Presbítero docente' }
function exibirData(v: string) { return v.slice(0, 10).split('-').reverse().join('/') }
function avisoMembresia(s: 'ELEGIVEL' | 'NAO_ELEGIVEL' | 'INDETERMINADA' | null) {
  if (s === 'NAO_ELEGIVEL') return ' · rol não elegível na data; requer conferência'
  if (s === 'INDETERMINADA') return ' · rol indeterminado na data; requer conferência'
  return ''
}

export function OrgaosPage() {
  const gestaoHabilitada = import.meta.env.VITE_FEATURE_ORGAOS_GESTAO === 'true'
  const identidade = useAuthStore(s => `${s.user?.igreja_id ?? ''}:${s.user?.sub ?? ''}`)
  const permissaoOrgaos = usePermissions('orgaos')
  const permissaoUnidades = usePermissions('unidades')
  const perfil = useAuthStore(s => s.user?.perfil)
  const [area, setArea] = useState('estrutura')
  const [dataSelecionada, setData] = useState<string | null>(null)
  const [secao, setSecao] = useState<string | null>(null)
  const [inativos, setInativos] = useState(false)
  const [filtro, filtrar] = useState('')
  const [cursor, setCursor] = useState<string | undefined>()
  const [anteriores, setAnteriores] = useState<(string | undefined)[]>([])
  const [selecionado, selecionar] = useState<string | null>(() => new URLSearchParams(window.location.search).get('orgao'))
  function setSelecionado(id: string | null) {
    setSecao(null)
    selecionar(id)
    if (window.location.pathname !== '/orgaos') return
    const url = new URL(window.location.href)
    if (id) url.searchParams.set('orgao', id)
    else url.searchParams.delete('orgao')
    window.history.replaceState(window.history.state, '', url)
  }
  const [incluirAnteriores, setIncluirAnteriores] = useState(false)
  const [paginasInativos, setPaginasInativos] = useState<string[]>([])
  const cursorInativo = paginasInativos[paginasInativos.length - 1]
  const [cursorOcupacao, setCursorOcupacao] = useState<string | undefined>()
  const [cursorParticipacao, setCursorParticipacao] = useState<string | undefined>()
  const [anterioresOcupacao, setAnterioresOcupacao] = useState<(string | undefined)[]>([])
  const [anterioresParticipacao, setAnterioresParticipacao] = useState<(string | undefined)[]>([])
  const [provimento, definirProvimento] = useState<{ cargo: VagaCargo; titular?: OcupacaoAtual; encerrar: boolean } | null>(null)
  const [encerrando, setEncerrando] = useState<{ tipo: 'oficial' | 'unidade' | 'desativar'; ocupacao?: { id: string; nome: string } } | null>(null)
  const relogio = useQuery({ queryKey: ['orgaos', identidade, 'relogio'], queryFn: orgaosApi.relogio, staleTime: 0, gcTime: 0, refetchInterval: 60000 })
  const data = dataSelecionada ?? relogio.data?.data_operacional ?? ''
  const lista = useQuery({ queryKey: ['orgaos', identidade, cursor, data], queryFn: () => orgaosApi.listar(cursor, data), enabled: !!data, staleTime: 0, gcTime: 0 })
  const detalhe = useQuery({ queryKey: ['orgaos', identidade, 'detalhe', selecionado, data, cursorOcupacao, cursorParticipacao, incluirAnteriores, cursorInativo], queryFn: () => orgaosApi.detalhe(selecionado!, data, { ocupacao: cursorOcupacao, participacao: cursorParticipacao, ...(incluirAnteriores && { inativos: true, cursorInativo }) }), enabled: !!selecionado && !!data, staleTime: 0, gcTime: 0 })
  const ficha = detalhe.data
  const oficial = ficha?.orgao.tipo === 'CONSELHO' || ficha?.orgao.tipo === 'JUNTA'
  const unidade = ficha?.orgao.tipo === 'UNIDADE_MINISTERIAL'
  const sociedade = ficha?.orgao.tipo === 'SOCIEDADE_INTERNA' || ficha?.orgao.gestao_presidencial
  const podeManter = gestaoHabilitada && ficha?.orgao.ativo && !!perfil &&
    ((oficial && permissaoOrgaos.canEdit) ||
      (unidade && !sociedade && permissaoUnidades.canEdit))
  const podeAtribuir = gestaoHabilitada && ficha?.pode_registrar_cargos
  const preparoRegistro = gestaoHabilitada && ficha?.contexto_id && data === relogio.data?.data_operacional
    ? ficha.preparo_registro_cargos : null
  const secoes = [
    { titulo: 'Composição e mandatos', icon: UsersRound, visivel: oficial || ficha?.composicao },
    { titulo: 'Cargos e titulares', icon: BriefcaseBusiness, visivel: ficha?.consulta_nominal !== false && (oficial || unidade || sociedade || ficha?.cargos_na_data?.length) },
    { titulo: 'Participação', icon: UsersRound, visivel: ficha?.consulta_nominal !== false && (unidade || sociedade) },
    { titulo: 'Histórico', icon: History, visivel: ficha?.consulta_nominal !== false },
    { titulo: 'Configuração e cadastro', icon: Settings, visivel: !!ficha?.contexto_modelos_reuniao_id || ficha?.versao || ficha?.pode_configurar || podeManter || (sociedade && lista.data?.pode_gerir_sociedades) },
  ]
  function limparHistoricos() { definirProvimento(null); setIncluirAnteriores(false); setPaginasInativos([]); setCursorOcupacao(undefined); setCursorParticipacao(undefined); setAnterioresOcupacao([]); setAnterioresParticipacao([]); setEncerrando(null) }
  function proxima() { if (!lista.data?.proximo_cursor) return; setAnteriores(a => [...a, cursor]); setCursor(lista.data.proximo_cursor); setSelecionado(null); limparHistoricos() }
  function anterior() { const itens = [...anteriores]; setCursor(itens.pop()); setAnteriores(itens); setSelecionado(null); limparHistoricos() }
  if (relogio.isPending) return <main className="p-6">Consultando a data da igreja...</main>
  if (relogio.isError || !relogio.data) return <main className="p-6"><p role="alert">Não foi possível conferir a data usada nos atos.</p></main>
  if (!relogio.data.data_operacional) return <main className="space-y-4 p-6"><p role="alert">O fuso cadastrado é inválido; corrija-o antes de registrar atos.</p>{gestaoHabilitada && perfil === Perfil.ADMINISTRADOR && <ConfiguracaoFuso identidade={identidade} />}</main>
  const estrutura = <div className="space-y-4">
    {!selecionado && <section aria-label="Filtros de órgãos" className="surface flex flex-wrap items-end gap-4">
      <label className="block w-full max-w-sm text-sm font-medium">Filtrar por tipo<select className="mt-1 block w-full rounded-lg border bg-background p-2" value={filtro} onChange={e => filtrar(e.target.value)}><option value="">Todos os tipos</option>{Object.entries(tipos).map(([v,n]) => <option key={v} value={v}>{n}</option>)}</select></label>
      <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" checked={inativos} onChange={e => setInativos(e.target.checked)} />Incluir sociedades inativas</label>
    </section>}
    <section className="surface"><Painel className="space-y-4">
      <CabecalhoPainel icone={Landmark} titulo="Órgãos cadastrados" />
      {lista.isPending && <p>Carregando órgãos...</p>}
      {lista.isError && <p role="alert">Não foi possível consultar os órgãos.</p>}
      {lista.data?.itens.length === 0 && <p>Nenhum órgão cadastrado.</p>}
      {(['Órgãos oficiais', 'Sociedades internas', 'Ministérios'] as const).map(grupo => {
        const itens = lista.data?.itens.filter(o => (!filtro || o.tipo === filtro) && (inativos || o.tipo !== 'SOCIEDADE_INTERNA' || o.ativo) &&
          (o.tipo === 'SOCIEDADE_INTERNA' ? 'Sociedades internas' : o.tipo === 'UNIDADE_MINISTERIAL' ? 'Ministérios' : 'Órgãos oficiais') === grupo)
        return itens?.length ? <section key={grupo}><h3 className="mb-2 font-medium">{grupo}</h3><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{itens.map(o => <article key={o.id} className="flex min-w-0 flex-col items-start gap-3 rounded-panel border p-4"><div className="flex w-full items-center justify-between"><span className="rounded-lg bg-purple-muted/60 p-2 text-purple">{o.tipo === 'UNIDADE_MINISTERIAL' ? <Layers size={20} /> : <Landmark size={20} />}</span><Badge variant={o.ativo ? 'success' : 'outline'}>{o.ativo ? 'Cadastro ativo' : 'Cadastro inativo'}</Badge></div><div className="flex-1"><p className="font-semibold">{o.nome}{o.sigla ? ` (${o.sigla})` : ''}</p><p className="text-sm text-muted-foreground">{tipos[o.tipo]} · {constituicoes[o.constituicao]}</p>{o.integrantes !== undefined && <p className="text-sm">{o.integrantes} {o.integrantes === 1 ? 'integrante' : 'integrantes'} · {o.vagas} {o.vagas === 1 ? 'cargo vago' : 'cargos vagos'}</p>}</div><Button type="button" variant="outline" onClick={() => { setSelecionado(o.id); limparHistoricos() }}>Consultar<ArrowRight /></Button></article>)}</div></section> : null
      })}
      {lista.data?.pode_gerir_sociedades && !inativos && lista.data.itens.some(o => o.tipo === 'SOCIEDADE_INTERNA' && !o.ativo) &&
        <Button variant="outline" onClick={() => { filtrar('SOCIEDADE_INTERNA'); setInativos(true) }}>Ver sociedades para ativar</Button>}
      {filtro && lista.data && !lista.data.itens.some(o => o.tipo === filtro) && <p>Nenhum órgão deste tipo nesta página.</p>}
      {(anteriores.length > 0 || lista.data?.proximo_cursor) && <div className="flex gap-2"><Button type="button" variant="outline" disabled={!anteriores.length} onClick={anterior}>Anterior</Button><Button type="button" variant="outline" disabled={!lista.data?.proximo_cursor} onClick={proxima}>Próxima</Button></div>}
    {selecionado && <SecaoPainel titulo={ficha?.orgao.nome ?? 'Ficha do órgão'} rotuloVoltar="Todos os órgãos" voltar={() => { setSelecionado(null); limparHistoricos() }}>
      {!data ? <p>Informe a data de referência.</p> : detalhe.isPending ? <p>Carregando detalhes...</p> : detalhe.isError ? <p role="alert">Não foi possível consultar os detalhes.</p> : ficha && <>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-sm text-muted-foreground">{tipos[ficha.orgao.tipo]} · {ficha.orgao.finalidade}</p></div>
          <Badge variant={ficha.orgao.ativo ? 'success' : 'outline'}>{ficha.orgao.ativo ? 'Cadastro ativo' : 'Cadastro inativo'}</Badge>
        </div>
        <nav aria-label="Seções da ficha" className="org-nav">
          <Button variant={!secao ? 'default' : 'ghost'} aria-current={!secao ? 'page' : undefined} onClick={() => { setSecao(null); definirProvimento(null); setEncerrando(null) }}>Visão geral</Button>
          {secoes.filter(item => item.visivel).map(({ titulo, icon: Icon }) => <Button key={titulo} type="button" variant={secao === titulo ? 'default' : 'ghost'}
            aria-current={secao === titulo ? 'page' : undefined} className={titulo === 'Configuração e cadastro' ? 'sm:ml-auto' : ''} onClick={() => { setSecao(titulo); definirProvimento(null); setEncerrando(null) }}>
            <Icon />{titulo}
          </Button>)}
        </nav>
        {!secao && <div className="grid gap-4 lg:grid-cols-2">
          <BlocoOrgao titulo="Sobre o órgão" descricao="Identificação e situação na data de referência.">
            <dl className="org-dados"><div><dt>Finalidade</dt><dd>{ficha.orgao.finalidade || 'Não informada'}</dd></div><div><dt>Fundação</dt><dd>{ficha.orgao.data_criacao ? exibirData(ficha.orgao.data_criacao) : 'Não informada'}</dd></div><div><dt>Situação na data</dt><dd>{ficha.vigente_na_data ? 'Vigente' : 'Não vigente ou histórico incompleto'}</dd></div></dl>
            {ficha.consulta_nominal === false && <p className="text-sm text-muted-foreground">A consulta nominal é reservada a quem atua nesta sociedade.</p>}
          </BlocoOrgao>
          <BlocoOrgao titulo="Consulta e acompanhamento" descricao="Acesse a composição, os cargos e os documentos deste órgão.">
            <div className="grid grid-cols-2 gap-3">
              {ficha.composicao && <div className="rounded-xl bg-background p-4"><strong className="text-2xl">{ficha.composicao.membros.length}</strong><p className="text-sm text-muted-foreground">Integrantes em exercício</p></div>}
              {ficha.cargos_na_data && <div className="rounded-xl bg-background p-4"><strong className="text-2xl">{ficha.cargos_na_data.filter(c => !c.titulares.length).length}</strong><p className="text-sm text-muted-foreground">Cargos vagos</p></div>}
            </div>
            {ficha.contexto_id && <Button asChild variant="outline"><a href={`/secretaria?contexto=${ficha.contexto_id}${ficha.orgao.tipo === 'ASSEMBLEIA_GERAL' ? '&aba=reunioes' : ''}`}>{ficha.orgao.tipo === 'ASSEMBLEIA_GERAL' ? 'Abrir reuniões da Assembleia' : 'Abrir contexto documental'}<ArrowRight /></a></Button>}
          </BlocoOrgao>
        </div>}
        {secoes.some(s => s.titulo === secao && s.visivel) && <Painel key={secao} className="space-y-5">
          <h3 className="sr-only">{secao} · {ficha.orgao.nome}</h3>
          {secao === 'Composição e mandatos' && <>
            {ficha.composicao && <BlocoOrgao titulo={`Composição em ${exibirData(ficha.data_referencia)}`} descricao="Integrantes em exercício na data consultada.">
              {!ficha.composicao.membros.length && <p>Nenhum oficial em exercício apurado.</p>}
              {!!ficha.composicao.membros.length && <TabelaOrgao rotulo="Composição do órgão" colunas={['Integrante', 'Ofício', 'Conferência']}>
                {ficha.composicao.membros.map(m => <tr key={m.pessoa_id}><td data-label="Integrante" className="font-medium">{m.nome}</td><td data-label="Ofício">{m.oficios.map(o => oficios[o] ?? o).join(', ')}</td><td data-label="Conferência">{m.revisao_pendente ? <Badge variant="outline">revisão institucional pendente</Badge> : '—'}</td></tr>)}
              </TabelaOrgao>}
              <label className="flex items-center gap-2"><input type="checkbox" checked={incluirAnteriores} onChange={e => { setIncluirAnteriores(e.target.checked); setPaginasInativos([]) }} />Incluir integrantes fora de exercício</label>
              {incluirAnteriores && <div>{ficha.fora_da_composicao?.map(p => <p key={p.id}>{p.nome_completo} · fora da composição na data</p>)}
                {!!paginasInativos.length && <Button variant="outline" onClick={() => setPaginasInativos(p => p.slice(0,-1))}>Voltar nos integrantes</Button>}
                {ficha.proximo_cursor_inativo && <Button variant="outline" onClick={() => setPaginasInativos(p => [...p, ficha.proximo_cursor_inativo!])}>Mais integrantes</Button>}</div>}
              {ficha.composicao.indeterminados.map(p => <p key={p.pessoa_id}>{p.nome} — situação indeterminada</p>)}
            </BlocoOrgao>}
            {oficial && <MandatosOrgao key={selecionado} orgao={selecionado} identidade={identidade} data={data}
              cargos={ficha.cargos_na_data} podeAtribuir={podeAtribuir} preparoRegistro={preparoRegistro}
              orgaoOficialAtivo={ficha.orgao.ativo && ficha.orgao.tipo_padrao === ficha.orgao.tipo}
              conselho={ficha.orgao.tipo === 'CONSELHO'} />}
          </>}
          {secao === 'Cargos e titulares' && <>
            {sociedade && ficha.consulta_nominal !== false &&
              <GestaoSociedadeMinisterio area="cargos" key={ficha.orgao.id} ficha={ficha} identidade={identidade} />}
            {!!ficha.cargos_na_data?.length && <section className="space-y-3"><h3 className="font-semibold">Cargos em {exibirData(data)}</h3>
              {preparoRegistro && <OrientacaoVinculoParaRegistro />}
              {gestaoHabilitada && oficial && ficha.contexto_id && !ficha.pode_registrar_cargos && perfil !== Perfil.AUDITOR && perfil !== Perfil.ADMINISTRADOR &&
                <p className="text-sm text-muted-foreground">O registro de titulares exige uma conta vinculada a uma pessoa e autorizada para registrar cargos.</p>}
              <TabelaOrgao rotulo="Cargos e titulares" colunas={['Cargo', 'Titular', 'Período e documentação', 'Gestão']}>
              {ficha.cargos_na_data.map(c => <tr key={c.id}>
                <td data-label="Cargo" className="font-semibold">{c.nome}</td>
                <td data-label="Titular">{c.titulares.map(p => p.nome_completo).join(', ') || <Badge variant="outline">Vago</Badge>}</td>
                <td data-label="Período e documentação">{c.ocupacoes?.length ? c.ocupacoes.map(o => <div className="space-y-1" key={o.id}>
                  <p>Início: {exibirData(o.inicio)}</p><p className="text-muted-foreground">{o.fim ? `Encerramento: ${exibirData(o.fim)}` : o.termino_previsto ? `Até ${exibirData(o.termino_previsto)} (previsto)` : 'Sem término informado'}</p>
                  {o.ato_id && ficha.contexto_id && <ReferenciaAta identidade={identidade} label="Ata da posse" alvo={{ grupo: 'ORGAO', alvo_id: o.ato_id, etapa: 'POSSE' }} />}
                </div>) : '—'}</td>
                <td data-label="Gestão">{podeAtribuir ? <div className="flex flex-col items-start gap-2">
                  <Button size="sm" variant="outline" onClick={() => definirProvimento({ cargo: c, titular: c.ocupacoes?.[0], encerrar: false })}>{c.titulares.length ? 'Programar sucessão' : 'Atribuir cargo'}</Button>
                  {c.ocupacoes?.[0] && !c.ocupacoes[0].fim && <Button size="sm" variant="ghost" onClick={() => definirProvimento({ cargo: c, titular: c.ocupacoes![0], encerrar: true })}>Registrar encerramento</Button>}
                </div> : '—'}</td>
              </tr>)}</TabelaOrgao>
              {podeAtribuir && provimento && <ProvimentoCargo key={provimento.cargo.id + ':' + provimento.encerrar} orgao={selecionado} identidade={identidade}
                  {...provimento} aoFechar={() => definirProvimento(null)} />}
            </section>}
            {podeManter && unidade && ficha.orgao.constituicao === 'DESIGNACAO' && <DesignacaoLideranca key={`DesignacaoLideranca:${ficha.orgao.id}`} orgaoId={ficha.orgao.id} identidade={identidade} cargos={ficha.cargos_configurados} />}
            {podeManter && ficha.orgao.constituicao !== 'DESIGNACAO' && (!ficha.versao || !ficha.contexto_id || ficha.orgao.tipo === 'UNIDADE_MINISTERIAL') && <EleicaoCargo key={`EleicaoCargo:${ficha.orgao.id}`} orgaoId={ficha.orgao.id} identidade={identidade} tipo={ficha.orgao.tipo === 'UNIDADE_MINISTERIAL' ? 'unidade' : 'oficial'} cargos={ficha.cargos_configurados} politicas={ficha.politicas} />}
            {!ficha.cargos_na_data?.length && <p>Nenhum cargo disponível na data consultada.</p>}
          </>}
          {secao === 'Participação' && <>
            {sociedade && ficha.consulta_nominal !== false &&
              <GestaoSociedadeMinisterio area="participacao" key={ficha.orgao.id} ficha={ficha} identidade={identidade} />}
            {ficha.orgao.tipo === 'UNIDADE_MINISTERIAL' && !ficha.orgao.gestao_presidencial && <div className="space-y-2"><h3 className="font-semibold">Histórico de participação</h3><p className="text-sm text-muted-foreground">A conferência do rol considera o fim da data consultada e não comprova exercício ou competência.</p>
              {!ficha.participacoes.length && <p>Nenhuma participação registrada.</p>}
              {ficha.participacoes.map(p => <p key={p.id}>{p.pessoa.nome_completo} — início em {exibirData(p.inicio)}{p.inicio_ordem ? `, sequência ${p.inicio_ordem}` : ''}{p.fim ? `; término em ${exibirData(p.fim)}${p.fim_ordem ? `, sequência ${p.fim_ordem}` : ''}` : ''}.{avisoMembresia(p.situacao_membresia)}</p>)}
              {gestaoHabilitada && permissaoUnidades.canEdit && ficha.orgao.ativo && <ParticipacaoUnidade key={`ParticipacaoUnidade:${ficha.orgao.id}`} orgaoId={ficha.orgao.id} identidade={identidade} />}
            </div>}
            {(ficha.orgao.tipo === 'UNIDADE_MINISTERIAL' || ficha.orgao.tipo === 'SOCIEDADE_INTERNA') &&
              (anterioresParticipacao.length > 0 || ficha.proximo_cursor_participacao) &&
              <div className="flex gap-2"><Button type="button" variant="outline" disabled={!anterioresParticipacao.length} onClick={() => { const itens = [...anterioresParticipacao]; setCursorParticipacao(itens.pop()); setAnterioresParticipacao(itens) }}>Participações anteriores</Button><Button type="button" variant="outline" disabled={!ficha.proximo_cursor_participacao} onClick={() => { const proximo = ficha?.proximo_cursor_participacao; if (proximo) { setAnterioresParticipacao(a => [...a, cursorParticipacao]); setCursorParticipacao(proximo) } }}>Mais participações</Button></div>}
          </>}
          {secao === 'Histórico' && <>
            <BlocoOrgao titulo="Histórico de ocupações" descricao="Períodos registrados para cada cargo e titular."><details className="text-sm text-muted-foreground"><summary>Como interpretar este histórico</summary><p className="mt-2">Os registros de cargo não comprovam, por si só, exercício atual ou competência para um ato. A sequência ordena os atos registrados no mesmo dia.</p></details>
              {!ficha.ocupacoes.length && <p>Nenhuma ocupação registrada.</p>}
              {!!ficha.ocupacoes.length && <TabelaOrgao rotulo="Histórico de ocupações" colunas={['Cargo e titular', 'Início', 'Término', 'Ações']}>
              {ficha.ocupacoes.map(o => <tr key={o.id}>
                <td data-label="Cargo e titular"><strong>{o.cargo.nome}: {o.pessoa.nome_completo}</strong>{avisoMembresia(o.situacao_membresia) && <p className="mt-1 text-xs text-muted-foreground">{avisoMembresia(o.situacao_membresia)}</p>}</td>
                <td data-label="Início">{exibirData(o.inicio)}{o.inicio_ordem > 1 && <p className="text-xs text-muted-foreground">sequência {o.inicio_ordem}</p>}</td>
                <td data-label="Término">{o.fim ? <><p>{exibirData(o.fim)} (efetivo)</p>{o.fim_ordem && o.fim_ordem > 1 ? <p className="text-xs">sequência {o.fim_ordem}</p> : null}</> : o.termino_previsto ? `${exibirData(o.termino_previsto)} (previsto)` : 'Sem término informado'}</td>
                <td data-label="Ações">
                {oficial && podeAtribuir && !o.fim && <Button aria-label={`Registrar encerramento de ${o.pessoa.nome_completo}`} variant="outline" onClick={() => definirProvimento({
                  cargo: { id: o.cargo_id, nome: o.cargo.nome, titulares: [o.pessoa] }, titular: o, encerrar: true,
                })}>Registrar encerramento</Button>}
                {podeAtribuir && provimento?.encerrar && provimento.titular?.id === o.id &&
                  <ProvimentoCargo key={o.id} orgao={selecionado} identidade={identidade} {...provimento} aoFechar={() => definirProvimento(null)} />}
                {gestaoHabilitada && !o.fim && o.termino_previsto && ficha.orgao.ativo && perfil && ((['CONSELHO', 'JUNTA'].includes(ficha.orgao.tipo) && (!ficha.versao || !ficha.contexto_id) && permissaoOrgaos.canEdit) || (ficha.orgao.tipo === 'UNIDADE_MINISTERIAL' && !ficha.orgao.gestao_presidencial && ficha.orgao.constituicao === 'ELEICAO' && permissaoUnidades.canEdit)) && <Button type="button" variant="outline" onClick={() => setEncerrando({ tipo: ficha.orgao.tipo === 'UNIDADE_MINISTERIAL' ? 'unidade' : 'oficial', ocupacao: { id: o.id, nome: `${o.cargo.nome} — ${o.pessoa.nome_completo}` } })}>Encerrar ocupação de {o.pessoa.nome_completo}</Button>}</td></tr>)}</TabelaOrgao>}
              {(anterioresOcupacao.length > 0 || ficha.proximo_cursor_ocupacao) && <div className="flex gap-2"><Button type="button" variant="outline" disabled={!anterioresOcupacao.length} onClick={() => { const itens = [...anterioresOcupacao]; setCursorOcupacao(itens.pop()); setAnterioresOcupacao(itens) }}>Ocupações anteriores</Button><Button type="button" variant="outline" disabled={!ficha.proximo_cursor_ocupacao} onClick={() => { const proximo = ficha?.proximo_cursor_ocupacao; if (proximo) { setAnterioresOcupacao(a => [...a, cursorOcupacao]); setCursorOcupacao(proximo) } }}>Mais ocupações</Button></div>}
              {ficha.cargos_limitados && <p>A lista mostra os 100 primeiros cargos ativos.</p>}
            </BlocoOrgao>
            {ficha.consulta_nominal !== false && <HistoricoAtos key={`atos:${ficha.orgao.id}`} orgaoId={ficha.orgao.id} identidade={identidade} />}
          </>}
          {secao === 'Configuração e cadastro' && <div className="grid items-start gap-4 xl:grid-cols-2">
            {ficha.contexto_modelos_reuniao_id && <BlocoOrgao titulo="Reuniões" descricao="Modelos, periodicidade e critérios de quórum." className="xl:col-span-2"><ModelosReuniao key={ficha.contexto_modelos_reuniao_id} contexto={ficha.contexto_modelos_reuniao_id} orgao={ficha.orgao.id} identidade={identidade} editar={perfil===Perfil.ADMINISTRADOR}/></BlocoOrgao>}
            {(ficha.versao || ficha.pode_configurar || podeManter) && <BlocoOrgao titulo="Estrutura e regras" descricao="Configuração institucional, cargos e acumulação de funções.">
              {ficha.versao && <p className="rounded-lg bg-background p-3 text-sm">Configuração {ficha.versao.numero} · {ficha.versao.fonte}</p>}
              <div className="space-y-3">{ficha.pode_configurar && <ConfiguracaoInstitucional key={selecionado} orgao={selecionado} identidade={identidade} />}
              {podeManter && <GestaoCargos key={`GestaoCargos:${ficha.orgao.id}`} orgaoId={ficha.orgao.id} identidade={identidade} cargos={ficha.cargos_configurados} />}
              {podeManter && ficha.orgao.constituicao === 'ELEICAO' && <PoliticaUnidade key={`PoliticaUnidade:${ficha.orgao.id}`} orgaoId={ficha.orgao.id} identidade={identidade} politicas={ficha.politicas} limitadas={ficha.politicas_limitadas} />}</div>
            </BlocoOrgao>}
            {(podeManter || (sociedade && ficha.consulta_nominal !== false)) && <BlocoOrgao titulo="Cadastro e administração" descricao="Dados do órgão e registros administrativos excepcionais.">
              {sociedade && ficha.consulta_nominal !== false && <GestaoSociedadeMinisterio area="cadastro" key={ficha.orgao.id} ficha={ficha} identidade={identidade} />}
              {podeManter && <ManutencaoOrgao key={`manutencao:${ficha.orgao.id}`} orgao={ficha.orgao} identidade={identidade} />}
              {podeManter && <div className="mt-4 border-t pt-4"><p className="mb-3 text-sm text-muted-foreground">Encerramento das atividades do órgão.</p><Button type="button" variant="outline" className="text-destructive" onClick={() => setEncerrando({ tipo: 'desativar' })}>Desativar órgão</Button></div>}
            </BlocoOrgao>}
          </div>}
          {encerrando && podeManter && <EncerrarAto key={`${ficha.orgao.id}:${encerrando.tipo}:${encerrando.ocupacao?.id ?? ''}`} orgaoId={ficha.orgao.id} identidade={identidade} tipo={encerrando.tipo} ocupacao={encerrando.ocupacao} aoFechar={() => setEncerrando(null)} />}
        </Painel>}
      </>}
    </SecaoPainel>}
    </Painel></section>
    {gestaoHabilitada && lista.data?.pode_gerir_sociedades && <CriarMinisterio identidade={identidade} aoCriar={id => {
      setData(null); setSelecionado(id); limparHistoricos()
    }} />}
  </div>
  const administracao = gestaoHabilitada && (permissaoOrgaos.canEdit || permissaoUnidades.canEdit)
    ? <section className="surface"><Painel><CabecalhoPainel icone={Settings} titulo="Administração institucional" />
      <div className="flex flex-wrap items-start gap-2">
        <InstituirOrgao identidade={identidade} />
        {perfil === Perfil.ADMINISTRADOR && <>
          <CompetenciaUnidades identidade={identidade} />
          <GestaoAutoridades identidade={identidade} />
          <ConfiguracaoFuso identidade={identidade} />
        </>}
        <PreviaImpactosMembresia identidade={identidade} />
      </div>
    </Painel></section> : null
  const aba = area === 'administracao' && administracao ? 'administracao' : 'estrutura'
  return <RelogioIgreja dia={relogio.data.data_operacional}><div className="workspace org-workspace">
    <WorkspaceHeader icon={Network} title="Estrutura da igreja" description="Estrutura institucional, composição e histórico de ocupações." />
    {!selecionado && <div className="metric-grid">
      <Metric icon={Landmark} label="Órgãos Oficiais" value={lista.data?.resumo?.oficiais ?? '—'} />
      <Metric icon={UsersRound} label="Sociedades Internas" value={lista.data?.resumo?.sociedades ?? '—'} />
      <Metric icon={Layers} label="Un. Ministeriais" value={lista.data?.resumo?.unidades ?? '—'} />
      <Metric icon={CircleCheck} label="Mandatos Vigentes" value={lista.data?.resumo?.mandatos_vigentes ?? '—'} />
    </div>}
    <Abas titulo="Seções da estrutura da igreja" ativa={aba} selecionar={setArea} ocultarSeUnica
      controle={aba === 'estrutura' && <DataReferencia id="data-orgaos" data={data} mudar={valor => { setData(valor); limparHistoricos() }} />}
      abas={[
        { id: 'estrutura', nome: 'Órgãos cadastrados', icone: Network, conteudo: estrutura },
        ...(administracao ? [{ id: 'administracao', nome: 'Administração institucional', icone: Settings, conteudo: administracao }] : []),
      ]} />
  </div></RelogioIgreja>
}
