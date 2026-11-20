import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '../../components/ui/button'
import {
  estadosLivro, nomeLivro, secretariaApi, type AcaoLivro, type ContextoSecretaria,
  type FinalidadeTermo, type LivroDetalhe, type LivroResumo,
} from '../../api/secretaria'
import { Area, Campo, Check, Escolha, Salvar, codigos, hoje, useComando } from './formulario'

export type NovoTermo = { livro: LivroResumo; finalidade: FinalidadeTermo }

const modalidadeLivro = { ELETRONICO: 'Eletrônico', PARA_ENCADERNACAO: 'Para encadernação', FISICO_DIGITALIZADO: 'Acervo físico digitalizado' }
const perfis = { LOCAL_V1: 'Local, versão 1', CONCILIO_IPB_2025: 'Concílios da IPB, Manual 2025', ACERVO_HISTORICO: 'Acervo histórico' }
const naturezas = { ABERTURA: 'Termo de abertura', ATA_ORIGINAL: 'Ata', EXAME: 'Registro de exame', OUTRO_AUTORIZADO: 'Outro documento', ENCERRAMENTO: 'Termo de encerramento' }
const estadoRegistro = { RESERVADO: 'Reservado para a matriz', EFETIVADO: 'Efetivado', CANCELADO: 'Reserva cancelada' }
const nomesAcoes: Record<AcaoLivro, string> = {
  suspender: 'Suspender inclusões', retomar: 'Retomar inclusões', 'preparar-encerramento': 'Preparar encerramento',
  'desistir-encerramento': 'Desistir do encerramento',
}

export function LivrosContexto({ contexto, identidade, abrirDocumento, novoTermo }: {
  contexto: ContextoSecretaria; identidade: string; abrirDocumento: (id: string) => void
  novoTermo: (termo: NovoTermo) => void
}) {
  const [selecionado, selecionar] = useState('')
  const [form, setForm] = useState<'novo' | 'importar' | null>(null)
  const [pagina, setPagina] = useState(0)
  const lista = useQuery({ queryKey: ['secretaria', identidade, 'livros', contexto.id, pagina], queryFn: () => secretariaApi.livros(contexto.id, pagina), gcTime: 0 })
  const livro = useQuery({ queryKey: ['secretaria', identidade, 'livro', selecionado], queryFn: () => secretariaApi.livro(selecionado), enabled: !!selecionado, gcTime: 0 })
  const pronto = (id: string) => { selecionar(id); setForm(null); setPagina(0) }
  return <div className="space-y-4">
    <div className="flex flex-wrap gap-2">
      {contexto.pode_preparar && <Button onClick={() => setForm('novo')}>Novo livro</Button>}
      {contexto.pode_aprovar && <Button variant="outline" onClick={() => setForm('importar')}>Cadastrar acervo físico</Button>}
      {form && <Button variant="outline" onClick={() => setForm(null)}>Fechar formulário</Button>}
    </div>
    {form && <CadastroLivro key={form} contexto={contexto} importar={form === 'importar'} pronto={pronto} />}
    {lista.isPending && <p>Carregando livros…</p>}
    {lista.isError && <p role="alert">{lista.error.message}</p>}
    {lista.data?.length === 0 && <p>Nenhum livro cadastrado nesta página.</p>}
    {lista.data?.map(item => <article key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded border p-3">
      <div><h3 className="font-semibold">{nomeLivro(item)}</h3><p>{estadosLivro[item.estado]} · {item.capacidade_folhas} folhas · {modalidadeLivro[item.modalidade]}{item.restrito ? ' · Restrito' : ''}</p></div>
      <Button variant="outline" onClick={() => selecionar(item.id)}>Consultar livro</Button>
    </article>)}
    <div className="flex items-center gap-2">
      <Button variant="outline" disabled={pagina === 0} onClick={() => setPagina(pagina - 1)}>Anterior</Button>
      <span>Página {pagina + 1}</span>
      <Button variant="outline" disabled={lista.data?.length !== 30} onClick={() => setPagina(pagina + 1)}>Próxima</Button>
    </div>
    {selecionado && livro.isPending && <p>Carregando livro…</p>}
    {livro.isError && <p role="alert">{livro.error.message}</p>}
    {livro.data && <DetalheLivro key={livro.data.id} livro={livro.data} contexto={contexto} abrirDocumento={abrirDocumento} novoTermo={novoTermo} identidade={identidade} />}
  </div>
}

function CadastroLivro({ contexto, importar, pronto }: { contexto: ContextoSecretaria; importar: boolean; pronto: (id: string) => void }) {
  const [numero, setNumero] = useState(''), [serie, setSerie] = useState(contexto.tipo === 'ASSEMBLEIA_GERAL' ? 'ATA_ASSEMBLEIA' : 'ATA_PADRAO')
  const [capacidade, setCapacidade] = useState('50'), [faces, setFaces] = useState('1'), [reserva, setReserva] = useState('1')
  const [perfil, setPerfil] = useState(contexto.orgao?.tipo === 'CONSELHO' ? 'CONCILIO_IPB_2025' : 'LOCAL_V1')
  const [modalidade, setModalidade] = useState('PARA_ENCADERNACAO'), [fonte, setFonte] = useState('')
  const [restrito, setRestrito] = useState(false)
  const [data, setData] = useState(hoje()), [autoridade, setAutoridade] = useState(''), [evidencia, setEvidencia] = useState('')
  const [arquivo, setArquivo] = useState<{ id: string; nome: string } | null>(null)
  const [enviando, setEnviando] = useState(false), [erro, setErro] = useState('')
  const normativo = !importar && perfil === 'CONCILIO_IPB_2025'
  const enviar = useComando((d: object) => importar ? secretariaApi.importarLivro(d) : secretariaApi.criarLivro(d), r => pronto(r.id))
  async function upload(pdf: File) {
    setArquivo(null); setEnviando(true); setErro('')
    try { const r = await secretariaApi.upload(pdf); setArquivo({ id: r.id, nome: pdf.name }) }
    catch (erro) { setErro(erro instanceof Error ? erro.message : 'Falha no envio do arquivo.') }
    finally { setEnviando(false) }
  }
  return <form className="space-y-4 rounded border p-4" onSubmit={e => {
    e.preventDefault()
    const comum = { contexto_id: contexto.id, numero: Number(numero), capacidade_folhas: Number(capacidade), faces_por_folha: Number(faces),
      serie: codigos(serie)[0], restrito, fonte_normativa: normativo ? 'Manual Presbiteriano 2025, Regulamento para Confecção de Atas, arts. 2 a 8, 11 e 20.' : fonte }
    enviar.mutate(importar ? { ...comum, data_historica: data, autoridade, evidencia, arquivo_historico_id: arquivo?.id }
      : { ...comum, modalidade: normativo ? 'PARA_ENCADERNACAO' : modalidade, perfil, reserva_exame: Number(reserva) })
  }}>
    <h3 className="font-semibold">{importar ? 'Cadastrar livro físico já encerrado' : 'Cadastrar livro em preparação'}</h3>
    <div className="grid gap-3 md:grid-cols-2">
      <Campo label="Número do livro" type="number" value={numero} onChange={setNumero} />
      <Campo label="Série documental das atas" value={serie} onChange={setSerie} />
      <Campo label="Capacidade declarada em folhas" type="number" value={capacidade} onChange={setCapacidade} />
      <Escolha label="Faces utilizáveis por folha" value={faces} onChange={setFaces}><option value="1">1 · frente</option><option value="2">2 · frente e verso</option></Escolha>
      {!importar && <>
        <Escolha label="Perfil normativo" value={perfil} onChange={setPerfil}>
          {contexto.orgao?.tipo === 'CONSELHO' && <option value="CONCILIO_IPB_2025">{perfis.CONCILIO_IPB_2025}</option>}
          <option value="LOCAL_V1">{perfis.LOCAL_V1}</option>
        </Escolha>
        {!normativo && <Escolha label="Modalidade" value={modalidade} onChange={setModalidade}><option value="PARA_ENCADERNACAO">Para encadernação</option><option value="ELETRONICO">Eletrônico</option></Escolha>}
        <Campo label="Faces reservadas para exames" type="number" value={reserva} onChange={setReserva} />
      </>}
      {!normativo && <Campo label={importar ? 'Origem do acervo' : 'Referência normativa local e vigência'} value={fonte} onChange={setFonte} />}
    </div>
    {normativo && <p>O perfil usa papel A4, margens de 3 cm e capacidade declarada de 50 a 100 folhas para encadernação.</p>}
    {contexto.pode_consultar_restritos && <Check label="Acervo restrito" checked={restrito} onChange={setRestrito} />}
    {importar && <>
      <Campo label="Data declarada de encerramento físico" type="date" value={data} onChange={setData} />
      <Campo label="Autoridade da conferência" value={autoridade} onChange={setAutoridade} />
      <Area label="Evidência de origem e conferência" value={evidencia} onChange={setEvidencia} />
      <label className="grid gap-1 text-sm">PDF digitalizado (até 10 MB)
        <input type="file" accept="application/pdf" disabled={enviando} onChange={e => { const file = e.target.files?.[0]; if (file) void upload(file) }} />
      </label>
      {arquivo && <p role="status">{arquivo.nome} enviado.</p>}
      {erro && <p role="alert">{erro}</p>}
    </>}
    <Salvar pending={enviar.isPending || enviando} disabled={importar && !arquivo} error={enviar.error} success={enviar.isSuccess} label={importar ? 'Cadastrar acervo' : 'Cadastrar livro'} />
  </form>
}

function DetalheLivro({ livro, contexto, abrirDocumento, novoTermo, identidade }: {
  livro: LivroDetalhe; contexto: ContextoSecretaria; identidade: string; abrirDocumento: (id: string) => void; novoTermo: (termo: NovoTermo) => void
}) {
  const t = livro.totais
  const finalidade = livro.estado === 'EM_PREPARACAO' ? 'TERMO_ABERTURA' : livro.estado === 'EM_ENCERRAMENTO' ? 'TERMO_ENCERRAMENTO' : null
  const termoAtivo = livro.termos.some(t => t.modelo.finalidade === finalidade && !['CANCELADO', 'ANULADO'].includes(t.documento.estado))
  return <section className="space-y-4 rounded border p-4" aria-label="Detalhes do livro">
    <div><h3 className="text-lg font-semibold">{nomeLivro(livro)}</h3><p>{livro.titular} · {estadosLivro[livro.estado]} · {modalidadeLivro[livro.modalidade]}</p></div>
    <p>{perfis[livro.perfil]} · {livro.fonte_normativa}</p>
    <p>Capacidade declarada de {livro.capacidade_folhas} folhas e {livro.capacidade_faces} faces ({livro.faces_por_folha} por folha).</p>
    {t && <>
      <p>{t.total_atas} atas efetivadas · {t.paginas_utilizadas} páginas em {t.folhas_utilizadas} folhas · saldo físico de {t.saldo_faces} faces e {t.saldo_folhas} folhas inteiramente sem conteúdo efetivado.</p>
      <p>{t.pendencias} reservas pendentes · {livro.reserva_exame} faces previstas para exames · última posição ocupada ou reservada {t.ultima_posicao || '—'}.</p>
    </>}
    {livro.aberto_em && <p>Abertura efetivada em {new Date(livro.aberto_em).toLocaleString('pt-BR')}.</p>}
    {livro.encerrado_em && <p>Encerramento efetivado em {new Date(livro.encerrado_em).toLocaleString('pt-BR')}.</p>}
    {livro.motivo_encerramento && <p>Motivo do encerramento · {livro.motivo_encerramento}</p>}
    {livro.data_historica && <p>Encerramento físico declarado em {livro.data_historica.slice(0, 10)}.</p>}
    {livro.arquivo_historico_id && <a className="underline" href={secretariaApi.arquivoLivroUrl(livro.id, 'historico')}>Baixar acervo digitalizado</a>}
    {livro.manifesto_sha256 && <div className="flex flex-wrap gap-3">
      <a className="underline" href={secretariaApi.arquivoLivroUrl(livro.id, 'manifesto')}>Baixar manifesto de fechamento</a>
      <a className="underline" href={secretariaApi.arquivoLivroUrl(livro.id, 'compilacao')}>Baixar compilação para leitura</a>
      <span className="break-all text-xs">SHA-256 do manifesto · {livro.manifesto_sha256}</span>
    </div>}
    {(finalidade || livro.termos.length > 0) && <div className="space-y-2">
      <h4 className="font-semibold">Termos</h4>
      {finalidade && <p>O termo precisa ser assinado e expedido para efetivar {finalidade === 'TERMO_ABERTURA' ? 'a abertura' : 'o encerramento'}.</p>}
      {contexto.pode_preparar && finalidade && !termoAtivo && <Button onClick={() => novoTermo({ livro, finalidade })}>{finalidade === 'TERMO_ABERTURA' ? 'Preparar termo de abertura' : 'Preparar termo de encerramento'}</Button>}
      {livro.termos.map(t => <div key={t.id} className="flex flex-wrap items-center gap-2"><span>{t.assunto} · v{t.numero} · {t.documento.estado.toLowerCase().replace(/_/g, ' ')}</span><Button variant="outline" onClick={() => abrirDocumento(t.documento.id)}>Abrir termo</Button></div>)}
    </div>}
    {livro.registros.length > 0 && <div className="space-y-2">
      <h4 className="font-semibold">Registros e reservas</h4>
      {livro.registros.map(r => <article key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded border p-3">
        <div><p className="font-medium">{r.ordem}. {naturezas[r.natureza]} · {r.versao.assunto} · v{r.versao.numero}</p>
          <p>{estadoRegistro[r.estado]} · folha {r.inicio.folha}, {r.inicio.face.toLowerCase()}{r.posicao_inicio !== r.posicao_fim && ` até folha ${r.fim.folha}, ${r.fim.face.toLowerCase()}`} · {r.numero_visivel_inicio == null ? 'Termo sem número de página' : `Numeração visível ${r.numero_visivel_inicio}${r.posicao_inicio === r.posicao_fim ? '' : ` a ${r.numero_visivel_inicio + r.posicao_fim - r.posicao_inicio}`}`}</p></div>
        <div className="flex flex-wrap items-center gap-2">
          {r.arquivo && <a className="underline" href={secretariaApi.arquivoRegistroUrl(livro.id, r.id)}>Baixar original</a>}
          <Button variant="outline" onClick={() => abrirDocumento(r.versao.documento_id)}>Abrir documento</Button>
        </div>
      </article>)}
    </div>}
    {!!livro.atas_legadas?.length && <div className="space-y-2">
      <h4 className="font-semibold">Atas legadas vinculadas</h4>
      {livro.atas_legadas.map(ata => <article key={ata.documento_id} className="flex flex-wrap items-center justify-between gap-2 rounded border p-3">
        <div><p className="font-medium">{ata.numero_original ? `Ata nº ${ata.numero_original} · ` : ''}{ata.assunto}</p>
          <p>{ata.data_documento.slice(0, 10)}{ata.folhas_legadas && ` · Folhas ${ata.folhas_legadas}`}</p></div>
        <Button variant="outline" onClick={() => abrirDocumento(ata.documento_id)}>Abrir ata</Button>
      </article>)}
    </div>}
    {livro.complementos.length > 0 && <div className="space-y-2">
      <h4 className="font-semibold">Atos complementares</h4>
      {livro.complementos.map(c => <div key={c.versao_id} className="flex flex-wrap items-center gap-2"><span>{c.versao.assunto} · v{c.versao.numero} · {c.versao.documento.estado.toLowerCase().replace(/_/g, ' ')}</span><Button variant="outline" onClick={() => abrirDocumento(c.versao.documento_id)}>Abrir complemento</Button></div>)}
    </div>}
    {contexto.pode_aprovar && <ComandosLivro key={livro.revisao} livro={livro} identidade={identidade} />}
    {livro.eventos.length > 0 && <details className="space-y-2"><summary className="cursor-pointer font-semibold">Histórico do livro</summary>{livro.eventos.map(evento => <article key={evento.id} className="rounded border p-2">
      <p>{evento.tipo.toLowerCase().replace(/[_-]/g, ' ')} · {new Date(evento.criado_em).toLocaleString('pt-BR')} · {evento.retrato.nome}</p>
      <p>{evento.motivo} · {evento.autoridade} · {evento.evidencia}</p>
    </article>)}</details>}
  </section>
}

function ComandosLivro({ livro, identidade }: { livro: LivroDetalhe; identidade: string }) {
  const opcoes: (AcaoLivro | 'complementar')[] = livro.estado === 'ABERTO' ? ['suspender', 'preparar-encerramento']
    : livro.estado === 'SUSPENSO' ? ['retomar', 'preparar-encerramento']
      : livro.estado === 'EM_ENCERRAMENTO' ? ['desistir-encerramento'] : livro.estado === 'ENCERRADO' ? ['complementar'] : []
  const [acao, setAcao] = useState(''), [autoridade, setAutoridade] = useState(''), [motivo, setMotivo] = useState(''), [evidencia, setEvidencia] = useState('')
  const [versao, setVersao] = useState(''), [pagina, setPagina] = useState(0)
  const candidatos = useQuery({
    queryKey: ['secretaria', identidade, 'candidatos-complemento', livro.id, pagina],
    queryFn: () => secretariaApi.candidatosComplemento(livro.id, pagina),
    enabled: acao === 'complementar', gcTime: 0,
  })
  const enviar = useComando((d: { revisao: number; autoridade: string; motivo: string; evidencia: string; versao_id?: string }) => acao === 'complementar'
    ? secretariaApi.complementarLivro(livro.id, d) : secretariaApi.acaoLivro(livro.id, acao as AcaoLivro, d), () => setAcao(''), acao)
  if (!opcoes.length) return null
  return <form className="space-y-3 rounded border p-3" onSubmit={e => {
    e.preventDefault(); enviar.mutate({ revisao: livro.revisao, autoridade, motivo, evidencia, ...(acao === 'complementar' ? { versao_id: versao } : {}) })
  }}>
    <Escolha label="Ação do livro" value={acao} onChange={setAcao}><option value="">Selecione uma ação</option>{opcoes.map(opcao => <option key={opcao} value={opcao}>{opcao === 'complementar' ? 'Vincular exame ou retificação' : nomesAcoes[opcao]}</option>)}</Escolha>
    {acao && <>
      {acao === 'desistir-encerramento' && <p>O termo de encerramento pendente será cancelado e preservado no histórico.</p>}
      {acao === 'complementar' && <div className="space-y-2"><Escolha label="Versão do documento complementar" value={versao} onChange={setVersao}>
        <option value="">Selecione uma versão aprovada ou expedida</option>
        {candidatos.data?.map(v => <option key={v.id} value={v.id}>{v.assunto} · v{v.numero}</option>)}
      </Escolha>
        {candidatos.isError && <p role="alert">{candidatos.error.message}</p>}
        {candidatos.data?.length === 0 && <p>Nenhum documento complementar aprovado nesta página.</p>}
        {(pagina > 0 || candidatos.data?.length === 30) && <div className="flex gap-2">
          <Button type="button" variant="outline" disabled={pagina === 0} onClick={() => { setPagina(pagina - 1); setVersao('') }}>Anteriores</Button>
          <Button type="button" variant="outline" disabled={candidatos.data?.length !== 30} onClick={() => { setPagina(pagina + 1); setVersao('') }}>Próximos</Button>
        </div>}
      </div>}
      <Campo label="Autoridade da ação" value={autoridade} onChange={setAutoridade} />
      <Area label="Motivo" value={motivo} onChange={setMotivo} />
      <Area label="Evidência e referência institucional" value={evidencia} onChange={setEvidencia} />
      <Salvar pending={enviar.isPending} error={enviar.error} success={enviar.isSuccess} label="Registrar ação" />
    </>}
  </form>
}
