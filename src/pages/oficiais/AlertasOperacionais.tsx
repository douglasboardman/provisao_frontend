import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { oficiaisApi } from '../../api/oficiais'
import { Button } from '../../components/ui/button'
function dia(valor: string) { return valor.slice(0, 10).split('-').reverse().join('/') }

export function AlertasOperacionais({ identidade }: { identidade: string }) {
  const client = useQueryClient()
  const avisos = useQuery({ queryKey: ['oficiais', identidade, 'notificacoes'], queryFn: oficiaisApi.notificacoes, refetchInterval: 60_000 })
  const ler = useMutation({ mutationFn: oficiaisApi.marcarNotificacao, onSuccess: () => client.invalidateQueries({ queryKey: ['oficiais', identidade, 'notificacoes'] }) })
  return <section className="min-w-0 space-y-2"><h3 className="font-semibold">Avisos de mandatos</h3>
    <p className="text-sm text-muted-foreground">Confira providências para eleição ou sucessão; o aviso não declara resultado eleitoral.</p>
    {avisos.isPending ? <p>Carregando avisos...</p> : avisos.isError ? <p role="alert">Não foi possível carregar os avisos.</p> : !avisos.data?.length ? <p>Nenhum aviso disponível.</p> : avisos.data.map(a => <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded border p-2"><p>{a.nome} — término em {dia(a.data_termino)} {a.lido_em ? '(lido)' : '(não lido)'}</p>{!a.lido_em && <Button type="button" variant="outline" disabled={ler.isPending} onClick={() => ler.mutate(a.id)}>Marcar como lido</Button>}</div>)}
    {ler.isError && <p role="alert">Não foi possível marcar o aviso como lido.</p>}
  </section>
}
