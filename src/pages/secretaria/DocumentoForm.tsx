import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '../../components/ui/button'
import { rotulosModalidadeReuniao, secretariaApi, numeroDocumento, finalidadeTermo, livrosHabilitados, nomeLivro, politicaLivro, type EstadoLivro, type ContextoSecretaria, type ModeloDocumento, type ReuniaoSecretaria, type DocumentoResumo, type DocumentoDetalhe, type VersaoInput } from '../../api/secretaria'
import { Area, Campo, CampoPapeis, Escolha, Check, Salvar, hoje, useComando } from './formulario'
import { Compositor } from './Compositor'
import type { NovoTermo } from './LivrosContexto'
import { EditarResolucoes, prepararResolucoes } from './ResolucoesDocumento'

const camposLivro = new Set(['NUMERO_LIVRO', 'CAPACIDADE_FOLHAS', 'TITULAR', 'SERIE_LIVRO', 'MODALIDADE_LIVRO'])
const camposEncerramento = new Set(['FOLHAS_UTILIZADAS', 'PAGINAS_UTILIZADAS', 'TOTAL_ATAS', 'SALDO_FOLHAS', 'SALDO_FACES', 'INTERVALO_REGISTROS', 'MOTIVO_ENCERRAMENTO'])
export function DocumentoForm({ contexto, documento, retificar = false, modelos, reunioes, documentos, pessoas, cargos, pronto, identidade, novoTermo }: {
  contexto: ContextoSecretaria; documento?: DocumentoDetalhe; identidade?: string; novoTermo?: NovoTermo; retificar?: boolean; modelos: ModeloDocumento[]; reunioes: ReuniaoSecretaria[]; documentos: DocumentoResumo[]; pessoas: { id: string; nome_completo: string }[]; cargos: { id: string; nome: string }[]; pronto: (id: string) => void
}) {
  const atual = documento?.versoes.find(v => v.numero === documento.versao_atual)
  const [v, set] = useState<VersaoInput>(atual ? { modelo_versao_id: atual.modelo_versao_id ?? '', livro_id: atual.livro_id, reuniao_id: atual.reuniao_id, motivador_id: atual.motivador_id, assunto: atual.assunto, data_documento: atual.data_documento.slice(0, 10), conteudo: atual.conteudo, resolucoes: prepararResolucoes(atual.resolucoes) } : { modelo_versao_id: '', ...(novoTermo ? { livro_id: novoTermo.livro.id } : {}), reuniao_id: null, motivador_id: null, assunto: novoTermo?.finalidade === 'TERMO_ABERTURA' ? 'Abertura do livro de atas' : novoTermo ? 'Encerramento do livro de atas' : '', data_documento: hoje(), conteudo: { teor: '', campos: {}, arrolados: [], anexos: [] } })
  const [restrito, setRestrito] = useState(documento?.restrito ?? novoTermo?.livro.restrito ?? false)
  const [pessoa, setPessoa] = useState(''), [autoridade, setAutoridade] = useState(''), [evidencia, setEvidencia] = useState('')
  const [upload, setUpload] = useState(false), [erroUpload, setErroUpload] = useState('')
  const todasVersoes = modelos.flatMap(m => m.versoes.map(r => ({ ...r, nome: m.nome })))
    .filter(m => novoTermo ? m.tipo === 'OUTRO' && m.finalidade === novoTermo.finalidade
      : atual?.modelo && finalidadeTermo(atual.modelo.finalidade) ? m.finalidade === atual.modelo.finalidade
        : m.id === atual?.modelo_versao_id || !finalidadeTermo(m.finalidade))
  const [paginaLivros, setPaginaLivros] = useState(0)
  const modelo = todasVersoes.find(m => m.id === v.modelo_versao_id)
  const politicaResolucoes = modelo?.configuracao.resolucoes ?? 'NAO_PERMITE'
  const resolucoes = v.resolucoes ?? []
  const reuniao = reunioes.find(r => r.id === v.reuniao_id)
  const participantes = new Map(reuniao?.dados.participantes.map(p => [p.pessoa_id, p]))
  const nomeArrolado = (id: string) => pessoas.find(p => p.id === id)?.nome_completo
    ?? atual?.arrolados.find(p => p.pessoa_id === id)?.retrato.nome ?? 'Pessoa'
  const pessoasResolucoes = v.conteudo.arrolados.map(p => {
    const participante = participantes.get(p.pessoa_id)
    const fundamento = !!p.fundamento.trim()
    const podePropor = modelo?.tipo === 'ATA'
      ? !!v.reuniao_id && (!reuniao || !!participante?.presente && (participante.pode_propor ?? fundamento))
      : fundamento
    return { id: p.pessoa_id, nome: nomeArrolado(p.pessoa_id), podePropor }
  })
  const termo = finalidadeTermo(modelo?.finalidade) ? modelo?.finalidade : undefined
  const campoAutomatico = (k: string) => !!termo && (camposLivro.has(k) || (termo === 'TERMO_ENCERRAMENTO' && camposEncerramento.has(k)))
  const politica = modelo ? politicaLivro(modelo.configuracao) : 'NAO_PERMITE'
  const escolherLivro = livrosHabilitados() && !novoTermo && !termo && politica !== 'NAO_PERMITE'
  const filtroLivros = { restrito, serie: modelo?.tipo === 'ATA' ? modelo.configuracao.perfil : undefined, estado: 'ABERTO' as EstadoLivro }
  const livros = useQuery({
    queryKey: ['secretaria', identidade, 'livros-para-documento', contexto.id, paginaLivros, filtroLivros],
    queryFn: () => secretariaApi.livros(contexto.id, paginaLivros, filtroLivros),
    enabled: escolherLivro, gcTime: 0,
  })
  const textos = v.conteudo.estrutura ? Object.values(v.conteudo.estrutura).flat().flatMap(b => b.tipo === 'TEXTO' ? [b.texto] : b.tipo === 'LISTA' ? b.itens : b.tipo === 'TABELA' ? b.linhas.flat() : []) : []
  const obrigatorios = new Set(modelo?.configuracao.campos_obrigatorios ?? [])
  const usados = [v.conteudo.teor, ...textos].flatMap(t => [...t.matchAll(/\{\{([^{}]*)\}\}/g)].map(m => m[1]))
  const campos = [...new Set([...obrigatorios, ...Object.keys(modelo?.configuracao.tipos_campos ?? {}), ...usados.filter(k => /^[A-Z][A-Z0-9_]{0,79}$/.test(k))])]
  const pendentes = [...new Set([...obrigatorios, ...usados])].filter(k => !campoAutomatico(k) && (!/^[A-Z][A-Z0-9_]{0,79}$/.test(k) || !v.conteudo.campos[k]?.trim()))
  const editar = <K extends keyof VersaoInput>(k: K, valor: VersaoInput[K]) => set(s => ({ ...s, [k]: valor }))
  const conteudo = <K extends keyof VersaoInput['conteudo']>(k: K, valor: VersaoInput['conteudo'][K]) => set(s => ({ ...s, conteudo: { ...s.conteudo, [k]: valor } }))
  const enviar = useComando((dados: { versao: VersaoInput }) => documento ? (retificar ? secretariaApi.comando(documento.id, 'retificar', { ...dados, revisao: documento.revisao, autoridade, evidencia }) : secretariaApi.editarDocumento(documento.id, { ...dados, revisao: documento.revisao })) : secretariaApi.criarDocumento({ ...dados, contexto_id: contexto.id, restrito }), r => pronto(r.id), `${documento?.id}:${documento?.revisao}:${contexto.id}:${retificar}:${restrito}:${autoridade}:${evidencia}`)
  async function anexar(file: File) {
    setUpload(true); setErroUpload('')
    try { const f = await secretariaApi.upload(file); set(s => ({ ...s, conteudo: { ...s.conteudo, anexos: [...s.conteudo.anexos, { arquivo_id: f.id, nome: file.name }] } })) }
    catch (error) { setErroUpload(error instanceof Error ? error.message : 'Falha ao enviar anexo.') }
    finally { setUpload(false) }
  }
  return <form className="space-y-4 rounded border p-4" onSubmit={e => { e.preventDefault(); if (!upload) enviar.mutate({ versao: escolherLivro || termo ? v : { ...v, livro_id: null } }) }}>
    <h3 className="font-semibold">{retificar ? 'Retificar documento' : documento ? 'Editar documento' : 'Novo documento'}</h3>
    {novoTermo && <p>{nomeLivro(novoTermo.livro)} · {novoTermo.livro.titular}</p>}
    {novoTermo && todasVersoes.length === 0 && <p role="status">Cadastre um modelo de termo para esta finalidade na aba Modelos antes de continuar.</p>}
    <Escolha label="Modelo e versão" value={v.modelo_versao_id} onChange={s => {
      const escolhido = todasVersoes.find(x => x.id === s)
      setPaginaLivros(0)
      set(atual => {
        const inicial = todasVersoes.find(x => x.id === atual.modelo_versao_id)?.configuracao.estrutura_padrao
        const substituirModelo = !documento && JSON.stringify(atual.conteudo.estrutura) === JSON.stringify(inicial)
        const estrutura = substituirModelo ? escolhido?.configuracao.estrutura_padrao : atual.conteudo.estrutura
        const arquivosAnteriores = Object.values(inicial ?? {}).flat().filter(b => b.tipo === 'IMAGEM').map(b => b.arquivo_id)
        const anexos = atual.conteudo.anexos.filter(a => !substituirModelo || !arquivosAnteriores.includes(a.arquivo_id))
        if (substituirModelo) {
          for (const bloco of Object.values(estrutura ?? {}).flat()) {
            if (bloco.tipo === 'IMAGEM' && !anexos.some(a => a.arquivo_id === bloco.arquivo_id)) anexos.push({ arquivo_id: bloco.arquivo_id, nome: bloco.descricao || 'Imagem do modelo' })
          }
        }
        return {
          ...atual, modelo_versao_id: s,
          livro_id: novoTermo || termo || escolhido?.configuracao.perfil === modelo?.configuracao.perfil ? atual.livro_id : null,
          reuniao_id: escolhido?.tipo === 'ATA' ? atual.reuniao_id : null,
          motivador_id: escolhido?.configuracao.motivador === 'NAO_PERMITE' ? null : atual.motivador_id,
          conteudo: { ...atual.conteudo, estrutura, anexos },
        }
      })
    }}><option value="">Selecione um modelo</option>{todasVersoes.map(m => <option key={m.id} value={m.id}>{m.nome} — v{m.numero}</option>)}</Escolha>
    {modelo?.tipo === 'ATA' && <Escolha label="Reunião da ata" value={v.reuniao_id ?? ''} onChange={s => editar('reuniao_id', s || null)}><option value="">Selecione a reunião</option>{v.reuniao_id && !reunioes.some(r => r.id === v.reuniao_id) && <option value={v.reuniao_id}>Reunião vinculada (histórico)</option>}{reunioes.map(r => <option key={r.id} value={r.id}>{r.data.slice(0, 10)} · {rotulosModalidadeReuniao[r.modalidade]} · {r.dados.local}</option>)}</Escolha>}
    <div className="grid gap-4 md:grid-cols-2"><Campo label="Assunto" value={v.assunto} onChange={s => editar('assunto', s)} /><Campo label="Data do documento" type="date" value={v.data_documento} onChange={s => editar('data_documento', s)} /></div>
    {!documento && !novoTermo && contexto.pode_consultar_restritos && <Check label="Documento restrito" checked={restrito} onChange={valor => { setRestrito(valor); editar('livro_id', null); setPaginaLivros(0) }} />}
    {escolherLivro && <div className="space-y-2">
      <Escolha label="Livro de registro" required={politica === 'OBRIGATORIO'} value={v.livro_id ?? ''} onChange={id => editar('livro_id', id || null)}>
        <option value="">{politica === 'OBRIGATORIO' ? 'Selecione um livro aberto' : 'Sem registro em livro'}</option>
        {v.livro_id && !livros.data?.some(item => item.id === v.livro_id) && <option value={v.livro_id}>Livro vinculado à versão</option>}
        {livros.data?.map(item => <option key={item.id} value={item.id}>{nomeLivro(item)} · {item.capacidade_folhas} folhas</option>)}
      </Escolha>
      {livros.isError && <p role="alert">{livros.error.message}</p>}
      {livros.data?.length === 0 && !v.livro_id && <p>Não há livro aberto compatível neste contexto.</p>}
      {(paginaLivros > 0 || livros.data?.length === 30) && <div className="flex gap-2">
        <Button type="button" variant="outline" disabled={paginaLivros === 0} onClick={() => setPaginaLivros(paginaLivros - 1)}>Livros anteriores</Button>
        <Button type="button" variant="outline" disabled={livros.data?.length !== 30} onClick={() => setPaginaLivros(paginaLivros + 1)}>Mais livros</Button>
      </div>}
    </div>}
    {termo && <p>Os dados do livro e os totais do termo são preenchidos pelo sistema ao salvar.</p>}
    {modelo?.configuracao.motivador !== 'NAO_PERMITE' && <Escolha label="Documento motivador" required={modelo?.configuracao.motivador === 'OBRIGATORIO'} value={v.motivador_id ?? ''} onChange={s => editar('motivador_id', s || null)}><option value="">Sem motivador</option>{v.motivador_id && !documentos.some(d => d.versoes.some(x => x.id === v.motivador_id)) && <option value={v.motivador_id}>Referência histórica preservada</option>}{documentos.filter(d => d.id !== documento?.id).flatMap(d => d.versoes.map(r => <option key={r.id} value={r.id}>{numeroDocumento(d)} · {r.assunto} · v{r.numero}</option>))}</Escolha>}
    {campos.filter(k => !campoAutomatico(k)).map(k => {
      const tipo = modelo?.configuracao.tipos_campos?.[k]
      const label = `Campo: ${k.toLowerCase().replace(/_/g, ' ')}`
      const valor = v.conteudo.campos[k] ?? ''
      const alterar = (s: string) => conteudo('campos', { ...v.conteudo.campos, [k]: s })
      if (tipo === 'SIM_NAO') return <Escolha key={k} label={label} required={false} value={valor} onChange={alterar}><option value="">A preencher</option><option value="SIM">Sim</option><option value="NAO">Não</option></Escolha>
      if (tipo === 'NUMERO') return <label key={k} className="grid gap-1 text-sm">{label}<input className="rounded border p-2" type="number" step="any" value={valor} onChange={e => alterar(e.target.value)} /></label>
      return <Campo key={k} label={label} required={false} type={tipo === 'DATA' ? 'date' : 'text'} value={valor} onChange={alterar} />
    })}
    {pendentes.length > 0 && <p className="text-sm">Preencha antes de encaminhar: {pendentes.join(', ')}.</p>}
    <Area label="Teor" value={v.conteudo.teor} onChange={s => conteudo('teor', s)} required={false} />
    {!v.conteudo.estrutura && <Button type="button" variant="outline" onClick={() => conteudo('estrutura', { cabecalho: [], corpo: [], rodape: [] })}>Adicionar compositor estruturado</Button>}
    {v.conteudo.estrutura && <Compositor valor={v.conteudo.estrutura} alterar={estrutura => conteudo('estrutura', estrutura)} anexos={v.conteudo.anexos} />}
    <fieldset className="space-y-3"><legend className="font-semibold">Arrolados, responsáveis e signatários</legend><p className="text-sm">Uma pessoa pode exercer vários papéis. Participar não implica assinar. Documente o fundamento de quem assina ou responde pelo documento.</p>
      <div className="flex items-end gap-2"><Escolha label="Adicionar arrolado" value={pessoa} onChange={setPessoa} required={false}><option value="">Selecione uma pessoa</option>{pessoas.filter(p => !v.conteudo.arrolados.some(r => r.pessoa_id === p.id)).map(p => <option key={p.id} value={p.id}>{p.nome_completo}</option>)}</Escolha><Button type="button" variant="outline" disabled={!pessoa} onClick={() => { conteudo('arrolados', [...v.conteudo.arrolados, { pessoa_id: pessoa, papeis: ['PARTICIPANTE'], cargo_id: null, cargos_ids: [], assina: false, obrigatorio: false, responsavel: false, fundamento: '' }]); setPessoa('') }}>Arrolar pessoa</Button></div>
      {v.conteudo.arrolados.map((p, i) => {
        const atualizar = (patch: Partial<typeof p>) => conteudo('arrolados', v.conteudo.arrolados.map((x, n) => n === i ? { ...x, ...patch } : x))
        const vinculado = resolucoes.some(r => r.proponentes_pessoas_ids.includes(p.pessoa_id) || r.dissidentes_pessoas_ids.includes(p.pessoa_id))
        return <div key={p.pessoa_id} className="space-y-3 rounded border p-3"><p className="font-medium">{nomeArrolado(p.pessoa_id)}</p><div className="grid gap-3 md:grid-cols-2"><CampoPapeis label="Papéis no documento (separados por vírgula)" value={p.papeis} onChange={s => atualizar({ papeis: s })} /><fieldset className="space-y-2"><legend>Cargos institucionais</legend>{!cargos.length && <p className="text-sm">Sem cargos configurados neste contexto.</p>}{cargos.map(c => <Check key={c.id} label={c.nome} checked={[...(p.cargo_id ? [p.cargo_id] : []), ...(p.cargos_ids ?? [])].includes(c.id)} onChange={b => atualizar({ cargo_id: null, cargos_ids: b ? [...new Set([...(p.cargo_id ? [p.cargo_id] : []), ...(p.cargos_ids ?? []), c.id])] : [...(p.cargo_id ? [p.cargo_id] : []), ...(p.cargos_ids ?? [])].filter(id => id !== c.id) })} />)}</fieldset></div><div className="flex flex-wrap gap-4"><Check label="Signatário" checked={p.assina} onChange={b => atualizar({ assina: b, obrigatorio: b && p.obrigatorio })} /><Check label="Assinatura obrigatória" checked={p.obrigatorio} onChange={b => atualizar({ obrigatorio: b, assina: b || p.assina })} /><Check label="Responsável pelo documento" checked={p.responsavel} onChange={b => atualizar({ responsavel: b })} /></div><Campo label="Fundamento do papel e da competência" required={p.assina || p.responsavel} value={p.fundamento} onChange={s => atualizar({ fundamento: s })} /><Button type="button" variant="outline" disabled={vinculado} onClick={() => conteudo('arrolados', v.conteudo.arrolados.filter((_, n) => n !== i))}>Remover arrolado</Button>{vinculado && <p className="text-sm text-muted-foreground">Retire os vínculos com resoluções para remover este arrolado.</p>}</div>
      })}
    </fieldset>
    {(politicaResolucoes !== 'NAO_PERMITE' || resolucoes.length > 0) && <EditarResolucoes
      valor={resolucoes} pessoas={pessoasResolucoes} permitido={politicaResolucoes !== 'NAO_PERMITE'}
      obrigatorio={politicaResolucoes === 'OBRIGATORIO'} alterar={r => editar('resolucoes', r)}
    />}
    <fieldset className="space-y-2"><legend className="font-semibold">Anexos privados</legend><label className="grid gap-1 text-sm">Enviar anexo (até 10 MB)<input type="file" disabled={upload} onChange={e => { const f = e.target.files?.[0]; if (f) void anexar(f); e.target.value = '' }} /></label>{upload && <p role="status">Enviando anexo…</p>}{erroUpload && <p role="alert">{erroUpload}</p>}{v.conteudo.anexos.map((f, i) => <div className="flex items-center gap-3" key={f.arquivo_id}><span>{f.nome}</span><Button type="button" variant="outline" onClick={() => conteudo('anexos', v.conteudo.anexos.filter((_, n) => n !== i))}>Retirar anexo</Button></div>)}</fieldset>
    {retificar && <><Campo label="Autoridade da retificação" value={autoridade} onChange={setAutoridade} /><Area label="Fundamento e evidência da retificação" value={evidencia} onChange={setEvidencia} /><p>A versão anterior permanece preservada. Documento já expedido gera um novo ato.</p></>}
    <Salvar pending={enviar.isPending || upload} disabled={!!novoTermo && todasVersoes.length === 0} error={enviar.error} success={enviar.isSuccess} label={retificar ? 'Criar retificação' : 'Salvar documento'} />
  </form>
}
