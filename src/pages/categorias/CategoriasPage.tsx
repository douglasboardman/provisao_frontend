import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Pencil, Trash2, Tag } from "lucide-react"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "../../components/ui/dialog"
import { DataTable, type Column } from "../../components/shared/DataTable"
import { DeleteDialog } from "../../components/shared/DeleteDialog"
import { EmptyState } from "../../components/shared/EmptyState"
import { usePermissions } from "../../hooks/use-permissions"
import { toast } from "../../components/ui/use-toast"
import { catDespesaApi } from "../../api/cat-despesa"
import { catReceitaApi } from "../../api/cat-receita"
import { ApiRequestError } from "../../api/client"
import type { CatDespesa, CatReceita } from "../../types/models"

const schema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  cor_hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Cor inválida").optional().or(z.literal("")),
})

type FormData = z.infer<typeof schema>

type Tab = "despesa" | "receita"

export function CategoriasPage() {
  const [tab, setTab] = useState<Tab>("despesa")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<(CatDespesa | CatReceita) | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<(CatDespesa | CatReceita) | null>(null)

  const permDespesa = usePermissions("cat-despesa")
  const permReceita = usePermissions("cat-receita")
  const perm = tab === "despesa" ? permDespesa : permReceita
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const api = (tab === "despesa" ? catDespesaApi : catReceitaApi) as any
  const queryKey = tab === "despesa" ? "cat-despesa" : "cat-receita"
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: [queryKey],
    queryFn: () => api.list(),
  })

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { nome: "", cor_hex: "" },
  })

  const createMut = useMutation({
    mutationFn: (d: FormData) => api.create({ nome: d.nome, cor_hex: d.cor_hex || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] })
      toast({ title: "Categoria criada com sucesso" })
      closeDialog()
    },
    onError: (e) => toast({ title: "Erro", description: e instanceof ApiRequestError ? e.messages[0] : "Erro ao criar", variant: "destructive" }),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, d }: { id: number; d: FormData }) => api.update(id, { nome: d.nome, cor_hex: d.cor_hex || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] })
      toast({ title: "Categoria atualizada" })
      closeDialog()
    },
    onError: (e) => toast({ title: "Erro", description: e instanceof ApiRequestError ? e.messages[0] : "Erro ao atualizar", variant: "destructive" }),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] })
      toast({ title: "Categoria excluída" })
      setDeleteTarget(null)
    },
    onError: (e) => toast({ title: "Erro", description: e instanceof ApiRequestError ? e.messages[0] : "Erro ao excluir", variant: "destructive" }),
  })

  function openCreate() {
    setEditing(null)
    form.reset({ nome: "", cor_hex: "" })
    setDialogOpen(true)
  }

  function openEdit(item: CatDespesa | CatReceita) {
    setEditing(item)
    form.reset({ nome: item.nome, cor_hex: item.cor_hex ?? "" })
    setDialogOpen(true)
  }

  function closeDialog() {
    setDialogOpen(false)
    setEditing(null)
    form.reset()
  }

  function onSubmit(d: FormData) {
    if (editing) {
      updateMut.mutate({ id: editing.id, d })
    } else {
      createMut.mutate(d)
    }
  }

  const columns: Column<CatDespesa | CatReceita>[] = [
    {
      key: "cor_hex",
      header: "Cor",
      render: (item) =>
        item.cor_hex ? (
          <div className="w-6 h-6 rounded-full border border-border" style={{ backgroundColor: item.cor_hex }} />
        ) : (
          <div className="w-6 h-6 rounded-full border border-border bg-muted" />
        ),
    },
    { key: "nome", header: "Nome", sortable: true },
  ]

  const actions = (perm.canEdit || perm.canDelete)
    ? (item: CatDespesa | CatReceita) => (
        <div className="flex gap-1">
          {perm.canEdit && (
            <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
              <Pencil size={16} />
            </Button>
          )}
          {perm.canDelete && (
            <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(item)}>
              <Trash2 size={16} className="text-destructive" />
            </Button>
          )}
        </div>
      )
    : undefined

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold">Categorias</h1>
          <p className="text-sm text-muted-foreground">Gerencie as categorias de despesas e receitas</p>
        </div>
        {perm.canCreate && (
          <Button onClick={openCreate}>
            <Plus size={18} className="mr-2" />
            Nova Categoria
          </Button>
        )}
      </div>

      <div className="flex gap-1 border-b border-border">
        <button
          onClick={() => setTab("despesa")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "despesa" ? "border-purple text-purple" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Despesas
        </button>
        <button
          onClick={() => setTab("receita")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "receita" ? "border-purple text-purple" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Receitas
        </button>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-muted-foreground">Carregando...</div>
      ) : !data?.length ? (
        <EmptyState icon={Tag} title="Nenhuma categoria" description={`Nenhuma categoria de ${tab === "despesa" ? "despesa" : "receita"} cadastrada`} />
      ) : (
        <DataTable data={data} columns={columns} keyExtractor={(item) => item.id} actions={actions} />
      )}

      <Dialog open={dialogOpen} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar" : "Nova"} Categoria de {tab === "despesa" ? "Despesa" : "Receita"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input id="nome" {...form.register("nome")} />
              {form.formState.errors.nome && <p className="text-xs text-destructive">{form.formState.errors.nome.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="cor_hex">Cor</Label>
              <div className="flex gap-2 items-center">
                <Input id="cor_hex" {...form.register("cor_hex")} placeholder="#6C4CAF" className="flex-1" />
                {form.watch("cor_hex") && /^#[0-9A-Fa-f]{6}$/.test(form.watch("cor_hex") ?? "") && (
                  <div className="w-10 h-10 rounded-lg border border-border" style={{ backgroundColor: form.watch("cor_hex") }} />
                )}
              </div>
              {form.formState.errors.cor_hex && <p className="text-xs text-destructive">{form.formState.errors.cor_hex.message}</p>}
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
        title="Excluir categoria"
        description={`Tem certeza que deseja excluir "${deleteTarget?.nome}"? Esta ação não pode ser desfeita.`}
      />
    </div>
  )
}
