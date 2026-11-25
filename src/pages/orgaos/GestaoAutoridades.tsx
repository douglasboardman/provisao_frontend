import { ConferenciaPresidencia } from '../configuracoes/AtuacaoConta'
import { SeletorPessoa } from '../../components/shared/SeletorPessoa'
import { useHojeIgreja } from './RelogioIgreja'
import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiRequestError } from '../../api/client'
import { gestaoOrgaosApi } from '../../api/orgaos'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'

function dataCivil(v: string) { return v.slice(0, 10).split('-').reverse().join('/') }

function EncerrarAutoridade({ tipo, id, identidade, aoFechar }: { tipo: 'competencia' | 'presidencia'; id: string; identidade: string; aoFechar: () => void }) {
  const hoje = useHojeIgreja()
  const [data, setData] = useState(hoje), [autoridade, setAutoridade] = useState(''), [evidencia, setEvidencia] = useState('')
  const tentativa = useRef<{ conteudo: string; id: string } | null>(null)
  const queryClient = useQueryClient()
  const encerrar = useMutation({ mutationFn: async () => {
    const comum = { autoridade: autoridade.trim(), evidencia: evidencia.trim() }
    const corpo = tipo === 'competencia' ? { ...comum, data_fim: data } : { ...comum, data_efeito: data }
    const conteudo = JSON.stringify({ tipo, id, corpo })
    if (tentativa.current?.conteudo !== conteudo) tentativa.current = { conteudo, id: crypto.randomUUID() }
    return tipo === 'competencia'
      ? gestaoOrgaosApi.encerrarCompetencia(id, { ...comum, data_fim: data, idempotencia: tentativa.current.id })
      : gestaoOrgaosApi.encerrarPresidencia(id, { ...comum, data_efeito: data, idempotencia: tentativa.current.id })
  }, onSuccess: async () => { tentativa.current = null; await queryClient.invalidateQueries({ queryKey: ['orgaos', identidade] }); aoFechar() } })
  return <form className="max-w-xl space-y-3 rounded border p-4" onSubmit={e => { e.preventDefault(); encerrar.mutate() }}>
    <h3 className="font-semibold">Encerrar {tipo === 'competencia' ? 'competência' : 'presidência'}</h3>
    <p className="text-sm text-muted-foreground">O encerramento exige autoridade e evidência. Os registros anteriores permanecem no histórico.</p>
    <div className="space-y-1"><Label htmlFor={`${tipo}-fim-data`}>Data de efeito</Label><Input id={`${tipo}-fim-data`} type="date" value={data} onChange={e => setData(e.target.value)} required /></div>
    <div className="space-y-1"><Label htmlFor={`${tipo}-fim-autoridade`}>Autoridade do encerramento</Label><Input id={`${tipo}-fim-autoridade`} value={autoridade} onChange={e => setAutoridade(e.target.value)} maxLength={255} required /></div>
    <div className="space-y-1"><Label htmlFor={`${tipo}-fim-evidencia`}>Evidência do encerramento</Label><Input id={`${tipo}-fim-evidencia`} value={evidencia} onChange={e => setEvidencia(e.target.value)} maxLength={1000} required /></div>
    {encerrar.isError && <p role="alert">{encerrar.error instanceof ApiRequestError ? encerrar.error.messages.join(' ') : 'Não foi possível encerrar o registro.'}</p>}
    <div className="flex gap-2"><Button type="submit" disabled={encerrar.isPending}>Confirmar encerramento</Button><Button type="button" variant="outline" onClick={aoFechar}>Cancelar</Button></div>
  </form>
}

function RegistrarPresidencia({ identidade, aoFechar }: { identidade: string; aoFechar: () => void }) {
  const hoje = useHojeIgreja()
  const [oficial, setOficial] = useState(''), [inicio, setInicio] = useState(hoje), [evidencia, setEvidencia] = useState('')
  const tentativa = useRef<{ conteudo: string; id: string } | null>(null)
  const queryClient = useQueryClient()
  const docentes = useQuery({
    queryKey: ['orgaos', identidade, 'docentes'], gcTime: 0,
    queryFn: async () => {
      let pagina = await gestaoOrgaosApi.docentes()
      const itens = [...pagina.itens]
      while (pagina.proximo_cursor) {
        pagina = await gestaoOrgaosApi.docentes(pagina.proximo_cursor)
        itens.push(...pagina.itens)
      }
      return itens
    },
  })
  const salvar = useMutation({ mutationFn: async () => {
    const corpo = { oficial_id: oficial, inicio, evidencia: evidencia.trim() }, conteudo = JSON.stringify(corpo)
    if (tentativa.current?.conteudo !== conteudo) tentativa.current = { conteudo, id: crypto.randomUUID() }
    return gestaoOrgaosApi.registrarPresidencia({ ...corpo, idempotencia: tentativa.current.id })
  }, onSuccess: async () => { tentativa.current = null; await queryClient.invalidateQueries({ queryKey: ['orgaos', identidade] }); aoFechar() } })
  return <form className="max-w-xl space-y-3 rounded border p-4" onSubmit={e => { e.preventDefault(); salvar.mutate() }}>
    <h3 className="font-semibold">Registrar presidência institucional</h3>
    <p className="text-sm text-muted-foreground">O registro exige presbítero docente com vínculo pastoral institucional e exercício comprovado. Informe a evidência da presidência.</p>
    <div className="space-y-1"><Label htmlFor="presidencia-docente">Presbítero docente</Label><SeletorPessoa id="presidencia-docente" value={oficial} onChange={id => setOficial(id)} required opcoes={docentes.data?.map(o => ({ id: o.id, nome: o.pessoa.nome_completo }))} />{docentes.isError && <p role="alert">Não foi possível carregar os docentes.</p>}</div>
    <div className="space-y-1"><Label htmlFor="presidencia-inicio">Início da presidência</Label><Input id="presidencia-inicio" type="date" value={inicio} onChange={e => setInicio(e.target.value)} required /></div>
    <div className="space-y-1"><Label htmlFor="presidencia-evidencia">Evidência da presidência</Label><Input id="presidencia-evidencia" value={evidencia} onChange={e => setEvidencia(e.target.value)} maxLength={1000} required /></div>
    {salvar.isError && <p role="alert">{salvar.error instanceof ApiRequestError ? salvar.error.messages.join(' ') : 'Não foi possível registrar a presidência.'}</p>}
    <div className="flex gap-2"><Button type="submit" disabled={salvar.isPending || !oficial}>Salvar presidência</Button><Button type="button" variant="outline" onClick={aoFechar}>Cancelar</Button></div>
  </form>
}

export function GestaoAutoridades({ identidade }: { identidade: string }) {
  const hoje = useHojeIgreja()
  const [aberto, setAberto] = useState(false), [registrar, setRegistrar] = useState(false)
  const [encerrando, setEncerrando] = useState<{ tipo: 'competencia' | 'presidencia'; id: string } | null>(null)
  const [cursorC, setCursorC] = useState<string | undefined>(), [anterioresC, setAnterioresC] = useState<(string | undefined)[]>([])
  const [cursorP, setCursorP] = useState<string | undefined>(), [anterioresP, setAnterioresP] = useState<(string | undefined)[]>([])
  const competencias = useQuery({ queryKey: ['orgaos', identidade, 'autoridades', 'competencias', cursorC], queryFn: () => gestaoOrgaosApi.competencias(cursorC), enabled: aberto, staleTime: 0, gcTime: 0 })
  const presidencias = useQuery({ queryKey: ['orgaos', identidade, 'autoridades', 'presidencias', cursorP], queryFn: () => gestaoOrgaosApi.presidencias(cursorP), enabled: aberto, staleTime: 0, gcTime: 0 })
  function proxima(tipo: 'c' | 'p') {
    if (tipo === 'c' && competencias.data?.proximo_cursor) { setAnterioresC(a => [...a, cursorC]); setCursorC(competencias.data.proximo_cursor) }
    if (tipo === 'p' && presidencias.data?.proximo_cursor) { setAnterioresP(a => [...a, cursorP]); setCursorP(presidencias.data.proximo_cursor) }
    setEncerrando(null)
  }
  function anterior(tipo: 'c' | 'p') {
    if (tipo === 'c') { const lista = [...anterioresC]; setCursorC(lista.pop()); setAnterioresC(lista) }
    else { const lista = [...anterioresP]; setCursorP(lista.pop()); setAnterioresP(lista) }
    setEncerrando(null)
  }
  return <section className="space-y-3">
    <Button type="button" variant="outline" onClick={() => { setAberto(v => !v); setEncerrando(null); setRegistrar(false) }}>{aberto ? 'Fechar autoridades institucionais' : 'Consultar autoridades institucionais'}</Button>
    {aberto && <div className="space-y-5 rounded border p-4">
      <p className="text-sm text-muted-foreground">Um registro aberto não comprova, sozinho, competência atual: também são conferidos o vínculo, a vigência e o exercício pastoral aplicáveis.</p>
      <div className="space-y-2"><h2 className="font-semibold">Competências de gestores</h2>
        {competencias.isPending ? <p>Carregando competências...</p> : competencias.isError ? <p role="alert">Não foi possível consultar competências.</p> : competencias.data?.itens.length ? competencias.data.itens.map(c => <div key={c.id} className="rounded border p-3"><p>{c.usuario.nome_usuario} · pessoa: {c.pessoa.nome_completo}</p><p className="text-sm text-muted-foreground">Início {dataCivil(c.inicio)} · {c.fim ? (c.fim.slice(0, 10) === c.inicio.slice(0, 10) ? 'sem período de vigência' : `primeiro dia sem competência: ${dataCivil(c.fim)}`) : 'registro aberto'}{!c.usuario.ativo || c.usuario.perfil !== 'GESTOR' || c.usuario.pessoa_id !== c.pessoa_id ? ' · vínculo atual precisa de conferência' : ''}</p>{(!c.fim || (c.fim.slice(0, 10) > hoje && c.fim.slice(0, 10) > c.inicio.slice(0, 10))) && <Button type="button" variant="outline" onClick={() => { setRegistrar(false); setEncerrando({ tipo: 'competencia', id: c.id }) }}>Encerrar competência de {c.usuario.nome_usuario}</Button>}</div>) : <p>Nenhuma competência registrada.</p>}
        <div className="flex gap-2"><Button type="button" variant="outline" disabled={!anterioresC.length} onClick={() => anterior('c')}>Competências anteriores</Button><Button type="button" variant="outline" disabled={!competencias.data?.proximo_cursor} onClick={() => proxima('c')}>Próximas competências</Button></div>
      </div>
      <div className="space-y-2"><h2 className="font-semibold">Presidências do Conselho</h2>
        {presidencias.isPending ? <p>Carregando presidências...</p> : presidencias.isError ? <p role="alert">Não foi possível consultar presidências.</p> : presidencias.data?.itens.length ? presidencias.data.itens.map(p => <div key={p.id} className="rounded border p-3"><p>{p.oficial.pessoa.nome_completo}</p><p className="text-sm text-muted-foreground">Início {dataCivil(p.inicio)} · {p.fim ? `encerrada em ${dataCivil(p.fim)}` : 'registro aberto'}</p>{!p.fim && <ConferenciaPresidencia id={p.id}/>}{!p.fim && <Button type="button" variant="outline" onClick={() => { setRegistrar(false); setEncerrando({ tipo: 'presidencia', id: p.id }) }}>Encerrar presidência de {p.oficial.pessoa.nome_completo}</Button>}</div>) : <p>Nenhuma presidência registrada.</p>}
        <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={!anterioresP.length} onClick={() => anterior('p')}>Presidências anteriores</Button><Button type="button" variant="outline" disabled={!presidencias.data?.proximo_cursor} onClick={() => proxima('p')}>Próximas presidências</Button><Button type="button" variant="outline" onClick={() => { setRegistrar(true); setEncerrando(null) }}>Registrar presidência</Button></div>
      </div>
      {registrar && <RegistrarPresidencia identidade={identidade} aoFechar={() => setRegistrar(false)} />}
      {encerrando && <EncerrarAutoridade key={`${encerrando.tipo}:${encerrando.id}`} tipo={encerrando.tipo} id={encerrando.id} identidade={identidade} aoFechar={() => setEncerrando(null)} />}
    </div>}
  </section>
}
