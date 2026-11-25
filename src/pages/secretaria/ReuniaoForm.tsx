import { PaineisSecretaria } from './PaineisSecretaria'
import { LocalDaReuniao } from './LocalDaReuniao'
import { SeletorPessoa } from '../../components/shared/SeletorPessoa'
import { useState } from 'react'
import { Button } from '../../components/ui/button'
import { modalidadesParaContexto, nomeModalidade, secretariaApi, situacoesReuniao, type ContextoSecretaria, type ReuniaoSecretaria, type DadosReuniao, type ResultadoSecretaria } from '../../api/secretaria'
import { Area, Campo, Escolha, Check, Salvar, hoje, CampoPapeis, useComando } from './formulario'
type LinhaPauta = { id?: string; chave: string; descricao: string; proponente_id: string | null }
const linhaPauta = (descricao = '', proponente_id: string | null = null, id?: string): LinhaPauta => ({ id, chave: id ?? crypto.randomUUID(), descricao, proponente_id })
function instanteLocal(valor: string) {
  if (!valor) return null
  const deslocamento = -new Date(valor).getTimezoneOffset()
  const absoluto = Math.abs(deslocamento)
  const hh = String(Math.floor(absoluto / 60)).padStart(2, '0')
  const mm = String(absoluto % 60).padStart(2, '0')
  const dataHora = valor.length === 16 ? valor + ':00' : valor
  return dataHora + (deslocamento < 0 ? '-' : '+') + hh + ':' + mm
}

type EntradaReuniao = { local_efetivo_id?: string | null; local_id?: string; dados: Omit<DadosReuniao, 'pauta' | 'local'> & { local?: string; itens_pauta: { descricao: string; proponente_id: string | null }[] } }

export function ReuniaoForm({ contexto, reuniao, pessoas, pronto, gerarEdital }: { contexto: ContextoSecretaria; reuniao?: ReuniaoSecretaria; pessoas: { id: string; nome_completo: string }[]; pronto: (id: string) => void; gerarEdital?: (v: EntradaReuniao & { idempotencia: string }) => Promise<ResultadoSecretaria> }) {
  const [v, set] = useState<Omit<DadosReuniao, 'pauta'>>(() => {
    if (reuniao) {
      const campos: Omit<DadosReuniao, 'pauta'> & { pauta?: string } = { ...reuniao.dados }
      delete campos.pauta
      return campos
    }
    return { situacao: 'AGENDADA', restrito: false, modalidade: modalidadesParaContexto(contexto).includes('REGULAR') ? 'REGULAR' : modalidadesParaContexto(contexto)[0], data: hoje(), local: '', inicio: null, fim: null, competencia: '', universo_informado: 0, quorum_minimo: 0, quorum_conferido: false, fundamento_quorum: '', resultado: '', participantes: [] }
  })
  const [aba, selecionarAba] = useState(reuniao && contexto.pode_agendar === false ? 'realizacao' : 'agendamento')
  const [localEfetivo, selecionarEfetivo] = useState(reuniao?.local_efetivo_id ?? '')
  const [localId, selecionarLocal] = useState(reuniao?.local_id ?? (reuniao ? 'historico' : ''))
  const [itens, setItens] = useState(() => reuniao?.itens_pauta?.length
    ? reuniao.itens_pauta.map(i => linhaPauta(i.descricao, i.proponente_id, i.id))
    : [linhaPauta(reuniao?.dados.pauta)])
  const opcoes = pessoas.map(p => ({ id: p.id, nome: p.nome_completo }))
  function alterarItem(chave: string, patch: Partial<Pick<LinhaPauta, 'descricao' | 'proponente_id'>>) {
    setItens(atuais => atuais.map(i => i.chave === chave ? { ...i, ...patch } : i))
  }
  const [pessoa, setPessoa] = useState('')
  const editar = <K extends keyof DadosReuniao>(k: K, valor: DadosReuniao[K]) => set(s => ({ ...s, [k]: valor }))
  const alterarParticipante = (i: number, patch: Partial<DadosReuniao['participantes'][number]>) =>
    editar('participantes', v.participantes.map((p, n) => n === i ? { ...p, ...patch } : p))
  const enviar = useComando<EntradaReuniao>(dados => gerarEdital ? gerarEdital(dados) : reuniao
    ? secretariaApi.editarReuniao(reuniao.id, { ...dados, revisao: reuniao.revisao })
    : secretariaApi.criarReuniao({ ...dados, contexto_id: contexto.id }), r => pronto(r.id))
  const agendamento = <div className="space-y-4">
    <div className="grid gap-4 md:grid-cols-2"><Escolha label="Modalidade" value={v.modalidade} onChange={s => editar('modalidade', s as DadosReuniao['modalidade'])}>{modalidadesParaContexto(contexto).map(m => <option key={m} value={m}>{nomeModalidade(contexto, m)}</option>)}</Escolha><Campo label="Data da reunião" type="date" value={v.data} onChange={s => editar('data', s)} />
      <LocalDaReuniao reuniao={reuniao} valor={localId} alterar={selecionarLocal} />
      <Campo label="Horário previsto" type="time" required={v.situacao === 'AGENDADA'} value={v.horario_previsto ?? ''} onChange={s => editar('horario_previsto', s || undefined)} />
    </div>
    <fieldset className="space-y-3"><legend className="font-semibold">Itens de pauta</legend>
      <ol className="space-y-3">{itens.map((item, i) => <li key={item.chave} className="rounded border p-3">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm">Descrição do item {i + 1}
            <textarea className="rounded border bg-background p-2" rows={2} required maxLength={20000} value={item.descricao} onChange={e => alterarItem(item.chave, { descricao: e.target.value })} />
          </label>
          <div className="space-y-1 text-sm"><label htmlFor={'proponente-' + item.chave}>Proponente do item {i + 1} (opcional)</label>
            <SeletorPessoa id={'proponente-' + item.chave} opcoes={opcoes} value={item.proponente_id ?? ''} onChange={id => alterarItem(item.chave, { proponente_id: id || null })}/>
          </div>
        </div>
        <div className="mt-2 flex gap-2">{[-1, 1].map(delta => <Button type="button" key={delta} variant="outline"
          aria-label={(delta < 0 ? 'Subir item ' : 'Descer item ') + (i + 1)} disabled={!itens[i + delta]} onClick={() => {
            const nova = [...itens]
            nova[i] = itens[i + delta]
            nova[i + delta] = item
            setItens(nova)
          }}>{delta < 0 ? 'Subir' : 'Descer'}</Button>)}
        {itens.length > 1 && <Button type="button" variant="outline" className="mt-2" onClick={() => setItens(atuais => atuais.filter(p => p.chave !== item.chave))}>Remover item {i + 1}</Button>}</div>
      </li>)}</ol>
      <Button type="button" variant="outline" disabled={itens.length >= 200} onClick={() => setItens(atuais => [...atuais, linhaPauta()])}>Adicionar item de pauta</Button>
    </fieldset>
    {contexto.pode_consultar_restritos && <Check label="Reunião restrita" checked={v.restrito} onChange={s => editar('restrito', s)} />}
  </div>
  const realizacao = <div className="space-y-4">
    <div className="grid gap-4 md:grid-cols-2">
      <Escolha label="Situação da reunião" value={v.situacao ?? ''} required={false} onChange={s => editar('situacao', s as DadosReuniao['situacao'])}>
        {!v.situacao && <option value="">Situação não registrada</option>}
        {Object.entries(situacoesReuniao).map(([id, nome]) => <option key={id} value={id} disabled={contexto.pode_agendar === false && id !== reuniao?.dados.situacao && ['CANCELADA','ADIADA','AGENDADA'].includes(id)}>{nome}</option>)}
      </Escolha>
      <LocalDaReuniao efetivo reuniao={reuniao} valor={localEfetivo} alterar={selecionarEfetivo} />
      {(['inicio', 'fim'] as const).map(k => <Campo key={k} label={k === 'inicio' ? 'Abertura efetiva' : 'Encerramento efetivo'} type="datetime-local" required={v.situacao === 'ENCERRADA' || (k === 'inicio' && v.situacao === 'EM_ANDAMENTO')} value={v[k] ? (() => { const d = new Date(v[k]!); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) })() : ''} onChange={s => editar(k, instanteLocal(s))} />)}
    </div>
    <Area label="Competência para os assuntos da pauta" required={v.quorum_conferido} value={v.competencia} onChange={s => editar('competencia', s)} />
    <fieldset className="space-y-3"><legend className="font-semibold">Presença e mesa</legend>
      <p className="text-sm">Registre quem tinha competência para apresentar propostas conforme as regras da reunião.</p>
      <div className="flex items-end gap-2"><div className="grid min-w-0 flex-1 gap-1 text-sm"><span>Adicionar participante</span><SeletorPessoa rotulo="Adicionar participante" value={pessoa} onChange={setPessoa} required={false} opcoes={pessoas.filter(p => !v.participantes.some(r => r.pessoa_id === p.id)).map(p => ({ id: p.id, nome: p.nome_completo }))} /></div><Button type="button" variant="outline" disabled={!pessoa} onClick={() => { editar('participantes', [...v.participantes, { pessoa_id: pessoa, presente: true, papeis: ['PARTICIPANTE'], pode_propor: false }]); setPessoa('') }}>Adicionar pessoa</Button></div>
      {reuniao?.instalacao_formal && <p className="text-sm text-muted-foreground">Defina o presidente e o secretário em Presença e mesa da assembleia.</p>}
      {v.participantes.map((p, i) => {
        const titulares: string[] = reuniao?.instalacao_formal ? p.papeis.filter(r => r === 'PRESIDENTE' || r === 'SECRETARIO') : []
        return <div key={p.pessoa_id} className="grid gap-2 rounded border p-3 md:grid-cols-3">
          <p>{pessoas.find(x => x.id === p.pessoa_id)?.nome_completo ?? reuniao?.participantes.find(x => x.pessoa_id === p.pessoa_id)?.retrato.nome ?? 'Pessoa'} {titulares.join(', ')}</p>
          <Check label="Presente" checked={p.presente} disabled={titulares.length > 0} onChange={b => alterarParticipante(i, { presente: b })} />
          <Check label="Pode apresentar propostas" checked={!!p.pode_propor} onChange={b => alterarParticipante(i, { pode_propor: b })} />
          <CampoPapeis label={reuniao?.instalacao_formal ? 'Outros papéis na reunião' : 'Papéis na reunião'} value={p.papeis.filter(r => !titulares.includes(r))}
            onChange={s => alterarParticipante(i, { papeis: reuniao?.instalacao_formal ? [...titulares, ...s.filter(r => r !== 'PRESIDENTE' && r !== 'SECRETARIO')] : s })}/>
          <Button variant="outline" type="button" disabled={titulares.length > 0} onClick={() => editar('participantes', v.participantes.filter((_, n) => n !== i))}>Remover participante</Button>
        </div>
      })}
    </fieldset>
    <p>Presentes: {v.participantes.filter(p => p.presente).length}. Cada pessoa é contada uma vez, mesmo exercendo vários papéis.</p>
    <div className="grid gap-4 md:grid-cols-2"><Campo label="Universo informado para conferência" type="number" value={v.universo_informado} onChange={s => editar('universo_informado', Number(s))} /><Campo label="Quórum mínimo informado" type="number" value={v.quorum_minimo} onChange={s => editar('quorum_minimo', Number(s))} /></div>
    <Area required={v.quorum_conferido} label="Fundamento e conferência do quórum" value={v.fundamento_quorum} onChange={s => editar('fundamento_quorum', s)} /><Check label="Quórum conferido pelo responsável" checked={v.quorum_conferido} onChange={s => editar('quorum_conferido', s)} />
    <Area label="Resultado da reunião" required={false} value={v.resultado} onChange={s => editar('resultado', s)} />
  </div>
  return <form className="space-y-4 rounded border p-4" inert={enviar.isPending} onSubmit={e => {
    e.preventDefault()
    if (!localId) return
    const dados = { ...v, local: localId === 'historico' ? v.local : undefined, itens_pauta: itens.map(({ id, descricao, proponente_id }) => ({ id, descricao, proponente_id })) }
    const localAgendado = localId === 'historico' ? undefined : localId
    const realizada = v.situacao === 'EM_ANDAMENTO' || v.situacao === 'ENCERRADA'
    enviar.mutate({ dados, local_id: localAgendado, local_efetivo_id: localEfetivo || (realizada ? localAgendado : null) })
  }}>
    <h3 className="font-semibold">{reuniao ? 'Editar reunião' : 'Agendar reunião'} · {contexto.nome}</h3>
    {reuniao ? <PaineisSecretaria titulo="Etapas da reunião" ativa={aba} selecionar={selecionarAba} abas={[
      { id: 'agendamento', nome: 'Agendamento', conteudo: <fieldset disabled={contexto.pode_agendar === false}>{agendamento}</fieldset> },
      { id: 'realizacao', nome: 'Realização', conteudo: realizacao },
    ]}/> : agendamento}
    <Salvar pending={enviar.isPending} error={enviar.error} success={enviar.isSuccess} label={gerarEdital ? "Agendar e abrir edital" : "Salvar reunião"} />
  </form>
}
