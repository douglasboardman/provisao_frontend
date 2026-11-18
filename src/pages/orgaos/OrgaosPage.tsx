import { ManutencaoOrgao } from './ManutencaoOrgao'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { orgaosApi, type OrgaoResumo } from '../../api/orgaos'
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
import { RelogioIgreja } from './RelogioIgreja'

const tipos: Record<OrgaoResumo['tipo'], string> = { CONSELHO: 'Conselho', JUNTA: 'Junta', UNIDADE_MINISTERIAL: 'Unidade ministerial' }
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
  const [cursor, setCursor] = useState<string | undefined>()
  const [anteriores, setAnteriores] = useState<(string | undefined)[]>([])
  const [selecionado, setSelecionado] = useState<string | null>(null)
  const [cursorOcupacao, setCursorOcupacao] = useState<string | undefined>()
  const [cursorParticipacao, setCursorParticipacao] = useState<string | undefined>()
  const [anterioresOcupacao, setAnterioresOcupacao] = useState<(string | undefined)[]>([])
  const [anterioresParticipacao, setAnterioresParticipacao] = useState<(string | undefined)[]>([])
  const [encerrando, setEncerrando] = useState<{ tipo: 'oficial' | 'unidade' | 'desativar'; ocupacao?: { id: string; nome: string } } | null>(null)
  const lista = useQuery({ queryKey: ['orgaos', identidade, cursor], queryFn: () => orgaosApi.listar(cursor), staleTime: 0, gcTime: 0 })
  const relogio = useQuery({ queryKey: ['orgaos', identidade, 'relogio'], queryFn: orgaosApi.relogio, staleTime: 0, gcTime: 0, refetchInterval: 60000 })
  const data = dataSelecionada ?? relogio.data?.data_operacional ?? ''
  const detalhe = useQuery({ queryKey: ['orgaos', identidade, 'detalhe', selecionado, data, cursorOcupacao, cursorParticipacao], queryFn: () => orgaosApi.detalhe(selecionado!, data, { ocupacao: cursorOcupacao, participacao: cursorParticipacao }), enabled: !!selecionado && !!data, staleTime: 0, gcTime: 0 })
  function limparHistoricos() { setCursorOcupacao(undefined); setCursorParticipacao(undefined); setAnterioresOcupacao([]); setAnterioresParticipacao([]); setEncerrando(null) }
  function proxima() { if (!lista.data?.proximo_cursor) return; setAnteriores(a => [...a, cursor]); setCursor(lista.data.proximo_cursor); setSelecionado(null); limparHistoricos() }
  function anterior() { const itens = [...anteriores]; setCursor(itens.pop()); setAnteriores(itens); setSelecionado(null); limparHistoricos() }
  if (relogio.isPending) return <main className="p-6">Consultando a data da igreja...</main>
  if (relogio.isError || !relogio.data) return <main className="p-6"><p role="alert">Não foi possível conferir a data usada nos atos.</p></main>
  if (!relogio.data.data_operacional) return <main className="space-y-4 p-6"><p role="alert">O fuso cadastrado é inválido; corrija-o antes de registrar atos.</p>{gestaoHabilitada && perfil === Perfil.ADMINISTRADOR && <ConfiguracaoFuso identidade={identidade} />}</main>
  return <RelogioIgreja dia={relogio.data.data_operacional}><main className="space-y-6 p-6">
    <div><h1 className="text-2xl font-semibold">Órgãos e unidades</h1><p className="text-sm text-muted-foreground">Consulta de composição e histórico de ocupações.</p></div>
    <p className="text-sm text-muted-foreground">Data adotada para atos: {exibirData(relogio.data.data_operacional)} ({relogio.data.fuso_iana ?? 'UTC, sem fuso cadastrado'}).</p>
    {import.meta.env.VITE_FEATURE_ORGAOS_GESTAO === 'true' && perfil && [Perfil.ADMINISTRADOR, Perfil.GESTOR, Perfil.SECRETARIO].includes(perfil) && <InstituirOrgao perfil={perfil} identidade={identidade} />}
    {import.meta.env.VITE_FEATURE_ORGAOS_GESTAO === 'true' && perfil === Perfil.ADMINISTRADOR && <CompetenciaUnidades identidade={identidade} />}
    {import.meta.env.VITE_FEATURE_ORGAOS_GESTAO === 'true' && perfil === Perfil.ADMINISTRADOR && <GestaoAutoridades identidade={identidade} />}
    {import.meta.env.VITE_FEATURE_ORGAOS_GESTAO === 'true' && perfil === Perfil.ADMINISTRADOR && <ConfiguracaoFuso identidade={identidade} />}
    {import.meta.env.VITE_FEATURE_ORGAOS_GESTAO === 'true' && perfil && [Perfil.ADMINISTRADOR, Perfil.GESTOR, Perfil.SECRETARIO].includes(perfil) && <PreviaImpactosMembresia identidade={identidade} />}
    <div className="max-w-xs space-y-2"><Label htmlFor="data-orgaos">Data de referência</Label><Input id="data-orgaos" type="date" value={data} onChange={e => setData(e.target.value)} /></div>
    <section className="space-y-3"><h2 className="text-lg font-semibold">Órgãos cadastrados</h2>
      {lista.isPending && <p>Carregando órgãos...</p>}
      {lista.isError && <p role="alert">Não foi possível consultar os órgãos.</p>}
      {lista.data?.itens.length === 0 && <p>Nenhum órgão cadastrado.</p>}
      {lista.data?.itens.map(o => <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 rounded border p-3"><div><p className="font-medium">{o.nome}{o.sigla ? ` (${o.sigla})` : ''}</p><p className="text-sm text-muted-foreground">{tipos[o.tipo]} · {constituicoes[o.constituicao]} · {o.ativo ? 'Cadastro ativo' : 'Cadastro inativo'}</p></div><Button type="button" variant="outline" onClick={() => { setSelecionado(o.id); limparHistoricos() }}>Consultar</Button></div>)}
      <div className="flex gap-2"><Button type="button" variant="outline" disabled={!anteriores.length} onClick={anterior}>Anterior</Button><Button type="button" variant="outline" disabled={!lista.data?.proximo_cursor} onClick={proxima}>Próxima</Button></div>
    </section>
    {selecionado && <section className="space-y-4 rounded border p-4" aria-live="polite">
      {!data ? <p>Informe a data de referência.</p> : detalhe.isPending ? <p>Carregando detalhes...</p> : detalhe.isError ? <p role="alert">Não foi possível consultar os detalhes.</p> : detalhe.data && <>
        <div><h2 className="text-lg font-semibold">{detalhe.data.orgao.nome}</h2><p>{detalhe.data.orgao.finalidade}</p><p className="text-sm text-muted-foreground">Criado em {exibirData(detalhe.data.orgao.data_criacao)}. {detalhe.data.vigente_na_data ? 'Vigente' : 'Não vigente ou histórico incompleto'} na data informada.</p></div>
        {detalhe.data.composicao && <div className="space-y-2"><h3 className="font-semibold">Composição em {exibirData(detalhe.data.data_referencia)}</h3>
          {!detalhe.data.composicao.membros.length && <p>Nenhum oficial em exercício apurado.</p>}
          {detalhe.data.composicao.membros.map(m => <p key={m.pessoa_id}>{m.nome} — {m.oficios.map(o => oficios[o] ?? o).join(', ')}{m.revisao_pendente ? ' · revisão institucional pendente' : ''}</p>)}
          {detalhe.data.composicao.indeterminados.map(p => <p key={p.pessoa_id}>{p.nome} — situação indeterminada</p>)}
        </div>}
        <div className="space-y-2"><h3 className="font-semibold">Histórico de ocupações</h3><p className="text-sm text-muted-foreground">Os registros de cargo não comprovam, por si só, exercício atual ou competência para um ato. A sequência ordena os atos registrados no mesmo dia.</p>
          {!detalhe.data.ocupacoes.length && <p>Nenhuma ocupação registrada.</p>}
          {detalhe.data.ocupacoes.map(o => <div key={o.id} className="space-y-1"><p>{o.cargo.nome}: {o.pessoa.nome_completo} — início em {exibirData(o.inicio)}{o.inicio_ordem > 1 ? `, sequência ${o.inicio_ordem}` : ''}{o.termino_previsto ? `; último dia previsto ${exibirData(o.termino_previsto)}` : ''}{o.fim ? `; término efetivo em ${exibirData(o.fim)}${o.fim_ordem && o.fim_ordem > 1 ? `, sequência ${o.fim_ordem}` : ''}` : ''}.{avisoMembresia(o.situacao_membresia)}</p>{import.meta.env.VITE_FEATURE_ORGAOS_GESTAO === 'true' && !o.fim && o.termino_previsto && detalhe.data.orgao.ativo && perfil && ((detalhe.data.orgao.tipo !== 'UNIDADE_MINISTERIAL' && [Perfil.ADMINISTRADOR, Perfil.GESTOR, Perfil.SECRETARIO].includes(perfil)) || (detalhe.data.orgao.constituicao === 'ELEICAO' && perfil === Perfil.GESTOR)) && <Button type="button" variant="outline" onClick={() => setEncerrando({ tipo: detalhe.data!.orgao.tipo === 'UNIDADE_MINISTERIAL' ? 'unidade' : 'oficial', ocupacao: { id: o.id, nome: `${o.cargo.nome} — ${o.pessoa.nome_completo}` } })}>Encerrar ocupação de {o.pessoa.nome_completo}</Button>}</div>)}
          <div className="flex gap-2"><Button type="button" variant="outline" disabled={!anterioresOcupacao.length} onClick={() => { const itens = [...anterioresOcupacao]; setCursorOcupacao(itens.pop()); setAnterioresOcupacao(itens) }}>Ocupações anteriores</Button><Button type="button" variant="outline" disabled={!detalhe.data.proximo_cursor_ocupacao} onClick={() => { const proximo = detalhe.data?.proximo_cursor_ocupacao; if (proximo) { setAnterioresOcupacao(a => [...a, cursorOcupacao]); setCursorOcupacao(proximo) } }}>Mais ocupações</Button></div>
          {detalhe.data.cargos_limitados && <p>A lista mostra os 100 primeiros cargos ativos.</p>}
          {import.meta.env.VITE_FEATURE_ORGAOS_GESTAO === 'true' && perfil === Perfil.GESTOR && detalhe.data.orgao.ativo && detalhe.data.orgao.constituicao === 'DESIGNACAO' && <DesignacaoLideranca key={`DesignacaoLideranca:${detalhe.data.orgao.id}`} orgaoId={detalhe.data.orgao.id} identidade={identidade} cargos={detalhe.data.cargos_configurados} />}
        </div>
        {import.meta.env.VITE_FEATURE_ORGAOS_GESTAO === 'true' && detalhe.data.orgao.ativo && perfil && ((detalhe.data.orgao.tipo !== 'UNIDADE_MINISTERIAL' && [Perfil.ADMINISTRADOR, Perfil.GESTOR, Perfil.SECRETARIO].includes(perfil)) || (detalhe.data.orgao.tipo === 'UNIDADE_MINISTERIAL' && perfil === Perfil.GESTOR)) && <div className="space-y-4">
          <GestaoCargos key={`GestaoCargos:${detalhe.data.orgao.id}`} orgaoId={detalhe.data.orgao.id} identidade={identidade} cargos={detalhe.data.cargos_configurados} />
          {detalhe.data.orgao.constituicao === 'ELEICAO' && <PoliticaUnidade key={`PoliticaUnidade:${detalhe.data.orgao.id}`} orgaoId={detalhe.data.orgao.id} identidade={identidade} politicas={detalhe.data.politicas} limitadas={detalhe.data.politicas_limitadas} />}
          {detalhe.data.orgao.constituicao !== 'DESIGNACAO' && <EleicaoCargo key={`EleicaoCargo:${detalhe.data.orgao.id}`} orgaoId={detalhe.data.orgao.id} identidade={identidade} tipo={detalhe.data.orgao.tipo === 'UNIDADE_MINISTERIAL' ? 'unidade' : 'oficial'} cargos={detalhe.data.cargos_configurados} politicas={detalhe.data.politicas} />}
          <Button type="button" variant="outline" onClick={() => setEncerrando({ tipo: 'desativar' })}>Desativar órgão</Button>
        </div>}
        {encerrando && import.meta.env.VITE_FEATURE_ORGAOS_GESTAO === 'true' && detalhe.data.orgao.ativo && perfil && ((detalhe.data.orgao.tipo !== 'UNIDADE_MINISTERIAL' && [Perfil.ADMINISTRADOR, Perfil.GESTOR, Perfil.SECRETARIO].includes(perfil)) || (detalhe.data.orgao.tipo === 'UNIDADE_MINISTERIAL' && perfil === Perfil.GESTOR)) && <EncerrarAto key={`${detalhe.data.orgao.id}:${encerrando.tipo}:${encerrando.ocupacao?.id ?? ''}`} orgaoId={detalhe.data.orgao.id} identidade={identidade} tipo={encerrando.tipo} ocupacao={encerrando.ocupacao} aoFechar={() => setEncerrando(null)} />}
        {detalhe.data.orgao.tipo === 'UNIDADE_MINISTERIAL' && <div className="space-y-2"><h3 className="font-semibold">Histórico de participação</h3><p className="text-sm text-muted-foreground">A conferência do rol considera o fim da data consultada e não comprova exercício ou competência.</p>
          {!detalhe.data.participacoes.length && <p>Nenhuma participação registrada.</p>}
          {detalhe.data.participacoes.map(p => <p key={p.id}>{p.pessoa.nome_completo} — início em {exibirData(p.inicio)}{p.inicio_ordem ? `, sequência ${p.inicio_ordem}` : ''}{p.fim ? `; término em ${exibirData(p.fim)}${p.fim_ordem ? `, sequência ${p.fim_ordem}` : ''}` : ''}.{avisoMembresia(p.situacao_membresia)}</p>)}
          <div className="flex gap-2"><Button type="button" variant="outline" disabled={!anterioresParticipacao.length} onClick={() => { const itens = [...anterioresParticipacao]; setCursorParticipacao(itens.pop()); setAnterioresParticipacao(itens) }}>Participações anteriores</Button><Button type="button" variant="outline" disabled={!detalhe.data.proximo_cursor_participacao} onClick={() => { const proximo = detalhe.data?.proximo_cursor_participacao; if (proximo) { setAnterioresParticipacao(a => [...a, cursorParticipacao]); setCursorParticipacao(proximo) } }}>Mais participações</Button></div>
          {import.meta.env.VITE_FEATURE_ORGAOS_GESTAO === 'true' && perfil === Perfil.GESTOR && detalhe.data.orgao.ativo && <ParticipacaoUnidade key={`ParticipacaoUnidade:${detalhe.data.orgao.id}`} orgaoId={detalhe.data.orgao.id} identidade={identidade} />}
        </div>}
        {gestaoHabilitada && detalhe.data.orgao.ativo && perfil && (detalhe.data.orgao.tipo === 'UNIDADE_MINISTERIAL' ? perfil === Perfil.GESTOR : [Perfil.ADMINISTRADOR, Perfil.GESTOR, Perfil.SECRETARIO].includes(perfil)) && <ManutencaoOrgao key={`manutencao:${detalhe.data.orgao.id}`} orgao={detalhe.data.orgao} identidade={identidade} />}
        <HistoricoAtos key={`atos:${detalhe.data.orgao.id}`} orgaoId={detalhe.data.orgao.id} identidade={identidade} />
      </>}
    </section>}
  </main></RelogioIgreja>
}
