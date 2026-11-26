import { PainelLocal, SecaoPainel } from '../../components/shared/Painel'
import { DecisaoOrgao } from './DecisaoOrgao'
import { AvisoImpactoOrgaos } from './AvisoImpactoOrgaos'
import { DecisaoEleitoral } from './DecisaoEleitoral'
import { useRef, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { oficiaisApi, type PreviaOrdem } from '../../api/oficiais'
import { ApiRequestError } from '../../api/client'
import { Button } from '../../components/ui/button'
const classe = 'block w-full rounded border bg-background p-2'
function dia(data: string) { return data.slice(0, 10).split('-').reverse().join('/') }

export function OrdenacaoMembresia({ oficialId, identidade, podeRegistrar, porPessoa = false }: { oficialId: string; identidade: string; podeRegistrar: boolean; porPessoa?: boolean }) {
  const [aberto, setAberto] = useState(false), [data, setData] = useState(''), [ordens, setOrdens] = useState<Record<string, string>>({})
  const [hashRevisaoOrgaos, setHashRevisaoOrgaos] = useState('')
  const [revisaoOrgaos, setRevisaoOrgaos] = useState<string[]>([])
  const [decisao, setDecisao] = useState<string | null>(null)
  const [aprovada, setAprovada] = useState<PreviaOrdem | null>(null), [mensagem, setMensagem] = useState('')
  const chave = useRef(crypto.randomUUID()), client = useQueryClient()
  const eventos = useQuery({ queryKey: ['oficiais', identidade, 'eventos-correcao', porPessoa, oficialId], queryFn: () => oficiaisApi.eventosParaCorrecao(oficialId, porPessoa), enabled: aberto, staleTime: 0, gcTime: 0 })
  const historico = useQuery({ queryKey: ['oficiais', identidade, 'ordenacoes-dia', porPessoa, oficialId], queryFn: () => oficiaisApi.ordenacoes(oficialId, porPessoa), enabled: aberto, staleTime: 0, gcTime: 0 })
  const previa = useMutation({ mutationFn: (dados: { data_evento: string; itens: { evento_id: string; ordem: number }[] }) => oficiaisApi.previaOrdenacao(oficialId, dados, porPessoa), onSuccess: setAprovada })
  const aplicar = useMutation({ mutationFn: (dados: unknown) => oficiaisApi.aplicarOrdenacao(oficialId, dados, porPessoa), onSuccess: async () => { setMensagem('Ordem registrada.'); setAprovada(null); chave.current = crypto.randomUUID(); await client.invalidateQueries() } })
  const datas = [...new Set((eventos.data ?? []).map(e => e.data_evento.slice(0, 10)))].sort()
  const grupo = (eventos.data ?? []).filter(e => e.data_evento.slice(0, 10) === data)
  function mudar(fn: () => void) { fn(); setDecisao(null); setRevisaoOrgaos([]); setAprovada(null); setMensagem(''); chave.current = crypto.randomUUID(); previa.reset(); aplicar.reset() }
  function escolherData(d: string) { mudar(() => { setData(d); setOrdens(Object.fromEntries((eventos.data ?? []).filter(e => e.data_evento.slice(0, 10) === d).map(e => [e.id, e.ordem_dia?.toString() ?? '']))) }) }
  function pedir(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setMensagem(''); setAprovada(null)
    previa.mutate({ data_evento: data, itens: grupo.map(e => ({ evento_id: e.id, ordem: Number(ordens[e.id]) })) })
  }
  function confirmar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!aprovada) return
    const d = new FormData(e.currentTarget), texto = (n: string) => String(d.get(n) ?? '').trim()
    aplicar.mutate({ data_evento: data, itens: grupo.map(e => ({ evento_id: e.id, ordem: Number(ordens[e.id]) })), hash_previa: aprovada.hash, ...(hashRevisaoOrgaos === aprovada.hash && revisaoOrgaos.length ? { decisoes_orgao: revisaoOrgaos } : {}), ...(decisao ? { decisao_id: decisao } : {}), justificativa: texto('justificativa'), autoridade: texto('autoridade'), evidencia: texto('evidencia'), ciente: d.has('ciente'), idempotencia: chave.current })
  }
  const erro = previa.error ?? aplicar.error
  return <PainelLocal><div className="space-y-3"><Button type="button" variant="outline" onClick={() => setAberto(true)}>Conferir ordem de atos no mesmo dia</Button>
    {aberto && <SecaoPainel titulo="Conferir ordem de atos no mesmo dia" voltar={() => setAberto(false)}><p className="text-sm text-muted-foreground">Informe a ordem comprovada de todos os atos. A sequência não é deduzida do cadastro ou da criação dos registros.</p>
      {eventos.isError && <p role="alert">Não foi possível consultar os eventos.</p>}{historico.isError && <p role="alert">Não foi possível consultar as ordenações registradas.</p>}
      <div><h3 className="font-medium">Ordenações registradas</h3>{historico.isPending ? <p>Carregando...</p> : !historico.data?.length ? <p>Nenhuma ordenação registrada.</p> : historico.data.map(r => <details key={r.id} className="my-2 rounded border p-2"><summary>{dia(r.data_evento)} — registrado por {r.criado_por.nome_usuario}</summary><p>Justificativa: {r.justificativa}</p><p>Autoridade: {r.autoridade}</p><p>Evidência: {r.evidencia}</p>{(r.impacto.itens ?? []).map(i => <p key={i.evento_id}>Evento {i.evento_id.slice(0, 8)}: {i.ordem_anterior ?? 'não informada'} → {i.ordem_nova}.</p>)}{(r.impacto.mandatos ?? []).map(m => <p key={m.id}>Eleição {dia(m.eleicao)}: {m.rol_eleicao_antes} → {m.rol_eleicao_depois}; posse {dia(m.posse)}: {m.rol_posse_antes} → {m.rol_posse_depois}.</p>)}</details>)}</div>
      <form className="max-w-xl space-y-3" onSubmit={pedir}><label className="block">Data com atos a ordenar<select className={classe} value={data} required disabled={previa.isPending || aplicar.isPending} onChange={e => escolherData(e.target.value)}><option value="">Selecione</option>{datas.map(d => <option key={d} value={d}>{dia(d)}</option>)}</select></label>
        {grupo.map(e => <label className="block" key={e.id}>Ordem para {e.tipo_evento} — {e.rol} — {e.id.slice(0, 8)}<input className={classe} type="number" min="1" max="9999" required disabled={previa.isPending || aplicar.isPending} value={ordens[e.id] ?? ''} onChange={ev => mudar(() => setOrdens(atual => ({ ...atual, [e.id]: ev.target.value })))} /></label>)}
        <Button type="submit" disabled={!data || !grupo.length || previa.isPending}>Gerar prévia da ordem</Button>
      </form>
      {aprovada && <div className="space-y-2 rounded border p-3"><h3 className="font-medium">Impacto previsto para {dia(aprovada.data_evento)}</h3><p>{aprovada.observacao}</p><AvisoImpactoOrgaos bloqueio={aprovada.bloqueio_orgao}>{import.meta.env.VITE_FEATURE_ORGAOS_GESTAO === 'true' && (aprovada.pessoa_id || porPessoa) && <DecisaoOrgao aoConferir={ids => { setRevisaoOrgaos(ids); setHashRevisaoOrgaos(aprovada.hash) }} key={aprovada.hash} identidade={identidade} pessoaId={aprovada.pessoa_id ?? oficialId} oficialId={porPessoa ? undefined : oficialId} operacao="ORDEM" proposta={{ data_evento: data, itens: grupo.map(e => ({ evento_id: e.id, ordem: Number(ordens[e.id]) })) }} hash={aprovada.hash} podeRegistrar={podeRegistrar} vinculos={aprovada.bloqueio_orgao?.detalhes} detalhesLimitados={aprovada.bloqueio_orgao?.detalhes_limitados} />}</AvisoImpactoOrgaos>{aprovada.mandatos.map(m => <p key={m.id}>Eleição {dia(m.eleicao)}: {m.rol_eleicao_antes} → {m.rol_eleicao_depois}; posse {dia(m.posse)}: {m.rol_posse_antes} → {m.rol_posse_depois}.</p>)}
        {aprovada.bloqueada && !decisao && <p role="alert">A sequência exige revisão do rol de origem, da conferência eleitoral ou do mandato antes da aplicação.</p>}
        {(!aprovada.bloqueio_orgao?.bloqueia || (revisaoOrgaos.length > 0 && hashRevisaoOrgaos === aprovada.hash)) && aprovada.bloqueada && !decisao && podeRegistrar && porPessoa && !aprovada.inconsistencias_rol_origem.length && <DecisaoEleitoral key={aprovada.hash} identidade={identidade} pessoaId={oficialId} operacao="ORDEM" proposta={{ data_evento: data, itens: grupo.map(e => ({ evento_id: e.id, ordem: Number(ordens[e.id]) })) }} hash={aprovada.hash} aoRegistrar={setDecisao} />}
        {(!aprovada.bloqueio_orgao?.bloqueia || (revisaoOrgaos.length > 0 && hashRevisaoOrgaos === aprovada.hash)) && (!aprovada.bloqueada || decisao) && podeRegistrar ? <form className="space-y-3" onSubmit={confirmar}><label className="block">Justificativa da sequência<input className={classe} name="justificativa" required maxLength={1000} /></label><label className="block">Autoridade da sequência<input className={classe} name="autoridade" required maxLength={255} /></label><label className="block">Evidência da sequência<input className={classe} name="evidencia" required maxLength={1000} /></label><label className="block"><input type="checkbox" name="ciente" required /> Conferi a sequência e o impacto.</label><Button type="submit" disabled={aplicar.isPending}>Confirmar ordem</Button></form> : !podeRegistrar ? <p>Seu acesso permite apenas consultar a prévia.</p> : null}
      </div>}
      {erro && <p role="alert">{erro instanceof ApiRequestError ? erro.messages.join(' ') : 'Não foi possível concluir a operação.'}</p>}{mensagem && <p role="status">{mensagem}</p>}
    </SecaoPainel>}
  </div></PainelLocal>
}
