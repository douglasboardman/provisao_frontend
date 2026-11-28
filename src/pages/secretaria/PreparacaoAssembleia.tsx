import { Link } from 'react-router'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { assembleiasApi, type CriterioPresidencia, type FichaAssembleia, type FolhaAssembleia, type LinhaRol, type MesaInput } from '../../api/assembleias'
import { pessoasApi } from '../../api/pessoas'
import type { ReuniaoSecretaria } from '../../api/secretaria'
import { Button } from '../../components/ui/button'
import { SeletorPessoa } from '../../components/shared/SeletorPessoa'
import { dataCivil } from '../../components/shared/Workspace'
import { Area, Campo, Check, Escolha, Salvar, useComando } from './formulario'
import { PaineisSecretaria } from './PaineisSecretaria'
import './assembleia.css'

const categoria = { COMUNGANTES: 'Comungante', NAO_COMUNGANTES: 'Não comungante', CONFERIR: 'Conferir situação no rol' }
const motivos: Record<string,string> = { PRESIDENCIA_INSTITUCIONAL: 'Presidência institucional', AUSENCIA: 'Ausência do pastor', ELEICAO_PASTORAL: 'Eleição pastoral', SUBSTITUICAO: 'Substituição durante a sessão', OUTRO: 'Outra indicação' }
const instante = (s: string) => new Date(s).toLocaleString('pt-BR')
type Props = { reuniao: ReuniaoSecretaria; identidade: string }

export function PreparacaoAssembleia({ reuniao, identidade }: Props) {
  const q = useQuery({ queryKey: ['secretaria',identidade,reuniao.id,'assembleia'], queryFn: () => assembleiasApi.ficha(reuniao.id), gcTime: 0 })
  const [aba, selecionar] = useState('folhas')
  const [copia, informarCopia] = useState('')
  const linkPresidencia = '/assembleia/'+reuniao.id+'/presidencia'
  if (q.isError) return <p role="alert">Falha ao consultar a assembleia. <Button variant="outline" onClick={() => void q.refetch()}>Tentar novamente</Button></p>
  if (!q.data) return <p role="status">Carregando assembleia…</p>
  const f = q.data
  const abas = []
  if (f.pode_gerar) abas.push({ id: 'folhas', nome: 'Lista de presença', conteudo: <Listas identidade={identidade} reuniao={reuniao} ficha={f}/> })
  abas.push({ id: 'mesa', nome: 'Mesa da assembleia', conteudo: <section className="surface space-y-4">
    {f.mesas.length > 0 && <div className="space-y-1"><Link className="font-medium text-primary underline" to={linkPresidencia}>Acesso do secretário eleito</Link>
      <Button type="button" variant="ghost" size="sm" onClick={async () => {
        try { await navigator.clipboard.writeText(new URL(linkPresidencia, window.location.origin).href); informarCopia('Link copiado.') }
        catch { informarCopia('Use a opção de copiar endereço do link acima.') }
      }}>Copiar link para o presidente</Button>{copia && <span role="status" className="text-sm">{copia}</span>}
      <p className="text-sm text-muted-foreground">O presidente desta sessão confirma o convite com a própria conta.</p></div>}
    {f.votacao?.base === 'VOTANTES_CONFIRMADOS' && <p>Presentes: {f.votacao.presentes} · Com direito a voto: {f.votacao.votantes_presentes?.length ?? 0}{f.votacao.minimo > 0 && ` · Mínimo do quórum: ${f.votacao.minimo}`}</p>}
    {!f.mesas.length && <p>Mesa ainda não instalada.</p>}
    {f.mesas.map((m,i) => <details key={m.id} open={i === 0}><summary>{i === 0 ? 'Última composição' : 'Composição anterior'} · {instante(m.vigente_desde)}</summary>
      <p>Presidente: {m.presidente_nome} · Secretário: {m.secretario_nome}</p>
      <p>{motivos[m.motivo]} · {m.fundamento}</p>
      {m.criterio_presidencia?.impedimentos.map(i => <p key={i.oficial_id}>{f.oficiais.find(o => o.id === i.oficial_id)?.nome ?? 'Titular da ordem de presidência'} · {i.motivo === 'AUSENTE' ? 'Ausência' : 'Impedimento'} · {i.fundamento}</p>)}
      {m.criterio_presidencia?.determinacao_presbiterio && <p>Determinação do Presbitério · {m.criterio_presidencia.determinacao_presbiterio}</p>}
      <p>Registrado por {m.operador.nome_usuario}</p></details>)}
    {f.pode_instalar && !reuniao.dados.fim && !['ENCERRADA','CANCELADA','ADIADA'].includes(reuniao.dados.situacao ?? '') &&
      <MesaForm key={f.mesas[0]?.id ?? 'instalacao'} ficha={f} identidade={identidade} reuniao={reuniao}/>}
  </section> })
  return <PaineisSecretaria titulo="Preparação da assembleia" abas={abas} ativa={f.pode_gerar ? aba : 'mesa'} selecionar={selecionar}/>
}

function diferencas(antes: LinhaRol[], agora: LinhaRol[]) {
  const mapa = new Map(antes.map(p => [p.pessoa_id,p]))
  const resultado: string[] = []
  for (const p of agora) {
    const anterior = mapa.get(p.pessoa_id)
    if (!anterior) resultado.push('Incluído · '+p.nome)
    else if (anterior.nome !== p.nome || anterior.categoria !== p.categoria)
      resultado.push(anterior.nome+' ('+categoria[anterior.categoria]+') → '+p.nome+' ('+categoria[p.categoria]+')')
    mapa.delete(p.pessoa_id)
  }
  for (const p of mapa.values()) resultado.push('Retirado · '+p.nome)
  return resultado
}

function Listas({ reuniao, identidade, ficha }: Props & { ficha: FichaAssembleia }) {
  const [referencia, definir] = useState(reuniao.data.slice(0,10))
  const [selecionada, selecionar] = useState('')
  const id = selecionada || ficha.folhas[0]?.id
  const base = ['secretaria',identidade,reuniao.id]
  const rol = useQuery({ queryKey: [...base,'rol',referencia], queryFn: () => assembleiasApi.rol(reuniao.id,referencia), enabled: !!referencia, gcTime: 0 })
  const folha = useQuery({ queryKey: [...base,'folha',id], queryFn: () => assembleiasApi.folha(reuniao.id,id!), enabled: !!id, gcTime: 0 })
  const gerar = useComando<{ referencia: string }>(d => assembleiasApi.gerar(reuniao.id,d), r => selecionar(r.id), reuniao.id)
  const diferenca = folha.data && rol.data ? diferencas(folha.data.linhas,rol.data) : undefined
  return <section className="surface space-y-4">
    <form className="flex flex-wrap items-end gap-3" onSubmit={e => { e.preventDefault(); gerar.mutate({ referencia }) }}>
      <Campo label="Consultar rol na data" type="date" value={referencia} onChange={definir}/>
      <Salvar label="Gerar lista de presença" disabled={!rol.data || rol.isError} pending={gerar.isPending} error={gerar.error} success={false}/>
    </form>
    {rol.isError && <p role="alert">Falha ao consultar o rol. <button onClick={() => void rol.refetch()}>Tentar novamente</button></p>}
    {rol.data && <p>{rol.data.length} pessoas no rol de referência · {rol.data.filter(p => p.categoria === 'CONFERIR').length} para conferência.</p>}
    {!!ficha.folhas.length && <Escolha label="Folha emitida" value={id ?? ''} onChange={selecionar}>{ficha.folhas.map(f =>
      <option key={f.id} value={f.id}>Versão {f.versao} · rol de {dataCivil(f.referencia)} · extraída em {instante(f.extraida_em)}</option>)}</Escolha>}
    {diferenca && <details><summary>{diferenca.length} alterações em relação à folha selecionada</summary><ul>{diferenca.map((s,i) => <li key={i}>{s}</li>)}</ul></details>}
    {folha.isError && <p role="alert">Falha ao carregar a folha. <button onClick={() => void folha.refetch()}>Tentar novamente</button></p>}
    {folha.data && <><Button variant="outline" onClick={() => window.print()}>Imprimir folha v{folha.data.versao}</Button>
      <Folha folha={folha.data}/>{createPortal(<div className="impressao-assembleia"><Folha folha={folha.data}/></div>, document.body)}</>}
  </section>
}

function Folha({ folha }: { folha: FolhaAssembleia }) {
  return <article className="folha-assembleia"><h3>Lista de presença · versão {folha.versao}</h3>
    <p>{folha.identificacao}</p><p>Rol de {dataCivil(folha.referencia)} · extraída em {instante(folha.extraida_em)}</p>
    <table><thead><tr><th>Nome</th><th>Categoria</th><th>Assinatura</th></tr></thead>
      <tbody>{folha.linhas.map(p => <tr key={p.pessoa_id}><td>{p.nome}</td><td>{categoria[p.categoria]}</td><td/></tr>)}</tbody></table>
  </article>
}

function MesaForm({ ficha, reuniao, identidade }: Props & { ficha: FichaAssembleia }) {
  const atual = ficha.mesas[0]
  const [presidente, presidir] = useState(atual?.presidente_oficial_id ?? ficha.prioridade?.find(p => p.ids.length)?.ids[0] ?? ficha.institucional ?? '')
  const [secretario, eleger] = useState(atual?.secretario_id ?? '')
  const [confirmados, confirmar] = useState<string[]>(atual ? reuniao.dados.participantes.filter(p => p.presente).map(p => p.pessoa_id) : [])
  const [motivo, justificar] = useState(atual ? 'SUBSTITUICAO' : ficha.institucional ? 'PRESIDENCIA_INSTITUCIONAL' : 'OUTRO')
  const [impedimentos, definirImpedimentos] = useState<CriterioPresidencia['impedimentos']>(atual?.criterio_presidencia?.impedimentos ?? [])
  const [referencia, determinar] = useState(atual?.criterio_presidencia?.determinacao_presbiterio ?? '')
  const [votantes, definirVotantes] = useState<string[]>(atual?.votantes_confirmados ?? [])
  const [votante, escolherVotante] = useState('')
  const rol = useQuery({ queryKey: ['secretaria', identidade, reuniao.id, 'rol-votacao', reuniao.dados.data],
    queryFn: () => assembleiasApi.rol(reuniao.id, reuniao.dados.data), gcTime: 0 })
  const [fundamento, fundamentar] = useState('')
  const [universo, informar] = useState(reuniao.dados.universo_informado)
  const [minimo, definirMinimo] = useState(reuniao.dados.quorum_minimo)
  const [competencia, definirCompetencia] = useState(reuniao.dados.competencia)
  const [baseQuorum, definirBase] = useState(reuniao.dados.fundamento_quorum)
  const [desde, iniciar] = useState('')
  const pessoas = useQuery({ queryKey: ['secretaria',identidade,'pessoas-opcoes'], queryFn: pessoasApi.list, gcTime: 0 })
  const oficial = ficha.oficiais.find(o => o.id === presidente)
  const precedentes = ficha.oficiais.filter(o => o.prioridade && o.prioridade < (oficial?.prioridade ?? 4))
  const aptos = rol.data?.filter(p => p.categoria === 'COMUNGANTES') ?? []
  const aptosPorId = new Map(aptos.map(p => [p.pessoa_id, p.nome]))
  const presencas = new Set([...reuniao.dados.participantes.filter(p => p.presente).map(p => p.pessoa_id), ...confirmados])
  const impedimentosComprovados = precedentes.every(o => impedimentos.some(i => i.oficial_id === o.id && i.fundamento.trim()))
  const ordemConferida = !!referencia.trim() || !!oficial?.prioridade && impedimentosComprovados
  function ajustarImpedimento(oficial_id: string, dados: Partial<CriterioPresidencia['impedimentos'][number]>) {
    definirImpedimentos(anteriores => {
      const registro = anteriores.find(i => i.oficial_id === oficial_id) ?? { oficial_id, motivo: 'IMPEDIDO' as const, fundamento: '' }
      return [...anteriores.filter(i => i.oficial_id !== oficial_id), { ...registro, ...dados }]
    })
  }
  const instalar = useComando<MesaInput>(d => assembleiasApi.instalar(reuniao.id,d), undefined, reuniao.id)
  const ambos = !!oficial && secretario !== oficial.pessoa_id && confirmados.includes(oficial.pessoa_id) && confirmados.includes(secretario)
  const [outro, escolherOutro] = useState('')
  const opcoes = pessoas.data?.map(p => ({ id: p.id, nome: p.nome_completo }))
  const marcar = (id: string, valor: boolean) => confirmar(arr => valor ? [...new Set([...arr,id])] : arr.filter(p => p !== id))
  return <form className="space-y-4 border-t pt-4" onSubmit={e => { e.preventDefault()
    if (ambos && desde && ordemConferida && rol.isSuccess) instalar.mutate({ revisao: reuniao.revisao, presidente_oficial_id: presidente, secretario_id: secretario, confirmar_presencas: confirmados,
      votantes_confirmados: votantes, criterio_presidencia: { impedimentos: impedimentos.filter(i => precedentes.some(o => o.id === i.oficial_id) && i.fundamento.trim()),
        ...(referencia.trim() && { determinacao_presbiterio: referencia }) },
      universo, ...(minimo>0 && competencia && baseQuorum && { quorum: { minimo, competencia, fundamento: baseQuorum } }), vigente_desde: new Date(desde).toISOString(), motivo, fundamento })
  }}>
    <h3 className="font-semibold">{atual ? 'Atualizar mesa e conferência' : 'Instalação da mesa'}</h3>
    <div className="grid gap-3 md:grid-cols-2">
      <Escolha label="Oficial que preside a sessão" value={presidente} onChange={presidir}><option value="">Selecione</option>{ficha.oficiais.map(o => <option key={o.id} value={o.id}>{o.nome}{o.prioridade ? ' · ' + ficha.prioridade?.find(p => p.ordem === o.prioridade)?.funcao : ' · Por determinação do Presbitério'}</option>)}</Escolha>
      <div><label htmlFor="secretario-eleito">Secretário eleito</label><SeletorPessoa id="secretario-eleito" rotulo="Secretário eleito" value={secretario} onChange={eleger} opcoes={opcoes}/></div>
    </div>
    {pessoas.isError && <p role="alert">Falha ao carregar os nomes. <button type="button" onClick={() => void pessoas.refetch()}>Tentar novamente</button></p>}
    <fieldset className="space-y-2"><legend>Confirmar presença nesta sessão</legend>
      {oficial && <Check label={'Presidente · '+oficial.nome} checked={confirmados.includes(oficial.pessoa_id)} onChange={v => marcar(oficial.pessoa_id,v)}/>}
      {secretario && <Check label={'Secretário · '+(opcoes?.find(p => p.id === secretario)?.nome ?? '')} checked={confirmados.includes(secretario)} onChange={v => marcar(secretario,v)}/>}
      <div className="flex flex-wrap items-end gap-2"><div><label htmlFor="outro-presente">Demais presentes</label><SeletorPessoa id="outro-presente" value={outro} onChange={escolherOutro} opcoes={opcoes}/></div>
        <Button type="button" variant="outline" disabled={!outro} onClick={() => { marcar(outro,true); escolherOutro('') }}>Confirmar pessoa</Button></div>
      {confirmados.filter(id => id !== secretario && id !== oficial?.pessoa_id).map(id => <Check key={id} label={opcoes?.find(p => p.id === id)?.nome ?? id} checked onChange={() => marcar(id,false)}/>)}
    </fieldset>
    <fieldset className="space-y-2"><legend className="font-medium">Ordem da presidência</legend>
      <ol className="ml-5 list-decimal">{ficha.prioridade?.map(p => <li key={p.ordem}>{p.funcao} · {p.ids.map(id => ficha.oficiais.find(o => o.id === id)?.nome).join(', ') || 'Sem titular apurado'}</li>)}</ol>
      {precedentes.map(o => <div key={o.id} className="rounded border p-3"><p className="font-medium">{o.nome}</p>
        <Escolha label="Situação do titular anterior na ordem" value={impedimentos.find(i => i.oficial_id === o.id)?.motivo ?? 'IMPEDIDO'}
          onChange={motivo => ajustarImpedimento(o.id, { motivo: motivo as 'AUSENTE' | 'IMPEDIDO' })}>
          <option value="IMPEDIDO">Impedido</option><option value="AUSENTE">Ausente</option></Escolha>
        <Campo label="Fundamento da ausência ou do impedimento" value={impedimentos.find(i => i.oficial_id === o.id)?.fundamento ?? ''}
          onChange={fundamento => ajustarImpedimento(o.id, { fundamento })} required={false} /></div>)}
      {(!oficial?.prioridade || precedentes.length > 0 || motivo === 'ELEICAO_PASTORAL') &&
        <Area label="Determinação do Presbitério, se aplicável" value={referencia} onChange={determinar} required={false}/>}
      {!ordemConferida && <p>Confira a ordem de substituição. Na falta de titular habilitado, reagende ou registre a determinação do Presbitério.</p>}
    </fieldset>
    <fieldset className="space-y-2"><legend className="font-medium">Direito a voto nesta sessão</legend>
      <label htmlFor="votante-assembleia">Comungante apto para a pauta</label>
      <div className="flex flex-wrap items-end gap-2"><SeletorPessoa id="votante-assembleia" value={votante} onChange={escolherVotante}
        opcoes={aptos.filter(p => !votantes.includes(p.pessoa_id)).map(p => ({ id: p.pessoa_id, nome: p.nome }))} />
        <Button type="button" variant="outline" disabled={!votante} onClick={() => { definirVotantes(ids => [...new Set([...ids, votante])]); escolherVotante('') }}>Confirmar direito a voto</Button></div>
      {rol.isError && <p role="alert">Não foi possível conferir o rol na data da sessão.</p>}
      <p>Presentes: {presencas.size} · Com direito a voto: {votantes.filter(id => presencas.has(id)).length}</p>
      {votantes.map(id => <div key={id} className="flex flex-wrap items-center gap-2"><span>{aptosPorId.get(id) ?? 'Apto a conferir no rol'}</span>
        <Button type="button" variant="ghost" onClick={() => definirVotantes(ids => ids.filter(i => i !== id))}>Retirar direito confirmado</Button></div>)}
    </fieldset>
    <div className="grid gap-3 md:grid-cols-2"><Campo label="Universo informado para quórum" type="number" value={universo} onChange={s => informar(Number(s))}/>
      <Campo label="Início desta composição (hora local)" type="datetime-local" value={desde} onChange={iniciar}/></div>
    {!reuniao.dados.modelo_reuniao && <div className="grid gap-3 md:grid-cols-2"><Campo label="Quórum mínimo" type="number" value={minimo} onChange={s => definirMinimo(Number(s))}/>
      <Campo required={false} label="Competência da assembleia para a pauta" value={competencia} onChange={definirCompetencia}/><Campo required={false} label="Fundamento do quórum" value={baseQuorum} onChange={definirBase}/></div>}
    <Escolha label="Motivo da indicação" value={motivo} onChange={justificar}>{Object.entries(motivos).map(([id,nome]) => <option key={id} value={id}>{nome}</option>)}</Escolha>
    <Area label="Fundamento da indicação e da eleição" value={fundamento} onChange={fundamentar}/>
    <Salvar label={atual ? 'Registrar atualização da sessão' : 'Instalar mesa'} disabled={!ambos || !ordemConferida || !rol.isSuccess} pending={instalar.isPending} error={instalar.error} success={false}/>
  </form>
}
