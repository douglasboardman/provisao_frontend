import { Pastores } from './Pastores'
import './oficiais.css'
import { usePermissions } from '../../hooks/use-permissions'
import { Painel, SecaoPainel } from '../../components/shared/Painel'
import { Link } from 'react-router'
import { useCanAccessModule } from '../../hooks/use-permissions'
import { SeletorPessoa } from '../../components/shared/SeletorPessoa'
import { UsersRound, CalendarClock, BellRing, ShieldCheck, LayoutList, Church } from 'lucide-react'
import { AlternarConteudo, CabecalhoPainel, DataReferencia, WorkspaceHeader } from '../../components/shared/Workspace'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ConfiguracaoAlertas } from './ConfiguracaoAlertas'
import { AlertasOperacionais } from './AlertasOperacionais'
import { AcessosSensiveis } from './AcessosSensiveis'
import { EventosSensiveis } from './EventosSensiveis'
import { Perfil } from '../../types/enums'
import { GestaoOficial } from './GestaoOficial'
import { pessoasApi } from '../../api/pessoas'
import { ApiRequestError } from '../../api/client'
import { oficiaisApi, type OficialResumo } from '../../api/oficiais'
import { Button } from '../../components/ui/button'
import { Abas } from '../../components/ui/abas'
import { Label } from '../../components/ui/label'
import { useAuthStore } from '../../stores/auth'

const tipos: Record<OficialResumo['tipo'], string> = { DIACONO: 'Diácono', PRESBITERO_REGENTE: 'Presbítero regente', PRESBITERO_DOCENTE: 'Presbítero docente' }
const situacoes = { EM_EXERCICIO: 'Em exercício', FORA_DE_EXERCICIO: 'Fora de exercício', INDETERMINADA: 'Histórico incompleto ou ambíguo' }
function dataLocal() { const hoje = new Date(); return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}` }
function dataCivil(valor: string) { return valor.slice(0, 10).split('-').reverse().join('/') }

export function OficiaisPage() {
  const queryClient = useQueryClient()
  const perfil = useAuthStore(s => s.user?.perfil)
  const auditor = perfil === Perfil.AUDITOR
  const permissoes = usePermissions('oficiais')
  const ficha = useCanAccessModule('orgaos')
  const [area, setArea] = useState('presbiteros')
  const [quadro, setQuadro] = useState<'mandatos' | 'oficios'>('mandatos')
  const [restrito, setRestrito] = useState<OficialResumo | null>(null)
  const [formAberto, setFormAberto] = useState(false)
  const [pessoaId, setPessoaId] = useState('')
  const [tipo, setTipo] = useState<OficialResumo['tipo']>('DIACONO')
  const [historico, setHistorico] = useState(false)
  const identidade = useAuthStore(s => `${s.user?.igreja_id ?? ''}:${s.user?.sub ?? ''}`)
  const [data, setData] = useState(dataLocal)
  const [cursor, setCursor] = useState<string | undefined>()
  const [anteriores, setAnteriores] = useState<(string | undefined)[]>([])
  const [gerenciar, setGerenciar] = useState<OficialResumo | null>(null)
  const [selecionado, setSelecionado] = useState<OficialResumo | null>(null)
  const acesso = useQuery({ queryKey: ['oficiais', identidade, 'meu-acesso'], queryFn: oficiaisApi.meuAcesso, staleTime: 0, gcTime: 0, refetchInterval: 30_000 })
  const historicoPermitido = !!acesso.data?.operacoes?.HISTORICO_OFICIAIS_CONSULTAR || !!acesso.data?.operacoes?.HISTORICO_OFICIAIS_REGISTRAR
  const pessoas = useQuery({ queryKey: ['oficiais', identidade, 'pessoas'], queryFn: pessoasApi.list, enabled: formAberto })
  const cadastrar = useMutation({ mutationFn: oficiaisApi.cadastrar, onSuccess: async () => { setPessoaId(''); setHistorico(false); setFormAberto(false); setCursor(undefined); setAnteriores([]); await queryClient.invalidateQueries({ queryKey: ['oficiais', identidade] }) } })
  const alterarSituacao = useMutation({
    mutationFn: oficiaisApi.alterarSituacao,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['oficiais', identidade] }),
  })
  const tipoQuadro = area === 'diaconos' ? 'DIACONO' : 'PRESBITERO_REGENTE'
  const lista = useQuery({ queryKey: ['oficiais', identidade, 'lista', tipoQuadro, cursor], queryFn: () => oficiaisApi.listar(cursor, tipoQuadro) })
  const exercicio = useQuery({ queryKey: ['oficiais', identidade, 'exercicio', selecionado?.id, data], queryFn: () => oficiaisApi.exercicio(selecionado!.id, data), enabled: !auditor && !!selecionado && !!data })
  const vigentes = useQuery({ queryKey: ['oficiais', identidade, 'vigentes', data], queryFn: () => oficiaisApi.vigentes(data), enabled: !auditor && !!data })
  const alertas = useQuery({ queryKey: ['oficiais', identidade, 'alertas', data], queryFn: () => oficiaisApi.alertas(data, 90), enabled: permissoes.canCreate && !!data })
  function abrirRegistro(item: OficialResumo, painel: 'exercicio' | 'gestao' | 'restrito') {
    setSelecionado(painel === 'exercicio' ? item : null)
    setGerenciar(painel === 'gestao' ? item : null)
    setRestrito(painel === 'restrito' ? item : null)
  }
  function proxima() { if (!lista.data?.proximo_cursor) return; setAnteriores(a => [...a, cursor]); setCursor(lista.data.proximo_cursor); setSelecionado(null); setGerenciar(null); setRestrito(null) }
  function anterior() { const itens = [...anteriores]; setCursor(itens.pop()); setAnteriores(itens); setSelecionado(null); setGerenciar(null); setRestrito(null) }
  const mandatosTipo = vigentes.data?.filter(m => m.oficial.tipo === tipoQuadro) ?? []
  const referencia = (area !== 'acessos') &&
    <DataReferencia id="referencia-oficiais" data={data} mudar={setData} />
  const visaoQuadro = auditor ? 'oficios' : quadro
  const conteudoQuadro = <div className="space-y-4">
    {!auditor && <AlternarConteudo titulo="Dados do quadro de oficiais" ativa={quadro} selecionar={setQuadro} opcoes={[
      { id: 'mandatos', nome: 'Mandatos vigentes' }, { id: 'oficios', nome: 'Ofícios registrados' },
    ]} />}
    {visaoQuadro === 'mandatos' && <section className="surface space-y-4">
      <CabecalhoPainel icone={CalendarClock} titulo="Mandatos vigentes">
        {vigentes.data && <span className="pill">{mandatosTipo.length} na data</span>}
      </CabecalhoPainel>
    {!data ? <p>Selecione a data de referência.</p> : vigentes.isPending ? <p>Consultando mandatos…</p> : vigentes.isError ? <p role="alert">Não foi possível consultar os mandatos.</p> : !mandatosTipo.length ? <p className="text-sm text-muted-foreground">Nenhum mandato no período selecionado.</p> :
    <div className="overflow-x-auto"><table className="record-table"><thead><tr><th>Oficial</th><th>Posse</th><th>Término</th><th>Período cumprido</th></tr></thead><tbody>{mandatosTipo.map(m => {
      const inicio = Date.parse(m.data_posse.slice(0,10))
      const fim = Date.parse((m.termino_efetivo ?? m.termino_previsto).slice(0,10))
      const percentual = fim <= inicio ? 100 : Math.max(0, Math.min(100, Math.round(100 * (Date.parse(data) - inicio) / (fim - inicio))))
      return <tr key={m.id}><td data-label="Oficial"><strong>{m.oficial.pessoa.nome_completo}</strong><p className="text-xs text-muted-foreground">{tipos[m.oficial.tipo]}</p></td><td data-label="Posse">{dataCivil(m.data_posse)}</td><td data-label="Término">{dataCivil(m.termino_efetivo ?? m.termino_previsto)}</td><td data-label="Período cumprido"><div className="flex items-center gap-2"><progress aria-label={'Mandato de ' + m.oficial.pessoa.nome_completo} value={percentual} max={100} className="w-24 accent-purple" /><span>{percentual}%</span></div></td></tr>
    })}</tbody></table></div>}</section>}
    {visaoQuadro === 'oficios' && <section className="surface"><Painel>
      <CabecalhoPainel icone={UsersRound} titulo="Ofícios registrados" />
      {ficha && <Button asChild variant="outline"><Link to="/orgaos">Registrar mandato na ficha do órgão</Link></Button>}
      {permissoes.canCreate && <Button type="button" variant="ghost" onClick={() => { cadastrar.reset(); setHistorico(false); setTipo(tipoQuadro); setFormAberto(true) }}>Registrar ofício</Button>}
      {formAberto && permissoes.canCreate && <SecaoPainel titulo="Registrar ofício" voltar={() => setFormAberto(false)} ocupado={cadastrar.isPending}><form className="max-w-xl space-y-3 rounded border p-4" onSubmit={e => { e.preventDefault(); if (pessoaId) cadastrar.mutate({ pessoa_id: pessoaId, tipo, ...(historico ? { ativo: false } : {}) }) }}>
        <p className="text-sm text-muted-foreground">O registro do ofício não cria ordenação, mandato ou competência.</p>
        <div className="space-y-1"><Label htmlFor="pessoa-oficial">Pessoa</Label><SeletorPessoa id="pessoa-oficial" value={pessoaId} onChange={id => setPessoaId(id)} required opcoes={pessoas.data?.map(p => ({ id: p.id, nome: p.nome_completo }))} />{pessoas.isError && <p role="alert">Não foi possível carregar as pessoas.</p>}</div>
        <div className="space-y-1"><Label htmlFor="tipo-oficial">Ofício</Label><select id="tipo-oficial" className="w-full rounded border bg-background p-2" value={tipo} onChange={e => setTipo(e.target.value as OficialResumo['tipo'])}>{Object.entries(tipos).filter(([valor]) => valor !== 'PRESBITERO_DOCENTE').map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}</select></div>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={historico} onChange={e => setHistorico(e.target.checked)} />
          Registrar como inativo
        </label>
        {cadastrar.isError && <p role="alert">{cadastrar.error instanceof ApiRequestError ? cadastrar.error.messages.join(' ') : 'Não foi possível registrar o ofício.'}</p>}
        <Button type="submit" disabled={!pessoaId || cadastrar.isPending}>Salvar ofício</Button>
      </form></SecaoPainel>}
      {lista.isPending && <p>Carregando oficiais...</p>}
      {lista.isError && <p role="alert">Não foi possível consultar os oficiais.</p>}
      {lista.data?.itens.length === 0 && <p>Nenhum oficial registrado.</p>}
      {!!lista.data?.itens.length && <div className="overflow-x-auto">
        <table className="record-table">
          <thead><tr><th scope="col">Oficial</th><th scope="col">Ações</th></tr></thead>
          <tbody>{lista.data.itens.map(item => {
            const ativo = item.ativo !== false
            return <tr key={item.id}>
              <td data-label="Oficial"><strong>{item.pessoa.nome_completo}</strong>
                <p className="text-xs text-muted-foreground">{tipos[item.tipo]} · {ativo ? 'Cadastro ativo' : 'Cadastro inativo'}</p>
              </td>
              <td data-label="Ações"><div className="flex flex-wrap gap-2">
                {!auditor && <>
                  {permissoes.canEdit && <Button type="button" size="sm" variant="outline" disabled={alterarSituacao.isPending} onClick={() => alterarSituacao.mutate({ id: item.id, ativo: !ativo })}>{ativo ? 'Inativar cadastro' : 'Ativar cadastro'}</Button>}
                  <Button type="button" size="sm" variant="outline" onClick={() => abrirRegistro(item, 'exercicio')}>Consultar exercício</Button>
                  {(permissoes.canEdit || historicoPermitido) && <Button type="button" size="sm" variant="outline" onClick={() => abrirRegistro(item, 'gestao')}>Gerir registros</Button>}
                </>}
                {(acesso.data?.pode_consultar || acesso.data?.pode_registrar) && <Button type="button" size="sm" variant="outline" onClick={() => abrirRegistro(item, 'restrito')}>Eventos restritos</Button>}
              </div></td>
            </tr>
          })}</tbody>
        </table>
      </div>}
      {alterarSituacao.isError && <p role="alert">{alterarSituacao.error instanceof ApiRequestError ? alterarSituacao.error.messages.join(' ') : 'Não foi possível alterar a situação do ofício.'}</p>}
      {(anteriores.length > 0 || lista.data?.proximo_cursor) && <div className="flex gap-2"><Button type="button" variant="outline" disabled={!anteriores.length} onClick={anterior}>Anterior</Button><Button type="button" variant="outline" disabled={!lista.data?.proximo_cursor} onClick={proxima}>Próxima</Button></div>}
    {acesso.isError && <p role="alert">Não foi possível verificar o acesso a eventos restritos.</p>}
    {selecionado && !auditor && <SecaoPainel titulo={`Exercício de ${selecionado.pessoa.nome_completo}`} voltar={() => setSelecionado(null)}>{!data ? <p>Informe a data de referência.</p> : exercicio.isPending ? <p>Consultando...</p> : exercicio.isError ? <p role="alert">Não foi possível consultar o exercício.</p> : <p>{situacoes[exercicio.data!.situacao]} em {dataCivil(exercicio.data!.data_referencia)}.</p>}{exercicio.data?.revisao_pendente && <p role="status">Mandato pendente de revisão institucional.</p>}<p className="text-sm text-muted-foreground">O exercício cadastrado não substitui a verificação de competência para um ato.</p></SecaoPainel>}
    {restrito && acesso.data && <EventosSensiveis key={restrito.id} voltar={() => setRestrito(null)} oficial={restrito} identidade={identidade} acesso={acesso.data} />}
    {gerenciar && <GestaoOficial key={gerenciar.id} voltar={() => setGerenciar(null)} oficial={gerenciar} identidade={identidade} podeConsultarDetalhe={!!acesso.data?.pode_consultar} acesso={acesso.data} />}
    </Painel></section>}
  </div>
  const conteudoAvisos = <div className="space-y-4">
    <section className="surface"><Painel>
      <CabecalhoPainel icone={BellRing} titulo="Avisos e prazos">
        {perfil === Perfil.ADMINISTRADOR && <ConfiguracaoAlertas identidade={identidade} />}
      </CabecalhoPainel>
      <div className="grid gap-4 border-t pt-3 lg:grid-cols-2">
        <section className="min-w-0 space-y-2">
          <h3 className="font-semibold">Términos nos próximos 90 dias</h3>
          {!data ? <p>Informe a data de referência.</p> : alertas.isPending ? <p>Carregando alertas...</p> : alertas.isError ? <p role="alert">Não foi possível consultar os alertas.</p> : alertas.data?.length ? alertas.data.map(a => <p key={a.id}>{a.oficial.pessoa.nome_completo} — {a.natureza === 'TERMINO_PREVISTO' ? 'término previsto' : 'encerramento registrado'} em {dataCivil(a.data_alerta)}.</p>) : <p>Nenhum término no período.</p>}
        </section>
        <AlertasOperacionais identidade={identidade} />
      </div>
    </Painel></section>
  </div>

  return <div className="workspace oficiais-workspace">
    <WorkspaceHeader icon={UsersRound} title="Oficiais e Pastores" description="Presbíteros, diáconos e equipe pastoral da igreja." />
    <Abas titulo="Áreas de oficiais" ativa={area} selecionar={nova => { setArea(nova); setCursor(undefined); setAnteriores([]); setSelecionado(null); setGerenciar(null); setRestrito(null); setFormAberto(false) }} controle={referencia} abas={[
      { id: 'presbiteros', nome: 'Presbíteros', icone: LayoutList, conteudo: conteudoQuadro, mostrar: true },
      { id: 'diaconos', nome: 'Diáconos', icone: UsersRound, conteudo: conteudoQuadro, mostrar: true },
      { id: 'pastores', nome: 'Pastores', icone: Church, conteudo: <Pastores identidade={identidade} data={data} administrador={perfil === Perfil.ADMINISTRADOR} podeCadastrar={permissoes.canCreate} podeGerir={permissoes.canEdit || historicoPermitido} acesso={acesso.data} />, mostrar: true },
      { id: 'avisos', nome: 'Avisos e prazos', icone: BellRing, conteudo: conteudoAvisos, mostrar: permissoes.canCreate },
      { id: 'acessos', nome: 'Permissões', icone: ShieldCheck, conteudo: <AcessosSensiveis identidade={identidade} />, mostrar: perfil === Perfil.ADMINISTRADOR },
    ].filter(a => a.mostrar)} />
  </div>
}
