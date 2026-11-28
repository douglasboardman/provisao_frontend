import { useRef, type MouseEventHandler, type ReactNode } from 'react'
import { Portal as TooltipPortal } from '@radix-ui/react-tooltip'
import { useQuery } from '@tanstack/react-query'
import { Eye, FileText, Pencil, type LucideIcon } from 'lucide-react'
import { useSearchParams } from 'react-router'
import { AlternarConteudo, dataCivil } from '../../components/shared/Workspace'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip'
import { estadosDocumento, numeroDocumento, secretariaApi, type ContextoSecretaria, type ModeloDocumento } from '../../api/secretaria'
import { useAbrirEditor } from './editor/navegacao'
import { FichaDocumento } from './FichaDocumento'

const tipos = [{ id: 'ATA', nome: 'Atas' }, { id: 'OUTRO', nome: 'Outros documentos' }] as const
const situacoes = { ...estadosDocumento, ENCAMINHADO: 'Encaminhado' }
const filtrosComuns = ['busca', 'modelo', 'de', 'ate'] as const
const opcoesSituacao = [
  ['EXPEDIDO', 'Expedidos'],
  ['andamento', 'Em andamento'],
  ...Object.entries(situacoes).filter(([id]) => id !== 'EXPEDIDO'),
]

function AcaoDocumento({ rotulo, icone: Icone, onClick }: {
  rotulo: string; icone: LucideIcon; onClick: MouseEventHandler<HTMLButtonElement>
}) {
  return <Tooltip>
    <TooltipTrigger asChild>
      <Button type="button" size="icon" variant="ghost" aria-label={rotulo} onClick={onClick}>
        <Icone aria-hidden="true" />
      </Button>
    </TooltipTrigger>
    <TooltipPortal><TooltipContent>{rotulo}</TooltipContent></TooltipPortal>
  </Tooltip>
}

export function ListaDocumentos({ contexto, identidade, modelos, abrir, acoes }: {
  contexto: ContextoSecretaria; identidade: string; modelos: ModeloDocumento[]; abrir: (id: string, editar?: boolean) => void; acoes?: ReactNode
}) {
  const [url, navegar] = useSearchParams()
  const abrirEditor = useAbrirEditor(contexto.id)
  const ficha = url.get('ficha')
  const mostrarFicha = (id: string) => navegar(anterior => {
    const busca = new URLSearchParams(anterior)
    if (id) busca.set('ficha', id)
    else busca.delete('ficha')
    return busca
  }, { replace: true })
  const origem = useRef<HTMLElement | null>(null)
  const tipo = !contexto.somente_atas && url.get('tipo') === 'OUTRO' ? 'OUTRO' : 'ATA'
  const visaoAnterior = url.get('visao')
  const estadoSolicitado = url.get('estado') ?? (visaoAnterior === 'andamento' ? 'andamento' : visaoAnterior === 'expedidos' ? 'EXPEDIDO' : '')
  const estados = opcoesSituacao.filter(([id]) => tipo === 'ATA' || id !== 'LEGADA_CONFERIDA')
  const estado = estados.some(([id]) => id === estadoSolicitado) ? estadoSolicitado : ''
  const n = Number(url.get('pagina'))
  const pagina = Number.isInteger(n) && n >= 0 && n <= 100000 ? n : 0
  const filtros = new URLSearchParams({ contexto: contexto.id, tipo, visao: estado === 'andamento' ? 'andamento' : 'todos', pagina: String(pagina) })
  for (const chave of filtrosComuns) if (url.get(chave)) filtros.set(chave, url.get(chave)!)
  if (estado && estado !== 'andamento') filtros.set('estado', estado)
  const consulta = useQuery({ queryKey: ['secretaria', identidade, 'consulta-documentos', filtros.toString()],
    queryFn: () => secretariaApi.consultarDocumentos(filtros), gcTime: 0, retry: false })
  function alterar(valores: Record<string, string>) {
    const proxima = new URLSearchParams(url)
    proxima.set('contexto', contexto.id)
    proxima.delete('pagina')
    for (const [chave, valor] of Object.entries(valores)) {
      if (valor) proxima.set(chave, valor)
      else proxima.delete(chave)
    }
    navegar(proxima)
  }
  return <>
    <form className="surface grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-3 min-[85rem]:grid-cols-[minmax(10rem,1.5fr)_minmax(10rem,1fr)_minmax(10.5rem,1fr)_repeat(2,minmax(8.75rem,1fr))_auto]" aria-label="Filtros de documentos" onSubmit={e => {
      e.preventDefault()
      const dados = new FormData(e.currentTarget)
      const valores = Object.fromEntries([...filtrosComuns, 'estado'].map(k => [k, String(dados.get(k) ?? '').trim()]))
      alterar({ ...valores, visao: '' })
    }}>
      <label className="grid gap-1 text-sm">Número ou assunto<Input key={url.get('busca')} name="busca" maxLength={255} defaultValue={url.get('busca') ?? ''}/></label>
      {!contexto.somente_atas && <label className="grid gap-1 text-sm">Modelo<select className="h-10 min-w-0 rounded-lg border border-input bg-card px-2" key={String(!!modelos.length) + url.get('modelo')} name="modelo" defaultValue={url.get('modelo') ?? ''}><option value="">Todos os modelos</option>{modelos.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}</select></label>}
      <label className="grid gap-1 text-sm">Situação<select className="h-10 min-w-0 rounded-lg border border-input bg-card px-2" key={estado} name="estado" defaultValue={estado}><option value="">Todas as situações</option>{estados.map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}</select></label>
      <label className="grid gap-1 text-sm">Data inicial<Input type="date" className="min-w-0" key={url.get('de')} name="de" defaultValue={url.get('de') ?? ''}/></label>
      <label className="grid gap-1 text-sm">Data final<Input type="date" className="min-w-0" key={url.get('ate')} name="ate" defaultValue={url.get('ate') ?? ''}/></label>
      <Button type="submit" variant="outline">Pesquisar</Button>
    </form>
    <div className="flex flex-wrap items-center justify-between gap-3">
      {!contexto.somente_atas && <AlternarConteudo titulo="Tipo de documento" ativa={tipo} opcoes={tipos}
        selecionar={id => {
          if (id !== tipo) alterar({ tipo: id, visao: '', estado: id === 'OUTRO' && estado === 'LEGADA_CONFERIDA' ? '' : estado })
        }} />}
      {acoes}
    </div>
    <div className="space-y-2">
      {consulta.isPending && <p role="status">Consultando documentos…</p>}
      {consulta.error && <p role="alert">{consulta.error.message} <Button variant="outline" onClick={() => void consulta.refetch()}>Tentar novamente</Button></p>}
      {consulta.data?.itens.length === 0 && <p>Nenhum documento encontrado.</p>}
      {!!consulta.data?.itens.length && <TooltipProvider delayDuration={300}>
        <div className="overflow-x-auto rounded-panel border border-border bg-card shadow-sm">
          <table className="record-table" aria-label={tipo === 'ATA' ? 'Atas do contexto' : 'Outros documentos do contexto'}>
            <thead><tr>
              {['Número', 'Data', 'Tipo', 'Modelo', 'Assunto', 'Situação', 'Ações'].map(t => (
                <th key={t} scope="col" aria-sort={t === 'Data' ? 'descending' : undefined}>{t}</th>
              ))}
            </tr></thead>
            <tbody>
              {consulta.data.itens.map(d => <tr key={d.id}>
                <td data-label="Número">{numeroDocumento(d)}</td>
                <td data-label="Data">{dataCivil(d.versoes[0]?.data_documento)}</td>
                <td data-label="Tipo">{d.tipo === 'ATA' ? 'Ata' : 'Outro'}</td>
                <td data-label="Modelo">{d.modelo_nome ?? '—'}</td>
                <td data-label="Assunto">{d.versoes[0]?.assunto} {d.restrito && <small>Restrito</small>}</td>
                <td data-label="Situação">{d.estado === 'EM_EDICAO' && d.encaminhado_em ? situacoes.ENCAMINHADO : estadosDocumento[d.estado]}</td>
                <td data-label="Ações">
                  <div className="flex w-max items-center gap-1">
                    <AcaoDocumento rotulo="Visualizar ficha" icone={Eye} onClick={e => {
                      origem.current = e.currentTarget
                      mostrarFicha(d.id)
                    }} />
                    <AcaoDocumento rotulo="Abrir documento" icone={FileText} onClick={() => abrir(d.id)} />
                    {contexto.pode_preparar && d.estado === 'EM_EDICAO' &&
                      <AcaoDocumento rotulo="Retomar edição" icone={Pencil} onClick={() => abrir(d.id, true)} />}
                  </div>
                </td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </TooltipProvider>}
      <nav aria-label="Paginação de documentos" className="flex flex-wrap items-center justify-end gap-2 px-1 text-sm text-muted-foreground">
        <Button size="sm" variant="outline" disabled={!pagina} onClick={() => alterar({ pagina: String(pagina - 1) })}>Anterior</Button>
        <span aria-current="page">Página {pagina + 1}</span>
        <Button size="sm" variant="outline" disabled={!consulta.data?.tem_proxima} onClick={() => alterar({ pagina: String(pagina + 1) })}>Próxima</Button>
      </nav>
    </div>
    {ficha && <FichaDocumento id={ficha} contexto={contexto} abrirPrevia={contexto.somente_atas ? undefined : versao => abrirEditor('documentos', ficha, { versao })} identidade={identidade} fechar={() => mostrarFicha('')} origem={origem.current}/>}
  </>
}
