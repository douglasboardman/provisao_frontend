import { useMutation, useQuery } from '@tanstack/react-query'
import { secretariaApi, livrosHabilitados, type ArtefatoDocumento, type ContextoSecretaria, type DocumentoDetalhe } from '../../api/secretaria'
import { Button } from '../../components/ui/button'

const estados = {
  PENDENTE: 'Na fila',
  PROCESSANDO: 'Gerando PDF',
  CONCLUIDO: 'Disponível',
  FALHOU: 'Falha na geração',
  OBSOLETO: 'Revisão substituída',
}

export function ArtefatosDocumento({ documento, contexto, identidade, editando }: {
  documento: DocumentoDetalhe; contexto: ContextoSecretaria; identidade: string; editando: boolean;
}) {
  const consulta = useQuery({
    queryKey: ['secretaria', identidade, 'artefatos', documento.id, documento.revisao],
    queryFn: () => secretariaApi.artefatos(documento.id),
    gcTime: 0,
    refetchInterval: q => q.state.data?.some(a => a.estado === 'PENDENTE' || a.estado === 'PROCESSANDO') ? 2000 : false,
  })
  const gerar = useMutation({
    mutationFn: async (versao: string | null) => {
      if (versao) await secretariaApi.solicitarMatriz(documento.id, versao)
      else await secretariaApi.solicitarRascunho(documento.id, documento.revisao)
    },
    onSuccess: async () => { await consulta.refetch() },
  })
  const medir = useMutation({
    mutationFn: () => secretariaApi.medirLivro(documento.id, documento.revisao),
    onSuccess: async () => { await consulta.refetch() },
  })
  const medicao = consulta.data?.find(a => a.finalidade === 'MEDICAO_LIVRO')
  const versao = documento.versoes.find(v => v.numero === documento.versao_atual)
  const exibirMedicao = livrosHabilitados() && documento.estado === 'EM_EDICAO' && !!versao?.livro_id && !editando
  const deliberacao = versao?.deliberacoes.slice(-1)[0]
  const podeMedir = contexto.pode_preparar && documento.encaminhado_em && (documento.tipo !== 'ATA' ||
    (deliberacao?.resultado === 'APROVADA' && deliberacao.revisao_conteudo === versao?.revisao_conteudo))
  const rascunho = consulta.data?.find(a => a.finalidade === 'RASCUNHO' && a.revisao_documento === documento.revisao)
  const congeladas = documento.versoes.filter(v => v.congelado_em)
  const podeGerarRascunho = documento.estado === 'EM_EDICAO' && contexto.pode_preparar && !editando
  if (!podeGerarRascunho && !congeladas.length && !rascunho && !exibirMedicao) return null

  function linha(artefato: ArtefatoDocumento) {
    const nome = artefato.finalidade === 'RASCUNHO' ? 'rascunho' : 'matriz aprovada'
    return <>
      <p role="status">{estados[artefato.estado]}</p>
      {artefato.estado === 'CONCLUIDO' && <>
        <a className="underline" target="_blank" rel="noopener noreferrer" href={secretariaApi.artefatoUrl(documento.id, artefato.id)}>Abrir {nome} em PDF</a>
        <p className="break-all text-xs">SHA-256: {artefato.sha256}</p>
      </>}
    </>
  }

  return <section className="space-y-3 rounded border p-3" aria-label="Arquivos do documento">
    {consulta.isError && <p role="alert">Falha ao consultar os arquivos. <Button variant="outline" onClick={() => void consulta.refetch()}>Recarregar arquivos</Button></p>}
    {gerar.error && <p role="alert">{gerar.error.message}</p>}
    {(podeGerarRascunho || rascunho) && <div className="space-y-2">
      <h4 className="font-medium">Prévia da versão salva</h4>
      {rascunho && linha(rascunho)}
      {podeGerarRascunho && (!rascunho || rascunho.estado === 'FALHOU') && <Button type="button" variant="outline" disabled={gerar.isPending || consulta.isPending} onClick={() => gerar.mutate(null)}>
        {rascunho ? 'Tentar gerar a prévia novamente' : 'Gerar prévia em PDF'}
      </Button>}
    </div>}
    {exibirMedicao && <div className="space-y-2">
      <h4 className="font-medium">Paginação do livro</h4>
      {medicao && <p role="status">{medicao.estado === 'CONCLUIDO' ? `${medicao.paginas_medidas} páginas medidas para esta revisão` : estados[medicao.estado]}</p>}
      {medir.error && <p role="alert">{medir.error.message}</p>}
      {!podeMedir && contexto.pode_preparar && <p>Encaminhe a versão e, se for ata, registre a aprovação deliberativa antes de medir.</p>}
      {podeMedir && <Button variant="outline" disabled={medir.isPending || medicao?.estado === 'PENDENTE' || medicao?.estado === 'PROCESSANDO'} onClick={() => medir.mutate()}>
        {medicao?.estado === 'CONCLUIDO' ? 'Conferir medição novamente' : 'Medir páginas da matriz'}
      </Button>}
      <p className="text-sm">A aprovação reserva todas as páginas de uma vez. A medição inclui o espaço das assinaturas.</p>
    </div>}
    {congeladas.map(v => {
      const matriz = consulta.data?.find(a => a.finalidade === 'MATRIZ_APROVADA' && a.versao_id === v.id)
      return <div key={v.id} className="space-y-2">
        <h4 className="font-medium">Matriz aprovada · Versão {v.numero}</h4>
        {matriz ? linha(matriz) : consulta.isSuccess && <p>Sem PDF arquivado para esta versão.</p>}
        {contexto.pode_aprovar && consulta.isSuccess && (!matriz || matriz.estado === 'FALHOU') && <Button type="button" variant="outline" disabled={gerar.isPending} onClick={() => gerar.mutate(v.id)}>
          {matriz ? 'Tentar gerar a matriz novamente' : 'Gerar matriz da versão congelada'}
        </Button>}
      </div>
    })}
  </section>
}
