import { HistoricoRevisoesEleitorais } from './DecisaoEleitoral'
import { InsercaoRetroativaOficial } from './InsercaoRetroativaOficial'
import { useRef, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { oficiaisApi, podeHistorico, type AcessoSensivel, type EventoSensivel, type OficialResumo } from '../../api/oficiais'
import { ApiRequestError } from '../../api/client'
import { OrdenacaoMembresia } from './OrdenacaoMembresia'
import { CorrecaoMembresia } from './CorrecaoMembresia'
import { Button } from '../../components/ui/button'

const nomes: Record<EventoSensivel['tipo'], string> = { LICENCA: 'Licença', SUSPENSAO: 'Suspensão', DISPONIBILIDADE: 'Disponibilidade', RESTAURACAO: 'Restauração', DEPOSICAO: 'Deposição' }
const classe = 'block w-full rounded border bg-background p-2'
function dia(s: string) { return s.slice(0, 10).split('-').reverse().join('/') }

export function EventosSensiveis({ oficial, identidade, acesso }: { oficial: OficialResumo; identidade: string; acesso: AcessoSensivel }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [tipo, setTipo] = useState<EventoSensivel['tipo']>('LICENCA')
  const [mensagem, setMensagem] = useState('')
  const client = useQueryClient()
  const consultaOficial = acesso.pode_consultar && podeHistorico(acesso, 'HISTORICO_OFICIAIS_CONSULTAR')
  const registraOficial = acesso.pode_registrar && podeHistorico(acesso, 'HISTORICO_OFICIAIS_REGISTRAR')
  const consultaMembresia = acesso.pode_consultar && podeHistorico(acesso, 'HISTORICO_MEMBRESIA_CONSULTAR')
  const retifica = acesso.pode_registrar && podeHistorico(acesso, 'HISTORICO_MEMBRESIA_RETIFICAR')
  const decide = acesso.pode_registrar && podeHistorico(acesso, 'REVISOES_ELEITORAIS_DECIDIR')
  const eventos = useQuery({ queryKey: ['oficiais', identidade, 'eventos-sensiveis', oficial.id], queryFn: () => oficiaisApi.eventosSensiveis(oficial.id), enabled: consultaOficial, staleTime: 0, gcTime: 0 })
  const salvar = useMutation({ mutationFn: (dados: unknown) => oficiaisApi.criarAto(`${encodeURIComponent(oficial.id)}/eventos`, dados), onSuccess: async () => { formRef.current?.reset(); setTipo('LICENCA'); setMensagem('Evento registrado.'); await client.invalidateQueries({ queryKey: ['oficiais', identidade] }) } })
  const restaurados = new Set(eventos.data?.filter(e => e.tipo === 'RESTAURACAO').map(e => e.evento_restaurado_id) ?? [])
  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setMensagem(''); salvar.reset()
    const form = new FormData(e.currentTarget), texto = (nome: string) => String(form.get(nome) ?? '').trim()
    const dados = { tipo, data_efeito: texto('data'), ordem: Number(texto('ordem')), autoridade: texto('autoridade'), evidencia: texto('evidencia'), ...(texto('observacoes') ? { observacoes: texto('observacoes') } : {}), ...(tipo === 'RESTAURACAO' ? { evento_restaurado_id: texto('restaurado') } : {}) }
    salvar.mutate(dados)
  }
  return <section className="space-y-3 rounded border p-4"><h2 className="font-semibold">Eventos com acesso específico — {oficial.pessoa.nome_completo}</h2>
    {consultaOficial && eventos.data && <InsercaoRetroativaOficial oficialId={oficial.id} identidade={identidade} podeRegistrar={registraOficial} eventos={eventos.data} />}
    {consultaMembresia && <HistoricoRevisoesEleitorais pessoaId={oficial.pessoa.id} identidade={identidade} podeRegistrar={decide} />}
    {consultaMembresia && <OrdenacaoMembresia oficialId={oficial.pessoa.id} identidade={identidade} podeRegistrar={retifica} porPessoa />}
    {consultaMembresia && <CorrecaoMembresia oficialId={oficial.pessoa.id} identidade={identidade} podeRegistrar={retifica} porPessoa />}
    {consultaOficial && <div>{eventos.isPending ? <p>Carregando histórico...</p> : eventos.isError ? <p role="alert">Não foi possível consultar o histórico.</p> : eventos.data?.length ? eventos.data.map(e => <article className="my-2 rounded border p-2" key={e.id}><p>{nomes[e.tipo]} em {dia(e.data_efeito)} — ordem {e.ordem}.</p><p>Autoridade: {e.autoridade}</p><p>Evidência: {e.evidencia}</p>{e.observacoes && <p>Observações: {e.observacoes}</p>}{e.registrado_por && <p>Registrado por {e.registrado_por.nome} em {new Date(e.registrado_por.data).toLocaleString()}.</p>}{e.evento_restaurado_id && <p>Restaura o evento {e.evento_restaurado_id}.</p>}</article>) : <p>Nenhum evento registrado.</p>}</div>}
    {registraOficial && <form ref={formRef} className="max-w-xl space-y-3" onSubmit={enviar}>
      <label className="block">Tipo de evento<select className={classe} value={tipo} onChange={e => setTipo(e.target.value as EventoSensivel['tipo'])}><option value="LICENCA">Licença</option><option value="SUSPENSAO">Suspensão</option><option value="DISPONIBILIDADE">Disponibilidade</option><option value="DEPOSICAO">Deposição</option>{consultaOficial && <option value="RESTAURACAO">Restauração</option>}</select></label>
      {tipo === 'RESTAURACAO' && <label className="block">Evento a restaurar<select name="restaurado" className={classe} defaultValue="" required><option value="">Selecione</option>{eventos.data?.filter(e => e.tipo !== 'RESTAURACAO' && !restaurados.has(e.id)).map(e => <option key={e.id} value={e.id}>{nomes[e.tipo]} — {dia(e.data_efeito)} (ordem {e.ordem})</option>)}</select></label>}
      <label className="block">Data do efeito<input className={classe} name="data" type="date" required /></label>
      <label className="block">Ordem no dia<input className={classe} name="ordem" type="number" min="1" max="9999" required /></label>
      <label className="block">Autoridade<input className={classe} name="autoridade" required maxLength={1000} /></label>
      <label className="block">Evidência<input className={classe} name="evidencia" required maxLength={1000} /></label>
      <label className="block">Observações (opcional)<textarea className={classe} name="observacoes" maxLength={1000} /></label>
      {salvar.isError && <p role="alert">{salvar.error instanceof ApiRequestError ? salvar.error.messages.join(' ') : 'Não foi possível registrar o evento.'}</p>}
      {mensagem && <p role="status">{mensagem}</p>}
      <Button disabled={salvar.isPending} type="submit">Registrar evento</Button>
    </form>}
  </section>
}
