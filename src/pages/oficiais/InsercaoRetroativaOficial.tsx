import { useRef, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { oficiaisApi, type EventoSensivel, type PreviaOficialRetroativa, type PropostaOficialRetroativa } from '../../api/oficiais'
import { ApiRequestError } from '../../api/client'
import { Button } from '../../components/ui/button'
const classe = 'block w-full rounded border bg-background p-2'
const dia = (d: string) => d.slice(0, 10).split('-').reverse().join('/')
const nomes: Record<string, string> = { ORDENACAO: 'Ordenação', LICENCA: 'Licença', SUSPENSAO: 'Suspensão', DISPONIBILIDADE: 'Disponibilidade', RESTAURACAO: 'Restauração', DEPOSICAO: 'Deposição' }
export function InsercaoRetroativaOficial({ oficialId, identidade, podeRegistrar, eventos }: { oficialId: string; identidade: string; podeRegistrar: boolean; eventos: EventoSensivel[] }) {
  const [aberto, setAberto] = useState(false), [tipo, setTipo] = useState('LICENCA'), [aprovada, setAprovada] = useState<PreviaOficialRetroativa | null>(null), [mensagem, setMensagem] = useState('')
  const chave = useRef(crypto.randomUUID()), client = useQueryClient()
  const historico = useQuery({ queryKey: ['oficiais', identidade, 'insercoes-retroativas', oficialId], queryFn: () => oficiaisApi.insercoesOficial(oficialId), enabled: aberto, staleTime: 0, gcTime: 0 })
  const previa = useMutation({ mutationFn: (dados: PropostaOficialRetroativa) => oficiaisApi.previaInsercaoOficial(oficialId, dados), onSuccess: setAprovada })
  const aplicar = useMutation({ mutationFn: (dados: unknown) => oficiaisApi.aplicarInsercaoOficial(oficialId, dados), onSuccess: async () => { setMensagem('Evento retroativo registrado.'); setAprovada(null); chave.current = crypto.randomUUID(); await client.invalidateQueries({ queryKey: ['oficiais', identidade] }) } })
  const restaurados = new Set(eventos.filter(e => e.tipo === 'RESTAURACAO').map(e => e.evento_restaurado_id))
  function mudar() { setAprovada(null); setMensagem(''); chave.current = crypto.randomUUID(); previa.reset(); aplicar.reset() }
  function pedir(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const d = new FormData(e.currentTarget), texto = (nome: string) => String(d.get(nome) ?? '').trim()
    setAprovada(null); setMensagem(''); previa.mutate({ tipo, data_efeito: texto('data'), ordem: Number(texto('ordem')), autoridade: texto('autoridade'), evidencia: texto('evidencia'), observacoes: texto('observacoes') || null, evento_restaurado_id: tipo === 'RESTAURACAO' ? texto('restaurado') : null })
  }
  function confirmar(e: FormEvent<HTMLFormElement>) { e.preventDefault(); if (!aprovada) return; const d = new FormData(e.currentTarget); aplicar.mutate({ ...aprovada.proposta, hash_previa: aprovada.hash, justificativa: String(d.get('justificativa') ?? '').trim(), idempotencia: chave.current, ciente: d.has('ciente') }) }
  const erro = previa.error ?? aplicar.error
  return <div className="space-y-3 rounded border p-4"><Button type="button" variant="outline" onClick={() => setAberto(!aberto)}>{aberto ? 'Fechar inclusão retroativa de ofício' : 'Conferir evento retroativo de ofício'}</Button>
    {aberto && <><p>Informe um ato anterior aos eventos já registrados. A prévia compara o exercício cadastrado e não reavalia documentos ou competências.</p>
      <div><h3 className="font-medium">Inclusões retroativas registradas</h3>{historico.isPending ? <p>Carregando...</p> : historico.isError ? <p role="alert">Não foi possível consultar as inclusões.</p> : !historico.data?.length ? <p>Nenhuma inclusão registrada.</p> : historico.data.map(r => <details key={r.id}><summary>{nomes[r.impacto.proposta.tipo]} — {dia(r.impacto.proposta.data_efeito)} — {r.criado_por.nome_usuario}</summary><p>Justificativa: {r.justificativa}</p><p>Autoridade: {r.impacto.proposta.autoridade}</p><p>Evidência: {r.impacto.proposta.evidencia}</p></details>)}</div>
      <form className="max-w-xl space-y-3" onSubmit={pedir} onChange={mudar}>
        <label className="block">Tipo de ato retroativo<select className={classe} value={tipo} onChange={e => setTipo(e.target.value)}><option value="ORDENACAO">Ordenação</option><option value="LICENCA">Licença</option><option value="SUSPENSAO">Suspensão</option><option value="DISPONIBILIDADE">Disponibilidade</option><option value="DEPOSICAO">Deposição</option><option value="RESTAURACAO">Restauração</option></select></label>
        {tipo === 'RESTAURACAO' && <label className="block">Afastamento a restaurar<select className={classe} name="restaurado" defaultValue="" required><option value="">Selecione</option>{eventos.filter(e => e.tipo !== 'RESTAURACAO' && !restaurados.has(e.id)).map(e => <option key={e.id} value={e.id}>{nomes[e.tipo]} — {dia(e.data_efeito)} (ordem {e.ordem})</option>)}</select></label>}
        <label className="block">Data do efeito retroativo<input className={classe} name="data" type="date" required /></label><label className="block">Ordem do ato retroativo<input className={classe} name="ordem" type="number" min="1" max="9999" step="1" required /></label><label className="block">Autoridade do ato retroativo<input className={classe} name="autoridade" required maxLength={1000} /></label><label className="block">Evidência do ato retroativo<input className={classe} name="evidencia" required maxLength={1000} /></label><label className="block">Observações do ato retroativo<textarea className={classe} name="observacoes" maxLength={1000} /></label>
        <Button type="submit" disabled={previa.isPending || aplicar.isPending}>Gerar prévia do ofício</Button>
      </form>
      {aprovada && <div className="space-y-2 rounded border p-3"><h3>Impacto previsto</h3><p>{nomes[aprovada.proposta.tipo]} em {dia(aprovada.proposta.data_efeito)}, ordem {aprovada.proposta.ordem}. Autoridade: {aprovada.proposta.autoridade}. Evidência: {aprovada.proposta.evidencia}.</p><p>{aprovada.observacao}</p>{!aprovada.alteracoes.length && <p>Nenhuma alteração de exercício encontrada nas datas verificadas.</p>}{aprovada.alteracoes.map((a, i) => <p key={`${a.tipo}-${a.id}-${a.data}-${i}`}>{a.tipo === 'MANDATO' ? 'Mandato' : 'Vínculo pastoral'} em {dia(a.data)}: {a.antes.motivo} → {a.depois.motivo}.</p>)}
        {aprovada.bloqueada ? <p role="alert">A inclusão exige revisão institucional da posse.</p> : podeRegistrar ? <form className="space-y-3" onSubmit={confirmar}><label className="block">Justificativa da inclusão retroativa<input className={classe} name="justificativa" required maxLength={1000} /></label><label className="block"><input type="checkbox" name="ciente" required /> Conferi o ato e o impacto no ofício.</label><Button type="submit" disabled={aplicar.isPending}>Confirmar evento retroativo</Button></form> : <p>Seu acesso permite apenas consultar a prévia.</p>}
      </div>}{erro && <p role="alert">{erro instanceof ApiRequestError ? erro.messages.join(' ') : 'Não foi possível concluir a operação.'}</p>}{mensagem && <p role="status">{mensagem}</p>}
    </>}
  </div>
}
