import { Link } from 'react-router'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { pessoasApi } from '../../api/pessoas'
import { nomeModalidade, secretariaApi, type ContextoSecretaria, type ModeloDocumento, type ReuniaoSecretaria } from '../../api/secretaria'
import { Button } from '../../components/ui/button'
import { Escolha, hoje, useComando } from './formulario'
import { caminhoEditor, useAbrirEditor } from './editor/navegacao'
import { ReuniaoForm } from './ReuniaoForm'

export function modelosConvocatorios(modelos: ModeloDocumento[]) {
  return modelos.flatMap(m => {
    const v = m.versoes[0]
    return m.estado === 'PUBLICADO' && m.permissoes?.criar && v?.tipo === 'OUTRO' && v.finalidade === 'CONVOCACAO' && v.configuracao.vinculo_reuniao !== 'NAO_PERMITE'
      ? [{ id: v.id, nome: m.nome }] : []
  })
}

export function ConvocacaoEmCurso({ contexto, edital }: { contexto: string; edital: NonNullable<ReuniaoSecretaria['convocacao_em_curso']> }) {
  return <Link className="font-medium underline" to={caminhoEditor(contexto, 'documentos', edital.documento_id, edital.pode_editar ? undefined : { versao: edital.versao_id })}>
    {edital.pode_editar ? 'Retomar convocação' : 'Consultar convocação em andamento'}
  </Link>
}

export function ConvocacaoForm({ contexto, modelos, identidade, reuniao }: { contexto: ContextoSecretaria; modelos: ModeloDocumento[]; identidade: string; reuniao?: ReuniaoSecretaria }) {
  const opcoes = modelosConvocatorios(modelos)
  const [modelo, escolherModelo] = useState(opcoes.length === 1 ? opcoes[0].id : '')
  const [escolhida, selecionar] = useState('')
  const [pagina, paginar] = useState(0)
  const [nova, agendar] = useState(false)
  const abrir = useAbrirEditor(contexto.id)
  const lista = useQuery({ queryKey: ['secretaria', identidade, contexto.id, 'reunioes', pagina], queryFn: () => secretariaApi.reunioes(contexto.id, pagina), enabled: !nova && !reuniao })
  const pessoas = useQuery({ queryKey: ['secretaria', identidade, 'pessoas-opcoes'], queryFn: pessoasApi.list, enabled: nova })
  const r = reuniao ?? lista.data?.find(item => item.id === escolhida)
  const ficha = useQuery({ queryKey: ['secretaria', identidade, contexto.id, 'reuniao', escolhida], queryFn: () => secretariaApi.reuniao(escolhida), enabled: !!escolhida && !nova && !reuniao })
  const emCurso = reuniao?.convocacao_em_curso ?? ficha.data?.convocacao_em_curso
  const titulo = opcoes.find(m => m.id === modelo)?.nome
  function gerar(idempotencia: string, restrito: boolean, reuniao_id: string | null, agendamento?: object) {
    return secretariaApi.criarDocumento({ contexto_id: contexto.id, idempotencia, restrito, retomar_convocacao: true, agendamento,
      versao: { modelo_versao_id: modelo, reuniao_id, assunto: titulo, data_documento: hoje(), conteudo: { teor: '', campos: {}, anexos: [], arrolados: [] } } })
  }
  const enviar = useComando(({ idempotencia }) => gerar(idempotencia, r!.dados.restrito, r!.id), res => abrir('documentos',res.id), modelo + (r?.id ?? ''))
  return <section className="surface space-y-3">
    <h3 className="font-semibold">Criar edital de convocação</h3>
    <Escolha label="Modelo de convocação" value={modelo} onChange={escolherModelo}><option value="">Selecione o modelo</option>{opcoes.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}</Escolha>
    {!reuniao && contexto.pode_agendar && <Button variant="outline" onClick={() => agendar(!nova)}>{nova ? 'Usar reunião cadastrada' : 'Agendar nova reunião'}</Button>}
    {!nova && !reuniao && <>
      <Escolha label="Reunião a convocar" value={escolhida} onChange={selecionar}><option value="">Selecione a reunião</option>
        {lista.data?.filter(item => !item.dados.situacao || item.dados.situacao === 'AGENDADA').map(item => <option key={item.id} value={item.id}>{item.data.slice(0,10).split('-').reverse().join('/')} · {nomeModalidade(contexto,item.modalidade)} · {item.dados.local}</option>)}
      </Escolha>
      {(pagina > 0 || lista.data?.length === 30) && <div className="flex gap-2"><Button variant="outline" disabled={!pagina} onClick={() => { selecionar(''); paginar(pagina-1) }}>Anterior</Button><Button variant="outline" disabled={lista.data?.length !== 30} onClick={() => { selecionar(''); paginar(pagina+1) }}>Próxima</Button></div>}
      {lista.isError && <p role="alert">Falha ao carregar as reuniões. <button onClick={() => void lista.refetch()}>Tentar novamente</button></p>}
    </>}
    {!nova && emCurso && <ConvocacaoEmCurso contexto={contexto.id} edital={emCurso}/>}
    {!nova && !emCurso && <><Button disabled={!r || !titulo || enviar.isPending} onClick={() => enviar.mutate({})}>Abrir edital no editor</Button>
      {enviar.error && <p role="alert">{enviar.error.message}</p>}</>}
    {nova && titulo && (pessoas.data ? <ReuniaoForm key={modelo} contexto={contexto} pessoas={pessoas.data}
      gerarEdital={({ dados, local_id, idempotencia }) => gerar(idempotencia, dados.restrito, null, { dados, local_id })} pronto={id => abrir('documentos',id)}/>
      : pessoas.isError ? <p role="alert">Falha ao consultar pessoas. <button onClick={() => void pessoas.refetch()}>Tentar novamente</button></p> : <p role="status">Carregando agendamento…</p>)}
  </section>
}
