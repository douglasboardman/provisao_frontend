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
import type { GrupoFamiliar } from "../../types/models"

const schema = z.object({
  nome_familia: z.string().min(1, "Nome da família é obrigatório"),
})

type FormData = z.infer<typeof schema>

export function GruposFamiliaresPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<GrupoFamiliar | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<GrupoFamiliar | null>(null)
  const { canCreate, canEdit, canDelete } = usePermissions("grupos-familiares")
  const queryClient = useQueryClient()
  const { current, hasBack, push, pop, closeAll } = useModalStack()

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["grupos-familiares"],
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
      toast({ title: "Grupo familiar atualizado" })
      closeDialog()
    },
    onError: (e) => toast({ title: "Erro", description: e instanceof ApiRequestError ? e.messages[0] : "Erro ao atualizar", variant: "destructive" }),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => gruposFamiliaresApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grupos-familiares"] })
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

  const actions = (item: GrupoFamiliar) => (
    <div className="flex gap-1">
      <Button variant="ghost" size="icon" onClick={() => push({ type: "familia", grupo: { id: item.id, nome_familia: item.nome_familia } })} title="Ver integrantes">
        <Eye size={16} />
      </Button>
      {canEdit && (
        <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
          <Pencil size={16} />
        </Button>
      )}
      {canDelete && (
        <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(item)}>
          <Trash2 size={16} className="text-destructive" />
        </Button>
      )}
    </div>
  )

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold">Grupos Familiares</h1>
          <p className="text-sm text-muted-foreground">Gerencie os grupos familiares da igreja</p>
        </div>
        {canCreate && (
          <Button onClick={openCreate}>
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
      ) : (
        <DataTable data={data} columns={columns} keyExtractor={(item) => item.id} actions={actions} />
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
