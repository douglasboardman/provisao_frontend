import { HistoricoIndicacoes } from './HistoricoIndicacoes'
import { useRecurso } from '../../lib/recursos'
import { ReferenciaAta } from '../../components/shared/ReferenciaAta'
import { useRef, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { IdentidadePastoral } from './IdentidadePastoral'
import { oficiaisApi, podeHistorico, type OficialResumo, type AcessoSensivel } from '../../api/oficiais'
import { ApiRequestError } from '../../api/client'
import { Button } from '../../components/ui/button'
import { useAuthStore } from '../../stores/auth'
import { Perfil } from '../../types/enums'

type Modo = 'ordenacao' | 'politica' | 'vinculo' | 'encerrar' | 'acervo'
const inputClass = 'block w-full rounded border bg-background p-2'
function Campo({ nome, titulo, tipo = 'text', obrigatorio = true }: { nome: string; titulo: string; tipo?: string; obrigatorio?: boolean }) {
  return <label className="block space-y-1"><span>{titulo}</span><input className={inputClass} name={nome} type={tipo} required={obrigatorio} maxLength={tipo === 'text' ? 1000 : undefined} /></label>
}
function dataExibida(d: string) { return d.slice(0, 10).split('-').reverse().join('/') }
function valor(d: FormData, nome: string) { return String(d.get(nome) ?? '').trim() }

export function GestaoOficial({ oficial, identidade, podeConsultarDetalhe, modoInicial = 'ordenacao', periodoInicial, acesso }: { periodoInicial?: string; modoInicial?: Modo; oficial: OficialResumo; identidade: string; podeConsultarDetalhe: boolean; acesso?: AcessoSensivel }) {
  const secretariaHabilitada = useRecurso('secretaria')
  const formRef = useRef<HTMLFormElement>(null)
  const chaveAcervo = useRef(crypto.randomUUID())
  const [detalheId, setDetalheId] = useState('')
  const [modo, setModo] = useState<Modo>(modoInicial)
  const [resultado, setResultado] = useState('')
  const perfil = useAuthStore(s => s.user?.perfil)
  const comum = perfil === Perfil.COMUM
  const consultarAcervo = comum ? !!acesso?.operacoes?.HISTORICO_OFICIAIS_CONSULTAR : podeHistorico(acesso, 'HISTORICO_OFICIAIS_CONSULTAR')
  const registrarHistorico = comum ? !!acesso?.operacoes?.HISTORICO_OFICIAIS_REGISTRAR : podeHistorico(acesso, 'HISTORICO_OFICIAIS_REGISTRAR')
  const modosLiberados = {
    ordenacao: registrarHistorico, acervo: registrarHistorico, politica: perfil === Perfil.ADMINISTRADOR,
    vinculo: !comum && oficial.tipo === 'PRESBITERO_DOCENTE', encerrar: !comum || !!periodoInicial,
  }
  const client = useQueryClient()
  const acervo = useQuery({ queryKey: ['oficiais', identidade, 'acervo', oficial.id], queryFn: () => oficiaisApi.acervo(oficial.id), enabled: consultarAcervo })
  const detalhe = useQuery({ queryKey: ['oficiais', identidade, 'detalhe-acervo', detalheId], queryFn: () => oficiaisApi.detalheAcervo(detalheId), enabled: consultarAcervo && podeConsultarDetalhe && !!detalheId, staleTime: 0, gcTime: 0 })
  const periodos = useQuery({ queryKey: ['oficiais', identidade, 'periodos', oficial.id], queryFn: () => oficiaisApi.periodos(oficial.id) })
  const salvar = useMutation({ mutationFn: ({ caminho, dados, patch }: { caminho: string; dados: unknown; patch?: boolean }) => patch ? oficiaisApi.encerrar(caminho, dados) : oficiaisApi.criarAto(caminho, dados), onSuccess: async () => { formRef.current?.reset(); chaveAcervo.current = crypto.randomUUID(); setResultado('Registro salvo.'); await Promise.all([client.invalidateQueries({ queryKey: ['oficiais', identidade] }), client.invalidateQueries({ queryKey: ['orgaos', identidade] })]) } })
  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setResultado(''); salvar.reset()
    const d = new FormData(e.currentTarget), id = encodeURIComponent(oficial.id)
    const texto = (nome: string) => valor(d, nome)
    let caminho = '', dados: unknown, patch = false
    if (modo === 'acervo') { caminho = `${id}/acervo-historico`; dados = { tipo: texto('tipo_historico'), data_evento: texto('data') || null, data_descricao: texto('data_descricao') || null, situacao_documental: texto('documento'), referencia_externa: texto('referencia') || null, autoridade: texto('autoridade') || null, idempotencia: chaveAcervo.current } }
    if (modo === 'ordenacao') { caminho = `${id}/eventos`; dados = { tipo: 'ORDENACAO', data_efeito: texto('data'), ordem: Number(texto('ordem')), autoridade: texto('autoridade'), evidencia: texto('evidencia') } }
    if (modo === 'politica') { caminho = 'politicas'; dados = { versao: texto('versao'), fonte: texto('fonte'), autoridade: texto('autoridade'), idade_minima: Number(texto('idade')), aniversario_bissexto: texto('bissexto'), vigente_desde: texto('inicio'), vigente_ate: texto('fim') || null } }
    if (modo === 'vinculo') { caminho = `${id}/vinculos-pastorais`; dados = { modalidade: texto('modalidade'), concilio: texto('concilio'), ato: texto('ato'), data_inicio: texto('inicio'), exercicio_institucional: d.has('exercicio'), evidencia: texto('evidencia') } }
    if (modo === 'encerrar') { const [tipo, registro] = texto('periodo').split(':'); caminho = `${tipo}/${encodeURIComponent(registro)}/encerrar`; patch = true; dados = tipo === 'mandatos' ? { data_efeito: texto('fim'), motivo: texto('motivo'), autoridade: texto('autoridade'), evidencia: texto('evidencia') } : { data_fim: texto('fim'), motivo: texto('motivo'), autoridade: texto('autoridade'), evidencia: texto('evidencia') } }
    if (caminho && modosLiberados[modo]) salvar.mutate({ caminho, dados, patch })
  }
  const titulo = `Registros de ${oficial.pessoa.nome_completo}`
  return <section className="space-y-4 rounded border p-4"><h2 className="font-semibold">{titulo}</h2>
    {!comum && oficial.tipo === 'PRESBITERO_DOCENTE' && <IdentidadePastoral oficialId={oficial.id} identidade={identidade} />}
    <div><h3 className="font-medium">Períodos registrados</h3>{periodos.isPending ? <p>Carregando períodos...</p> : periodos.isError ? <p role="alert">Não foi possível carregar os períodos.</p> : <>
      {!periodos.data?.mandatos.length && !periodos.data?.vinculos.length && <p>Nenhum período registrado.</p>}
      {periodos.data?.mandatos.map(m => <div key={m.id}><p>Mandato: eleição {dataExibida(m.data_eleicao)}, posse {dataExibida(m.data_posse)}, {m.termino_efetivo ? `término efetivo ${dataExibida(m.termino_efetivo)}` : `término previsto ${dataExibida(m.termino_previsto)}`}.{m.revisao_pendente && <strong> Pendente de revisão institucional.</strong>}</p>{secretariaHabilitada && <>{(['ELEICAO', 'POSSE', ...(m.termino_efetivo ? ['ENCERRAMENTO'] : [])] as ('ELEICAO' | 'POSSE' | 'ENCERRAMENTO')[]).map(ato => <div key={ato}><p>Referência de {ato.toLowerCase()}:</p><ReferenciaAta alvo={{ grupo: 'MANDATO', alvo_id: m.id, etapa: ato }} identidade={identidade} /></div>)}</>}</div>)}
      {periodos.data?.vinculos.map(v => <div key={v.id}><p>Vínculo pastoral {v.modalidade}, {v.concilio}: {dataExibida(v.data_inicio)} até {v.data_fim ? dataExibida(v.data_fim) : 'em aberto'}.</p>{secretariaHabilitada && <>{(['INICIO', ...(v.data_fim ? ['ENCERRAMENTO'] : [])] as ('INICIO' | 'ENCERRAMENTO')[]).map(ato => <div key={ato}><p>Referência de {ato.toLowerCase()}:</p><ReferenciaAta alvo={{ grupo: 'PASTORAL', alvo_id: v.id, etapa: ato }} identidade={identidade} /></div>)}</>}</div>)}
    </>}</div>
    {!comum && secretariaHabilitada && oficial.tipo !== 'PRESBITERO_DOCENTE' && <HistoricoIndicacoes identidade={identidade} oficial={oficial.id} />}
    {consultarAcervo && <div><h3 className="font-medium">Acervo histórico conferido</h3><p className="text-sm text-muted-foreground">Estes registros preservam lacunas e não concedem exercício automaticamente.</p>
      {acervo.isPending ? <p>Carregando acervo...</p> : acervo.isError ? <p role="alert">Não foi possível carregar o acervo.</p> : !acervo.data?.length ? <p>Nenhum registro histórico.</p> : acervo.data.map(a => <div key={a.id} className="my-2 rounded border p-2"><p>{({ ELEICAO: 'Eleição', POSSE: 'Posse', ORDENACAO: 'Ordenação', VINCULO_PASTORAL: 'Vínculo pastoral', FIM_EXERCICIO: 'Fim de exercício' } as const)[a.tipo]} — {a.data_evento ? dataExibida(a.data_evento) : 'data não informada'} — {a.situacao_documental === 'PENDENTE' ? 'documentação pendente' : 'referência externa conferida'}.</p>{podeConsultarDetalhe && <Button type="button" variant="outline" onClick={() => setDetalheId(a.id)}>Consultar referência</Button>}</div>)}
      {detalheId && podeConsultarDetalhe && (detalhe.isPending ? <p>Carregando referência...</p> : detalhe.isError ? <p role="alert">Não foi possível consultar a referência.</p> : detalhe.data && <div className="rounded border p-2"><p>Data aproximada: {detalhe.data.data_descricao || 'não informada'}</p><p>Referência: {detalhe.data.referencia_externa || 'não informada'}</p><p>Autoridade: {detalhe.data.autoridade || 'não informada'}</p><p>Registrado por: {detalhe.data.criado_por.nome_usuario}</p><Button type="button" variant="outline" onClick={() => setDetalheId('')}>Fechar referência</Button></div>)}
    </div>}
    <label className="block space-y-1"><span>Operação</span><select className={inputClass} disabled={salvar.isPending} value={modosLiberados[modo] ? modo : ''} onChange={e => { setModo(e.target.value as Modo); chaveAcervo.current = crypto.randomUUID(); setResultado(''); salvar.reset() }}>
      <option value="" disabled>Selecione</option>{registrarHistorico && <><option value="ordenacao">Registrar ordenação</option><option value="acervo">Importar registro histórico</option></>}
      {oficial.tipo !== 'PRESBITERO_DOCENTE' && perfil === Perfil.ADMINISTRADOR && <option value="politica">Registrar política eleitoral</option>}
      {modosLiberados.vinculo && <option value="vinculo">Registrar vínculo pastoral</option>}
      {modosLiberados.encerrar && <option value="encerrar">Encerrar período</option>}
    </select></label>
    {modosLiberados[modo] && <form ref={formRef} key={`${oficial.id}:${modo}`} className="max-w-xl space-y-3" onSubmit={enviar}>
      {modo === 'acervo' && <><p className="text-sm text-muted-foreground">Importe apenas o que foi conferido. Deixe a data em branco quando for desconhecida; este registro não ativa o exercício.</p><label className="block">Fato histórico<select className={inputClass} name="tipo_historico"><option value="ELEICAO">Eleição</option><option value="POSSE">Posse</option><option value="ORDENACAO">Ordenação</option><option value="VINCULO_PASTORAL">Vínculo pastoral</option><option value="FIM_EXERCICIO">Fim de exercício</option></select></label><Campo nome="data" titulo="Data exata (opcional)" tipo="date" obrigatorio={false} /><Campo nome="data_descricao" titulo="Data aproximada ou lacuna (opcional)" obrigatorio={false} /><label className="block">Situação documental<select className={inputClass} name="documento"><option value="PENDENTE">Pendente</option><option value="EXTERNO_CONFERIDO">Referência externa conferida</option></select></label><Campo nome="referencia" titulo="Referência externa (obrigatória se conferida)" obrigatorio={false} /><Campo nome="autoridade" titulo="Autoridade do ato (opcional)" obrigatorio={false} /></>}
      {modo === 'ordenacao' && <><Campo nome="data" titulo="Data da ordenação" tipo="date" /><Campo nome="ordem" titulo="Ordem do ato no dia" tipo="number" /><Campo nome="autoridade" titulo="Autoridade do ato" /><Campo nome="evidencia" titulo="Referência ou evidência" /></>}
      {modo === 'politica' && <><Campo nome="versao" titulo="Versão" /><Campo nome="fonte" titulo="Fonte normativa" /><Campo nome="autoridade" titulo="Autoridade que aprovou a regra" /><Campo nome="idade" titulo="Idade mínima" tipo="number" /><label className="block">Aniversário em ano não bissexto<select className={inputClass} name="bissexto"><option value="DIA_28_FEVEREIRO">28 de fevereiro</option><option value="DIA_01_MARCO">1º de março</option></select></label><Campo nome="inicio" titulo="Vigente desde" tipo="date" /><Campo nome="fim" titulo="Vigente até (opcional)" tipo="date" obrigatorio={false} /></>}
      {modo === 'vinculo' && <><Campo nome="modalidade" titulo="Modalidade" /><Campo nome="concilio" titulo="Concílio competente" /><Campo nome="ato" titulo="Ato do concílio" /><Campo nome="inicio" titulo="Início do vínculo" tipo="date" /><label className="block"><input type="checkbox" name="exercicio" /> Exercício institucional</label><Campo nome="evidencia" titulo="Evidência do vínculo" /></>}
      {modo === 'encerrar' && <><label className="block">Período<select className={inputClass} key={periodos.isSuccess ? 'pronto' : 'aguardando'} name="periodo" defaultValue={periodoInicial ?? ''} required><option value="">Selecione</option>{periodoInicial && !periodos.data?.mandatos.some(m => 'mandatos:' + m.id === periodoInicial) && <option value={periodoInicial}>Mandato selecionado na ficha</option>}{periodos.data?.mandatos.filter(m => !m.termino_efetivo).map(m => <option key={m.id} value={`mandatos:${m.id}`}>Mandato desde {dataExibida(m.data_posse)}</option>)}{periodos.data?.vinculos.filter(v => !v.data_fim).map(v => <option key={v.id} value={`vinculos-pastorais:${v.id}`}>Vínculo desde {dataExibida(v.data_inicio)}</option>)}</select></label><Campo nome="fim" titulo="Último dia de exercício" tipo="date" /><Campo nome="motivo" titulo="Motivo do encerramento" /><Campo nome="autoridade" titulo="Autoridade do ato" /><Campo nome="evidencia" titulo="Evidência do ato" /></>}
      {salvar.isError && <p role="alert">{salvar.error instanceof ApiRequestError ? salvar.error.messages.join(' ') : 'Não foi possível salvar o registro.'}</p>}
      {resultado && <p role="status">{resultado}</p>}
      <Button type="submit" disabled={salvar.isPending}>Salvar registro</Button>
    </form>}
  </section>
}
