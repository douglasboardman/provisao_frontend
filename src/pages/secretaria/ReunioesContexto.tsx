import { PreparacaoAssembleia } from './PreparacaoAssembleia'
import { ConvocacaoEmCurso, ConvocacaoForm, modelosConvocatorios } from './ConvocacaoForm'
import { Link, useSearchParams } from 'react-router'
import { caminhoEditor, useAbrirEditor } from './editor/navegacao'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { pessoasApi } from '../../api/pessoas'
import { nomeModalidade, secretariaApi, situacoesReuniao, type ContextoSecretaria, type ReuniaoSecretaria, type ModeloDocumento } from '../../api/secretaria'
import { colunaDetalhe, TabelaSecretaria } from './TabelaSecretaria'
import { dataCivil } from '../../components/shared/Workspace'
import { Eye, Pencil } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { PaineisSecretaria, type AbaSecretaria } from './PaineisSecretaria'
import { PautaReuniao } from './PautaReuniao'
import { ReuniaoForm } from './ReuniaoForm'

export function ReunioesContexto({ contexto, identidade, modelos = [] }: { contexto: ContextoSecretaria; identidade: string; modelos?: ModeloDocumento[] }) {
  const abrirEditor = useAbrirEditor(contexto.id)
  const [busca, setBusca] = useSearchParams()
  const reuniaoInicial = busca.get('reuniao') ?? undefined
  const [aba, selecionar] = useState(reuniaoInicial ? contexto.tipo === 'ASSEMBLEIA_GERAL' ? 'assembleia' : 'consulta' : 'lista')
  const [pagina, paginar] = useState(0)
  const [consulta, consultar] = useState<string | undefined>(reuniaoInicial)
  const [edicao, editar] = useState<{ reuniao?: ReuniaoSecretaria }>()
  const lista = useQuery({ queryKey: ['secretaria', identidade, contexto.id, 'reunioes', pagina], queryFn: () => secretariaApi.reunioes(contexto.id, pagina), gcTime: 0 })
  const pessoas = useQuery({ queryKey: ['secretaria', identidade, 'pessoas-opcoes'], queryFn: pessoasApi.list, enabled: !!edicao && contexto.pode_preparar, gcTime: 0 })
  const ficha = useQuery({ queryKey: ['secretaria', identidade, contexto.id, 'reuniao', consulta], queryFn: () => secretariaApi.reuniao(consulta!), enabled: ['consulta','assembleia'].includes(aba) && !!consulta, gcTime: 0 })
  const detalhe = ficha.data?.contexto_id === contexto.id ? ficha.data : lista.data?.find(r => r.id === consulta)
  function abrirPresenca() {
    if (!consulta) return
    setBusca(anterior => {
      const params = new URLSearchParams(anterior)
      params.set('reuniao', consulta)
      return params
    }, { replace: true })
    selecionar('assembleia')
  }
  const titulo = (r: ReuniaoSecretaria) => dataCivil(r.data) + ' · ' + nomeModalidade(contexto, r.modalidade) + ' · ' + r.dados.local
  function abrir(reuniao?: ReuniaoSecretaria) { editar({ reuniao }); selecionar('cadastro') }
  function fechar() { editar(undefined); selecionar('lista') }
  const abas: AbaSecretaria[] = [{ id: 'lista', nome: 'Reuniões cadastradas', conteudo: <div className="space-y-3">
    {contexto.pode_preparar && contexto.pode_agendar !== false && <Button onClick={() => abrir()}>Agendar reunião</Button>}
    {lista.isPending && <p role="status">Carregando reuniões…</p>}
    {lista.isError && <p role="alert">Falha ao consultar reuniões. <button onClick={() => void lista.refetch()}>Tentar novamente</button></p>}
    {lista.data?.length === 0 && <p>Nenhuma reunião nesta página.</p>}
    {!!lista.data?.length && <TabelaSecretaria nome="Reuniões cadastradas" principais={['Data', 'Modalidade', 'Ações']} colunas={['Data', 'Modalidade', 'Situação', 'Local', 'Previsto', 'Abertura', 'Encerramento', 'Presentes', 'Ações']}>
      {lista.data.map(r => <tr key={r.id}>
        <td className="whitespace-nowrap font-medium">{dataCivil(r.data)}</td>
        <td>{nomeModalidade(contexto, r.modalidade)}</td>
        <td className={colunaDetalhe}>{r.dados.situacao ? situacoesReuniao[r.dados.situacao] : 'Sem registro'}</td>
        <td className={colunaDetalhe}>{r.dados.local}</td><td className={colunaDetalhe}>{r.dados.horario_previsto ?? '—'}</td>
        <td className={colunaDetalhe}>{r.horario_inicio_reuniao ?? '—'}</td>
        <td className={colunaDetalhe}>{r.horario_encerramento_reuniao ?? '—'}</td>
        <td className={colunaDetalhe}>{r.dados.total_presentes ?? '—'}</td>
        <td><div className="flex items-center gap-1.5">
          <Button size="sm" variant="outline" title="Consultar" onClick={() => { consultar(r.id); selecionar('consulta') }}><Eye aria-hidden="true"/><span className="sr-only md:not-sr-only">Consultar</span></Button>
          {contexto.pode_preparar && contexto.registro_livro !== false && <Button size="sm" variant="outline" title="Editar" onClick={() => abrir(r)}><Pencil aria-hidden="true"/><span className="sr-only md:not-sr-only">Editar</span></Button>}
        </div></td>
      </tr>)}
    </TabelaSecretaria>}
    <div className="flex items-center gap-2"><Button variant="outline" disabled={!pagina} onClick={() => paginar(pagina - 1)}>Anterior</Button>
      <span>Página {pagina + 1}</span><Button variant="outline" disabled={lista.data?.length !== 30} onClick={() => paginar(pagina + 1)}>Próxima</Button></div>
  </div> }]
  if (detalhe) abas.push({ id: 'consulta', nome: 'Detalhes da reunião', conteudo: <section className="surface space-y-3">
    <h3 className="font-semibold">{titulo(detalhe)}</h3>
    {contexto.tipo === 'ASSEMBLEIA_GERAL' && <Button variant="outline" onClick={abrirPresenca}>Presença e mesa da assembleia</Button>}
    <h4>Agendamento</h4>
    {detalhe.dados.modelo_reuniao && <p>{detalhe.dados.modelo_reuniao.finalidade} · {detalhe.dados.formato} · {detalhe.dados.carater} · {detalhe.dados.convocacao} convocação</p>}
    <p>Horário previsto: {detalhe.dados.horario_previsto ?? 'Não informado'}</p>
    {contexto.registro_livro === false && detalhe.mesa_atual_id && <p>A redação está com a mesa. Consulte a presença e a mesa desta sessão.</p>}
    {contexto.pode_preparar && !(contexto.registro_livro === false && detalhe.mesa_atual_id) && modelos.some(m => m.estado !== 'EM_EDICAO' && m.versoes[0]?.tipo === 'ATA' && (!m.permissoes || m.permissoes.criar || m.permissoes.preparar)) &&
      <Button onClick={() => abrirEditor('documentos', 'novo', { reuniao: detalhe.id })}>Preparar ata</Button>}
    {ficha.data?.convocacoes?.length === 0 && <p>Nenhuma convocação expedida vinculada.</p>}
    {ficha.isError && <p role="alert">Falha ao consultar a ficha. <button onClick={() => void ficha.refetch()}>Tentar novamente</button></p>}
    {detalhe.convocacoes?.map((c, i) => <div key={c.versao_id}>
      <Link className="underline" to={caminhoEditor(contexto.id, 'documentos', c.documento_id, { versao: c.versao_id })}>{c.assunto} · versão {c.versao}</Link>
      {i === 0 && c.agendamento_alterado && <p role="status">O agendamento mudou desde esta convocação. Atualize a convocação.</p>}
    </div>)}
    {detalhe.convocacao_em_curso && <ConvocacaoEmCurso contexto={contexto.id} edital={detalhe.convocacao_em_curso}/>}
    {ficha.data && !detalhe.convocacao_em_curso && !!modelosConvocatorios(modelos).length && (!detalhe.dados.situacao || detalhe.dados.situacao === 'AGENDADA') &&
      <Button onClick={() => selecionar('convocar')}>{detalhe.convocacoes?.length ? 'Gerar reconvocação' : 'Gerar convocação'}</Button>}
    <h4>Pauta</h4><PautaReuniao itens={detalhe.itens_pauta} texto={detalhe.dados.pauta}/>
    <h4>Realização</h4>
    <p>{detalhe.dados.situacao ? situacoesReuniao[detalhe.dados.situacao] : 'Situação não registrada'} · Abertura: {detalhe.horario_inicio_reuniao ?? '—'} · Encerramento: {detalhe.horario_encerramento_reuniao ?? '—'}</p>
    <p>Local efetivo: {detalhe.dados.local_efetivo ?? detalhe.local_efetivo_retrato?.descritivo ?? 'Não informado'}</p>
    <p>Competência: {detalhe.dados.competencia}</p><p>Quórum: {detalhe.dados.quorum_minimo || 'Não informado'}</p><p>Total de presentes: {detalhe.dados.total_presentes ?? 'Não informado'}</p>
    <p>Resultado: {detalhe.dados.resultado || 'Não informado'}</p>{detalhe.participantes.map(p => <p key={p.pessoa_id}>{p.retrato.nome} · {p.presente ? 'Presente' : 'Ausente'} · {p.papeis.join(', ')}</p>)}
    {contexto.pode_preparar && contexto.registro_livro !== false && <Button variant="outline" onClick={() => abrir(detalhe)}>Editar reunião</Button>}
  </section> })
  if (detalhe && contexto.tipo === 'ASSEMBLEIA_GERAL' && aba === 'assembleia') abas.push({ id: 'assembleia', nome: 'Presença e mesa',
    conteudo: <PreparacaoAssembleia key={detalhe.id} reuniao={detalhe} identidade={identidade}/> })
  if (aba === 'convocar' && detalhe && !detalhe.convocacao_em_curso && modelosConvocatorios(modelos).length > 0 && (!detalhe.dados.situacao || detalhe.dados.situacao === 'AGENDADA')) {
    abas.push({ id: 'convocar', nome: 'Convocação', conteudo: <ConvocacaoForm contexto={contexto} identidade={identidade} modelos={modelos} reuniao={detalhe}/> })
  }
  if (edicao && contexto.pode_preparar && contexto.registro_livro !== false) abas.push({ id: 'cadastro', nome: edicao.reuniao ? 'Editar reunião' : 'Agendar reunião', manter: true, conteudo:
    <div className="space-y-3">{pessoas.data ? <ReuniaoForm key={edicao.reuniao?.id ?? 'nova'} contexto={contexto} reuniao={edicao.reuniao} pessoas={pessoas.data} pronto={fechar}/>
      : pessoas.isError ? <p role="alert">Falha ao carregar as pessoas. <button onClick={() => void pessoas.refetch()}>Tentar novamente</button></p> : <p role="status">Carregando pessoas…</p>}
      <Button variant="outline" onClick={fechar}>Fechar formulário</Button></div> })
  if (consulta && ['assembleia','consulta'].includes(aba) && !detalhe && (ficha.isError || ficha.isSuccess)) {
    return <section className="surface space-y-2"><p role="alert">Reunião indisponível neste contexto.</p><Button variant="outline" onClick={() => selecionar('lista')}>Voltar às reuniões</Button></section>
  }
  return <PaineisSecretaria titulo="Reuniões do contexto" abas={abas} ativa={abas.some(a => a.id === aba) ? aba : 'lista'} selecionar={selecionar}/>
}
