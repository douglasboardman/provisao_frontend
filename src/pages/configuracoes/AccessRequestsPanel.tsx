import { usePermissions } from '../../hooks/use-permissions'
import { useAuthStore } from '../../stores/auth'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { accessRequestsApi } from '../../api/access-requests'
import { Button } from '../../components/ui/button'
import { toast } from '../../components/ui/use-toast'
import { ApiRequestError } from '../../api/client'

export function AccessRequestsPanel() {
  const { canEdit } = usePermissions('solicitacoes-acesso')
  const ator = useAuthStore(s => s.user)
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const query = useQuery({ queryKey: ['solicitacoes-acesso', ator?.igreja_id, ator?.sub, page], queryFn: () => accessRequestsApi.list(page) })
  const action = useMutation({
    mutationFn: ({ id, approve }: { id: string; approve: boolean }) => approve ? accessRequestsApi.approve(id) : accessRequestsApi.reject(id),
    onSuccess: result => { toast({ title: result.message }); void queryClient.invalidateQueries({ queryKey: ['solicitacoes-acesso'] }); void queryClient.invalidateQueries({ queryKey: ['usuarios'] }) },
    onError: e => toast({ title: 'Não foi possível analisar', description: e instanceof ApiRequestError ? e.messages[0] : 'Tente novamente.', variant: 'destructive' }),
  })
  return <section className="space-y-3 rounded-lg border p-4">
    <h3 className="font-semibold">Solicitações de acesso</h3>
    {query.isLoading && <p>Carregando solicitações...</p>}
    {query.isError && <p role="alert">{query.error instanceof ApiRequestError && query.error.statusCode === 403 ? 'Você não possui competência registrada para analisar solicitações.' : 'Não foi possível carregar as solicitações.'}</p>}
    {query.data?.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma solicitação encontrada.</p>}
    {query.data?.map(item => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
      <div><p>{item.nome_usuario}</p><p className="text-sm text-muted-foreground">{item.email_login}</p><p className="text-sm">{({ AGUARDA_CONFIRMACAO: "Aguardando confirmação", EM_ANALISE: "Em análise", APROVADA: "Aprovada", REJEITADA: "Rejeitada", CANCELADA: "Cancelada" } as Record<string, string>)[item.estado] ?? item.estado}{item.estado === "APROVADA" && ` — ${item.situacao_acesso === "CONVITE_PENDENTE" ? "convite pendente" : item.situacao_acesso === "ATIVADA" ? "acesso ativado" : "situação anterior não verificada"}`}</p></div>
      {item.estado === "EM_ANALISE" && (canEdit || ator?.perfil === "ADMINISTRADOR" || ator?.perfil === "GESTOR") && <div className="flex gap-2"><Button size="sm" disabled={action.isPending} onClick={() => action.mutate({ id: item.id, approve: true })}>Aprovar</Button><Button size="sm" variant="outline" disabled={action.isPending} onClick={() => action.mutate({ id: item.id, approve: false })}>Rejeitar</Button></div>}
    </div>)}
    <div className="flex items-center gap-3"><Button size="sm" variant="outline" disabled={page === 1 || query.isFetching} onClick={() => setPage(page - 1)}>Anterior</Button><span className="text-sm">Página {page}</span><Button size="sm" variant="outline" disabled={query.isFetching || (query.data?.length ?? 0) < 100} onClick={() => setPage(page + 1)}>Próxima</Button></div>
  </section>
}
