import { Painel, SecaoPainel } from '../../components/shared/Painel'
import { CriarMinisterio, GestaoSociedadeMinisterio } from './SociedadesMinisterios'
import { ReferenciaAta } from '../../components/shared/ReferenciaAta'
import { ProvimentoCargo } from './ProvimentoCargo'
import { MandatosOrgao, OrientacaoRegistroCargos } from './MandatosOrgao'
import { Badge } from '../../components/ui/badge'
import { Network, Landmark, UsersRound, Layers, CircleCheck, ArrowRight, BriefcaseBusiness, History, Settings } from 'lucide-react'
import { WorkspaceHeader, Metric } from '../../components/shared/Workspace'
import { ManutencaoOrgao } from './ManutencaoOrgao'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { orgaosApi, type OrgaoResumo, type OcupacaoAtual, type VagaCargo } from '../../api/orgaos'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
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
  const perfil = useAuthStore(s => s.user?.perfil)
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
    ((oficial && [Perfil.ADMINISTRADOR, Perfil.GESTOR, Perfil.SECRETARIO].includes(perfil)) ||
      (unidade && !sociedade && perfil === Perfil.GESTOR))
  const podeAtribuir = gestaoHabilitada && ficha?.pode_registrar_cargos
  const preparoRegistro = gestaoHabilitada && ficha?.contexto_id && data === relogio.data?.data_operacional
    ? ficha.preparo_registro_cargos : null
  const secoes = [
    { titulo: 'Composição e mandatos', icon: UsersRound, visivel: oficial || ficha?.composicao },
    { titulo: 'Cargos e titulares', icon: BriefcaseBusiness, visivel: ficha?.consulta_nominal !== false && (oficial || unidade || sociedade || ficha?.cargos_na_data?.length) },
    { titulo: 'Participação', icon: UsersRound, visivel: ficha?.consulta_nominal !== false && (unidade || sociedade) },
    { titulo: 'Histórico', icon: History, visivel: ficha?.consulta_nominal !== false },
    { titulo: 'Configuração e cadastro', icon: Settings, visivel: ficha?.versao || ficha?.pode_configurar || podeManter || (sociedade && lista.data?.pode_gerir_sociedades) },
  ]
  function limparHistoricos() { definirProvimento(null); setIncluirAnteriores(false); setPaginasInativos([]); setCursorOcupacao(undefined); setCursorParticipacao(undefined); setAnterioresOcupacao([]); setAnterioresParticipacao([]); setEncerrando(null) }
  function proxima() { if (!lista.data?.proximo_cursor) return; setAnteriores(a => [...a, cursor]); setCursor(lista.data.proximo_cursor); setSelecionado(null); limparHistoricos() }
  function anterior() { const itens = [...anteriores]; setCursor(itens.pop()); setAnteriores(itens); setSelecionado(null); limparHistoricos() }
  if (relogio.isPending) return <main className="p-6">Consultando a data da igreja...</main>
  if (relogio.isError || !relogio.data) return <main className="p-6"><p role="alert">Não foi possível conferir a data usada nos atos.</p></main>
  if (!relogio.data.data_operacional) return <main className="space-y-4 p-6"><p role="alert">O fuso cadastrado é inválido; corrija-o antes de registrar atos.</p>{gestaoHabilitada && perfil === Perfil.ADMINISTRADOR && <ConfiguracaoFuso identidade={identidade} />}</main>
  return <RelogioIgreja dia={relogio.data.data_operacional}><div className="workspace">
    <WorkspaceHeader icon={Network} title="Estrutura da igreja" description="Estrutura institucional, composição e histórico de ocupações." />
    <div className="metric-grid">{([{icon:Landmark,label:'Conselhos',tipo:'CONSELHO'},{icon:UsersRound,label:'Juntas',tipo:'JUNTA'},{icon:Layers,label:'Unidades',tipo:'UNIDADE_MINISTERIAL'},{icon:CircleCheck,label:'Cadastros ativos',tipo:'ativos'}]).map(m => <Metric key={m.tipo} icon={m.icon} label={m.label + (cursor || lista.data?.proximo_cursor ? ' nesta página' : '')} value={lista.data?.itens.filter(o => m.tipo === 'ativos' ? o.ativo : o.tipo === m.tipo).length ?? '—'} />)}</div>
    <p className="text-sm text-muted-foreground">Data adotada para atos: {exibirData(relogio.data.data_operacional)} ({relogio.data.fuso_iana ?? 'UTC, sem fuso cadastrado'}).</p>
    <div className="max-w-xs space-y-2"><Label htmlFor="data-orgaos">Data de referência</Label><Input id="data-orgaos" type="date" value={data} onChange={e => { setData(e.target.value); limparHistoricos() }} /></div>
    <section className="surface"><Painel className="space-y-4"><h2 className="text-lg font-semibold">Órgãos cadastrados</h2>
      {lista.isPending && <p>Carregando órgãos...</p>}
      {lista.isError && <p role="alert">Não foi possível consultar os órgãos.</p>}
      {lista.data?.itens.length === 0 && <p>Nenhum órgão cadastrado.</p>}
      <label className="block max-w-sm text-sm font-medium">Filtrar por tipo<select className="mt-1 block w-full rounded-lg border bg-white p-2" value={filtro} onChange={e => filtrar(e.target.value)}><option value="">Todos os tipos</option>{Object.entries(tipos).map(([v,n]) => <option key={v} value={v}>{n}</option>)}</select></label>
      <label className="flex items-center gap-2"><input type="checkbox" checked={inativos} onChange={e => setInativos(e.target.checked)} />Incluir sociedades inativas</label>
      {(['Órgãos oficiais', 'Sociedades internas', 'Ministérios'] as const).map(grupo => {
        const itens = lista.data?.itens.filter(o => (!filtro || o.tipo === filtro) && (inativos || o.tipo !== 'SOCIEDADE_INTERNA' || o.ativo) &&
          (o.tipo === 'SOCIEDADE_INTERNA' ? 'Sociedades internas' : o.tipo === 'UNIDADE_MINISTERIAL' ? 'Ministérios' : 'Órgãos oficiais') === grupo)
        return itens?.length ? <section key={grupo}><h3 className="mb-2 font-medium">{grupo}</h3><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{itens.map(o => <article key={o.id} className="flex min-w-0 flex-col items-start gap-3 rounded-xl border p-4"><div className="flex w-full items-center justify-between"><span className="rounded-lg bg-purple-muted/60 p-2 text-purple">{o.tipo === 'UNIDADE_MINISTERIAL' ? <Layers size={20} /> : <Landmark size={20} />}</span><Badge variant={o.ativo ? 'success' : 'outline'}>{o.ativo ? 'Cadastro ativo' : 'Cadastro inativo'}</Badge></div><div className="flex-1"><p className="font-semibold">{o.nome}{o.sigla ? ` (${o.sigla})` : ''}</p><p className="text-sm text-muted-foreground">{tipos[o.tipo]} · {constituicoes[o.constituicao]}</p>{o.integrantes !== undefined && <p className="text-sm">{o.integrantes} {o.integrantes === 1 ? 'integrante' : 'integrantes'} · {o.vagas} {o.vagas === 1 ? 'cargo vago' : 'cargos vagos'}</p>}</div><Button type="button" variant="outline" onClick={() => { setSelecionado(o.id); limparHistoricos() }}>Consultar<ArrowRight /></Button></article>)}</div></section> : null
      })}
      {lista.data?.pode_gerir_sociedades && !inativos && lista.data.itens.some(o => o.tipo === 'SOCIEDADE_INTERNA' && !o.ativo) &&
        <Button variant="outline" onClick={() => { filtrar('SOCIEDADE_INTERNA'); setInativos(true) }}>Ver sociedades para ativar</Button>}
      {filtro && lista.data && !lista.data.itens.some(o => o.tipo === filtro) && <p>Nenhum órgão deste tipo nesta página.</p>}
      {(anteriores.length > 0 || lista.data?.proximo_cursor) && <div className="flex gap-2"><Button type="button" variant="outline" disabled={!anteriores.length} onClick={anterior}>Anterior</Button><Button type="button" variant="outline" disabled={!lista.data?.proximo_cursor} onClick={proxima}>Próxima</Button></div>}
    {selecionado && <SecaoPainel titulo={ficha?.orgao.nome ?? 'Ficha do órgão'} voltar={() => setSelecionado(null)}>
      {!data ? <p>Informe a data de referência.</p> : detalhe.isPending ? <p>Carregando detalhes...</p> : detalhe.isError ? <p role="alert">Não foi possível consultar os detalhes.</p> : ficha && <>
        <div><p>{ficha.orgao.finalidade}</p><p className="text-sm text-muted-foreground">{ficha.orgao.data_criacao ? 'Criado em ' + exibirData(ficha.orgao.data_criacao) + '.' : 'Data de fundação não informada.'} {ficha.vigente_na_data ? 'Vigente' : 'Não vigente ou histórico incompleto'} na data informada.</p></div>
        {ficha.contexto_id && <a className="inline-block underline" href={`/secretaria?contexto=${ficha.contexto_id}${ficha.orgao.tipo === 'ASSEMBLEIA_GERAL' ? '&aba=reunioes' : ''}`}>{ficha.orgao.tipo === 'ASSEMBLEIA_GERAL' ? 'Abrir reuniões da Assembleia' : 'Abrir contexto documental'}</a>}
        {ficha.consulta_nominal === false && <p>A consulta nominal é reservada a quem atua nesta sociedade.</p>}
        <nav aria-label="Seções da ficha" className="grid gap-2 sm:grid-cols-2">
          {secoes.filter(item => item.visivel).map(({ titulo, icon: Icon }) => <Button key={titulo} type="button" variant="outline"
            className="h-auto justify-start gap-3 px-4 py-3 text-left" onClick={() => setSecao(titulo)}>
            <Icon className="text-purple" />{titulo}<ArrowRight className="ml-auto" />
          </Button>)}
        </nav>
        {secoes.some(s => s.titulo === secao && s.visivel) && <SecaoPainel titulo={`${secao} · ${ficha.orgao.nome}`} voltar={() => setSecao(null)}>
          {secao === 'Composição e mandatos' && <>
            {ficha.composicao && <div className="space-y-2"><h3 className="font-semibold">Composição em {exibirData(ficha.data_referencia)}</h3>
              {!ficha.composicao.membros.length && <p>Nenhum oficial em exercício apurado.</p>}
              {ficha.composicao.membros.map(m => <p key={m.pessoa_id}>{m.nome} — {m.oficios.map(o => oficios[o] ?? o).join(', ')}{m.revisao_pendente ? ' · revisão institucional pendente' : ''}</p>)}
              <label className="flex items-center gap-2"><input type="checkbox" checked={incluirAnteriores} onChange={e => { setIncluirAnteriores(e.target.checked); setPaginasInativos([]) }} />Incluir integrantes fora de exercício</label>
              {incluirAnteriores && <div>{ficha.fora_da_composicao?.map(p => <p key={p.id}>{p.nome_completo} · fora da composição na data</p>)}
                {!!paginasInativos.length && <Button variant="outline" onClick={() => setPaginasInativos(p => p.slice(0,-1))}>Voltar nos integrantes</Button>}
                {ficha.proximo_cursor_inativo && <Button variant="outline" onClick={() => setPaginasInativos(p => [...p, ficha.proximo_cursor_inativo!])}>Mais integrantes</Button>}</div>}
              {ficha.composicao.indeterminados.map(p => <p key={p.pessoa_id}>{p.nome} — situação indeterminada</p>)}
            </div>}
            {oficial && <MandatosOrgao key={selecionado} orgao={selecionado} identidade={identidade} data={data}
              cargos={ficha.cargos_na_data} podeAtribuir={podeAtribuir} preparoRegistro={preparoRegistro}
              orgaoOficialAtivo={ficha.orgao.ativo && ficha.orgao.tipo_padrao === ficha.orgao.tipo}
              conselho={ficha.orgao.tipo === 'CONSELHO'} />}
          </>}
          {secao === 'Cargos e titulares' && <>
            {sociedade && ficha.consulta_nominal !== false &&
              <GestaoSociedadeMinisterio area="cargos" key={ficha.orgao.id} ficha={ficha} identidade={identidade} />}
            {!!ficha.cargos_na_data?.length && <section><h3 className="font-semibold">Cargos em {exibirData(data)}</h3>
              {preparoRegistro && <OrientacaoRegistroCargos preparo={preparoRegistro} identidade={identidade} />}
              {gestaoHabilitada && oficial && ficha.contexto_id && !ficha.pode_registrar_cargos && perfil !== Perfil.AUDITOR && perfil !== Perfil.ADMINISTRADOR &&
                <p className="text-sm text-muted-foreground">O registro de titulares exige uma conta vinculada a uma pessoa e autorizada para registrar cargos.</p>}
              <ul className="divide-y">{ficha.cargos_na_data.map(c => <li className="space-y-2 py-3" key={c.id}>
                <div className="flex flex-wrap justify-between gap-2"><strong>{c.nome}</strong><span>{c.titulares.map(p => p.nome_completo).join(', ') || 'Vago'}</span></div>
                {c.ocupacoes?.map(o => <div className="text-sm" key={o.id}>
                  <p>{exibirData(o.inicio)}{o.fim ? ` · encerramento em ${exibirData(o.fim)}` : o.termino_previsto ? ` · último dia previsto ${exibirData(o.termino_previsto)}` : ''}</p>
                  {o.ato_id && ficha.contexto_id && <ReferenciaAta identidade={identidade} label="Ata da posse" alvo={{ grupo: 'ORGAO', alvo_id: o.ato_id, etapa: 'POSSE' }} />}
                </div>)}
                {podeAtribuir && <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => definirProvimento({ cargo: c, titular: c.ocupacoes?.[0], encerrar: false })}>{c.titulares.length ? 'Programar sucessão' : 'Atribuir cargo'}</Button>
                  {c.ocupacoes?.[0] && !c.ocupacoes[0].fim && <Button variant="outline" onClick={() => definirProvimento({ cargo: c, titular: c.ocupacoes![0], encerrar: true })}>Registrar encerramento</Button>}
                </div>}
                {podeAtribuir && provimento?.cargo.id === c.id && <ProvimentoCargo key={c.id + ':' + provimento.encerrar} orgao={selecionado} identidade={identidade}
                  {...provimento} aoFechar={() => definirProvimento(null)} />}
                </li>)}</ul></section>}
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
              {gestaoHabilitada && perfil === Perfil.GESTOR && ficha.orgao.ativo && <ParticipacaoUnidade key={`ParticipacaoUnidade:${ficha.orgao.id}`} orgaoId={ficha.orgao.id} identidade={identidade} />}
            </div>}
            {(ficha.orgao.tipo === 'UNIDADE_MINISTERIAL' || ficha.orgao.tipo === 'SOCIEDADE_INTERNA') &&
              (anterioresParticipacao.length > 0 || ficha.proximo_cursor_participacao) &&
              <div className="flex gap-2"><Button type="button" variant="outline" disabled={!anterioresParticipacao.length} onClick={() => { const itens = [...anterioresParticipacao]; setCursorParticipacao(itens.pop()); setAnterioresParticipacao(itens) }}>Participações anteriores</Button><Button type="button" variant="outline" disabled={!ficha.proximo_cursor_participacao} onClick={() => { const proximo = ficha?.proximo_cursor_participacao; if (proximo) { setAnterioresParticipacao(a => [...a, cursorParticipacao]); setCursorParticipacao(proximo) } }}>Mais participações</Button></div>}
          </>}
          {secao === 'Histórico' && <>
            <div className="space-y-2"><h3 className="font-semibold">Histórico de ocupações</h3><p className="text-sm text-muted-foreground">Os registros de cargo não comprovam, por si só, exercício atual ou competência para um ato. A sequência ordena os atos registrados no mesmo dia.</p>
              {!ficha.ocupacoes.length && <p>Nenhuma ocupação registrada.</p>}
              {ficha.ocupacoes.map(o => <div key={o.id} className="space-y-1"><p>{o.cargo.nome}: {o.pessoa.nome_completo} — início em {exibirData(o.inicio)}{o.inicio_ordem > 1 ? `, sequência ${o.inicio_ordem}` : ''}{o.termino_previsto ? `; último dia previsto ${exibirData(o.termino_previsto)}` : ''}{o.fim ? `; término efetivo em ${exibirData(o.fim)}${o.fim_ordem && o.fim_ordem > 1 ? `, sequência ${o.fim_ordem}` : ''}` : ''}.{avisoMembresia(o.situacao_membresia)}</p>
                {oficial && podeAtribuir && !o.fim && <Button variant="outline" onClick={() => definirProvimento({
                  cargo: { id: o.cargo_id, nome: o.cargo.nome, titulares: [o.pessoa] }, titular: o, encerrar: true,
                })}>Registrar encerramento de {o.pessoa.nome_completo}</Button>}
                {podeAtribuir && provimento?.encerrar && provimento.titular?.id === o.id &&
                  <ProvimentoCargo key={o.id} orgao={selecionado} identidade={identidade} {...provimento} aoFechar={() => definirProvimento(null)} />}
                {gestaoHabilitada && !o.fim && o.termino_previsto && ficha.orgao.ativo && perfil && ((['CONSELHO', 'JUNTA'].includes(ficha.orgao.tipo) && (!ficha.versao || !ficha.contexto_id) && [Perfil.ADMINISTRADOR, Perfil.GESTOR, Perfil.SECRETARIO].includes(perfil)) || (ficha.orgao.tipo === 'UNIDADE_MINISTERIAL' && !ficha.orgao.gestao_presidencial && ficha.orgao.constituicao === 'ELEICAO' && perfil === Perfil.GESTOR)) && <Button type="button" variant="outline" onClick={() => setEncerrando({ tipo: ficha.orgao.tipo === 'UNIDADE_MINISTERIAL' ? 'unidade' : 'oficial', ocupacao: { id: o.id, nome: `${o.cargo.nome} — ${o.pessoa.nome_completo}` } })}>Encerrar ocupação de {o.pessoa.nome_completo}</Button>}</div>)}
              {(anterioresOcupacao.length > 0 || ficha.proximo_cursor_ocupacao) && <div className="flex gap-2"><Button type="button" variant="outline" disabled={!anterioresOcupacao.length} onClick={() => { const itens = [...anterioresOcupacao]; setCursorOcupacao(itens.pop()); setAnterioresOcupacao(itens) }}>Ocupações anteriores</Button><Button type="button" variant="outline" disabled={!ficha.proximo_cursor_ocupacao} onClick={() => { const proximo = ficha?.proximo_cursor_ocupacao; if (proximo) { setAnterioresOcupacao(a => [...a, cursorOcupacao]); setCursorOcupacao(proximo) } }}>Mais ocupações</Button></div>}
              {ficha.cargos_limitados && <p>A lista mostra os 100 primeiros cargos ativos.</p>}
            </div>
            {ficha.consulta_nominal !== false && <HistoricoAtos key={`atos:${ficha.orgao.id}`} orgaoId={ficha.orgao.id} identidade={identidade} />}
          </>}
          {secao === 'Configuração e cadastro' && <>
            {sociedade && ficha.consulta_nominal !== false &&
              <GestaoSociedadeMinisterio area="cadastro" key={ficha.orgao.id} ficha={ficha} identidade={identidade} />}
            {ficha.versao && <p className="text-sm">Configuração {ficha.versao.numero} · {ficha.versao.fonte}</p>}
            {ficha.pode_configurar && <ConfiguracaoInstitucional key={selecionado} orgao={selecionado} identidade={identidade} />}
            {podeManter && <div className="space-y-3">
              <GestaoCargos key={`GestaoCargos:${ficha.orgao.id}`} orgaoId={ficha.orgao.id} identidade={identidade} cargos={ficha.cargos_configurados} />
              {ficha.orgao.constituicao === 'ELEICAO' && <PoliticaUnidade key={`PoliticaUnidade:${ficha.orgao.id}`} orgaoId={ficha.orgao.id} identidade={identidade} politicas={ficha.politicas} limitadas={ficha.politicas_limitadas} />}
              <Button type="button" variant="outline" onClick={() => setEncerrando({ tipo: 'desativar' })}>Desativar órgão</Button>
            </div>}
            {podeManter && <ManutencaoOrgao key={`manutencao:${ficha.orgao.id}`} orgao={ficha.orgao} identidade={identidade} />}
          </>}
          {encerrando && podeManter && <EncerrarAto key={`${ficha.orgao.id}:${encerrando.tipo}:${encerrando.ocupacao?.id ?? ''}`} orgaoId={ficha.orgao.id} identidade={identidade} tipo={encerrando.tipo} ocupacao={encerrando.ocupacao} aoFechar={() => setEncerrando(null)} />}
        </SecaoPainel>}
      </>}
    </SecaoPainel>}
    </Painel></section>
    {gestaoHabilitada && lista.data?.pode_gerir_sociedades && <CriarMinisterio identidade={identidade} aoCriar={id => {
      setData(null); setSelecionado(id); limparHistoricos()
    }} />}
    {gestaoHabilitada && perfil && [Perfil.ADMINISTRADOR, Perfil.GESTOR, Perfil.SECRETARIO].includes(perfil) && <section className="surface"><Painel><h2 className="text-lg font-semibold">Administração institucional</h2>
      <div className="flex flex-wrap items-start gap-2">
        <InstituirOrgao perfil={perfil} identidade={identidade} />
        {perfil === Perfil.ADMINISTRADOR && <>
          <CompetenciaUnidades identidade={identidade} />
          <GestaoAutoridades identidade={identidade} />
          <ConfiguracaoFuso identidade={identidade} />
        </>}
        <PreviaImpactosMembresia identidade={identidade} />
      </div>
    </Painel></section>}
  </div></RelogioIgreja>
}
