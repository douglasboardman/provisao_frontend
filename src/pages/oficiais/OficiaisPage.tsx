import { Link } from 'react-router'
import { useCanAccessModule } from '../../hooks/use-permissions'
import { SeletorPessoa } from '../../components/shared/SeletorPessoa'
import { UsersRound, CalendarClock, BellRing, Vote, ShieldCheck, LayoutList } from 'lucide-react'
import { WorkspaceHeader } from '../../components/shared/Workspace'
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
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { useAuthStore } from '../../stores/auth'
import { useRecurso } from '../../lib/recursos'
import { EleicaoOficiais } from './EleicaoOficiais'

const tipos: Record<OficialResumo['tipo'], string> = { DIACONO: 'Diácono', PRESBITERO_REGENTE: 'Presbítero regente', PRESBITERO_DOCENTE: 'Presbítero docente' }
const situacoes = { EM_EXERCICIO: 'Em exercício', FORA_DE_EXERCICIO: 'Fora de exercício', INDETERMINADA: 'Histórico incompleto ou ambíguo' }
function dataLocal() { const hoje = new Date(); return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}` }
function dataCivil(valor: string) { return valor.slice(0, 10).split('-').reverse().join('/') }

export function OficiaisPage() {
  const queryClient = useQueryClient()
  const perfil = useAuthStore(s => s.user?.perfil)
  const auditor = perfil === Perfil.AUDITOR
  const comum = perfil === Perfil.COMUM
  const ficha = useCanAccessModule('orgaos')
  const secretaria = useRecurso('secretaria')
  const [area, setArea] = useState('quadro')
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
  const lista = useQuery({ queryKey: ['oficiais', identidade, cursor], queryFn: () => oficiaisApi.listar(cursor) })
  const exercicio = useQuery({ queryKey: ['oficiais', identidade, 'exercicio', selecionado?.id, data], queryFn: () => oficiaisApi.exercicio(selecionado!.id, data), enabled: !auditor && !!selecionado && !!data })
  const vigentes = useQuery({ queryKey: ['oficiais', identidade, 'vigentes', data], queryFn: () => oficiaisApi.vigentes(data), enabled: !auditor && !!data })
  const alertas = useQuery({ queryKey: ['oficiais', identidade, 'alertas', data], queryFn: () => oficiaisApi.alertas(data, 90), enabled: !auditor && !comum && !!data })
  function abrirRegistro(item: OficialResumo, painel: 'exercicio' | 'gestao' | 'restrito') {
    setSelecionado(painel === 'exercicio' ? item : null)
    setGerenciar(painel === 'gestao' ? item : null)
    setRestrito(painel === 'restrito' ? item : null)
    requestAnimationFrame(() => document.getElementById('painel-oficial')?.focus())
  }
  function proxima() { if (!lista.data?.proximo_cursor) return; setAnteriores(a => [...a, cursor]); setCursor(lista.data.proximo_cursor); setSelecionado(null); setGerenciar(null); setRestrito(null) }
  function anterior() { const itens = [...anteriores]; setCursor(itens.pop()); setAnteriores(itens); setSelecionado(null); setGerenciar(null); setRestrito(null) }
  return <div className="workspace"><WorkspaceHeader icon={UsersRound} title="Oficiais" description="Quadro de mandatos, exercício e registros eleitorais." />
    <nav aria-label="Áreas de oficiais" className="flex flex-wrap gap-2">{[
      {id:'quadro', nome:'Quadro de oficiais', icon:LayoutList, mostrar:true},
      {id:'eleicao', nome:'Processo eleitoral', icon:Vote, mostrar:!auditor && !comum && secretaria},
      {id:'avisos', nome:'Avisos e prazos', icon:BellRing, mostrar:!auditor && !comum},
      {id:'acessos', nome:'Permissões', icon:ShieldCheck, mostrar:perfil === Perfil.ADMINISTRADOR},
    ].filter(a => a.mostrar).map(a => <Button key={a.id} aria-pressed={area === a.id} variant={area === a.id ? 'default' : 'outline'} onClick={() => setArea(a.id)}><a.icon />{a.nome}</Button>)}</nav>
    {(area === 'quadro' || area === 'avisos') && !auditor && <div className="max-w-xs space-y-2"><Label htmlFor="referencia-oficiais">Data de referência</Label><Input id="referencia-oficiais" type="date" value={data} onChange={e => setData(e.target.value)} /></div>}
    {area === 'quadro' && <>{!auditor && <section className="surface space-y-4"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-xl font-semibold"><CalendarClock className="text-purple" />Mandatos vigentes</h2>{vigentes.data && <span className="pill">{vigentes.data.length} na data</span>}</div>
    {!data ? <p>Selecione a data de referência.</p> : vigentes.isPending ? <p>Consultando mandatos…</p> : vigentes.isError ? <p role="alert">Não foi possível consultar os mandatos.</p> : !vigentes.data.length ? <p className="text-sm text-muted-foreground">Nenhum mandato no período selecionado.</p> :
    <div className="overflow-x-auto"><table className="record-table"><thead><tr><th>Oficial</th><th>Posse</th><th>Término</th><th>Período cumprido</th></tr></thead><tbody>{vigentes.data.map(m => {
      const inicio = Date.parse(m.data_posse.slice(0,10))
      const fim = Date.parse((m.termino_efetivo ?? m.termino_previsto).slice(0,10))
      const percentual = fim <= inicio ? 100 : Math.max(0, Math.min(100, Math.round(100 * (Date.parse(data) - inicio) / (fim - inicio))))
      return <tr key={m.id}><td data-label="Oficial"><strong>{m.oficial.pessoa.nome_completo}</strong><p className="text-xs text-muted-foreground">{tipos[m.oficial.tipo]}</p></td><td data-label="Posse">{dataCivil(m.data_posse)}</td><td data-label="Término">{dataCivil(m.termino_efetivo ?? m.termino_previsto)}</td><td data-label="Período cumprido"><div className="flex items-center gap-2"><progress aria-label={'Mandato de ' + m.oficial.pessoa.nome_completo} value={percentual} max={100} className="w-24 accent-purple" /><span>{percentual}%</span></div></td></tr>
    })}</tbody></table></div>}</section>}
    <section className="surface space-y-3"><h2 className="text-lg font-semibold">Ofícios registrados</h2>
      {ficha && <Button asChild variant="outline"><Link to="/orgaos">Registrar mandato na ficha do órgão</Link></Button>}
      {!auditor && !comum && <Button type="button" variant="ghost" onClick={() => { cadastrar.reset(); setHistorico(false); setFormAberto(!formAberto) }}>{formAberto ? 'Cancelar' : 'Registrar ofício'}</Button>}
      {formAberto && <form className="max-w-xl space-y-3 rounded border p-4" onSubmit={e => { e.preventDefault(); if (pessoaId) cadastrar.mutate({ pessoa_id: pessoaId, tipo, ...(historico ? { ativo: false } : {}) }) }}>
        <p className="text-sm text-muted-foreground">O registro do ofício não cria ordenação, mandato ou competência.</p>
        <div className="space-y-1"><Label htmlFor="pessoa-oficial">Pessoa</Label><SeletorPessoa id="pessoa-oficial" value={pessoaId} onChange={id => setPessoaId(id)} required opcoes={pessoas.data?.map(p => ({ id: p.id, nome: p.nome_completo }))} />{pessoas.isError && <p role="alert">Não foi possível carregar as pessoas.</p>}</div>
        <div className="space-y-1"><Label htmlFor="tipo-oficial">Ofício</Label><select id="tipo-oficial" className="w-full rounded border bg-background p-2" value={tipo} onChange={e => setTipo(e.target.value as OficialResumo['tipo'])}>{Object.entries(tipos).map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}</select></div>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={historico} onChange={e => setHistorico(e.target.checked)} />
          Registrar como inativo
        </label>
        {cadastrar.isError && <p role="alert">{cadastrar.error instanceof ApiRequestError ? cadastrar.error.messages.join(' ') : 'Não foi possível registrar o ofício.'}</p>}
        <Button type="submit" disabled={!pessoaId || cadastrar.isPending}>Salvar ofício</Button>
      </form>}
      {lista.isPending && <p>Carregando oficiais...</p>}
      {lista.isError && <p role="alert">Não foi possível consultar os oficiais.</p>}
      {lista.data?.itens.length === 0 && <p>Nenhum oficial registrado.</p>}
      {lista.data?.itens.map(item => {
        const ativo = item.ativo !== false
        return <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4"><div className="flex items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-purple-muted font-bold text-purple">{item.pessoa.nome_completo.slice(0,1)}</span>
          <div>
            <p className="font-medium">{item.pessoa.nome_completo}</p>
            <p className="text-sm text-muted-foreground">{tipos[item.tipo]} · {ativo ? 'Cadastro ativo' : 'Cadastro inativo'}</p></div>
          </div>
          <div className="flex flex-wrap gap-2">
            {!auditor && <>
              {!comum && <Button type="button" variant="outline" disabled={alterarSituacao.isPending} onClick={() => alterarSituacao.mutate({ id: item.id, ativo: !ativo })}>{ativo ? 'Inativar cadastro' : 'Ativar cadastro'}</Button>}
              <Button type="button" variant="outline" onClick={() => abrirRegistro(item, 'exercicio')}>Consultar exercício</Button>
              {(!comum || historicoPermitido) && <Button type="button" variant="outline" onClick={() => abrirRegistro(item, 'gestao')}>Gerir registros</Button>}
            </>}
            {(acesso.data?.pode_consultar || acesso.data?.pode_registrar) && <Button type="button" variant="outline" onClick={() => abrirRegistro(item, 'restrito')}>Eventos restritos</Button>}
          </div>
        </div>
      })}
      {alterarSituacao.isError && <p role="alert">{alterarSituacao.error instanceof ApiRequestError ? alterarSituacao.error.messages.join(' ') : 'Não foi possível alterar a situação do ofício.'}</p>}
      <div className="flex gap-2"><Button type="button" variant="outline" disabled={!anteriores.length} onClick={anterior}>Anterior</Button><Button type="button" variant="outline" disabled={!lista.data?.proximo_cursor} onClick={proxima}>Próxima</Button></div>
    </section>
    {acesso.isError && <p role="alert">Não foi possível verificar o acesso a eventos restritos.</p>}
    {(selecionado || gerenciar || restrito) && <div id="painel-oficial" tabIndex={-1} className="space-y-3"><Button variant="outline" onClick={() => { setSelecionado(null); setGerenciar(null); setRestrito(null) }}>Fechar consulta</Button>
    {selecionado && <section className="space-y-2 rounded border p-4" aria-live="polite"><h2 className="font-semibold">Exercício de {selecionado.pessoa.nome_completo}</h2>{!data ? <p>Informe a data de referência.</p> : exercicio.isPending ? <p>Consultando...</p> : exercicio.isError ? <p role="alert">Não foi possível consultar o exercício.</p> : <p>{situacoes[exercicio.data!.situacao]} em {dataCivil(exercicio.data!.data_referencia)}.</p>}{exercicio.data?.revisao_pendente && <p role="status">Mandato pendente de revisão institucional.</p>}<p className="text-sm text-muted-foreground">O exercício cadastrado não substitui a verificação de competência para um ato.</p></section>}
    {restrito && acesso.data && <EventosSensiveis key={restrito.id} oficial={restrito} identidade={identidade} acesso={acesso.data} />}
    {gerenciar && <GestaoOficial key={gerenciar.id} oficial={gerenciar} identidade={identidade} podeConsultarDetalhe={!!acesso.data?.pode_consultar} acesso={acesso.data} />}
    </div>}
    </>}
    {area === 'eleicao' && !auditor && secretaria && <EleicaoOficiais identidade={identidade} key={identidade} />}
    {area === 'avisos' && !auditor && <AlertasOperacionais identidade={identidade} />}
    {area === 'avisos' && perfil === Perfil.ADMINISTRADOR && <ConfiguracaoAlertas identidade={identidade} />}
    {area === 'acessos' && perfil === Perfil.ADMINISTRADOR && <AcessosSensiveis identidade={identidade} />}
    {area === 'avisos' && !auditor && <section className="surface space-y-2"><h2 className="text-lg font-semibold">Términos nos próximos 90 dias</h2>
      {!data ? <p>Informe a data de referência.</p> : alertas.isPending ? <p>Carregando alertas...</p> : alertas.isError ? <p role="alert">Não foi possível consultar os alertas.</p> : alertas.data?.length ? alertas.data.map(a => <p key={a.id}>{a.oficial.pessoa.nome_completo} — {a.natureza === 'TERMINO_PREVISTO' ? 'término previsto' : 'encerramento registrado'} em {dataCivil(a.data_alerta)}.</p>) : <p>Nenhum término no período.</p>}
    </section>}
  </div>
}
