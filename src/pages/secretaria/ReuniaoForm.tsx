import { SeletorPessoa } from '../../components/shared/SeletorPessoa'
import { useState } from 'react'
import { Button } from '../../components/ui/button'
import { modalidadesParaContexto, rotulosModalidadeReuniao, secretariaApi, type ContextoSecretaria, type ReuniaoSecretaria, type DadosReuniao } from '../../api/secretaria'
import { Area, Campo, Escolha, Check, Salvar, hoje, CampoPapeis, useComando } from './formulario'
export function ReuniaoForm({ contexto, reuniao, pessoas, pronto }: { contexto: ContextoSecretaria; reuniao?: ReuniaoSecretaria; pessoas: { id: string; nome_completo: string }[]; pronto: () => void }) {
  const [v, set] = useState<DadosReuniao>(reuniao?.dados ?? { restrito: false, modalidade: contexto.tipo === 'ASSEMBLEIA_GERAL' ? 'AGO' : 'ORDINARIA', data: hoje(), local: '', inicio: null, fim: null, pauta: '', competencia: '', universo_informado: 0, quorum_minimo: 0, quorum_conferido: false, fundamento_quorum: '', resultado: '', participantes: [] })
  const [pessoa, setPessoa] = useState('')
  const editar = <K extends keyof DadosReuniao>(k: K, valor: DadosReuniao[K]) => set(s => ({ ...s, [k]: valor }))
  const alterarParticipante = (i: number, patch: Partial<DadosReuniao['participantes'][number]>) =>
    editar('participantes', v.participantes.map((p, n) => n === i ? { ...p, ...patch } : p))
  const enviar = useComando((dados: { dados: DadosReuniao }) => reuniao ? secretariaApi.editarReuniao(reuniao.id, { ...dados, revisao: reuniao.revisao }) : secretariaApi.criarReuniao({ ...dados, contexto_id: contexto.id }), pronto)
  return <form className="space-y-4 rounded border p-4" onSubmit={e => { e.preventDefault(); enviar.mutate({ dados: v }) }}>
    <h3 className="font-semibold">{reuniao ? 'Editar reunião' : 'Nova reunião'}</h3>
    <div className="grid gap-4 md:grid-cols-2"><Escolha label="Modalidade" value={v.modalidade} onChange={s => editar('modalidade', s as DadosReuniao['modalidade'])}>{modalidadesParaContexto(contexto).map(m => <option key={m} value={m}>{rotulosModalidadeReuniao[m]}</option>)}</Escolha><Campo label="Data da reunião" type="date" value={v.data} onChange={s => editar('data', s)} />
      <Campo label="Local" value={v.local} onChange={s => editar('local', s)} />
      {(['inicio', 'fim'] as const).map(k => <Campo key={k} label={k === 'inicio' ? 'Início (data e hora local)' : 'Fim (data e hora local)'} type="datetime-local" required={false} value={v[k] ? (() => { const d = new Date(v[k]!); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) })() : ''} onChange={s => editar(k, s ? new Date(s).toISOString() : null)} />)}
    </div>
    <Area label="Pauta" value={v.pauta} onChange={s => editar('pauta', s)} /><Area label="Competência para os assuntos da pauta" value={v.competencia} onChange={s => editar('competencia', s)} />
    {contexto.pode_consultar_restritos && <Check label="Reunião restrita" checked={v.restrito} onChange={s => editar('restrito', s)} />}
    <fieldset className="space-y-3"><legend className="font-semibold">Presença e mesa</legend>
      <p className="text-sm">Registre quem tinha competência para apresentar propostas conforme as regras da reunião.</p>
      <div className="flex items-end gap-2"><div className="grid min-w-0 flex-1 gap-1 text-sm"><span>Adicionar participante</span><SeletorPessoa rotulo="Adicionar participante" value={pessoa} onChange={setPessoa} required={false} opcoes={pessoas.filter(p => !v.participantes.some(r => r.pessoa_id === p.id)).map(p => ({ id: p.id, nome: p.nome_completo }))} /></div><Button type="button" variant="outline" disabled={!pessoa} onClick={() => { editar('participantes', [...v.participantes, { pessoa_id: pessoa, presente: true, papeis: ['PARTICIPANTE'], pode_propor: false }]); setPessoa('') }}>Adicionar pessoa</Button></div>
      {v.participantes.map((p, i) => <div key={p.pessoa_id} className="grid gap-2 rounded border p-3 md:grid-cols-3"><p>{pessoas.find(x => x.id === p.pessoa_id)?.nome_completo ?? reuniao?.participantes.find(x => x.pessoa_id === p.pessoa_id)?.retrato.nome ?? 'Pessoa'}</p><Check label="Presente" checked={p.presente} onChange={b => alterarParticipante(i, { presente: b })} /><Check label="Pode apresentar propostas" checked={!!p.pode_propor} onChange={b => alterarParticipante(i, { pode_propor: b })} /><CampoPapeis label="Papéis na reunião (ex.: Presidente, Secretário)" value={p.papeis} onChange={s => editar('participantes', v.participantes.map((x, n) => n === i ? { ...x, papeis: s } : x))} /><Button variant="outline" type="button" onClick={() => editar('participantes', v.participantes.filter((_, n) => n !== i))}>Remover participante</Button></div>)}
    </fieldset>
    <p>Presentes: {v.participantes.filter(p => p.presente).length}. Cada pessoa é contada uma vez, mesmo exercendo vários papéis.</p>
    <div className="grid gap-4 md:grid-cols-2"><Campo label="Universo informado para conferência" type="number" value={v.universo_informado} onChange={s => editar('universo_informado', Number(s))} /><Campo label="Quórum mínimo informado" type="number" value={v.quorum_minimo} onChange={s => editar('quorum_minimo', Number(s))} /></div>
    <Area label="Fundamento e conferência do quórum" value={v.fundamento_quorum} onChange={s => editar('fundamento_quorum', s)} /><Check label="Quórum conferido pelo responsável" checked={v.quorum_conferido} onChange={s => editar('quorum_conferido', s)} />
    <Area label="Resultado da reunião" required={false} value={v.resultado} onChange={s => editar('resultado', s)} /><Salvar pending={enviar.isPending} error={enviar.error} success={enviar.isSuccess} label="Salvar reunião" />
  </form>
}
