import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { assinaturasHabilitadas } from '../../api/assinaturas'
import { estadosDocumento, finalidadeTermo, livrosHabilitados, rotulosModalidadeReuniao, secretariaApi, type ContextoSecretaria, type DocumentoDetalhe } from '../../api/secretaria'
import { Button } from '../../components/ui/button'
import { useArtefatosDocumento } from './ArtefatosDocumento'
import { Area, Campo, Escolha, Salvar, hoje, useComando } from './formulario'

type Acao = 'encaminhar' | 'deliberar' | 'aprovar' | 'cancelar' | 'anular'
const rotulos: Record<Acao, string> = {
  encaminhar: 'Encaminhar para aprovação', deliberar: 'Registrar deliberação da ata',
  aprovar: 'Aprovar tecnicamente', cancelar: 'Cancelar documento', anular: 'Anular documento',
}
export function TramitacaoDocumento({ documento: d, contexto, identidade, corrigir, retificar }: {
  documento: DocumentoDetalhe; contexto: ContextoSecretaria; identidade: string; corrigir: (destino: string) => void; retificar: () => void
}) {
  const v = d.versoes.find(v => v.numero === d.versao_atual)!
  const [acao, selecionar] = useState<Acao>()
  const arquivos = useArtefatosDocumento(d, identidade)
  const edicao = d.estado === 'EM_EDICAO'
  const termo = finalidadeTermo(v.modelo?.finalidade)
  const assinaturas = d.tramitacao?.assinaturas ?? assinaturasHabilitadas()
  const livros = livrosHabilitados() && d.tramitacao?.livros !== false
  const livroInativo = !!v.livro_id && !livros
  const pendencias = d.tramitacao?.pendencias ?? []
  const deliberacao = v.deliberacoes[v.deliberacoes.length - 1]
  const ataPendente = d.tipo === 'ATA' && !(deliberacao?.resultado === 'APROVADA' && deliberacao.revisao_conteudo === v.revisao_conteudo)
  const medido = arquivos.data?.some(a => a.versao_id === v.id && a.revisao_documento === d.revisao && a.finalidade === 'MEDICAO_LIVRO' && a.estado === 'CONCLUIDO')
  const faltaMedir = !!v.livro_id && !medido
  const acoes: Acao[] = []
  if (edicao && contexto.pode_preparar && (d.atuacao?.criar !== false || contexto.registro_livro === false && d.atuacao.preparar) && !d.encaminhado_em) acoes.push('encaminhar')
  if (edicao && contexto.pode_deliberar && d.tipo === 'ATA') acoes.push('deliberar')
  if (edicao && contexto.pode_aprovar) acoes.push('aprovar')
  if (contexto.pode_aprovar && (edicao || d.estado === 'APROVADO')) acoes.push('cancelar')
  if (contexto.pode_aprovar && d.estado === 'EXPEDIDO' && !termo) acoes.push('anular')
  function impedimento(a: Acao) {
    if (livroInativo && a !== 'deliberar') return 'O recurso de livros está desabilitado para esta versão vinculada.'
    if ((a === 'aprovar' || a === 'encaminhar') && pendencias.length) return 'Resolva as pendências da versão.'
    if (a !== 'aprovar') return ''
    if (!d.encaminhado_em || !d.numero) return 'Aguarda encaminhamento.'
    if (ataPendente) return 'Aguarda deliberação favorável desta revisão.'
    if (faltaMedir) return 'Aguarda medição das páginas desta revisão.'
    if (d.tramitacao?.data_futura) return 'A data do documento ainda é futura.'
    if (assinaturas && !assinaturasHabilitadas()) return 'Habilite a interface de assinaturas para escolher a modalidade.'
    return ''
  }
  const avisos = [...new Set(acoes.map(impedimento).filter(Boolean))]
  return <section id="tramitacao-documento" tabIndex={-1} className="surface space-y-3" aria-label="Tramitação da versão salva">
    <h3 className="font-semibold">Tramitação · Versão {v.numero} · Revisão {d.revisao}</h3>
    <p>{edicao && d.encaminhado_em ? 'Encaminhado para aprovação' : estadosDocumento[d.estado]}{v.congelado_em && ' · Conteúdo congelado'}</p>
    {edicao && pendencias.length > 0 && <div><h4 className="font-medium">Pendências para encaminhar ou aprovar</h4><ul className="list-disc space-y-1 pl-5">{pendencias.map(p => <li key={p.destino+p.mensagem}>{p.mensagem}{contexto.pode_preparar && <button type="button" className="ml-2 underline" onClick={() => corrigir(p.destino)}>Corrigir</button>}</li>)}</ul></div>}
    {avisos.map(aviso => <p key={aviso} className="text-sm">{aviso}</p>)}
    {assinaturas === false && (edicao || d.estado === 'APROVADO') && <p>Assinaturas e expedição estão desabilitadas.</p>}
    <div className="flex flex-wrap gap-2">{acoes.map(a => <Button key={a} type="button" variant={a === 'cancelar' || a === 'anular' ? 'ghost' : 'outline'} disabled={!!impedimento(a)} onClick={() => selecionar(a)}>{rotulos[a]}</Button>)}
      {contexto.pode_aprovar && !termo && !livroInativo && ['APROVADO','EXPEDIDO','ANULADO'].includes(d.estado) && <Button type="button" variant="outline" onClick={retificar}>Preparar retificação</Button>}
      {((edicao && contexto.pode_preparar) || v.congelado_em) && <a href="#arquivos-documento" className="self-center underline">Prévia e matriz</a>}
      {v.congelado_em && assinaturas && assinaturasHabilitadas() && <a href="#assinaturas-documento" className="self-center underline">Assinaturas e expedição</a>}
    </div>
    {acao && acoes.includes(acao) && !impedimento(acao) && <ConfirmarAcao key={acao} acao={acao} d={d} identidade={identidade} assinaturas={assinaturas} fechar={() => selecionar(undefined)} />}
  </section>
}

function ConfirmarAcao({ acao, d, identidade, assinaturas, fechar }: {
  acao: Acao; d: DocumentoDetalhe; identidade: string; assinaturas: boolean; fechar: () => void
}) {
  const [autoridade, setAutoridade] = useState(''), [evidencia, setEvidencia] = useState('')
  const [modalidade, setModalidade] = useState(''), [resultado, setResultado] = useState('APROVADA')
  const [reuniao, setReuniao] = useState(''), [data, setData] = useState(hoje()), [pagina, setPagina] = useState(0)
  const reunioes = useQuery({ queryKey: ['secretaria', identidade, d.contexto_id, 'reunioes', pagina], queryFn: () => secretariaApi.reunioes(d.contexto_id, pagina), enabled: acao === 'deliberar' })
  const enviar = useComando((dados: { revisao: number; autoridade: string; evidencia: string; modalidade?: string; reuniao_id?: string; resultado?: string; data?: string }) => secretariaApi.comando(d.id, acao, dados), fechar, d.id + ':' + acao)
  const escolherModalidade = acao === 'aprovar' && assinaturas
  return <form className="space-y-3 rounded border p-3" inert={enviar.isPending} onSubmit={e => {
    e.preventDefault()
    enviar.mutate({ revisao: d.revisao, autoridade, evidencia, ...(escolherModalidade && { modalidade }), ...(acao === 'deliberar' && { reuniao_id: reuniao, resultado, data }) })
  }}>
    <h4 className="font-medium">{rotulos[acao]} · Revisão {d.revisao}</h4>
    {escolherModalidade && <Escolha label="Modalidade de assinatura" value={modalidade} onChange={setModalidade}><option value="">Selecione a modalidade</option><option value="ELETRONICA">Eletrônica por convite individual</option><option value="FISICA">Física com digitalização conferida</option></Escolha>}
    {acao === 'deliberar' && <>
      <Escolha label="Reunião da deliberação" value={reuniao} onChange={id => { setReuniao(id); setData(reunioes.data?.find(r => r.id === id)?.data.slice(0,10) ?? hoje()) }}><option value="">Selecione a reunião</option>{reunioes.data?.filter(r => d.restrito || !r.dados.restrito).map(r => <option key={r.id} value={r.id}>{r.data.slice(0,10)} · {rotulosModalidadeReuniao[r.modalidade]} · {r.dados.local}</option>)}</Escolha>
      {reunioes.isError && <p role="alert">{reunioes.error.message}</p>}
      {(pagina > 0 || reunioes.data?.length === 30) && <div><Button type="button" disabled={!pagina} onClick={() => { setPagina(pagina-1); setReuniao('') }}>Reuniões anteriores</Button><Button type="button" disabled={reunioes.data?.length !== 30} onClick={() => { setPagina(pagina+1); setReuniao('') }}>Mais reuniões</Button></div>}
      <Campo label="Data da deliberação" type="date" value={data} onChange={setData} />
      <Escolha label="Resultado deliberativo" value={resultado} onChange={setResultado}><option value="APROVADA">Aprovada</option><option value="REJEITADA">Rejeitada</option><option value="ADIADA">Adiada</option></Escolha>
    </>}
    <Campo label="Autoridade da ação" value={autoridade} onChange={setAutoridade}/>
    <Area label="Fundamento e evidência da ação" value={evidencia} onChange={setEvidencia}/>
    <Salvar pending={enviar.isPending} error={enviar.error} success={false} label={'Confirmar · ' + rotulos[acao]}/>
    <Button type="button" variant="ghost" onClick={fechar}>Voltar</Button>
  </form>
}
