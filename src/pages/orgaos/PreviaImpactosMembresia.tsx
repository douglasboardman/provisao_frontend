import { SeletorPessoa } from '../../components/shared/SeletorPessoa'
import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { gestaoOrgaosApi } from '../../api/orgaos'
import { pessoasApi } from '../../api/pessoas'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { DecisaoOrgao } from '../oficiais/DecisaoOrgao'

const exibir = (data: string) => data.slice(0, 10).split('-').reverse().join('/')

export function PreviaImpactosMembresia({ identidade }: { identidade: string }) {
  const [aberto, setAberto] = useState(false), [pessoa, setPessoa] = useState(''), [evento, setEvento] = useState(''), [data, setData] = useState('')
  const [cursorEvento, setCursorEvento] = useState<string | undefined>(), [anterioresEventos, setAnterioresEventos] = useState<(string | undefined)[]>([])
  const [cursorParticipacao, setCursorParticipacao] = useState<string | undefined>(), [anterioresParticipacoes, setAnterioresParticipacoes] = useState<(string | undefined)[]>([])
  const [cursorOcupacao, setCursorOcupacao] = useState<string | undefined>(), [anterioresOcupacoes, setAnterioresOcupacoes] = useState<(string | undefined)[]>([])
  const [referencia, setReferencia] = useState<string | null>(null), [aviso, setAviso] = useState('')
  const pessoas = useQuery({ queryKey: ['orgaos', identidade, 'pessoas'], queryFn: pessoasApi.list, enabled: aberto, gcTime: 0 })
  const eventos = useQuery({ queryKey: ['orgaos', identidade, 'eventos-base', pessoa, cursorEvento], queryFn: () => gestaoOrgaosApi.eventosBaseMembresia(pessoa, cursorEvento), enabled: aberto && !!pessoa, gcTime: 0 })
  const previa = useMutation({
    mutationFn: (dados: { pessoa: string; data: string; evento?: string; cursores?: { participacao?: string; ocupacao?: string } }) => gestaoOrgaosApi.impactosMembresia(dados.pessoa, dados.data, dados.evento, dados.cursores),
    onSuccess: (resultado, dados) => {
      if ((dados.cursores?.participacao || dados.cursores?.ocupacao) && referencia && resultado.data_inicial !== referencia) {
        limparPrevia(); setAviso('A data de referência mudou durante a consulta. Consulte novamente desde o início.'); return
      }
      setReferencia(resultado.data_inicial)
    },
  })
  function limparPrevia() { previa.reset(); setReferencia(null); setAviso(''); setCursorParticipacao(undefined); setAnterioresParticipacoes([]); setCursorOcupacao(undefined); setAnterioresOcupacoes([]) }
  function consultar(participacao?: string, ocupacao?: string) { previa.mutate({ pessoa, data, evento: evento || undefined, cursores: participacao || ocupacao ? { participacao, ocupacao } : undefined }) }
  function paginaEvento(cursor: string | undefined) { setCursorEvento(cursor); setEvento(''); setData(''); limparPrevia() }
  return <section className="space-y-3">
    <Button type="button" variant="outline" disabled={previa.isPending} onClick={() => { setAberto(v => !v); limparPrevia() }}>{aberto ? 'Fechar prévia de impactos' : 'Consultar possíveis impactos de membresia'}</Button>
    {aberto && <form className="max-w-2xl space-y-3 rounded border p-4" onSubmit={e => { e.preventDefault(); limparPrevia(); consultar() }}>
      <h2 className="font-semibold">Prévia de vínculos de órgão</h2>
      <p className="text-sm text-muted-foreground">Para um evento existente, selecione-o e informe a nova data somente se ela for mudar. Para um evento novo, informe sua data. A lista é conservadora, considera apenas vínculos de órgão e pode mudar após a consulta. Não substitui a revisão da membresia ou dos atos; não autoriza a alteração.</p>
      <div className="space-y-1"><Label htmlFor="impacto-pessoa">Pessoa para conferência</Label><SeletorPessoa id="impacto-pessoa" value={pessoa} disabled={previa.isPending} onChange={id => { setPessoa(id); setEvento(''); setData(''); setCursorEvento(undefined); setAnterioresEventos([]); limparPrevia() }} required opcoes={pessoas.data?.map(p => ({ id: p.id, nome: p.nome_completo }))} />{pessoas.isError && <p role="alert">Não foi possível carregar as pessoas.</p>}</div>
      {pessoa && <div className="space-y-1"><Label htmlFor="impacto-evento">Evento existente (opcional)</Label><select id="impacto-evento" className="w-full rounded border bg-background p-2" value={evento} disabled={previa.isPending || eventos.isPending || eventos.isError} onChange={e => { setEvento(e.target.value); setData(''); limparPrevia() }}><option value="">Novo evento ou data informada</option>{eventos.data?.itens.map(e => <option key={e.id} value={e.id}>{exibir(e.data_evento)} · {e.id}</option>)}</select>{eventos.isError && <p role="alert">Não foi possível consultar os eventos existentes.</p>}<div className="flex gap-2"><Button type="button" variant="outline" disabled={previa.isPending || !anterioresEventos.length} onClick={() => { const itens = [...anterioresEventos]; paginaEvento(itens.pop()); setAnterioresEventos(itens) }}>Eventos anteriores</Button><Button type="button" variant="outline" disabled={previa.isPending || !eventos.data?.proximo_cursor} onClick={() => { const proximo = eventos.data?.proximo_cursor; if (proximo) { setAnterioresEventos(a => [...a, cursorEvento]); paginaEvento(proximo) } }}>Mais eventos</Button></div></div>}
      <div className="space-y-1"><Label htmlFor="impacto-data">{evento ? 'Nova data proposta (opcional)' : 'Data mais antiga atingida'}</Label><Input id="impacto-data" type="date" value={data} disabled={previa.isPending} onChange={e => { setData(e.target.value); limparPrevia() }} required={!evento} /></div>
      <Button type="submit" disabled={!pessoa || (!evento && !data) || previa.isPending}>Consultar vínculos</Button>
      {aviso && <p role="alert">{aviso}</p>}
      {previa.isError && <p role="alert">Não foi possível consultar os vínculos.</p>}
      {previa.data && <div className="space-y-2" aria-live="polite"><p>Vínculos com início a partir de {exibir(previa.data.data_inicial)}:</p>
        {!previa.data.participacoes.length && !previa.data.ocupacoes.length && <p>{cursorParticipacao || cursorOcupacao ? 'Nenhum vínculo nesta página.' : 'Nenhum vínculo de órgão encontrado nesta prévia.'}</p>}
        {previa.data.participacoes.map(p => <p key={p.id}>Participação em {p.orgao.nome} · início em {exibir(p.inicio)}</p>)}
        {previa.data.ocupacoes.map(o => <p key={o.id}>{o.cargo.nome} em {o.cargo.orgao.nome} · início em {exibir(o.inicio)}</p>)}
        <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={previa.isPending || !anterioresParticipacoes.length} onClick={() => { const itens = [...anterioresParticipacoes], anterior = itens.pop(); setAnterioresParticipacoes(itens); setCursorParticipacao(anterior); consultar(anterior, cursorOcupacao) }}>Participações anteriores</Button><Button type="button" variant="outline" disabled={previa.isPending || !previa.data.proximo_cursor_participacao} onClick={() => { const proximo = previa.data?.proximo_cursor_participacao; if (proximo) { setAnterioresParticipacoes(a => [...a, cursorParticipacao]); setCursorParticipacao(proximo); consultar(proximo, cursorOcupacao) } }}>Mais participações</Button><Button type="button" variant="outline" disabled={previa.isPending || !anterioresOcupacoes.length} onClick={() => { const itens = [...anterioresOcupacoes], anterior = itens.pop(); setAnterioresOcupacoes(itens); setCursorOcupacao(anterior); consultar(cursorParticipacao, anterior) }}>Ocupações anteriores</Button><Button type="button" variant="outline" disabled={previa.isPending || !previa.data.proximo_cursor_ocupacao} onClick={() => { const proximo = previa.data?.proximo_cursor_ocupacao; if (proximo) { setAnterioresOcupacoes(a => [...a, cursorOcupacao]); setCursorOcupacao(proximo); consultar(cursorParticipacao, proximo) } }}>Mais ocupações</Button></div>
      </div>}
    </form>}
    {aberto && pessoa && <DecisaoOrgao key={pessoa} identidade={identidade} pessoaId={pessoa} operacao="DATA" proposta={{}} hash="" podeRegistrar={false} somenteHistorico />}
  </section>
}
