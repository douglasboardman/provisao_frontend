import { PainelLocal, SecaoPainel } from '../../components/shared/Painel'
import { SeletorPessoa } from '../../components/shared/SeletorPessoa'
import { useHojeIgreja } from './RelogioIgreja'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiRequestError } from '../../api/client'
import { gestaoOrgaosApi, type DetalheOrgao } from '../../api/orgaos'
import { pessoasApi } from '../../api/pessoas'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { useIdempotencia } from './useIdempotencia'

function dataCivil(v: string) { return v.slice(0, 10).split('-').reverse().join('/') }

export function EleicaoCargo({ orgaoId, identidade, tipo, cargos, politicas }: { orgaoId: string; identidade: string; tipo: 'oficial' | 'unidade'; cargos: DetalheOrgao['cargos_configurados']; politicas: DetalheOrgao['politicas'] }) {
  const hoje = useHojeIgreja()
  const [aberto, setAberto] = useState(false), [cargo, setCargo] = useState(''), [pessoa, setPessoa] = useState(''), [politica, setPolitica] = useState(''), [eleicao, setEleicao] = useState(hoje), [posse, setPosse] = useState(hoje), [termino, setTermino] = useState(''), [autoridade, setAutoridade] = useState(''), [evidencia, setEvidencia] = useState(''), [mensagem, setMensagem] = useState('')
  const chave = useIdempotencia(), queryClient = useQueryClient()
  const pessoas = useQuery({ queryKey: ['orgaos', identidade, 'pessoas'], queryFn: pessoasApi.list, enabled: aberto, gcTime: 0 })
  const salvar = useMutation({ mutationFn: async () => {
    const corpo = { pessoa_id: pessoa, data_eleicao: eleicao, data_posse: posse, termino_previsto: termino, autoridade: autoridade.trim(), evidencia: evidencia.trim(), ...(tipo === 'unidade' ? { politica_id: politica } : {}) }
    return gestaoOrgaosApi.registrarEleicao(orgaoId, cargo, tipo, { ...corpo, idempotencia: chave.obter({ orgaoId, cargo, tipo, corpo }) })
  }, onSuccess: async () => { chave.limpar(); setAberto(false); setCargo(''); setPessoa(''); setPolitica(''); setTermino(''); setAutoridade(''); setEvidencia(''); setMensagem('Eleição e posse registradas.'); await queryClient.invalidateQueries({ queryKey: ['orgaos', identidade] }) } })
  return <PainelLocal><div className="space-y-3">
    <Button type="button" variant="outline" onClick={() => { if (!aberto) { setEleicao(hoje); setPosse(hoje) } salvar.reset(); setMensagem(''); setAberto(true) }}>Atribuir cargo por eleição</Button>
    {mensagem && <p role="status">{mensagem}</p>}
    {aberto && <SecaoPainel titulo="Atribuir cargo por eleição e posse" voltar={() => setAberto(false)} ocupado={salvar.isPending}>
      <form className="max-w-xl space-y-3" onSubmit={e => { e.preventDefault(); salvar.mutate() }}>
      <p className="text-sm text-muted-foreground">Registre uma eleição já realizada e a posse. A API confere elegibilidade, prazo e acumulação; o registro não substitui a deliberação competente.</p>
      <div className="space-y-1"><Label htmlFor="eleicao-cargo">Cargo eleito</Label><select id="eleicao-cargo" className="w-full rounded border bg-background p-2" value={cargo} onChange={e => setCargo(e.target.value)} required><option value="">Selecione o cargo</option>{cargos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
      <div className="space-y-1"><Label htmlFor="eleicao-pessoa">Pessoa eleita</Label><SeletorPessoa id="eleicao-pessoa" value={pessoa} onChange={id => setPessoa(id)} required opcoes={pessoas.data?.map(p => ({ id: p.id, nome: p.nome_completo }))} />{pessoas.isError && <p role="alert">Não foi possível carregar as pessoas.</p>}</div>
      {tipo === 'unidade' && <div className="space-y-1"><Label htmlFor="eleicao-politica">Política aplicável</Label><select id="eleicao-politica" className="w-full rounded border bg-background p-2" value={politica} onChange={e => setPolitica(e.target.value)} required><option value="">Selecione a política</option>{politicas.map(p => <option key={p.id} value={p.id}>{p.versao} · {dataCivil(p.inicio)} a {dataCivil(p.fim)}</option>)}</select></div>}
      <div className="space-y-1"><Label htmlFor="eleicao-data">Data da eleição</Label><Input id="eleicao-data" type="date" value={eleicao} onChange={e => setEleicao(e.target.value)} required /></div>
      <div className="space-y-1"><Label htmlFor="eleicao-posse">Data da posse</Label><Input id="eleicao-posse" type="date" value={posse} onChange={e => setPosse(e.target.value)} required /></div>
      <div className="space-y-1"><Label htmlFor="eleicao-termino">Último dia previsto</Label><Input id="eleicao-termino" type="date" value={termino} onChange={e => setTermino(e.target.value)} required /></div>
      <div className="space-y-1"><Label htmlFor="eleicao-autoridade">Autoridade da eleição</Label><Input id="eleicao-autoridade" value={autoridade} onChange={e => setAutoridade(e.target.value)} maxLength={255} required /></div>
      <div className="space-y-1"><Label htmlFor="eleicao-evidencia">Evidência da eleição e posse</Label><Input id="eleicao-evidencia" value={evidencia} onChange={e => setEvidencia(e.target.value)} maxLength={1000} required /></div>
      {salvar.isError && <p role="alert">{salvar.error instanceof ApiRequestError ? salvar.error.messages.join(' ') : 'Não foi possível registrar a eleição.'}</p>}
      <Button type="submit" disabled={salvar.isPending || !cargo || !pessoa || (tipo === 'unidade' && !politica) || !!(eleicao && posse && eleicao > posse) || !!(posse && termino && posse > termino)}>Salvar eleição e posse</Button>
    </form>
    </SecaoPainel>}
  </div></PainelLocal>
}
