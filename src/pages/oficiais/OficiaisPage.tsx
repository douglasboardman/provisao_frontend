import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ConfiguracaoAlertas } from './ConfiguracaoAlertas'
import { AlertasOperacionais } from './AlertasOperacionais'
import { AcessosSensiveis } from './AcessosSensiveis'
import { EventosSensiveis } from './EventosSensiveis'
import { Perfil } from '../../types/enums'
import { GestaoOficial } from './GestaoOficial'
import { pessoasApi } from '../../api/pessoas'
import { oficiaisApi, type OficialResumo } from '../../api/oficiais'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
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
  const [restrito, setRestrito] = useState<OficialResumo | null>(null)
  const [formAberto, setFormAberto] = useState(false)
  const [pessoaId, setPessoaId] = useState('')
  const [tipo, setTipo] = useState<OficialResumo['tipo']>('DIACONO')
  const identidade = useAuthStore(s => `${s.user?.igreja_id ?? ''}:${s.user?.sub ?? ''}`)
  const [data, setData] = useState(dataLocal)
  const [cursor, setCursor] = useState<string | undefined>()
  const [anteriores, setAnteriores] = useState<(string | undefined)[]>([])
  const [gerenciar, setGerenciar] = useState<OficialResumo | null>(null)
  const [selecionado, setSelecionado] = useState<OficialResumo | null>(null)
  const acesso = useQuery({ queryKey: ['oficiais', identidade, 'meu-acesso'], queryFn: oficiaisApi.meuAcesso, staleTime: 0, gcTime: 0 })
  const pessoas = useQuery({ queryKey: ['oficiais', identidade, 'pessoas'], queryFn: pessoasApi.list, enabled: formAberto })
  const cadastrar = useMutation({ mutationFn: oficiaisApi.cadastrar, onSuccess: async () => { setPessoaId(''); setFormAberto(false); setCursor(undefined); setAnteriores([]); await queryClient.invalidateQueries({ queryKey: ['oficiais', identidade] }) } })
  const lista = useQuery({ queryKey: ['oficiais', identidade, cursor], queryFn: () => oficiaisApi.listar(cursor) })
  const exercicio = useQuery({ queryKey: ['oficiais', identidade, 'exercicio', selecionado?.id, data], queryFn: () => oficiaisApi.exercicio(selecionado!.id, data), enabled: !auditor && !!selecionado && !!data })
  const alertas = useQuery({ queryKey: ['oficiais', identidade, 'alertas', data], queryFn: () => oficiaisApi.alertas(data, 90), enabled: !auditor && !!data })
  function proxima() { if (!lista.data?.proximo_cursor) return; setAnteriores(a => [...a, cursor]); setCursor(lista.data.proximo_cursor); setSelecionado(null) }
  function anterior() { const itens = [...anteriores]; setCursor(itens.pop()); setAnteriores(itens); setSelecionado(null) }
  return <main className="space-y-6 p-6">
    <div><h1 className="text-2xl font-semibold">Oficiais</h1><p className="text-sm text-muted-foreground">Consulta de registros e períodos de exercício.</p></div>
    <div className="max-w-xs space-y-2"><Label htmlFor="referencia-oficiais">Data de referência</Label><Input id="referencia-oficiais" type="date" value={data} onChange={e => setData(e.target.value)} /></div>
    <section className="space-y-3"><h2 className="text-lg font-semibold">Ofícios registrados</h2>
      {!auditor && <Button type="button" variant="outline" onClick={() => { cadastrar.reset(); setFormAberto(!formAberto) }}>{formAberto ? 'Cancelar' : 'Registrar ofício'}</Button>}
      {formAberto && <form className="max-w-xl space-y-3 rounded border p-4" onSubmit={e => { e.preventDefault(); if (pessoaId) cadastrar.mutate({ pessoa_id: pessoaId, tipo }) }}>
        <p className="text-sm text-muted-foreground">O registro do ofício não cria ordenação, mandato ou competência.</p>
        <div className="space-y-1"><Label htmlFor="pessoa-oficial">Pessoa</Label><select id="pessoa-oficial" className="w-full rounded border bg-background p-2" value={pessoaId} onChange={e => setPessoaId(e.target.value)} required><option value="">Selecione a pessoa</option>{pessoas.data?.map(p => <option key={p.id} value={p.id}>{p.nome_completo}</option>)}</select>{pessoas.isError && <p role="alert">Não foi possível carregar as pessoas.</p>}</div>
        <div className="space-y-1"><Label htmlFor="tipo-oficial">Ofício</Label><select id="tipo-oficial" className="w-full rounded border bg-background p-2" value={tipo} onChange={e => setTipo(e.target.value as OficialResumo['tipo'])}>{Object.entries(tipos).map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}</select></div>
        {cadastrar.isError && <p role="alert">Não foi possível registrar o ofício. Verifique se a pessoa já possui esse registro.</p>}
        <Button type="submit" disabled={!pessoaId || cadastrar.isPending}>Salvar ofício</Button>
      </form>}
      {lista.isPending && <p>Carregando oficiais...</p>}
      {lista.isError && <p role="alert">Não foi possível consultar os oficiais.</p>}
      {lista.data?.itens.length === 0 && <p>Nenhum oficial registrado.</p>}
      {lista.data?.itens.map(item => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded border p-3"><div><p className="font-medium">{item.pessoa.nome_completo}</p><p className="text-sm text-muted-foreground">{tipos[item.tipo]}</p></div><div className="flex flex-wrap gap-2">{!auditor && <><Button type="button" variant="outline" onClick={() => setSelecionado(item)}>Consultar exercício</Button><Button type="button" variant="outline" onClick={() => setGerenciar(item)}>Gerir registros</Button></>}{(acesso.data?.pode_consultar || acesso.data?.pode_registrar) && <Button type="button" variant="outline" onClick={() => setRestrito(item)}>Eventos restritos</Button>}</div></div>)}
      <div className="flex gap-2"><Button type="button" variant="outline" disabled={!anteriores.length} onClick={anterior}>Anterior</Button><Button type="button" variant="outline" disabled={!lista.data?.proximo_cursor} onClick={proxima}>Próxima</Button></div>
    </section>
    {selecionado && <section className="space-y-2 rounded border p-4" aria-live="polite"><h2 className="font-semibold">Exercício de {selecionado.pessoa.nome_completo}</h2>{!data ? <p>Informe a data de referência.</p> : exercicio.isPending ? <p>Consultando...</p> : exercicio.isError ? <p role="alert">Não foi possível consultar o exercício.</p> : <p>{situacoes[exercicio.data!.situacao]} em {dataCivil(exercicio.data!.data_referencia)}.</p>}{exercicio.data?.revisao_pendente && <p role="status">Mandato pendente de revisão institucional.</p>}<p className="text-sm text-muted-foreground">O exercício cadastrado não substitui a verificação de competência para um ato.</p></section>}
    {!auditor && <AlertasOperacionais identidade={identidade} />}
    {perfil === Perfil.ADMINISTRADOR && <ConfiguracaoAlertas identidade={identidade} />}
    {perfil === Perfil.ADMINISTRADOR && <AcessosSensiveis identidade={identidade} />}
    {acesso.isError && <p role="alert">Não foi possível verificar o acesso a eventos restritos.</p>}
    {restrito && acesso.data && <EventosSensiveis key={restrito.id} oficial={restrito} identidade={identidade} acesso={acesso.data} />}
    {gerenciar && <GestaoOficial key={gerenciar.id} oficial={gerenciar} identidade={identidade} podeConsultarDetalhe={!!acesso.data?.pode_consultar} />}
    {!auditor && <section className="space-y-2"><h2 className="text-lg font-semibold">Términos nos próximos 90 dias</h2>
      {!data ? <p>Informe a data de referência.</p> : alertas.isPending ? <p>Carregando alertas...</p> : alertas.isError ? <p role="alert">Não foi possível consultar os alertas.</p> : alertas.data?.length ? alertas.data.map(a => <p key={a.id}>{a.oficial.pessoa.nome_completo} — {a.natureza === 'TERMINO_PREVISTO' ? 'término previsto' : 'encerramento registrado'} em {dataCivil(a.data_alerta)}.</p>) : <p>Nenhum término no período.</p>}
    </section>}
  </main>
}
