import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { assinaturasApi, dataAssinatura, modalidadeLabel, verificacaoUrl, type Expedicao, type Signatario } from '../../api/assinaturas'
import type { ContextoSecretaria, DocumentoDetalhe } from '../../api/secretaria'
import { useArtefatosDocumento } from './ArtefatosDocumento'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Area, Campo, Check, Salvar, useComando } from './formulario'

const estados: Record<Expedicao['estado'], string> = {
  AGUARDANDO: 'Aguardando assinaturas',
  PENDENTE: 'Expedição na fila',
  PROCESSANDO: 'Preparando arquivo final',
  FALHOU: 'Falha na expedição',
  CONCLUIDA: 'Expedição concluída',
  CANCELADA: 'Coleta encerrada',
}
const link = 'underline underline-offset-4'

export function AssinaturasDocumento({ documento: d, contexto, identidade, versaoId }: {
  documento: DocumentoDetalhe; contexto: ContextoSecretaria; identidade: string; versaoId: string
}) {
  const client = useQueryClient()
  const arquivos = useArtefatosDocumento(d, identidade)
  const consulta = useQuery({
    queryKey: ['secretaria', identidade, 'assinaturas', d.id, d.revisao],
    queryFn: () => assinaturasApi.listar(d.id),
    enabled: d.versoes.some(v => !!v.congelado_em),
    gcTime: 0,
    refetchInterval: q => q.state.data?.some(e => ['AGUARDANDO', 'PENDENTE', 'PROCESSANDO'].includes(e.estado)) ? 3000 : false,
  })
  const atual = d.versoes.find(v => v.numero === d.versao_atual)
  const fluxoAtual = consulta.data?.find(e => e.versao_id === atual?.id)
  useEffect(() => {
    if (d.estado === 'APROVADO' && fluxoAtual?.estado === 'CONCLUIDA') {
      void client.invalidateQueries({ queryKey: ['secretaria', identidade, contexto.id] })
    }
  }, [client, contexto.id, d.estado, fluxoAtual?.estado, identidade])

  if (!d.versoes.some(v => !!v.congelado_em)) return null
  return <section className="space-y-3 rounded border p-3" id="assinaturas-documento" tabIndex={-1} aria-label="Assinaturas e expedição">
    <h4 className="font-semibold">Assinaturas e expedição</h4>
    {consulta.isPending && <p>Consultando assinaturas…</p>}
    {consulta.isError && <p role="alert">Falha ao consultar assinaturas. <Button variant="outline" onClick={() => void consulta.refetch()}>Tentar novamente</Button></p>}
    {consulta.isSuccess && d.estado === 'APROVADO' && versaoId === atual?.id && !fluxoAtual && <p>Esta versão foi aprovada antes da habilitação de assinaturas. Prepare uma nova versão para iniciar a coleta.</p>}
    {d.versoes.filter(v => v.id === versaoId).map(v => {
      const e = consulta.data?.find(e => e.versao_id === v.id)
      return e && <ExpedicaoVersao key={e.versao_id} e={e} numero={v.numero} d={d} matrizPronta={!!e.matriz_sha256 || !!arquivos.data?.some(a => a.versao_id === v.id && a.finalidade === 'MATRIZ_APROVADA' && a.estado === 'CONCLUIDO')} competente={contexto.pode_aprovar} />
    })}
  </section>
}

function ExpedicaoVersao({ e, d, numero, competente, matrizPronta }: { e: Expedicao; d: DocumentoDetalhe; numero: number; competente: boolean; matrizPronta: boolean }) {
  const base = { versao_id: e.versao_id, revisao: d.revisao }
  const arquivo = (tipo: 'via' | 'scan' | 'final' | 'manifesto') => assinaturasApi.arquivoUrl(d.id, e.versao_id, tipo)
  const comandos = useComando<{ acao: 'via' | 'repetir' }>(dados => {
    const { acao, idempotencia } = dados
    return assinaturasApi.comando(d.id, acao, { ...base, idempotencia })
  }, undefined, `${e.versao_id}:${d.revisao}`)
  const atual = numero === d.versao_atual
  const podeColetar = competente && atual && d.estado === 'APROVADO' && e.estado === 'AGUARDANDO'
  const derivacao = e.modalidade === 'ELETRONICA' && e.estado === 'CONCLUIDA'
  return <details className="space-y-3 rounded border p-3" open={atual}>
    <summary className="cursor-pointer font-medium">Versão {numero} · {modalidadeLabel[e.modalidade]}</summary>
    <p role="status">{estados[e.estado]}{e.expedido_em && ` em ${dataAssinatura(e.expedido_em, e.fuso_iana)} (${e.fuso_iana})`}</p>
    {podeColetar && !matrizPronta && <p>A coleta poderá começar quando a matriz aprovada estiver disponível.</p>}
    <ul className="space-y-2">
      {e.signatarios.map(a => <li key={a.id} className="border-b pb-2">
        <p>{a.nome} · {a.obrigatorio ? 'Obrigatório' : 'Opcional'}</p>
        {a.assinatura && <p className="text-sm">
          {a.assinatura.metodo === 'ELETRONICA'
            ? `Assinou em ${dataAssinatura(a.assinatura.data, e.fuso_iana)} (${e.fuso_iana})`
            : `Assinatura física de ${a.assinatura.evidencias.data_fisica?.split('-').reverse().join('/')}`}
        </p>}
        {a.convite && <p className="text-sm">
          Convite {a.convite.estado.toLowerCase()}{a.convite.estado === 'PENDENTE' && a.convite.entrega ? ` · E-mail: ${a.convite.entrega.toLowerCase()}` : ''}
          {a.convite.motivo_recusa && ` · ${a.convite.motivo_recusa}`}
        </p>}
        {podeColetar && matrizPronta && e.modalidade === 'ELETRONICA' && !a.assinatura && a.convite?.estado !== 'RECUSADO' &&
          <ConviteForm doc={d.id} base={base} signatario={a} />}
      </li>)}
    </ul>
    {e.via_sha256 && <a href={arquivo('via')} className={link}>
      {derivacao ? 'Reimprimir derivação para coleta física' : 'Reimprimir via aprovada para coleta'}
    </a>}
    {!e.via_sha256 && ((e.modalidade === 'FISICA' && podeColetar) || (derivacao && competente && d.estado === 'EXPEDIDO')) &&
      <Button type="button" variant="outline" disabled={!matrizPronta || comandos.isPending} onClick={() => comandos.mutate({ acao: 'via' })}>
        {derivacao ? 'Gerar derivação para coleta física' : 'Gerar impressão para assinatura'}
      </Button>}
    {podeColetar && e.modalidade === 'FISICA' && e.via_sha256 && <ConferenciaForm e={e} doc={d.id} base={base} viaSha256={e.via_sha256} />}
    {e.conferencia && <div className="space-y-1">
      <p>Conferido por {e.conferencia.operador} em {dataAssinatura(e.conferencia.data, e.fuso_iana)}</p>
      <p>{e.conferencia.evidencia}</p>
      <a className={link} href={arquivo('scan')}>Baixar digitalização original</a>
    </div>}
    {e.estado === 'FALHOU' && atual && d.estado === 'APROVADO' && competente &&
      <Button type="button" variant="outline" disabled={comandos.isPending} onClick={() => comandos.mutate({ acao: 'repetir' })}>Retomar expedição</Button>}
    {comandos.error && <p role="alert" className="text-destructive">{comandos.error.message}</p>}
    {e.codigo && <div className="space-y-2">
      <div className="flex flex-wrap gap-4">
        <a className={link} href={arquivo('final')}>Baixar PDF expedido</a>
        <a className={link} href={arquivo('manifesto')}>Baixar manifesto</a>
        <a className={link} href={verificacaoUrl(e.codigo)} target="_blank" rel="noopener noreferrer">Verificar expedição</a>
      </div>
      <p className="break-all text-xs">SHA-256 da via expedida {e.final_sha256}</p>
    </div>}
  </details>
}

type Base = { versao_id: string; revisao: number }
function ConviteForm({ doc, base, signatario }: { doc: string; base: Base; signatario: Signatario }) {
  const [acao, setAcao] = useState<'convidar' | 'revogar' | null>(null)
  const [evidencia, setEvidencia] = useState('')
  const [individual, setIndividual] = useState(false)
  const enviar = useComando<{ acao: 'convidar' | 'revogar'; evidencia: string; individual: boolean }>(dados =>
    assinaturasApi.comando(doc, dados.acao, {
      ...base, idempotencia: dados.idempotencia, arrolado_id: signatario.id, evidencia: dados.evidencia,
      ...(dados.acao === 'convidar' ? { canal_individual: dados.individual } : {}),
    }), () => { setAcao(null); setEvidencia(''); setIndividual(false) }, `${base.versao_id}:${base.revisao}`)
  return <div className="mt-2 space-y-3">
    {!acao && <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" onClick={() => setAcao('convidar')}>{signatario.convite ? 'Reenviar convite' : 'Convidar por e-mail'}</Button>
      {signatario.convite?.estado === 'PENDENTE' && <Button type="button" variant="outline" onClick={() => setAcao('revogar')}>Revogar convite</Button>}
    </div>}
    {enviar.isSuccess && !acao && <p role="status">Operação registrada.</p>}
    {acao && <form className="space-y-2" onSubmit={ev => { ev.preventDefault(); enviar.mutate({ acao, evidencia, individual }) }}>
      {acao === 'convidar' && <Check label="Conferi que o endereço cadastrado é individual" checked={individual} onChange={setIndividual} />}
      <Area label={acao === 'convidar' ? 'Evidência da conferência do endereço' : 'Motivo da revogação'} value={evidencia} onChange={setEvidencia} />
      <Salvar pending={enviar.isPending} success={false} error={enviar.error} disabled={acao === 'convidar' && !individual} label={acao === 'convidar' ? 'Enfileirar convite' : 'Confirmar revogação'} />
      <Button type="button" variant="ghost" disabled={enviar.isPending} onClick={() => setAcao(null)}>Fechar</Button>
    </form>}
  </div>
}

function ConferenciaForm({ e, doc, base, viaSha256 }: { e: Expedicao; doc: string; base: Base; viaSha256: string }) {
  const [arquivo, setArquivo] = useState<File>()
  const [selecao, setSelecao] = useState(0)
  const [evidencia, setEvidencia] = useState('')
  const [conferidos, setConferidos] = useState<Record<string, { data: string; evidencia: string }>>({})
  const enviar = useComando<{ evidencia: string; assinaturas: { arrolado_id: string; data: string; evidencia: string }[] }>(dados =>
    assinaturasApi.conferir(doc, { ...base, ...dados, via_sha256: viaSha256 }, arquivo!), undefined, `${base.versao_id}:${base.revisao}:${selecao}`)
  return <form className="space-y-3 rounded border p-3" onSubmit={ev => {
    ev.preventDefault()
    enviar.mutate({ evidencia, assinaturas: Object.entries(conferidos).map(([arrolado_id, v]) => ({ arrolado_id, ...v })) })
  }}>
    <h5 className="font-semibold">Conferir assinaturas no original físico</h5>
    <label className="grid gap-1 text-sm">Digitalização em PDF (até 10 MB)
      <Input type="file" accept="application/pdf,.pdf" required onChange={ev => { setArquivo(ev.target.files?.[0]); setSelecao(x => x + 1) }} />
    </label>
    {e.signatarios.map(a => {
      const conf = conferidos[a.id]
      return <fieldset key={a.id} className="space-y-2">
        <Check label={`Assinatura conferida de ${a.nome}${a.obrigatorio ? ' (obrigatória)' : ''}`} checked={!!conf} onChange={v => {
          const proximos = { ...conferidos }
          if (v) proximos[a.id] = { data: '', evidencia: '' }
          else delete proximos[a.id]
          setConferidos(proximos)
        }} />
        {conf && <div className="grid gap-2 pl-6">
          <Campo label={`Data da assinatura de ${a.nome}`} type="date" value={conf.data} onChange={data => setConferidos({ ...conferidos, [a.id]: { ...conf, data } })} />
          <Campo label={`Evidência da assinatura de ${a.nome}`} value={conf.evidencia} onChange={evidencia => setConferidos({ ...conferidos, [a.id]: { ...conf, evidencia } })} />
        </div>}
      </fieldset>
    })}
    <Area label="Evidência da conferência da digitalização" value={evidencia} onChange={setEvidencia} />
    <Salvar pending={enviar.isPending} error={enviar.error} success={enviar.isSuccess}
      disabled={!arquivo || arquivo.size > 10 * 1024 * 1024 || e.signatarios.some(a => a.obrigatorio && !conferidos[a.id])}
      label="Registrar conferência e enfileirar expedição" />
  </form>
}
