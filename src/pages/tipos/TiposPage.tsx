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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "../../components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../../components/ui/select"
import { DataTable, type Column } from "../../components/shared/DataTable"
import { DeleteDialog } from "../../components/shared/DeleteDialog"
import { EmptyState } from "../../components/shared/EmptyState"
import { Badge } from "../../components/ui/badge"
import { usePermissions } from "../../hooks/use-permissions"
import { toast } from "../../components/ui/use-toast"
import { despesasApi } from "../../api/despesas"
import { receitasApi } from "../../api/receitas"
import { catDespesaApi } from "../../api/cat-despesa"
import { catReceitaApi } from "../../api/cat-receita"
import { ApiRequestError } from "../../api/client"
import type { Despesa, Receita, CatDespesa, CatReceita } from "../../types/models"

type Tab = "despesa" | "receita"

const schema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  category_id: z.coerce.number<number>().int().positive("Categoria é obrigatória"),
  requer_pessoa: z.boolean(),
  requer_acao: z.boolean(),
  requer_conta: z.boolean(),
  requer_comprovante: z.boolean(),
})

type FormData = z.infer<typeof schema>

const FORM_DEFAULTS: FormData = { nome: "", category_id: 0, requer_pessoa: false, requer_acao: false, requer_conta: false, requer_comprovante: false }

export function TiposPage() {
  const [tab, setTab] = useState<Tab>("despesa")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<(Despesa | Receita) | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<(Despesa | Receita) | null>(null)

  const permDespesa = usePermissions("despesas")
  const permReceita = usePermissions("receitas")
  const perm = tab === "despesa" ? permDespesa : permReceita
  const queryClient = useQueryClient()

  const { data: despesas, isLoading: loadingD } = useQuery({
    queryKey: ["despesas"],
    queryFn: despesasApi.list,
    enabled: tab === "despesa",
  })

  const { data: receitas, isLoading: loadingR } = useQuery({
    queryKey: ["receitas"],
    queryFn: receitasApi.list,
    enabled: tab === "receita",
  })

  const { data: catsDespesa } = useQuery({
    queryKey: ["cat-despesa"],
    queryFn: catDespesaApi.list,
    enabled: tab === "despesa",
  })

  const { data: catsReceita } = useQuery({
    queryKey: ["cat-receita"],
    queryFn: catReceitaApi.list,
    enabled: tab === "receita",
  })

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: FORM_DEFAULTS,
  })

  const createMut = useMutation<Despesa | Receita, Error, FormData>({
    mutationFn: (d) => {
      const payload = { nome: d.nome, requer_pessoa: d.requer_pessoa, requer_acao: d.requer_acao, requer_conta: d.requer_conta, requer_comprovante: d.requer_comprovante }
      return tab === "despesa"
        ? despesasApi.create({ ...payload, cat_despesa_id: d.category_id })
        : receitasApi.create({ ...payload, cat_receita_id: d.category_id })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tab === "despesa" ? "despesas" : "receitas"] })
      toast({ title: `Tipo de ${tab} criado` })
      closeDialog()
    },
    onError: (e) => toast({ title: "Erro", description: e instanceof ApiRequestError ? e.messages[0] : "Erro ao criar", variant: "destructive" }),
  })

  const updateMut = useMutation<Despesa | Receita, Error, { id: number; d: FormData }>({
    mutationFn: ({ id, d }) => {
      const payload = { nome: d.nome, requer_pessoa: d.requer_pessoa, requer_acao: d.requer_acao, requer_conta: d.requer_conta, requer_comprovante: d.requer_comprovante }
      return tab === "despesa"
        ? despesasApi.update(id, { ...payload, cat_despesa_id: d.category_id })
        : receitasApi.update(id, { ...payload, cat_receita_id: d.category_id })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tab === "despesa" ? "despesas" : "receitas"] })
      toast({ title: `Tipo de ${tab} atualizado` })
      closeDialog()
    },
    onError: (e) => toast({ title: "Erro", description: e instanceof ApiRequestError ? e.messages[0] : "Erro ao atualizar", variant: "destructive" }),
  })

  const deleteMut = useMutation<Despesa | Receita, Error, number>({
    mutationFn: (id) => tab === "despesa" ? despesasApi.remove(id) : receitasApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tab === "despesa" ? "despesas" : "receitas"] })
      toast({ title: `Tipo de ${tab} excluído` })
      setDeleteTarget(null)
    },
    onError: (e) => toast({ title: "Erro", description: e instanceof ApiRequestError ? e.messages[0] : "Erro ao excluir", variant: "destructive" }),
  })

  function openCreate() {
    setEditing(null)
    form.reset(FORM_DEFAULTS)
    setDialogOpen(true)
  }

  function openEdit(item: Despesa | Receita) {
    setEditing(item)
    const catId = tab === "despesa" ? (item as Despesa).cat_despesa_id : (item as Receita).cat_receita_id
    form.reset({ nome: item.nome, category_id: catId, requer_pessoa: item.requer_pessoa, requer_acao: item.requer_acao, requer_conta: item.requer_conta, requer_comprovante: item.requer_comprovante })
    setDialogOpen(true)
  }

  function closeDialog() {
    setDialogOpen(false)
    setEditing(null)
  }

  function onSubmit(d: FormData) {
    if (editing) updateMut.mutate({ id: editing.id, d })
    else createMut.mutate(d)
  }

  const data = tab === "despesa" ? despesas : receitas
  const isLoading = tab === "despesa" ? loadingD : loadingR
  const categories: (CatDespesa | CatReceita)[] = (tab === "despesa" ? catsDespesa : catsReceita) ?? []
  const isPending = createMut.isPending || updateMut.isPending

  const columns: Column<Despesa | Receita>[] = [
    { key: "nome", header: "Nome", sortable: true },
    {
      key: "categoria",
      header: "Categoria",
      render: (item) => {
        const cat = tab === "despesa" ? (item as Despesa).cat_despesa : (item as Receita).cat_receita
        return <Badge variant="outline">{cat?.nome ?? "—"}</Badge>
      },
    },
    {
      key: "requisitos",
      header: "Requisitos",
      render: (item) => (
        <div className="flex gap-1 flex-wrap">
          {item.requer_pessoa && <Badge variant="secondary">Pessoa</Badge>}
          {item.requer_acao && <Badge variant="secondary">Ação</Badge>}
          {item.requer_conta && <Badge variant="secondary">Conta</Badge>}
          {item.requer_comprovante && <Badge variant="secondary">Comprovante</Badge>}
        </div>
      ),
    },
  ]

  const actions = (perm.canEdit || perm.canDelete)
    ? (item: Despesa | Receita) => (
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
          <h1 className="text-2xl font-heading font-bold">Tipos</h1>
          <p className="text-sm text-muted-foreground">Gerencie os tipos de despesas e receitas</p>
        </div>
        {perm.canCreate && (
          <Button onClick={openCreate}>
            <Plus size={18} className="mr-2" />
            Novo Tipo
          </Button>
        )}
      </div>

      <div className="flex gap-1 border-b border-border">
        <button onClick={() => setTab("despesa")} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "despesa" ? "border-purple text-purple" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
          Despesas
        </button>
        <button onClick={() => setTab("receita")} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "receita" ? "border-purple text-purple" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
          Receitas
        </button>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-muted-foreground">Carregando...</div>
      ) : !data?.length ? (
        <EmptyState icon={Calculator} title={`Nenhum tipo de ${tab}`} description={`Nenhum tipo de ${tab} cadastrado`} />
      ) : (
        <DataTable data={data} columns={columns} keyExtractor={(item) => item.id} actions={actions} />
      )}

      <Dialog open={dialogOpen} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar" : "Novo"} Tipo de {tab === "despesa" ? "Despesa" : "Receita"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input id="nome" {...form.register("nome")} />
              {form.formState.errors.nome && <p className="text-xs text-destructive">{form.formState.errors.nome.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Categoria *</Label>
              <Select
                value={String(form.watch("category_id") || "")}
                onValueChange={(v) => form.setValue("category_id", Number(v))}
              >
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.category_id && (
                <p className="text-xs text-destructive">{form.formState.errors.category_id.message}</p>
              )}
            </div>
            <div className="space-y-3">
              <Label>Requisitos do lançamento</Label>
              <div className="grid grid-cols-2 gap-3">
                {(["requer_pessoa", "requer_acao", "requer_conta", "requer_comprovante"] as const).map((field) => (
                  <label key={field} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={form.watch(field)}
                      onCheckedChange={(v) => form.setValue(field, !!v)}
                    />
                    {field === "requer_pessoa" ? "Pessoa" : field === "requer_acao" ? "Ação" : field === "requer_conta" ? "Conta" : "Comprovante"}
                  </label>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Salvando..." : "Salvar"}
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
        title={`Excluir tipo de ${tab}`}
        description={`Tem certeza que deseja excluir "${deleteTarget?.nome}"? Esta ação não pode ser desfeita.`}
      />
    </div>
  )
}
