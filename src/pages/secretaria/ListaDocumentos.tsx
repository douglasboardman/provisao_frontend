import { useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router'
import { dataCivil } from '../../components/shared/Workspace'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { estadosDocumento, numeroDocumento, secretariaApi, type ContextoSecretaria, type ModeloDocumento } from '../../api/secretaria'
import { useAbrirEditor } from './editor/navegacao'
import { FichaDocumento } from './FichaDocumento'

const visoes = { expedidos: 'Expedidos', andamento: 'Em andamento', todos: 'Todos' }
const situacoes = { ...estadosDocumento, ENCAMINHADO: 'Encaminhado' }
const chaves = ['busca', 'modelo', 'de', 'ate', 'estado'] as const

export function ListaDocumentos({ contexto, identidade, modelos, abrir }: {
  contexto: ContextoSecretaria; identidade: string; modelos: ModeloDocumento[]; abrir: (id: string, editar?: boolean) => void
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
  const visao = url.get('visao') === 'todos' ? 'todos' : url.get('visao') === 'andamento' ? 'andamento' : 'expedidos'
  const n = Number(url.get('pagina'))
  const pagina = Number.isInteger(n) && n >= 0 && n <= 100000 ? n : 0
  const filtros = new URLSearchParams({ contexto: contexto.id, visao, pagina: String(pagina) })
  for (const chave of chaves) if (url.get(chave)) filtros.set(chave, url.get(chave)!)
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
  const estados = visao === 'todos' ? Object.keys(situacoes) : visao === 'andamento' ? ['EM_EDICAO', 'ENCAMINHADO', 'APROVADO'] : ['EXPEDIDO']
  return <>
    <div className="flex flex-wrap gap-2" role="group" aria-label="Visão dos documentos">{Object.entries(visoes).map(([id, nome]) =>
      <Button key={id} aria-pressed={id === visao} variant={id === visao ? 'default' : 'outline'} onClick={() => alterar({ visao: id, estado: '' })}>{nome}</Button>)}</div>
    <form className="grid items-end gap-3 md:grid-cols-3" onSubmit={e => {
      e.preventDefault()
      const dados = new FormData(e.currentTarget)
      alterar(Object.fromEntries(chaves.map(k => [k, String(dados.get(k) ?? '').trim()])))
    }}>
      <label className="grid gap-1 text-sm">Número ou assunto<Input key={url.get('busca')} name="busca" maxLength={255} defaultValue={url.get('busca') ?? ''}/></label>
      <label className="grid gap-1 text-sm">Modelo<select className="h-10 rounded border px-2" key={String(!!modelos.length) + url.get('modelo')} name="modelo" defaultValue={url.get('modelo') ?? ''}><option value="">Todos os modelos</option>{modelos.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}</select></label>
      <label className="grid gap-1 text-sm">Situação<select className="h-10 rounded border px-2" key={visao + url.get('estado')} name="estado" defaultValue={url.get('estado') ?? ''}><option value="">Todas as situações</option>{estados.map(k => <option key={k} value={k}>{situacoes[k as keyof typeof situacoes]}</option>)}</select></label>
      <label className="grid gap-1 text-sm">Data inicial<Input type="date" key={url.get('de')} name="de" defaultValue={url.get('de') ?? ''}/></label>
      <label className="grid gap-1 text-sm">Data final<Input type="date" key={url.get('ate')} name="ate" defaultValue={url.get('ate') ?? ''}/></label>
      <Button type="submit" variant="outline">Pesquisar</Button>
    </form>
    {consulta.isPending && <p role="status">Consultando documentos…</p>}
    {consulta.error && <p role="alert">{consulta.error.message} <Button variant="outline" onClick={() => void consulta.refetch()}>Tentar novamente</Button></p>}
    {consulta.data?.itens.length === 0 && <p>Nenhum documento encontrado.</p>}
    {!!consulta.data?.itens.length && <div className="overflow-x-auto rounded-xl border bg-white"><table className="record-table"><thead><tr>{['Número','Data','Tipo','Modelo','Assunto','Situação','Ações'].map(t => <th key={t} scope="col" aria-sort={t === 'Data' ? 'descending' : undefined}>{t}</th>)}</tr></thead><tbody>
      {consulta.data.itens.map(d => <tr key={d.id}><td data-label="Número">{numeroDocumento(d)}</td><td data-label="Data">{dataCivil(d.versoes[0]?.data_documento)}</td>
        <td data-label="Tipo">{d.tipo === 'ATA' ? 'Ata' : 'Outro'}</td><td data-label="Modelo">{d.modelo_nome ?? '—'}</td>
        <td data-label="Assunto">{d.versoes[0]?.assunto} {d.restrito && <small>Restrito</small>}</td><td data-label="Situação">{d.estado === 'EM_EDICAO' && d.encaminhado_em ? situacoes.ENCAMINHADO : estadosDocumento[d.estado]}</td>
        <td data-label="Ações"><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={e => { origem.current = e.currentTarget; mostrarFicha(d.id) }}>Visualizar ficha</Button>
          <Button size="sm" variant="outline" onClick={() => abrir(d.id)}>Abrir documento</Button>
          {contexto.pode_preparar && d.estado === 'EM_EDICAO' && <Button size="sm" onClick={() => abrir(d.id, true)}>Retomar edição</Button>}</div></td></tr>)}
    </tbody></table></div>}
    {ficha && <FichaDocumento id={ficha} contextoId={contexto.id} abrirPrevia={versao => abrirEditor('documentos', ficha, { versao })} identidade={identidade} fechar={() => mostrarFicha('')} origem={origem.current}/>}
    <div className="flex items-center gap-2"><Button variant="outline" disabled={!pagina} onClick={() => alterar({ pagina: String(pagina - 1) })}>Anterior</Button>
      <span>Página {pagina + 1}</span><Button variant="outline" disabled={!consulta.data?.tem_proxima} onClick={() => alterar({ pagina: String(pagina + 1) })}>Próxima</Button></div>
  </>
}
