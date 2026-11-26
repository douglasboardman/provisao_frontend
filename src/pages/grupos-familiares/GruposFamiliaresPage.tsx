import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Pencil, Trash2, Building2, Eye } from "lucide-react"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "../../components/ui/dialog"
import { DataTable, type Column } from "../../components/shared/DataTable"
import { CampoBusca } from "../../components/shared/CampoBusca"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { DeleteDialog } from "../../components/shared/DeleteDialog"
import { FamiliaViewDialog } from "../../components/shared/FamiliaViewDialog"
import { PessoaEditDialog } from "../../components/shared/PessoaEditDialog"
import { HistoricoMembresiaDialog } from "../../components/shared/HistoricoMembresiaDialog"
import { EmptyState } from "../../components/shared/EmptyState"
import { ErrorState } from "../../components/shared/ErrorState"
import { usePermissions } from "../../hooks/use-permissions"
import { useModalStack } from "../../hooks/use-modal-stack"
import { toast } from "../../components/ui/use-toast"
import { gruposFamiliaresApi } from "../../api/grupos-familiares"
import { ApiRequestError } from "../../api/client"
import { correspondeBusca, normalizarBusca } from "../../lib/busca"
import { useAuthStore } from "../../stores/auth"
import type { GrupoFamiliar } from "../../types/models"

const schema = z.object({
  nome_familia: z.string().min(1, "Nome da família é obrigatório"),
})

type FormData = z.infer<typeof schema>

export function GruposFamiliaresPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<GrupoFamiliar | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<GrupoFamiliar | null>(null)
  const [busca, setBusca] = useState("")
  const [composicao, setComposicao] = useState("todos")
  const { canCreate, canEdit, canDelete } = usePermissions("grupos-familiares")
  const { canView: podeConsultarPessoas } = usePermissions("pessoas")
  const identidade = useAuthStore(s => `${s.user?.igreja_id}:${s.user?.sub}`)
  const queryClient = useQueryClient()
  const { current, hasBack, push, pop, closeAll } = useModalStack()

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["grupos-familiares", identidade],
    queryFn: gruposFamiliaresApi.list,
  })

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { nome_familia: "" },
  })

  const createMut = useMutation({
    mutationFn: (d: FormData) => gruposFamiliaresApi.create(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grupos-familiares"] })
      toast({ title: "Grupo familiar criado com sucesso" })
      closeDialog()
    },
    onError: (e) => toast({ title: "Erro", description: e instanceof ApiRequestError ? e.messages[0] : "Erro ao criar", variant: "destructive" }),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, d }: { id: string; d: FormData }) => gruposFamiliaresApi.update(id, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grupos-familiares"] })
      queryClient.invalidateQueries({ queryKey: ["pessoas"] })
      toast({ title: "Grupo familiar atualizado" })
      closeDialog()
    },
    onError: (e) => toast({ title: "Erro", description: e instanceof ApiRequestError ? e.messages[0] : "Erro ao atualizar", variant: "destructive" }),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => gruposFamiliaresApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grupos-familiares"] })
      queryClient.invalidateQueries({ queryKey: ["pessoas"] })
      toast({ title: "Grupo familiar excluído" })
      setDeleteTarget(null)
    },
    onError: (e) => toast({ title: "Erro", description: e instanceof ApiRequestError ? e.messages[0] : "Erro ao excluir", variant: "destructive" }),
  })

  function openCreate() {
    setEditing(null)
    form.reset({ nome_familia: "" })
    setDialogOpen(true)
  }

  function openEdit(item: GrupoFamiliar) {
    setEditing(item)
    form.reset({ nome_familia: item.nome_familia })
    setDialogOpen(true)
  }

  function closeDialog() {
    setDialogOpen(false)
    setEditing(null)
    form.reset()
  }

  function onSubmit(d: FormData) {
    if (editing) updateMut.mutate({ id: editing.id, d })
    else createMut.mutate(d)
  }

  const columns: Column<GrupoFamiliar>[] = [
    { key: "nome_familia", header: "Nome da Família", sortable: true },
    {
      key: "pessoas",
      header: "Pessoas",
      render: (item) => <span>{item._count?.pessoas ?? 0}</span>,
    },
  ]

  const actions = (canEdit || canDelete || podeConsultarPessoas) ? (item: GrupoFamiliar) => (
    <div className="flex gap-1">
      {podeConsultarPessoas && <Button variant="ghost" size="icon" onClick={() => push({ type: "familia", grupo: { id: item.id, nome_familia: item.nome_familia } })} title="Ver integrantes">
        <Eye size={16} />
      </Button>}
      {canEdit && (
        <Button aria-label={`Editar ${item.nome_familia}`} variant="ghost" size="icon" onClick={() => openEdit(item)}>
          <Pencil size={16} />
        </Button>
      )}
      {canDelete && (
        <Button aria-label={`Excluir ${item.nome_familia}`} variant="ghost" size="icon" onClick={() => setDeleteTarget(item)}>
          <Trash2 size={16} className="text-destructive" />
        </Button>
      )}
    </div>
  ) : undefined

  const termo = normalizarBusca(busca)
  const filtrados = (data ?? []).filter(grupo => correspondeBusca(termo, grupo.nome_familia) &&
    (composicao === "todos" || ((grupo._count?.pessoas ?? 0) > 0) === (composicao === "com"))
  )

  return (
    <div className="space-y-4">
      <div className="surface flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-[2]">
          <CampoBusca rotulo="Buscar grupos familiares" placeholder="Nome da família" valor={busca} mudar={setBusca} />
        </div>
        <div className="min-w-40 flex-1 space-y-1.5">
          <label htmlFor="grupos-composicao" className="text-sm font-medium">Composição</label>
          <Select value={composicao} onValueChange={setComposicao}>
            <SelectTrigger id="grupos-composicao" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os grupos</SelectItem>
              <SelectItem value="com">Com integrantes</SelectItem>
              <SelectItem value="sem">Sem integrantes</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {(busca || composicao !== "todos") && <Button variant="ghost" onClick={() => { setBusca(""); setComposicao("todos") }}>Limpar filtros</Button>}
        {canCreate && (
          <Button className="ml-auto" onClick={openCreate}>
            <Plus size={18} className="mr-2" />
            Novo Grupo
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-muted-foreground">Carregando...</div>
      ) : isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : !data?.length ? (
        <EmptyState icon={Building2} title="Nenhum grupo familiar" description="Nenhum grupo familiar cadastrado" />
      ) : !filtrados.length ? (
        <EmptyState icon={Building2} title="Nenhum grupo familiar encontrado" description="Altere a busca ou o filtro." />
      ) : (
        <DataTable data={filtrados} columns={columns} keyExtractor={(item) => item.id} actions={actions} pageResetKey={JSON.stringify([termo, composicao])} />
      )}

      <FamiliaViewDialog
        grupo={current?.type === "familia" ? current.grupo : null}
        onClose={closeAll}
        onBack={hasBack ? pop : undefined}
        onEditPessoa={(id) => push({ type: "pessoa-edit", pessoaId: id })}
        onViewHistorico={(id) => push({ type: "historico", pessoaId: id })}
      />

      <PessoaEditDialog
        pessoaId={current?.type === "pessoa-edit" ? current.pessoaId : null}
        open={current?.type === "pessoa-edit"}
        onClose={closeAll}
        onBack={hasBack ? pop : undefined}
      />

      <HistoricoMembresiaDialog
        pessoaId={current?.type === "historico" ? current.pessoaId : null}
        open={current?.type === "historico"}
        onClose={closeAll}
        onBack={hasBack ? pop : undefined}
      />

      <Dialog open={dialogOpen} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar" : "Novo"} Grupo Familiar</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome_familia">Nome da Família *</Label>
              <Input id="nome_familia" {...form.register("nome_familia")} />
              {form.formState.errors.nome_familia && <p className="text-xs text-destructive">{form.formState.errors.nome_familia.message}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button>
              <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>
                {(createMut.isPending || updateMut.isPending) ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DeleteDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
        loading={deleteMut.isPending}
        title="Excluir grupo familiar"
        description={`Tem certeza que deseja excluir "${deleteTarget?.nome_familia}"? Esta ação não pode ser desfeita.`}
      />
    </div>
  )
}
