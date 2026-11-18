import { DecisaoOrgao } from './DecisaoOrgao'
import { AvisoImpactoOrgaos } from './AvisoImpactoOrgaos'
import { DecisaoEleitoral } from './DecisaoEleitoral'
import { useRef, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { oficiaisApi, type PreviaConteudo, type PropostaConteudo, type DetalheConteudo } from '../../api/oficiais'
import { ApiRequestError } from '../../api/client'
import { useEnumRelations } from '../../hooks/use-enum-relations'
import { MOTIVACAO_LABELS, ROL_LABELS } from '../../lib/membresia-labels'
import { MembresiaRol, MotivacaoEvento } from '../../types/enums'
import { Button } from '../../components/ui/button'
const classe = 'block w-full rounded border bg-background p-2'
const dia = (d: string) => d.slice(0, 10).split('-').reverse().join('/')
const descricao = (d: DetalheConteudo) => `${d.tipo_evento} — ${ROL_LABELS[d.rol as MembresiaRol] ?? d.rol} — ${MOTIVACAO_LABELS[d.motivacao_evento as MotivacaoEvento] ?? d.motivacao_evento}${d.rol_origem ? ` (origem: ${ROL_LABELS[d.rol_origem as MembresiaRol] ?? d.rol_origem})` : ''}`
export function CorrecaoConteudo({ pessoaId, identidade, podeRegistrar }: { pessoaId: string; identidade: string; podeRegistrar: boolean }) {
  const [aberto, setAberto] = useState(false), [evento, setEvento] = useState(''), [tipo, setTipo] = useState('ADMISSAO'), [rol, setRol] = useState(''), [motivacao, setMotivacao] = useState('')
  const [hashRevisaoOrgaos, setHashRevisaoOrgaos] = useState('')
  const [revisaoOrgaos, setRevisaoOrgaos] = useState<string[]>([])
  const [decisao, setDecisao] = useState<string | null>(null)
  const [aprovada, setAprovada] = useState<PreviaConteudo | null>(null), [mensagem, setMensagem] = useState('')
  const { getFilter, getMapping, isLoading } = useEnumRelations('membresia'), chave = useRef(crypto.randomUUID()), client = useQueryClient()
  const eventos = useQuery({ queryKey: ['oficiais', identidade, 'eventos-correcao', true, pessoaId], queryFn: () => oficiaisApi.eventosParaCorrecao(pessoaId, true), enabled: aberto, staleTime: 0, gcTime: 0 })
  const historico = useQuery({ queryKey: ['oficiais', identidade, 'correcoes-conteudo', pessoaId], queryFn: () => oficiaisApi.correcoesConteudo(pessoaId), enabled: aberto, staleTime: 0, gcTime: 0 })
  const previa = useMutation({ mutationFn: (dados: PropostaConteudo) => oficiaisApi.previaConteudo(pessoaId, dados), onSuccess: setAprovada })
  const aplicar = useMutation({ mutationFn: (dados: unknown) => oficiaisApi.aplicarConteudo(pessoaId, dados), onSuccess: async () => { setMensagem('Correção registrada.'); setAprovada(null); chave.current = crypto.randomUUID(); await client.invalidateQueries() } })
  const rotulo = tipo === 'ADMISSAO' ? 'Admissão' : tipo === 'DEMISSAO' ? 'Demissão' : 'Mudança de Rol'
  const rols = tipo === 'ADMISSAO' ? getFilter('Rols de Admissão', tipo) : tipo === 'MUDANCA_DE_ROL' ? getFilter('Rols de Mudança de Rol', tipo) : []
  const motivos = getFilter(`Motivações de ${rotulo}`, tipo).filter(v => tipo !== 'MUDANCA_DE_ROL' || !rol || getFilter('Motivações por Rol de Destino', rol).includes(v))
  const rolFinal = tipo === 'DEMISSAO' ? getMapping('Rol de Destino por Motivação de Demissão', motivacao) ?? '' : rol
  const proposta = (): PropostaConteudo => ({ evento_id: evento, tipo_evento: tipo, rol: rolFinal, motivacao_evento: motivacao })
  function mudar(fn: () => void) { fn(); setDecisao(null); setRevisaoOrgaos([]); setAprovada(null); setMensagem(''); chave.current = crypto.randomUUID(); previa.reset(); aplicar.reset() }
  function pedir(e: FormEvent) { e.preventDefault(); setAprovada(null); setRevisaoOrgaos([]); previa.mutate(proposta()) }
  function confirmar(e: FormEvent<HTMLFormElement>) { e.preventDefault(); if (!aprovada) return; const d = new FormData(e.currentTarget); aplicar.mutate({ ...proposta(), hash_previa: aprovada.hash, ...(hashRevisaoOrgaos === aprovada.hash && revisaoOrgaos.length ? { decisoes_orgao: revisaoOrgaos } : {}), ...(decisao ? { decisao_id: decisao } : {}), justificativa: String(d.get('justificativa') ?? '').trim(), autoridade: String(d.get('autoridade') ?? '').trim(), evidencia: String(d.get('evidencia') ?? '').trim(), idempotencia: chave.current, ciente: d.has('ciente') }) }
  const erro = previa.error ?? aplicar.error
  return <div className="space-y-3 rounded border p-4"><Button type="button" variant="outline" onClick={() => setAberto(!aberto)}>{aberto ? 'Fechar correção de conteúdo' : 'Conferir correção de tipo ou rol'}</Button>
    {aberto && <><p>Corrija o tipo, o rol ou a motivação de um ato. A data e a ordem não serão alteradas. A prévia não substitui a revisão institucional.</p>
      <div><h3 className="font-medium">Correções registradas</h3>{historico.isPending ? <p>Carregando...</p> : historico.isError ? <p role="alert">Não foi possível consultar as correções.</p> : !historico.data?.length ? <p>Nenhuma correção registrada.</p> : historico.data.map(r => <details key={r.id}><summary>Evento {r.evento_id.slice(0, 8)} — {r.criado_por.nome_usuario}</summary><p>Antes: {descricao(r.dados_anteriores)}</p><p>Depois: {descricao(r.dados_novos)}</p><p>Justificativa: {r.justificativa}</p><p>Autoridade: {r.autoridade}</p><p>Evidência: {r.evidencia}</p></details>)}</div>
      {eventos.isError && <p role="alert">Não foi possível consultar os eventos.</p>}
      <form className="max-w-xl space-y-3" onSubmit={pedir}>
        <label className="block">Evento a corrigir<select className={classe} required value={evento} onChange={e => mudar(() => setEvento(e.target.value))}><option value="">Selecione</option>{eventos.data?.map(e => <option key={e.id} value={e.id}>{dia(e.data_evento)} — {e.tipo_evento} — {e.rol} — {e.id.slice(0, 8)}</option>)}</select></label>
        <label className="block">Tipo corrigido<select className={classe} value={tipo} onChange={e => mudar(() => { setTipo(e.target.value); setRol(''); setMotivacao('') })}><option value="ADMISSAO">Admissão</option><option value="DEMISSAO">Demissão</option><option value="MUDANCA_DE_ROL">Mudança de rol</option></select></label>
        {tipo !== 'DEMISSAO' && <label className="block">Rol corrigido<select className={classe} required value={rol} onChange={e => mudar(() => { setRol(e.target.value); setMotivacao('') })}><option value="">Selecione</option>{rols.map(v => <option key={v} value={v}>{ROL_LABELS[v as MembresiaRol] ?? v}</option>)}</select></label>}
        <label className="block">Motivação corrigida<select className={classe} required value={motivacao} onChange={e => mudar(() => setMotivacao(e.target.value))}><option value="">Selecione</option>{motivos.map(v => <option key={v} value={v}>{MOTIVACAO_LABELS[v as MotivacaoEvento] ?? v}</option>)}</select></label>
        {tipo === 'DEMISSAO' && rolFinal && <p>Rol de destino: {ROL_LABELS[rolFinal as MembresiaRol] ?? rolFinal}</p>}
        <Button type="submit" disabled={isLoading || eventos.isPending || eventos.isError || !evento || !rolFinal || previa.isPending || aplicar.isPending}>Gerar prévia do conteúdo</Button>
      </form>
      {aprovada && <div className="space-y-2 rounded border p-3"><h3>Impacto previsto em {dia(aprovada.data_evento)}</h3><p>Antes: {descricao(aprovada.dados_anteriores)}</p><p>Depois: {descricao(aprovada.dados_novos)}</p><p>{aprovada.observacao}</p><AvisoImpactoOrgaos bloqueio={aprovada.bloqueio_orgao}>{import.meta.env.VITE_FEATURE_ORGAOS_GESTAO === 'true' && <DecisaoOrgao aoConferir={ids => { setRevisaoOrgaos(ids); setHashRevisaoOrgaos(aprovada.hash) }} key={aprovada.hash} identidade={identidade} pessoaId={pessoaId} operacao="CONTEUDO" proposta={proposta()} hash={aprovada.hash} podeRegistrar={podeRegistrar} vinculos={aprovada.bloqueio_orgao?.detalhes} detalhesLimitados={aprovada.bloqueio_orgao?.detalhes_limitados} />}</AvisoImpactoOrgaos>{aprovada.mandatos.map(m => <p key={m.id}>Eleição {dia(m.eleicao)}: {m.rol_eleicao_antes} → {m.rol_eleicao_depois}; posse {dia(m.posse)}: {m.rol_posse_antes} → {m.rol_posse_depois}.</p>)}{aprovada.conferencias.map(c => <p key={c.id}>Conferência {dia(c.data_eleicao)}: {c.rol_antes} → {c.rol_depois}{c.evento_corrigido_utilizado ? ' — utiliza este evento' : ''}.</p>)}
        {aprovada.bloqueada && !decisao && <p role="alert">A correção exige revisão do rol de origem, da conferência eleitoral ou do mandato.</p>}
        {(!aprovada.bloqueio_orgao?.bloqueia || (revisaoOrgaos.length > 0 && hashRevisaoOrgaos === aprovada.hash)) && aprovada.bloqueada && !decisao && podeRegistrar && !aprovada.origem_seguinte_invalida && <DecisaoEleitoral key={aprovada.hash} identidade={identidade} pessoaId={pessoaId} operacao="CONTEUDO" proposta={proposta()} hash={aprovada.hash} aoRegistrar={setDecisao} />}
        {(!aprovada.bloqueio_orgao?.bloqueia || (revisaoOrgaos.length > 0 && hashRevisaoOrgaos === aprovada.hash)) && (!aprovada.bloqueada || decisao) && podeRegistrar ? <form className="space-y-3" onSubmit={confirmar}><label className="block">Justificativa da correção<input className={classe} name="justificativa" required maxLength={1000} /></label><label className="block">Autoridade da correção<input className={classe} name="autoridade" required maxLength={255} /></label><label className="block">Evidência da correção<input className={classe} name="evidencia" required maxLength={1000} /></label><label className="block"><input type="checkbox" name="ciente" required /> Conferi a correção e o impacto.</label><Button type="submit" disabled={aplicar.isPending}>Confirmar conteúdo</Button></form> : !podeRegistrar ? <p>Seu acesso permite apenas consultar a prévia.</p> : null}
      </div>}{erro && <p role="alert">{erro instanceof ApiRequestError ? erro.messages.join(' ') : 'Não foi possível concluir a operação.'}</p>}{mensagem && <p role="status">{mensagem}</p>}
    </>}
  </div>
}
