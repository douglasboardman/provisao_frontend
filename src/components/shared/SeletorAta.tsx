import { Fragment, useId, useRef, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Check, ChevronDown, Files, Search } from 'lucide-react'
import { resultadosResolucao } from '../../api/secretaria'
import type { BuscaAtaOpcao, PaginaSelecao } from '../../api/referencias-ata'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '../ui/dialog'
import { Input } from '../ui/input'

type Props = {
  label: string
  valor: string
  chave: readonly unknown[]
  buscar: (filtros: Record<string, string>) => Promise<PaginaSelecao>
  selecionar: (ata: BuscaAtaOpcao) => void
  limpar?: () => void
  documento?: boolean
  contextoInicial?: string
}
export const descreverAta = (a: BuscaAtaOpcao) =>
  [
    a.numero_formatado || 'Sem número',
    a.data.slice(0, 10).split('-').reverse().join('/'),
    a.reconvocacao ? 'Reconvocação · ' + a.assunto : a.assunto,
    'v' + a.versao,
  ].join(' · ')

export function SeletorAta(props: Props) {
  const [aberto, abrir] = useState(false)
  const id = useId()
  const gatilho = useRef<HTMLButtonElement>(null)
  return (
    <div className="grid min-w-0 gap-1 text-sm">
      <label htmlFor={id}>{props.label}</label>
      <div className="flex min-w-0 flex-wrap gap-2">
        <Input
          id={id}
          className="min-w-32 flex-1 bg-muted/40"
          readOnly
          value={props.valor}
          title={props.valor}
          placeholder={props.documento ? 'Nenhum documento selecionado' : 'Nenhuma ata selecionada'}
        />
        <Dialog open={aberto} onOpenChange={abrir}>
          <DialogTrigger asChild>
            <Button ref={gatilho} type="button" variant="outline">
              <Files size={16} />
              Selecionar
            </Button>
          </DialogTrigger>
          {aberto && (
            <DialogContent
              onCloseAutoFocus={(e) => {
                e.preventDefault()
                if (
                  !document.activeElement ||
                  document.activeElement === document.body ||
                  document.activeElement.closest('[role="dialog"]') === e.target
                ) {
                  gatilho.current?.focus()
                }
              }}
              aria-describedby={undefined}
              className="max-w-5xl gap-4 p-4 sm:p-6"
            >
              <DialogTitle className="flex items-center gap-3 pr-6">
                <span className="rounded-lg bg-purple-muted/50 p-2 text-purple">
                  <Files aria-hidden size={20} />
                </span>
                {props.documento ? 'Selecionar documento' : 'Selecionar ata'}
              </DialogTitle>
              <Consulta
                {...props}
                selecionar={(ata) => {
                  props.selecionar(ata)
                  abrir(false)
                }}
              />
            </DialogContent>
          )}
        </Dialog>
        {props.limpar && props.valor && (
          <Button type="button" variant="ghost" onClick={props.limpar}>
            Limpar
          </Button>
        )}
      </div>
    </div>
  )
}

const campos = [
  ['assunto', 'Título ou assunto', 'search'],
  ['numero', 'Número', 'search'],
  ['de', 'Data inicial', 'date'],
  ['ate', 'Data final', 'date'],
  ['arrolado', 'Arrolado', 'search'],
  ['pauta', 'Pauta', 'search'],
] as const

function Consulta({ chave, buscar, selecionar, documento, contextoInicial }: Props) {
  const [contexto, setContexto] = useState(contextoInicial ?? '')
  const [camposBusca, editar] = useState<Record<string, string>>({})
  const [filtros, aplicar] = useState<Record<string, string>>({})
  const [pagina, paginar] = useState(0)
  const [expandida, expandir] = useState('')
  const id = useId()
  const parametros = { ...filtros, ...(contexto ? { contexto } : {}), pagina: String(pagina) }
  const q = useQuery({
    queryKey: ['selecao-documental', ...chave, parametros],
    queryFn: () => buscar(parametros),
    gcTime: 0,
    retry: false,
    placeholderData: keepPreviousData,
  })
  function mudarPagina(n: number) {
    paginar(n)
    expandir('')
  }
  const periodoInvalido = !!(camposBusca.de && camposBusca.ate && camposBusca.de > camposBusca.ate)
  const carregando = q.isPending || q.isPlaceholderData
  const contextos = q.data?.contextos ?? []
  const contextoAusente = !!contexto && !contextos.some((c) => c.id === contexto)
  return (
    <div className="min-w-0 space-y-4">
      <label className="grid gap-1 text-sm font-medium">
        Contexto documental
        <select
          className="w-full rounded-lg border bg-background p-2"
          value={contexto || (contextos.length === 1 ? contextos[0].id : '')}
          onChange={(e) => {
            setContexto(e.target.value)
            mudarPagina(0)
          }}
        >
          {(contextos.length !== 1 || contextoAusente) && <option value="">Todos os contextos compatíveis</option>}
          {contextoAusente && <option value={contexto}>Contexto atual</option>}
          {contextos.map((c) => (
            <option value={c.id} key={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </label>
      <form
        className="grid grid-cols-2 gap-3 rounded-xl border bg-muted/30 p-3 sm:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (!periodoInvalido) {
            aplicar(
              Object.fromEntries(
                Object.entries(camposBusca)
                  .map(([k, v]) => [k, v.trim()])
                  .filter(([, v]) => v),
              ),
            )
            mudarPagina(0)
          }
        }}
      >
        {campos.map(([k, label, tipo]) => (
          <label key={k} className="grid min-w-0 gap-1 text-sm">
            {label}
            <Input
              type={tipo}
              className="min-w-0 bg-background"
              maxLength={k === 'numero' ? 100 : 255}
              value={camposBusca[k] ?? ''}
              onChange={(e) => editar({ ...camposBusca, [k]: e.target.value })}
            />
          </label>
        ))}
        {periodoInvalido && (
          <p className="col-span-full text-sm text-destructive" role="alert">
            A data final deve ser igual ou posterior à inicial.
          </p>
        )}
        <div className="col-span-full flex flex-wrap gap-2">
          <Button type="submit" disabled={periodoInvalido}>
            <Search size={16} />
            Filtrar
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              editar({})
              aplicar({})
              mudarPagina(0)
            }}
          >
            Limpar filtros
          </Button>
        </div>
      </form>
      {carregando ? (
        <p role="status">Buscando documentos…</p>
      ) : q.isError ? (
        <div role="alert">
          Não foi possível carregar os documentos.{' '}
          <Button type="button" variant="outline" onClick={() => void q.refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : !q.data.itens.length ? (
        <p role="status">{documento ? 'Nenhum documento encontrado.' : 'Nenhuma ata encontrada.'}</p>
      ) : (
        <table className="block w-full text-left text-sm sm:table sm:table-fixed">
          <caption className="sr-only">Documentos disponíveis para seleção</caption>
          <thead className="sr-only bg-muted text-muted-foreground sm:not-sr-only sm:table-header-group">
            <tr>
              <th className="w-[15%] p-2">Número</th>
              <th className="w-[15%] p-2">Data</th>
              <th className="p-2">Título / assunto</th>
              <th className="w-[28%] p-2">Ação</th>
            </tr>
          </thead>
          <tbody className="block sm:table-row-group">
            {q.data.itens.map((a) => (
              <Fragment key={a.versao_id}>
                <tr className="grid grid-cols-2 items-start gap-1 border-t py-2 sm:table-row">
                  <td className="break-words p-2">
                    <span className="block text-xs text-muted-foreground sm:hidden">Número</span>
                    {a.numero_formatado || 'Sem número'}
                  </td>
                  <td className="p-2">
                    <span className="block text-xs text-muted-foreground sm:hidden">Data</span>
                    {a.data.slice(0, 10).split('-').reverse().join('/')}
                  </td>
                  <td className="col-span-2 break-words px-2 sm:py-2">
                    <strong>{a.reconvocacao && 'Reconvocação · '}{a.assunto}</strong>
                    <div className="text-xs text-muted-foreground">
                      {a.contexto} · v{a.versao}
                    </div>
                  </td>
                  <td className="col-span-2 p-2">
                    <div className="flex flex-wrap gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        aria-expanded={expandida === a.versao_id}
                        aria-controls={id + a.versao_id}
                        onClick={() => expandir(expandida === a.versao_id ? '' : a.versao_id)}
                      >
                        <ChevronDown
                          size={14}
                          className={
                            expandida === a.versao_id ? 'rotate-180 transition-transform' : 'transition-transform'
                          }
                        />
                        Detalhes
                      </Button>
                      <Button type="button" size="sm" onClick={() => selecionar(a)}>
                        <Check size={14} />
                        Selecionar
                      </Button>
                    </div>
                  </td>
                </tr>
                {expandida === a.versao_id && (
                  <tr className="block bg-muted/40 sm:table-row">
                    <td colSpan={4} className="block p-4 sm:table-cell">
                      <div
                        id={id + a.versao_id}
                        className="grid gap-4 whitespace-pre-line break-words sm:grid-cols-2"
                      >
                        <section>
                          <h3 className="font-semibold">Pauta</h3>
                          <p>{a.pauta || 'Sem pauta registrada.'}</p>
                        </section>
                        <section>
                          <h3 className="font-semibold">Arrolados</h3>
                          <p>{a.arrolados.join(', ') || 'Nenhum arrolado registrado.'}</p>
                        </section>
                        <section className="sm:col-span-2">
                          <h3 className="font-semibold">Resoluções</h3>
                          {a.resolucoes.length ? (
                            <ul className="list-disc space-y-2 pl-5">
                              {a.resolucoes.map((r, i) => (
                                <li key={i}>
                                  <strong>{r.assunto}</strong> · {resultadosResolucao[r.resultado]}
                                  {r.texto && <p>{r.texto}</p>}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            'Nenhuma resolução registrada.'
                          )}
                        </section>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      )}
      <nav
        aria-label="Paginação da seleção"
        className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-sm"
      >
        <Button
          type="button"
          variant="outline"
          disabled={!pagina || carregando}
          onClick={() => mudarPagina(pagina - 1)}
        >
          Anterior
        </Button>
        <span aria-live="polite">Página {pagina + 1}</span>
        <Button
          type="button"
          variant="outline"
          disabled={!q.data?.tem_proxima || carregando}
          onClick={() => mudarPagina(pagina + 1)}
        >
          Próxima
        </Button>
      </nav>
    </div>
  )
}
