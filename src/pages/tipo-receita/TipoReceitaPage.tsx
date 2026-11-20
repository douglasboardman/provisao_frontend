import { TrendingUp as PageIcon } from "lucide-react"
import { WorkspaceHeader } from "../../components/shared/Workspace"
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Pencil, Trash2, Calculator } from "lucide-react"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Checkbox } from "../../components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { DataTable, type Column } from "../../components/shared/DataTable"
import { DeleteDialog } from "../../components/shared/DeleteDialog"
import { EmptyState } from "../../components/shared/EmptyState"
import { Badge } from "../../components/ui/badge"
import { usePermissions } from "../../hooks/use-permissions"
import { toast } from "../../components/ui/use-toast"
import { receitasApi } from "../../api/receitas"
import { catReceitaApi } from "../../api/cat-receita"
import { ApiRequestError } from "../../api/client"
import type { Receita } from "../../types/models"

const schema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  cat_receita_id: z.coerce.number<number>().int().positive("Categoria é obrigatória"),
  requer_pessoa: z.boolean(),
  requer_acao: z.boolean(),
  requer_conta: z.boolean(),
  requer_comprovante: z.boolean(),
})
type FormData = z.infer<typeof schema>
const DEFAULTS: FormData = { nome: "", cat_receita_id: 0, requer_pessoa: false, requer_acao: false, requer_conta: false, requer_comprovante: false }

export function TipoReceitaPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Receita | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Receita | null>(null)
  const { canCreate, canEdit, canDelete } = usePermissions("receitas")
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({ queryKey: ["receitas"], queryFn: receitasApi.list })
  const { data: categorias } = useQuery({ queryKey: ["cat-receita"], queryFn: catReceitaApi.list })
  const form = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: DEFAULTS })

  const createMut = useMutation({
    mutationFn: (d: FormData) => receitasApi.create({ ...d }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["receitas"] }); toast({ title: "Tipo de receita criado" }); closeDialog() },
    onError: (e) => toast({ title: "Erro", description: e instanceof ApiRequestError ? e.messages[0] : "Erro ao criar", variant: "destructive" }),
  })
  const updateMut = useMutation({
    mutationFn: ({ id, d }: { id: number; d: FormData }) => receitasApi.update(id, { ...d }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["receitas"] }); toast({ title: "Tipo de receita atualizado" }); closeDialog() },
    onError: (e) => toast({ title: "Erro", description: e instanceof ApiRequestError ? e.messages[0] : "Erro ao atualizar", variant: "destructive" }),
  })
  const deleteMut = useMutation({
    mutationFn: (id: number) => receitasApi.remove(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["receitas"] }); toast({ title: "Tipo de receita excluído" }); setDeleteTarget(null) },
    onError: (e) => toast({ title: "Erro", description: e instanceof ApiRequestError ? e.messages[0] : "Erro ao excluir", variant: "destructive" }),
  })

  function openCreate() { setEditing(null); form.reset(DEFAULTS); setDialogOpen(true) }
  function openEdit(item: Receita) {
    setEditing(item)
    form.reset({ nome: item.nome, cat_receita_id: item.cat_receita_id, requer_pessoa: item.requer_pessoa, requer_acao: item.requer_acao, requer_conta: item.requer_conta, requer_comprovante: item.requer_comprovante })
    setDialogOpen(true)
  }
  function closeDialog() { setDialogOpen(false); setEditing(null); form.reset(DEFAULTS) }
  function onSubmit(d: FormData) { editing ? updateMut.mutate({ id: editing.id, d }) : createMut.mutate(d) }

  const columns: Column<Receita>[] = [
    { key: "nome", header: "Nome", sortable: true },
    { key: "categoria", header: "Categoria", render: (i) => <Badge variant="outline">{i.cat_receita?.nome ?? "—"}</Badge> },
    { key: "req", header: "Requisitos", render: (i) => (
      <div className="flex gap-1 flex-wrap">
        {i.requer_pessoa && <Badge variant="secondary">Pessoa</Badge>}
        {i.requer_acao && <Badge variant="secondary">Ação</Badge>}
        {i.requer_conta && <Badge variant="secondary">Conta</Badge>}
        {i.requer_comprovante && <Badge variant="secondary">Comprovante</Badge>}
      </div>
    )},
  ]
  const actions = (canEdit || canDelete) ? (item: Receita) => (
    <div className="flex gap-1">
      {canEdit && <Button variant="ghost" size="icon" onClick={() => openEdit(item)}><Pencil size={16} /></Button>}
      {canDelete && <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(item)}><Trash2 size={16} className="text-destructive" /></Button>}
    </div>
  ) : undefined

  return (
    <div className="workspace">
      <WorkspaceHeader icon={PageIcon} title="Tipos de Receita" description="Gerencie os tipos de receita">
        {canCreate && <Button onClick={openCreate}><Plus size={18} className="mr-2" />Novo Tipo</Button>}
      </WorkspaceHeader>
      {isLoading ? <div className="py-16 text-center text-muted-foreground">Carregando...</div>
        : !data?.length ? <EmptyState icon={Calculator} title="Nenhum tipo" description="Nenhum tipo de receita cadastrado" />
        : <DataTable data={data} columns={columns} keyExtractor={(i) => i.id} actions={actions} />}

      <Dialog open={dialogOpen} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Editar" : "Novo"} Tipo de Receita</DialogTitle></DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input id="nome" {...form.register("nome")} />
              {form.formState.errors.nome && <p className="text-xs text-destructive">{form.formState.errors.nome.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Categoria *</Label>
              <Select value={String(form.watch("cat_receita_id") || "")} onValueChange={(v) => form.setValue("cat_receita_id", Number(v))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{categorias?.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>)}</SelectContent>
              </Select>
              {form.formState.errors.cat_receita_id && <p className="text-xs text-destructive">{form.formState.errors.cat_receita_id.message}</p>}
            </div>
            <div className="space-y-3">
              <Label>Requisitos do lançamento</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(["requer_pessoa", "requer_acao", "requer_conta", "requer_comprovante"] as const).map((f) => (
                  <label key={f} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={form.watch(f)} onCheckedChange={(v) => form.setValue(f, !!v)} />
                    {f === "requer_pessoa" ? "Pessoa" : f === "requer_acao" ? "Ação" : f === "requer_conta" ? "Conta" : "Comprovante"}
                  </label>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button>
              <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>{(createMut.isPending || updateMut.isPending) ? "Salvando..." : "Salvar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <DeleteDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)} onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)} loading={deleteMut.isPending} title="Excluir tipo de receita" description={`Tem certeza que deseja excluir "${deleteTarget?.nome}"?`} />
    </div>
  )
}
