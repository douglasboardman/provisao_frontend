import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiRequestError } from '../../api/client'
import { referenciasAtaApi, situacoesAta, type AlvoAta, type AtaOpcao, type EntradaReferencia } from '../../api/referencias-ata'
import { formatarDataCivil } from '../../lib/membresia-temporal'
import { Button } from '../ui/button'
import { Input } from '../ui/input'

const selectClass = 'block w-full rounded border bg-background p-2'
const numero = (ata: AtaOpcao) => ata.numero_formatado || (ata.numero == null ? 'Sem número' : `${String(ata.numero).padStart(3, '0')}/${ata.ano}/${ata.sigla}`)
const identificacao = (ata: AtaOpcao) => `${numero(ata)} · ${formatarDataCivil(ata.data)} · ${ata.contexto} · versão ${ata.versao}`

export function PaginacaoAta({ pagina, mudar, proxima }: { pagina: number; mudar: (n: number) => void; proxima?: boolean }) {
  if (!pagina && !proxima) return null
  return <div className="flex items-center gap-2">
    <Button type="button" variant="outline" disabled={!pagina} onClick={() => mudar(pagina - 1)}>Anterior</Button>
    <span>Página {pagina + 1}</span>
    <Button type="button" variant="outline" disabled={!proxima} onClick={() => mudar(pagina + 1)}>Próxima</Button>
  </div>
}

export function ReferenciaAta({ alvo, identidade, label = 'Ata e documentação' }: { alvo: AlvoAta; identidade: string; label?: string }) {
  const [aberto, setAberto] = useState(false)
  return <div className="mt-2 space-y-2 text-sm">
    <Button type="button" variant="outline" aria-expanded={aberto} onClick={() => setAberto(!aberto)}>{label}</Button>
    {aberto && <PainelReferencia alvo={alvo} identidade={identidade} />}
  </div>
}

function PainelReferencia({ alvo, identidade }: { alvo: AlvoAta; identidade: string }) {
  const [pagina, setPagina] = useState(0)
  const [editar, setEditar] = useState(false)
  const client = useQueryClient()
  const chave = ['referencias-ata', identidade]
  const consulta = useQuery({ queryKey: [...chave, 'historico', alvo, pagina], queryFn: () => referenciasAtaApi.consultar(alvo, pagina), gcTime: 0, retry: false })
  const salvar = useMutation({
    mutationFn: (dados: EntradaReferencia) => referenciasAtaApi.registrar(alvo, dados),
    onSuccess: async () => { setEditar(false); setPagina(0); await client.invalidateQueries({ queryKey: chave }) },
  })
  const atual = pagina === 0 ? consulta.data?.itens[0] : undefined
  return <div className="space-y-3 rounded border p-3">
    {consulta.isPending && <p>Carregando documentação…</p>}
    {consulta.isError && <p role="alert">Não foi possível consultar a documentação. <Button type="button" variant="outline" onClick={() => void consulta.refetch()}>Tentar novamente</Button></p>}
    {consulta.data?.situacao && <p className="font-medium" role="status">{situacoesAta[consulta.data.situacao]}</p>}
    {consulta.data && <p className="text-muted-foreground">Confira no acervo se o ato consta no texto da ata. O vínculo identifica a referência informada.</p>}
    {consulta.data?.itens.map(r => <article key={r.id} className="space-y-1 border-l pl-3">
      <p>{situacoesAta[r.situacao]} · {r.operador} · {new Date(r.criado_em).toLocaleString('pt-BR')}</p>
      {r.ata && <p>{identificacao(r.ata)}</p>}
      {r.referencia_externa && <p>{[r.referencia_externa.origem, r.referencia_externa.concilio, r.referencia_externa.identificacao, formatarDataCivil(r.referencia_externa.data), r.referencia_externa.livro && `Livro ${r.referencia_externa.livro}`, r.referencia_externa.paginas && `Páginas ${r.referencia_externa.paginas}`, r.referencia_externa.localizacao].filter(Boolean).join(' · ')}</p>}
      <p className="whitespace-pre-wrap">{r.justificativa}</p>
    </article>)}
    <PaginacaoAta pagina={pagina} mudar={n => { setPagina(n); setEditar(false) }} proxima={consulta.data?.tem_proxima} />
    {pagina === 0 && consulta.data?.pode_editar && <Button type="button" variant="outline" onClick={() => { setEditar(!editar); salvar.reset() }}>{editar ? 'Fechar formulário' : atual ? 'Corrigir referência' : 'Registrar referência'}</Button>}
    {editar && consulta.data?.pode_editar && <FormularioReferencia alvo={alvo} identidade={identidade} revisao={atual?.id ?? null} enviar={salvar.mutate} pendente={salvar.isPending} />}
    {salvar.isError && <p role="alert">{salvar.error instanceof ApiRequestError ? salvar.error.message : 'Não foi possível salvar a referência.'} <Button type="button" variant="outline" onClick={() => { salvar.reset(); void consulta.refetch() }}>Recarregar</Button></p>}
    {salvar.isSuccess && <p role="status">Referência registrada.</p>}
  </div>
}

function FormularioReferencia({ alvo, identidade, revisao, enviar, pendente }: {
  alvo: AlvoAta; identidade: string; revisao: string | null; enviar: (dados: EntradaReferencia) => void; pendente: boolean
}) {
  const [modo, setModo] = useState('local')
  const [filtros, setFiltros] = useState<Record<string, string>>({})
  const [pagina, setPagina] = useState(0)
  const [versao, setVersao] = useState('')
  const busca = useQuery({
    queryKey: ['referencias-ata', identidade, 'atas', alvo, filtros, pagina],
    queryFn: () => referenciasAtaApi.buscar(alvo, { ...filtros, pagina: String(pagina) }),
    enabled: modo === 'local', gcTime: 0,
  })
  const ata = busca.data?.itens.find(item => item.versao_id === versao)
  function salvar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const campos = new FormData(e.currentTarget)
    const t = (nome: string) => String(campos.get(nome) ?? '').trim()
    const dados: EntradaReferencia = { justificativa: t('justificativa'), revisao_esperada: revisao }
    if (modo === 'local') {
      if (!ata) return
      dados.ata_documento_id = ata.documento_id
      dados.versao_id = ata.versao_id
    } else if (modo === 'externa') {
      if (!campos.has('conferida')) return
      dados.referencia_externa = {
        concilio: t('concilio'), identificacao: t('identificacao'), data: t('dataExterna'), localizacao: t('localizacao'),
        origem: t('origem') || undefined, livro: t('livro') || undefined, paginas: t('paginas') || undefined, conferida: true,
      }
    }
    enviar(dados)
  }
  return <div className="space-y-3">
    <label className="block">Fonte documental
      <select className={selectClass} value={modo} onChange={e => { setModo(e.target.value); setVersao('') }}>
        <option value="local">Ata da igreja</option><option value="externa">Acervo externo</option><option value="pendente">Pendente</option>
      </select>
    </label>
    {modo === 'local' && <form className="space-y-2" onSubmit={e => {
      e.preventDefault()
      const campos = new FormData(e.currentTarget)
      setFiltros(Object.fromEntries([...campos].map(([k, v]) => [k, String(v).trim()]).filter(([, v]) => v)))
      setPagina(0)
      setVersao('')
    }}>
      <div className="grid gap-2 md:grid-cols-3">
        <label>Órgão<select name="contexto" className={selectClass}><option value="">Todos os compatíveis</option>{busca.data?.contextos.map(c => <option key={c.id} value={c.id}>{c.nome} ({c.sigla})</option>)}</select></label>
        <label>Número<Input name="numero" placeholder="012/2026/CON" maxLength={56} /></label>
        <label>Data da ata<Input name="data" type="date" /></label>
      </div>
      <Button type="submit" variant="outline">Buscar atas</Button>
    </form>}
    <form className="space-y-2" onSubmit={salvar}>
      {modo === 'local' && <>
        {busca.isPending && <p>Buscando atas…</p>}
        {busca.isError && <p role="alert">{busca.error instanceof ApiRequestError ? busca.error.message : 'Não foi possível buscar atas.'}</p>}
        {busca.data && !busca.data.itens.length && <p>Nenhuma ata encontrada.</p>}
        <label className="block">Ata<select value={versao} onChange={e => setVersao(e.target.value)} required className={selectClass}>
          <option value="">Selecione uma ata</option>
          {busca.data?.itens.map(opcao => <option key={opcao.versao_id} value={opcao.versao_id}>{identificacao(opcao)} · {opcao.assunto} · {opcao.estado === 'EXPEDIDO' ? 'Expedida' : 'Provisória'}</option>)}
        </select></label>
        <PaginacaoAta pagina={pagina} mudar={n => { setPagina(n); setVersao('') }} proxima={busca.data?.tem_proxima} />
      </>}
      {modo === 'externa' && <div className="grid gap-2 md:grid-cols-2">
        <label>Concílio ou órgão<Input name="concilio" maxLength={255} required /></label>
        <label>Número ou identificação<Input name="identificacao" maxLength={255} required /></label>
        <label>Data<Input name="dataExterna" type="date" required /></label>
        <label>Localização no acervo<Input name="localizacao" maxLength={1000} required /></label>
        <label>Origem<Input name="origem" maxLength={255} /></label>
        <label>Livro<Input name="livro" maxLength={80} /></label>
        <label>Páginas<Input name="paginas" maxLength={80} /></label>
        <label className="self-end"><input name="conferida" type="checkbox" required /> Conferi a referência no acervo externo.</label>
      </div>}
      <label className="block">Justificativa da inclusão ou correção<Input name="justificativa" required maxLength={1000} /></label>
      <Button type="submit" disabled={pendente || (modo === 'local' && !ata)}>Salvar referência</Button>
    </form>
  </div>
}
