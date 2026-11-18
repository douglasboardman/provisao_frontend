import { AvisoImpactoOrgaos } from './AvisoImpactoOrgaos'
import { DecisaoOrgao } from './DecisaoOrgao'
import { DecisaoEleitoral } from './DecisaoEleitoral'
import { useRef, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { oficiaisApi, type PreviaCorrecao } from '../../api/oficiais'
import { ApiRequestError } from '../../api/client'
import { Button } from '../../components/ui/button'
const classe = 'block w-full rounded border bg-background p-2'
function dia(data: string) { return data.slice(0, 10).split('-').reverse().join('/') }

export function CorrecaoMembresia({ oficialId, identidade, podeRegistrar, porPessoa = false }: { oficialId: string; identidade: string; podeRegistrar: boolean; porPessoa?: boolean }) {
  const [aberto, setAberto] = useState(false), [evento, setEvento] = useState(''), [novaData, setNovaData] = useState('')
  const [hashRevisaoOrgaos, setHashRevisaoOrgaos] = useState('')
  const [revisaoOrgaos, setRevisaoOrgaos] = useState<string[]>([])
  const [decisao, setDecisao] = useState<string | null>(null)
  const [aprovada, setAprovada] = useState<PreviaCorrecao | null>(null), [mensagem, setMensagem] = useState('')
  const chave = useRef(crypto.randomUUID()), client = useQueryClient()
  const historico = useQuery({ queryKey: ['oficiais', identidade, 'correcoes-data', porPessoa, oficialId], queryFn: () => oficiaisApi.correcoes(oficialId, porPessoa), enabled: aberto, staleTime: 0, gcTime: 0 })
  const eventos = useQuery({ queryKey: ['oficiais', identidade, 'eventos-correcao', porPessoa, oficialId], queryFn: () => oficiaisApi.eventosParaCorrecao(oficialId, porPessoa), enabled: aberto, staleTime: 0, gcTime: 0 })
  const previa = useMutation({ mutationFn: (dados: { evento_id: string; nova_data: string }) => oficiaisApi.previaCorrecao(oficialId, dados, porPessoa), onSuccess: setAprovada })
  const aplicar = useMutation({ mutationFn: (dados: unknown) => oficiaisApi.aplicarCorrecao(oficialId, dados, porPessoa), onSuccess: async () => { setMensagem('Correção registrada.'); setAprovada(null); chave.current = crypto.randomUUID(); await client.invalidateQueries() } })
  function alterar(fn: () => void) { fn(); setDecisao(null); setRevisaoOrgaos([]); setAprovada(null); setMensagem(''); chave.current = crypto.randomUUID(); previa.reset(); aplicar.reset() }
  function pedir(e: FormEvent<HTMLFormElement>) { e.preventDefault(); setMensagem(''); setAprovada(null); setRevisaoOrgaos([]); previa.mutate({ evento_id: evento, nova_data: novaData }) }
  function confirmar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!aprovada) return
    const d = new FormData(e.currentTarget), texto = (nome: string) => String(d.get(nome) ?? '').trim()
    aplicar.mutate({ evento_id: evento, nova_data: novaData, hash_previa: aprovada.hash, ...(hashRevisaoOrgaos === aprovada.hash && revisaoOrgaos.length ? { decisoes_orgao: revisaoOrgaos } : {}), ...(decisao ? { decisao_id: decisao } : {}), justificativa: texto('justificativa'), autoridade: texto('autoridade'), evidencia: texto('evidencia'), ciente: d.has('ciente'), idempotencia: chave.current })
  }
  const erro = previa.error ?? aplicar.error
  return <div className="space-y-3 rounded border p-4"><Button type="button" variant="outline" onClick={() => setAberto(!aberto)}>{aberto ? 'Fechar correção de data' : 'Conferir correção de data de membresia'}</Button>
    {aberto && <><p className="text-sm text-muted-foreground">A prévia verifica a sequência e o rol de origem. Se houver atos na data de destino, a ordem existente do ato corrigido deve ser posterior às demais.</p>
      <div><h3 className="font-medium">Correções registradas</h3>{historico.isPending ? <p>Carregando correções...</p> : historico.isError ? <p role="alert">Não foi possível consultar as correções.</p> : !historico.data?.length ? <p>Nenhuma correção registrada.</p> : historico.data.map(c => <details className="my-2 rounded border p-2" key={c.id}><summary>{dia(c.data_anterior)} → {dia(c.data_nova)} — registrado por {c.criado_por.nome_usuario}</summary><p>Justificativa: {c.justificativa}</p><p>Autoridade: {c.autoridade}</p><p>Evidência: {c.evidencia}</p>{c.impacto.mandatos.map(m => <p key={m.id}>Eleição {dia(m.eleicao)}: {m.rol_eleicao_antes} → {m.rol_eleicao_depois}; posse {dia(m.posse)}: {m.rol_posse_antes} → {m.rol_posse_depois}.</p>)}{c.impacto.conferencias.map(a => <p key={a.id}>Conferência {dia(a.data_eleicao)}: {a.rol_antes} → {a.rol_depois}.</p>)}</details>)}</div>
      {eventos.isError && <p role="alert">Não foi possível consultar os eventos.</p>}
      <form className="max-w-xl space-y-3" onSubmit={pedir}><label className="block">Evento de membresia<select className={classe} value={evento} required disabled={previa.isPending || aplicar.isPending} onChange={e => alterar(() => setEvento(e.target.value))}><option value="">Selecione</option>{eventos.data?.map(e => <option key={e.id} value={e.id}>{e.tipo_evento} — {dia(e.data_evento)} — {e.rol} — ordem {e.ordem_dia ?? 'não informada'}</option>)}</select></label><label className="block">Data corrigida<input className={classe} type="date" value={novaData} required disabled={previa.isPending || aplicar.isPending} onChange={e => alterar(() => setNovaData(e.target.value))} /></label><Button type="submit" disabled={!evento || !novaData || previa.isPending}>Gerar prévia</Button></form>
      {aprovada && <div className="space-y-2 rounded border p-3"><h3 className="font-medium">Impacto previsto: {dia(aprovada.data_anterior)} → {dia(aprovada.data_nova)}</h3><p>{aprovada.observacao}</p><AvisoImpactoOrgaos bloqueio={aprovada.bloqueio_orgao}>{import.meta.env.VITE_FEATURE_ORGAOS_GESTAO === 'true' && (aprovada.pessoa_id || porPessoa) && <DecisaoOrgao aoConferir={ids => { setRevisaoOrgaos(ids); setHashRevisaoOrgaos(aprovada.hash) }} key={aprovada.hash} identidade={identidade} pessoaId={aprovada.pessoa_id ?? oficialId} oficialId={porPessoa ? undefined : oficialId} operacao="DATA" proposta={{ evento_id: evento, nova_data: novaData }} hash={aprovada.hash} podeRegistrar={podeRegistrar} vinculos={aprovada.bloqueio_orgao?.detalhes} detalhesLimitados={aprovada.bloqueio_orgao?.detalhes_limitados} />}</AvisoImpactoOrgaos>{!!aprovada.origens_invalidadas?.length && <p>Atos com origem inconsistente: {aprovada.origens_invalidadas.map(id => id.slice(0, 8)).join(', ')}.</p>}{!aprovada.mandatos.length && <p>Nenhum mandato potencialmente afetado.</p>}{aprovada.mandatos.map(m => <p key={m.id}>Eleição {dia(m.eleicao)}: {m.rol_eleicao_antes} → {m.rol_eleicao_depois}; posse {dia(m.posse)}: {m.rol_posse_antes} → {m.rol_posse_depois}.</p>)}{aprovada.conferencias.map(c => <p key={c.id}>Conferência de {dia(c.data_eleicao)}: {c.rol_antes} → {c.rol_depois}.</p>)}
        {aprovada.bloqueada && !decisao && <p role="alert">A alteração exige revisão da origem de rol, da conferência eleitoral ou do mandato.</p>}
        {(!aprovada.bloqueio_orgao?.bloqueia || (revisaoOrgaos.length > 0 && hashRevisaoOrgaos === aprovada.hash)) && aprovada.bloqueada && !decisao && podeRegistrar && porPessoa && !aprovada.origens_invalidadas?.length && <DecisaoEleitoral key={aprovada.hash} identidade={identidade} pessoaId={oficialId} operacao="DATA" proposta={{ evento_id: evento, nova_data: novaData }} hash={aprovada.hash} aoRegistrar={setDecisao} />}
        {(!aprovada.bloqueio_orgao?.bloqueia || (revisaoOrgaos.length > 0 && hashRevisaoOrgaos === aprovada.hash)) && (!aprovada.bloqueada || decisao) && podeRegistrar ? <form className="space-y-3" onSubmit={confirmar}><label className="block">Justificativa<input className={classe} name="justificativa" required maxLength={1000} /></label><label className="block">Autoridade que determinou a correção<input className={classe} name="autoridade" required maxLength={255} /></label><label className="block">Evidência da correção<input className={classe} name="evidencia" required maxLength={1000} /></label><label className="block"><input type="checkbox" name="ciente" required /> Conferi a prévia e a evidência.</label><Button type="submit" disabled={aplicar.isPending}>Confirmar correção</Button></form> : !podeRegistrar ? <p>Seu acesso permite apenas consultar a prévia.</p> : null}
      </div>}
      {erro && <p role="alert">{erro instanceof ApiRequestError ? erro.messages.join(' ') : 'Não foi possível concluir a operação.'}</p>}{mensagem && <p role="status">{mensagem}</p>}
    </>}
  </div>
}
