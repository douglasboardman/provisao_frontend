import { PainelLocal, SecaoPainel } from '../../components/shared/Painel'
import { DecisaoOrgao } from './DecisaoOrgao'
import { AvisoImpactoOrgaos } from './AvisoImpactoOrgaos'
import { DecisaoEleitoral } from './DecisaoEleitoral'
import { useRef, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { oficiaisApi, type PreviaInsercao, type PropostaInsercao } from '../../api/oficiais'
import { ApiRequestError } from '../../api/client'
import { useEnumRelations } from '../../hooks/use-enum-relations'
import { MOTIVACAO_LABELS, ROL_LABELS } from '../../lib/membresia-labels'
import { MembresiaRol, MotivacaoEvento } from '../../types/enums'
import { Button } from '../../components/ui/button'
const classe = 'block w-full rounded border bg-background p-2'
const dia = (d: string) => d.slice(0, 10).split('-').reverse().join('/')
export function InsercaoRetroativa({ pessoaId, identidade, podeRegistrar }: { pessoaId: string; identidade: string; podeRegistrar: boolean }) {
  const [aberto, setAberto] = useState(false), [tipo, setTipo] = useState('ADMISSAO'), [rol, setRol] = useState(''), [motivacao, setMotivacao] = useState(''), [data, setData] = useState(''), [ordem, setOrdem] = useState(''), [origem, setOrigem] = useState(''), [destino, setDestino] = useState(''), [observacoes, setObservacoes] = useState('')
  const [hashRevisaoOrgaos, setHashRevisaoOrgaos] = useState('')
  const [revisaoOrgaos, setRevisaoOrgaos] = useState<string[]>([])
  const [decisao, setDecisao] = useState<string | null>(null)
  const [aprovada, setAprovada] = useState<PreviaInsercao | null>(null), [mensagem, setMensagem] = useState('')
  const { getFilter, getMapping, isLoading } = useEnumRelations('membresia'), chave = useRef(crypto.randomUUID()), client = useQueryClient()
  const eventos = useQuery({ queryKey: ['oficiais', identidade, 'eventos-correcao', true, pessoaId], queryFn: () => oficiaisApi.eventosParaCorrecao(pessoaId, true), enabled: aberto, staleTime: 0, gcTime: 0 })
  const historico = useQuery({ queryKey: ['oficiais', identidade, 'insercoes-retroativas', pessoaId], queryFn: () => oficiaisApi.insercoesRetroativas(pessoaId), enabled: aberto, staleTime: 0, gcTime: 0 })
  const previa = useMutation({ mutationFn: (dados: PropostaInsercao) => oficiaisApi.previaInsercao(pessoaId, dados), onSuccess: setAprovada })
  const aplicar = useMutation({ mutationFn: (dados: unknown) => oficiaisApi.aplicarInsercao(pessoaId, dados), onSuccess: async () => { setMensagem('Inclusão retroativa registrada.'); setAprovada(null); chave.current = crypto.randomUUID(); await client.invalidateQueries() } })
  const rotulo = tipo === 'ADMISSAO' ? 'Admissão' : tipo === 'DEMISSAO' ? 'Demissão' : 'Mudança de Rol'
  const rols = tipo === 'ADMISSAO' ? getFilter('Rols de Admissão', tipo) : tipo === 'MUDANCA_DE_ROL' ? getFilter('Rols de Mudança de Rol', tipo) : []
  const motivos = getFilter(`Motivações de ${rotulo}`, tipo).filter(v => tipo !== 'MUDANCA_DE_ROL' || !rol || getFilter('Motivações por Rol de Destino', rol).includes(v))
  const rolFinal = tipo === 'DEMISSAO' ? getMapping('Rol de Destino por Motivação de Demissão', motivacao) ?? '' : rol
  const mesmoDia = (eventos.data ?? []).filter(e => e.data_evento.slice(0, 10) === data)
  const proposta = (): PropostaInsercao => ({ data_evento: data, ordem_dia: ordem ? Number(ordem) : null, tipo_evento: tipo, rol: rolFinal, motivacao_evento: motivacao, igreja_origem: origem.trim() || null, igreja_destino: destino.trim() || null, observacoes: observacoes.trim() || null })
  function mudar(fn: () => void) { fn(); setDecisao(null); setRevisaoOrgaos([]); setAprovada(null); setMensagem(''); chave.current = crypto.randomUUID(); previa.reset(); aplicar.reset() }
  function pedir(e: FormEvent) { e.preventDefault(); setAprovada(null); setRevisaoOrgaos([]); previa.mutate(proposta()) }
  function confirmar(e: FormEvent<HTMLFormElement>) { e.preventDefault(); if (!aprovada) return; const d = new FormData(e.currentTarget); aplicar.mutate({ ...proposta(), hash_previa: aprovada.hash, ...(hashRevisaoOrgaos === aprovada.hash && revisaoOrgaos.length ? { decisoes_orgao: revisaoOrgaos } : {}), ...(decisao ? { decisao_id: decisao } : {}), justificativa: String(d.get('justificativa') ?? '').trim(), autoridade: String(d.get('autoridade') ?? '').trim(), evidencia: String(d.get('evidencia') ?? '').trim(), idempotencia: chave.current, ciente: d.has('ciente') }) }
  const erro = previa.error ?? aplicar.error
  return <PainelLocal><div className="space-y-3"><Button type="button" variant="outline" onClick={() => setAberto(true)}>Conferir inclusão retroativa</Button>
    {aberto && <SecaoPainel titulo="Conferir inclusão retroativa" voltar={() => setAberto(false)}><p>Inclua um ato anterior aos demais. Se houver outros atos na data, confira suas ordens e informe uma posição distinta. A prévia não substitui a revisão institucional.</p>
      <div><h3 className="font-medium">Inclusões registradas</h3>{historico.isPending ? <p>Carregando...</p> : historico.isError ? <p role="alert">Não foi possível consultar as inclusões.</p> : !historico.data?.length ? <p>Nenhuma inclusão registrada.</p> : historico.data.map(r => <details key={r.id}><summary>{dia(r.data_evento)} — {r.criado_por.nome_usuario}</summary><p>Justificativa: {r.justificativa}</p><p>Autoridade: {r.autoridade}</p><p>Evidência: {r.evidencia}</p></details>)}</div>
      <form className="max-w-xl space-y-3" onSubmit={pedir}>
        <label className="block">Tipo do ato<select className={classe} value={tipo} onChange={e => mudar(() => { setTipo(e.target.value); setRol(''); setMotivacao('') })}><option value="ADMISSAO">Admissão</option><option value="DEMISSAO">Demissão</option><option value="MUDANCA_DE_ROL">Mudança de rol</option></select></label>
        <label className="block">Data do ato<input className={classe} type="date" required value={data} onChange={e => mudar(() => setData(e.target.value))} /></label>
        {eventos.isError && <p role="alert">Não foi possível consultar os atos existentes. Reabra a conferência para tentar novamente.</p>}
        {mesmoDia.length > 0 && <div><p>Atos existentes na data:</p>{mesmoDia.map(e => <p key={e.id}>{e.tipo_evento} — {e.rol} — ordem {e.ordem_dia ?? 'não conferida'} — {e.id.slice(0, 8)}</p>)}{mesmoDia.some(e => e.ordem_dia == null) && <p role="alert">Confira primeiro a ordem dos atos existentes.</p>}</div>}
        <label className="block">Ordem do ato no dia<input className={classe} type="number" min="1" max="9999" step="1" required={mesmoDia.length > 0} value={ordem} onChange={e => mudar(() => setOrdem(e.target.value))} /></label>
        {tipo !== 'DEMISSAO' && <label className="block">Rol de destino<select className={classe} required value={rol} onChange={e => mudar(() => { setRol(e.target.value); setMotivacao('') })}><option value="">Selecione</option>{rols.map(v => <option key={v} value={v}>{ROL_LABELS[v as MembresiaRol] ?? v}</option>)}</select></label>}
        <label className="block">Motivação<select className={classe} required value={motivacao} onChange={e => mudar(() => setMotivacao(e.target.value))}><option value="">Selecione</option>{motivos.map(v => <option key={v} value={v}>{MOTIVACAO_LABELS[v as MotivacaoEvento] ?? v}</option>)}</select></label>
        {tipo === 'DEMISSAO' && rolFinal && <p>Rol de destino: {ROL_LABELS[rolFinal as MembresiaRol] ?? rolFinal}</p>}
        <label className="block">Igreja de origem<input className={classe} maxLength={255} value={origem} onChange={e => mudar(() => setOrigem(e.target.value))} /></label><label className="block">Igreja de destino<input className={classe} maxLength={255} value={destino} onChange={e => mudar(() => setDestino(e.target.value))} /></label><label className="block">Observações<textarea className={classe} maxLength={1000} value={observacoes} onChange={e => mudar(() => setObservacoes(e.target.value))} /></label>
        <Button type="submit" disabled={isLoading || eventos.isPending || eventos.isError || !rolFinal || previa.isPending || aplicar.isPending}>Gerar prévia da inclusão</Button>
      </form>
      {aprovada && <div className="space-y-2 rounded border p-3"><h3>Impacto previsto</h3><p>{aprovada.observacao}</p><AvisoImpactoOrgaos bloqueio={aprovada.bloqueio_orgao}>{import.meta.env.VITE_FEATURE_ORGAOS_GESTAO === 'true' && <DecisaoOrgao aoConferir={ids => { setRevisaoOrgaos(ids); setHashRevisaoOrgaos(aprovada.hash) }} key={aprovada.hash} identidade={identidade} pessoaId={pessoaId} operacao="INSERCAO" proposta={proposta()} hash={aprovada.hash} podeRegistrar={podeRegistrar} vinculos={aprovada.bloqueio_orgao?.detalhes} detalhesLimitados={aprovada.bloqueio_orgao?.detalhes_limitados} />}</AvisoImpactoOrgaos>{aprovada.mandatos.map(m => <p key={m.id}>Eleição {dia(m.eleicao)}: {m.rol_eleicao_antes} → {m.rol_eleicao_depois}; posse {dia(m.posse)}: {m.rol_posse_antes} → {m.rol_posse_depois}.</p>)}{aprovada.conferencias.map(c => <p key={c.id}>Conferência {dia(c.data_eleicao)}: {c.rol_antes} → {c.rol_depois}.</p>)}
        {aprovada.bloqueada && !decisao && <p role="alert">A inclusão exige revisão do rol de origem, da conferência eleitoral ou do mandato.</p>}
        {(!aprovada.bloqueio_orgao?.bloqueia || (revisaoOrgaos.length > 0 && hashRevisaoOrgaos === aprovada.hash)) && aprovada.bloqueada && !decisao && podeRegistrar && !aprovada.origem_seguinte_invalida && <DecisaoEleitoral key={aprovada.hash} identidade={identidade} pessoaId={pessoaId} operacao="INSERCAO" proposta={proposta()} hash={aprovada.hash} aoRegistrar={setDecisao} />}
        {(!aprovada.bloqueio_orgao?.bloqueia || (revisaoOrgaos.length > 0 && hashRevisaoOrgaos === aprovada.hash)) && (!aprovada.bloqueada || decisao) && podeRegistrar ? <form className="space-y-3" onSubmit={confirmar}><label className="block">Justificativa da inclusão<input className={classe} name="justificativa" required maxLength={1000} /></label><label className="block">Autoridade da inclusão<input className={classe} name="autoridade" required maxLength={255} /></label><label className="block">Evidência da inclusão<input className={classe} name="evidencia" required maxLength={1000} /></label><label className="block"><input type="checkbox" name="ciente" required /> Conferi o ato e o impacto.</label><Button type="submit" disabled={aplicar.isPending}>Confirmar inclusão</Button></form> : !podeRegistrar ? <p>Seu acesso permite apenas consultar a prévia.</p> : null}
      </div>}{erro && <p role="alert">{erro instanceof ApiRequestError ? erro.messages.join(' ') : 'Não foi possível concluir a operação.'}</p>}{mensagem && <p role="status">{mensagem}</p>}
    </SecaoPainel>}
  </div></PainelLocal>
}
