import { TeorDocumento } from './FichaDocumento'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '../../components/ui/button'
import { modalidadesParaContexto, nomeLivro, numeroDocumento, rotulosModalidadeReuniao, secretariaApi, type AtaLegadaInput, type ContextoSecretaria, type DocumentoDetalhe, type ReuniaoLegada, type ReuniaoSecretaria } from '../../api/secretaria'
import { formatarDataCivil } from '../../lib/membresia-temporal'
import { Area, Campo, CampoPapeis, Check, Escolha, Salvar, useComando } from './formulario'
import { EditarResolucoes, LerResolucoes } from './ResolucoesDocumento'

const textoOpcional = (v: string) => v.trim() || null
const horaIso = (v: string) => v ? new Date(v).toISOString() : null

export function AtaLegadaForm({ contexto, reunioes, pessoas, pronto }: {
  contexto: ContextoSecretaria; reunioes: ReuniaoSecretaria[]; pessoas: { id: string; nome_completo: string }[]; pronto: (id: string) => void
}) {
  const [v, set] = useState<Omit<AtaLegadaInput, 'pdf'>>({
    contexto_id: contexto.id, restrito: false, numero_original: null, assunto: '', data_documento: '',
    reuniao_id: null, reuniao: { data: null, local: null, modalidade: null, inicio: null, fim: null, pauta: null },
    teor: '', arrolados: [], resolucoes: [], autoridade: '', evidencia: '', conferida: false,
  })
  const [pdf, setPdf] = useState<AtaLegadaInput['pdf'] | null>(null)
  const [pessoa, setPessoa] = useState('')
  const [arquivoPendente, setArquivoPendente] = useState(false)
  const [extracaoPendente, setExtracaoPendente] = useState(false)
  const [erroArquivo, setErroArquivo] = useState('')
  const editar = <K extends keyof typeof v>(campo: K, valor: typeof v[K]) => set(atual => ({
    ...atual, [campo]: valor, ...(campo === 'conferida' ? {} : { conferida: false }),
  }))
  const editarReuniao = <K extends keyof ReuniaoLegada>(campo: K, valor: ReuniaoLegada[K]) => set(atual => ({
    ...atual, reuniao: { ...atual.reuniao, [campo]: valor }, conferida: false,
  }))
  const salvar = useComando(secretariaApi.criarAtaLegada, r => pronto(r.id), contexto.id)

  async function enviarPdf(arquivo: File) {
    setPdf(null)
    editar('conferida', false)
    setArquivoPendente(true)
    setErroArquivo('')
    try {
      const r = await secretariaApi.upload(arquivo)
      setPdf({ arquivo_id: r.id, nome: arquivo.name })
    } catch (erro) {
      setErroArquivo(erro instanceof Error ? erro.message : 'Falha no envio do PDF.')
    } finally { setArquivoPendente(false) }
  }

  async function extrair() {
    if (!pdf) return
    setExtracaoPendente(true)
    setErroArquivo('')
    try {
      const r = await secretariaApi.extrairTeorLegado({ contexto_id: contexto.id, arquivo_id: pdf.arquivo_id })
      editar('teor', r.teor)
    } catch (erro) {
      setErroArquivo(erro instanceof Error ? erro.message : 'Falha ao extrair o teor do PDF.')
    } finally { setExtracaoPendente(false) }
  }

  const ocupados = new Set(v.arrolados.map(p => p.pessoa_id))
  const nome = (id: string) => pessoas.find(p => p.id === id)?.nome_completo ?? 'Pessoa'
  const horasLocais = (valor: string | null) => {
    if (!valor) return ''
    const d = new Date(valor)
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  }
  return <form className="space-y-4 rounded border p-4" onSubmit={e => {
    e.preventDefault()
    if (pdf && v.conferida && !arquivoPendente && !extracaoPendente) {
      salvar.mutate({ ...v, numero_original: textoOpcional(v.numero_original ?? ''), pdf })
    }
  }}>
    <h3 className="text-lg font-semibold">Cadastrar ata legada</h3>
    <div className="grid gap-3 md:grid-cols-3">
      <Campo label="Número original (se houver)" required={false} value={v.numero_original ?? ''} onChange={s => editar('numero_original', s || null)} />
      <Campo label="Assunto" value={v.assunto} onChange={s => editar('assunto', s)} />
      <Campo label="Data do documento original" type="date" value={v.data_documento} onChange={s => editar('data_documento', s)} />
    </div>
    {contexto.pode_consultar_restritos && <Check label="Ata restrita" checked={v.restrito} onChange={s => editar('restrito', s)} />}
    <fieldset className="space-y-3 rounded border p-3">
      <legend className="px-1 font-semibold">Reunião registrada no original</legend>
      <div className="grid gap-3 md:grid-cols-3">
        <Campo label="Data da reunião" type="date" required={false} value={v.reuniao.data ?? ''} onChange={s => editarReuniao('data', s || null)} />
        <Campo label="Local" required={false} value={v.reuniao.local ?? ''} onChange={s => editarReuniao('local', s || null)} />
        <Escolha label="Modalidade" required={false} value={v.reuniao.modalidade ?? ''} onChange={s => editarReuniao('modalidade', s as ReuniaoLegada['modalidade'] || null)}>
          <option value="">Não informada no acervo</option>
          {modalidadesParaContexto(contexto).map(m => <option key={m} value={m}>{rotulosModalidadeReuniao[m]}</option>)}
        </Escolha>
        <Campo label="Início da reunião" type="datetime-local" required={false} value={horasLocais(v.reuniao.inicio)} onChange={s => editarReuniao('inicio', horaIso(s))} />
        <Campo label="Fim da reunião" type="datetime-local" required={false} value={horasLocais(v.reuniao.fim)} onChange={s => editarReuniao('fim', horaIso(s))} />
      </div>
      <Area label="Pauta histórica" required={false} value={v.reuniao.pauta ?? ''} onChange={s => editarReuniao('pauta', s || null)} />
      {reunioes.length > 0 && <Escolha label="Vincular reunião já cadastrada" required={false} value={v.reuniao_id ?? ''} onChange={s => editar('reuniao_id', s || null)}>
        <option value="">Selecione se a reunião já existe no sistema</option>
        {reunioes.map(r => <option key={r.id} value={r.id}>{r.data.slice(0, 10)} · {rotulosModalidadeReuniao[r.modalidade]} · {r.dados.local}</option>)}
      </Escolha>}
    </fieldset>
    <fieldset className="space-y-3 rounded border p-3">
      <legend className="px-1 font-semibold">PDF e teor</legend>
      <label className="grid gap-1 text-sm">PDF original (até 10 MB)
        <input type="file" accept="application/pdf,.pdf" disabled={arquivoPendente || extracaoPendente || salvar.isPending} onChange={e => {
          const arquivo = e.target.files?.[0]; if (arquivo) void enviarPdf(arquivo)
        }} />
      </label>
      {arquivoPendente && <p role="status">Enviando PDF…</p>}
      {pdf && <div className="flex flex-wrap items-center gap-3"><span className="text-sm">{pdf.nome}</span>
        <Button type="button" variant="outline" disabled={extracaoPendente || salvar.isPending} onClick={() => void extrair()}>
          {extracaoPendente ? 'Extraindo…' : v.teor ? 'Substituir pelo teor extraído do PDF' : 'Extrair teor do PDF'}
        </Button>
      </div>}
      {erroArquivo && <p role="alert" className="text-destructive">{erroArquivo}</p>}
      <Area label="Teor conferido" value={v.teor} onChange={s => editar('teor', s)} />
    </fieldset>
    <fieldset className="space-y-3 rounded border p-3">
      <legend className="px-1 font-semibold">Pessoas arroladas na ata original</legend>
      <div className="flex flex-wrap items-end gap-2">
        <Escolha label="Adicionar arrolado" required={false} value={pessoa} onChange={setPessoa}>
          <option value="">Selecione uma pessoa cadastrada</option>
          {pessoas.filter(p => !ocupados.has(p.id)).map(p => <option key={p.id} value={p.id}>{p.nome_completo}</option>)}
        </Escolha>
        <Button type="button" variant="outline" disabled={!pessoa || ocupados.has(pessoa)} onClick={() => {
          editar('arrolados', [...v.arrolados, { pessoa_id: pessoa, papeis: ['PARTICIPANTE'], fundamento: '' }]); setPessoa('')
        }}>Arrolar pessoa</Button>
      </div>
      {v.arrolados.map(p => {
        const atualizar = (patch: Partial<typeof p>) => editar('arrolados', v.arrolados.map(r => r.pessoa_id === p.pessoa_id ? { ...r, ...patch } : r))
        const vinculado = v.resolucoes.some(r => r.proponentes_pessoas_ids.includes(p.pessoa_id) || r.dissidentes_pessoas_ids.includes(p.pessoa_id))
        return <div className="space-y-2 rounded border p-3" key={p.pessoa_id}>
          <p className="font-medium">{nome(p.pessoa_id)}</p>
          <CampoPapeis label="Papéis no original (separados por vírgula)" value={p.papeis} onChange={papeis => atualizar({ papeis })} />
          <Campo label="Evidência do papel" required={false} value={p.fundamento} onChange={fundamento => atualizar({ fundamento })} />
          <Button type="button" variant="outline" disabled={vinculado} onClick={() => editar('arrolados', v.arrolados.filter(r => r.pessoa_id !== p.pessoa_id))}>Remover arrolado</Button>
        </div>
      })}
    </fieldset>
    <EditarResolucoes valor={v.resolucoes} pessoas={v.arrolados.map(p => ({ id: p.pessoa_id, nome: nome(p.pessoa_id), podePropor: true }))}
      obrigatorio={false} permitido alterar={r => editar('resolucoes', r)} />
    <Campo label="Autoridade da conferência" value={v.autoridade} onChange={s => editar('autoridade', s)} />
    <Area label="Evidência da origem e da conferência" value={v.evidencia} onChange={s => editar('evidencia', s)} />
    <Check label="Conferi o teor, os arrolados e as resoluções com o PDF original" checked={v.conferida} onChange={s => editar('conferida', s)} />
    <Salvar pending={salvar.isPending} error={salvar.error} success={salvar.isSuccess} label="Salvar ata legada conferida"
      disabled={!pdf || !v.conferida || arquivoPendente || extracaoPendente} />
  </form>
}

export function AtaLegadaLeitura({ documento }: { documento: DocumentoDetalhe }) {
  const versao = documento.versoes.find(v => v.numero === documento.versao_atual)
  const legado = versao?.fonte_congelada?.legado
  if (!versao || !legado) return <p role="alert">Evidência histórica indisponível.</p>
  const { reuniao } = legado
  const pdf = versao.anexos.find(a => a.arquivo_id === legado.arquivo_id)
  return <div className="space-y-4">
    <div>
      <h3 className="text-lg font-semibold">{versao.assunto}</h3>
      <p className="text-sm">{numeroDocumento(documento)} · {formatarDataCivil(versao.data_documento)} · Ata legada conferida</p>
    </div>
    {(reuniao.data || reuniao.local || reuniao.modalidade || reuniao.inicio || reuniao.fim || reuniao.pauta) && <div className="space-y-1">
      <h4 className="font-semibold">Reunião registrada no original</h4>
      <p>{[reuniao.data && formatarDataCivil(reuniao.data), reuniao.local,
        reuniao.modalidade && rotulosModalidadeReuniao[reuniao.modalidade]].filter(Boolean).join(' · ')}</p>
      {reuniao.inicio && <p>Início {new Date(reuniao.inicio).toLocaleString('pt-BR')}</p>}
      {reuniao.fim && <p>Fim {new Date(reuniao.fim).toLocaleString('pt-BR')}</p>}
      {reuniao.pauta && <p className="whitespace-pre-wrap">{reuniao.pauta}</p>}
    </div>}
    {pdf && <a className="underline" href={secretariaApi.anexoUrl(documento.id, versao.id, pdf.arquivo_id)}>Baixar PDF original · {pdf.nome}</a>}
    {versao.folhas_legadas && <p>Folhas no livro histórico · {versao.folhas_legadas}</p>}
    <div>
      <h4 className="font-semibold">Teor conferido</h4>
      <TeorDocumento texto={versao.conteudo.teor} />
    </div>
    <LerResolucoes resolucoes={versao.resolucoes ?? []} />
    {versao.arrolados.length > 0 && <div>
      <h4 className="font-semibold">Pessoas arroladas</h4>
      <ul className="list-disc pl-5">
        {versao.arrolados.map(p => <li key={p.pessoa_id}>{p.retrato.nome} · {p.papeis.join(', ')}{p.retrato.fundamento && ` · ${p.retrato.fundamento}`}</li>)}
      </ul>
    </div>}
    <div>
      <h4 className="font-semibold">Conferência histórica</h4>
      <p>{legado.autoridade} · {legado.operador} · {formatarDataCivil(legado.conferido_em)}</p>
      <p className="whitespace-pre-wrap">{legado.evidencia}</p>
    </div>
  </div>
}

export function VinculoLivroLegado({ documento, identidade }: { documento: DocumentoDetalhe; identidade: string }) {
  const versao = documento.versoes.find(v => v.numero === documento.versao_atual)
  const [livro, setLivro] = useState(versao?.livro_id ?? '')
  const [folhas, setFolhas] = useState(versao?.folhas_legadas ?? '')
  const [autoridade, setAutoridade] = useState('')
  const [evidencia, setEvidencia] = useState('')
  const [pagina, setPagina] = useState(0)
  const livros = useQuery({
    queryKey: ['secretaria', identidade, documento.contexto_id, 'livros-legados', pagina, documento.restrito],
    queryFn: () => secretariaApi.livros(documento.contexto_id, pagina, {
      estado: 'ENCERRADO', restrito: documento.restrito, modalidade: 'FISICO_DIGITALIZADO',
    }), gcTime: 0,
  })
  const salvar = useComando((d: Omit<Parameters<typeof secretariaApi.vincularLivroLegado>[1], 'idempotencia'> & { idempotencia: string }) =>
    secretariaApi.vincularLivroLegado(documento.id, d), undefined, documento.id)
  return <details className="rounded border p-3">
    <summary className="cursor-pointer font-semibold">Vínculo com livro histórico</summary>
    <form className="mt-3 space-y-3" onSubmit={e => {
      e.preventDefault()
      salvar.mutate({ revisao: documento.revisao, livro_id: livro || null, folhas: livro ? textoOpcional(folhas) : null, autoridade, evidencia })
    }}>
      <Escolha label="Livro físico digitalizado" required={false} value={livro} onChange={s => { setLivro(s); setFolhas('') }}>
        <option value="">Sem vínculo</option>
        {livro && !livros.data?.some(l => l.id === livro) && <option value={livro}>Livro selecionado</option>}
        {livros.data?.map(l => <option key={l.id} value={l.id}>{nomeLivro(l)}</option>)}
      </Escolha>
      {livros.isError && <p role="alert">Não foi possível consultar os livros.</p>}
      {(pagina > 0 || livros.data?.length === 30) && <div className="flex gap-2">
        <Button type="button" variant="outline" disabled={pagina === 0} onClick={() => setPagina(p => p - 1)}>Anterior</Button>
        <Button type="button" variant="outline" disabled={livros.data?.length !== 30} onClick={() => setPagina(p => p + 1)}>Próxima</Button>
      </div>}
      {livro && <Campo label="Folhas no original" required={false} value={folhas} onChange={setFolhas} />}
      <Campo label="Autoridade do vínculo" value={autoridade} onChange={setAutoridade} />
      <Area label="Evidência da localização no acervo" value={evidencia} onChange={setEvidencia} />
      <Salvar pending={salvar.isPending} error={salvar.error} success={salvar.isSuccess} label="Salvar vínculo com o livro" />
    </form>
  </details>
}
