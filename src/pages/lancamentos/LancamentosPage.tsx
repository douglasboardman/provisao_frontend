import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Pencil, Trash2, ArrowRightLeft } from "lucide-react"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Textarea } from "../../components/ui/textarea"
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
import { lancamentosApi, type LancamentosFilters } from "../../api/lancamentos"
import { contasApi } from "../../api/contas"
import { acoesApi } from "../../api/acoes"
import { pessoasApi } from "../../api/pessoas"
import { despesasApi } from "../../api/despesas"
import { receitasApi } from "../../api/receitas"
import { ApiRequestError } from "../../api/client"
import { TipoTransacao } from "../../types/enums"
import type { Lancamento } from "../../types/models"

const TIPO_LABELS: Record<TipoTransacao, string> = { [TipoTransacao.RECEITA]: "Receita", [TipoTransacao.DESPESA]: "Despesa" }

const schema = z.object({
  data_transacao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  valor: z.coerce.number<number>().positive("Valor deve ser positivo"),
  tipo_transacao: z.nativeEnum(TipoTransacao),
  conta_id: z.string().uuid("Conta é obrigatória"),
  acao_id: z.string().optional().or(z.literal("")),
  receita_id: z.coerce.number<number>().optional().or(z.literal(0)),
  despesa_id: z.coerce.number<number>().optional().or(z.literal(0)),
  pessoa_id: z.string().optional().or(z.literal("")),
  observacao: z.string().max(1000).optional().or(z.literal("")),
})

type FormData = z.infer<typeof schema>

export function LancamentosPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Lancamento | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Lancamento | null>(null)
  const [filters, setFilters] = useState<LancamentosFilters>({ page: 1 })
  const { canCreate, canEdit, canDelete } = usePermissions("lancamentos")
  const queryClient = useQueryClient()

  const { data: response, isLoading } = useQuery({
    queryKey: ["lancamentos", filters],
    queryFn: () => lancamentosApi.list(filters),
  })

  const { data: contas } = useQuery({ queryKey: ["contas"], queryFn: contasApi.list })
  const { data: acoes } = useQuery({ queryKey: ["acoes"], queryFn: acoesApi.list })
  const { data: pessoas } = useQuery({ queryKey: ["pessoas"], queryFn: pessoasApi.list })
  const { data: despesas } = useQuery({ queryKey: ["despesas"], queryFn: despesasApi.list })
  const { data: receitas } = useQuery({ queryKey: ["receitas"], queryFn: receitasApi.list })

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { data_transacao: "", valor: 0, tipo_transacao: TipoTransacao.RECEITA, conta_id: "", acao_id: "", receita_id: 0, despesa_id: 0, pessoa_id: "", observacao: "" },
  })

  const tipoWatch = form.watch("tipo_transacao")

  useEffect(() => {
    if (tipoWatch === "RECEITA") form.setValue("despesa_id", 0)
    else form.setValue("receita_id", 0)
  }, [tipoWatch, form])

  const createMut = useMutation({
    mutationFn: (d: FormData) => lancamentosApi.create({
      data_transacao: d.data_transacao, valor: d.valor, tipo_transacao: d.tipo_transacao, conta_id: d.conta_id,
      acao_id: d.acao_id || null, pessoa_id: d.pessoa_id || null, observacao: d.observacao || null,
      receita_id: d.receita_id || null, despesa_id: d.despesa_id || null,
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["lancamentos"] }); toast({ title: "Lançamento criado com sucesso" }); closeDialog() },
    onError: (e) => toast({ title: "Erro", description: e instanceof ApiRequestError ? e.messages[0] : "Erro ao criar", variant: "destructive" }),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, d }: { id: string; d: FormData }) => lancamentosApi.update(id, {
      data_transacao: d.data_transacao, valor: d.valor, tipo_transacao: d.tipo_transacao, conta_id: d.conta_id,
      acao_id: d.acao_id || null, pessoa_id: d.pessoa_id || null, observacao: d.observacao || null,
      receita_id: d.receita_id || null, despesa_id: d.despesa_id || null,
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["lancamentos"] }); toast({ title: "Lançamento atualizado" }); closeDialog() },
    onError: (e) => toast({ title: "Erro", description: e instanceof ApiRequestError ? e.messages[0] : "Erro ao atualizar", variant: "destructive" }),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => lancamentosApi.remove(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["lancamentos"] }); toast({ title: "Lançamento excluído" }); setDeleteTarget(null) },
    onError: (e) => toast({ title: "Erro", description: e instanceof ApiRequestError ? e.messages[0] : "Erro ao excluir", variant: "destructive" }),
  })

  function openCreate() {
    setEditing(null)
    form.reset({ data_transacao: new Date().toISOString().split("T")[0], valor: 0, tipo_transacao: TipoTransacao.RECEITA, conta_id: "", acao_id: "", receita_id: 0, despesa_id: 0, pessoa_id: "", observacao: "" })
    setDialogOpen(true)
  }

  function openEdit(item: Lancamento) {
    setEditing(item)
    form.reset({
      data_transacao: item.data_transacao.split("T")[0],
      valor: item.valor,
      tipo_transacao: item.tipo_transacao,
      conta_id: item.conta_id,
      acao_id: item.acao_id ?? "",
      receita_id: item.receita_id ?? 0,
      despesa_id: item.despesa_id ?? 0,
      pessoa_id: item.pessoa_id ?? "",
      observacao: item.observacao ?? "",
    })
    setDialogOpen(true)
  }

  function closeDialog() { setDialogOpen(false); setEditing(null); form.reset() }

  function onSubmit(d: FormData) {
    if (editing) updateMut.mutate({ id: editing.id, d })
    else createMut.mutate(d)
  }

  const lancamentos = response?.data ?? []
  const meta = response?.meta

  const columns: Column<Lancamento>[] = [
    {
      key: "data_transacao",
      header: "Data",
      sortable: true,
      render: (item) => <span className="text-sm">{new Date(item.data_transacao).toLocaleDateString("pt-BR")}</span>,
    },
    {
      key: "tipo_transacao",
      header: "Tipo",
      render: (item) => (
        <Badge variant={item.tipo_transacao === TipoTransacao.RECEITA ? "success" : "destructive"}>
          {TIPO_LABELS[item.tipo_transacao]}
        </Badge>
      ),
    },
    {
      key: "valor",
      header: "Valor",
      sortable: true,
      render: (item) => (
        <span className={`font-mono font-medium ${item.tipo_transacao === TipoTransacao.RECEITA ? "text-receita" : "text-despesa"}`}>
          {Number(item.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </span>
      ),
    },
    {
      key: "conta",
      header: "Conta",
      render: (item) => <span>{item.contas?.descricao ?? "—"}</span>,
    },
    {
      key: "pessoa",
      header: "Pessoa",
      render: (item) => <span className="text-sm">{item.pessoas?.nome_completo ?? "—"}</span>,
    },
    {
      key: "observacao",
      header: "Obs.",
      render: (item) => <span className="text-xs text-muted-foreground truncate max-w-[150px] block">{item.observacao ?? "—"}</span>,
    },
  ]

  const actions = (canEdit || canDelete)
    ? (item: Lancamento) => (
        <div className="flex gap-1">
          {canEdit && <Button variant="ghost" size="icon" onClick={() => openEdit(item)}><Pencil size={16} /></Button>}
          {canDelete && <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(item)}><Trash2 size={16} className="text-destructive" /></Button>}
        </div>
      )
    : undefined

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold">Lançamentos</h1>
          <p className="text-sm text-muted-foreground">Gerencie os lançamentos financeiros</p>
        </div>
        {canCreate && (
          <Button onClick={openCreate}><Plus size={18} className="mr-2" />Novo Lançamento</Button>
        )}
      </div>

      <div className="flex gap-3 flex-wrap">
        <Select value={filters.tipo ?? "all"} onValueChange={(v) => setFilters((f) => ({ ...f, tipo: v === "all" ? undefined : v, page: 1 }))}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="RECEITA">Receitas</SelectItem>
            <SelectItem value="DESPESA">Despesas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.conta_id ?? "all"} onValueChange={(v) => setFilters((f) => ({ ...f, conta_id: v === "all" ? undefined : v, page: 1 }))}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Conta" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as contas</SelectItem>
            {contas?.map((c) => <SelectItem key={c.id} value={c.id}>{c.descricao}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-muted-foreground">Carregando...</div>
      ) : !lancamentos.length ? (
        <EmptyState icon={ArrowRightLeft} title="Nenhum lançamento" description="Nenhum lançamento encontrado" />
      ) : (
        <>
          <DataTable data={lancamentos} columns={columns} keyExtractor={(item) => item.id} actions={actions} />
          {meta && meta.total_pages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button variant="outline" size="sm" disabled={meta.page <= 1} onClick={() => setFilters((f) => ({ ...f, page: meta.page - 1 }))}>
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {meta.page} de {meta.total_pages}
              </span>
              <Button variant="outline" size="sm" disabled={meta.page >= meta.total_pages} onClick={() => setFilters((f) => ({ ...f, page: meta.page + 1 }))}>
                Próxima
              </Button>
            </div>
          )}
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar" : "Novo"} Lançamento</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="data_transacao">Data *</Label>
                <Input id="data_transacao" type="date" {...form.register("data_transacao")} />
                {form.formState.errors.data_transacao && <p className="text-xs text-destructive">{form.formState.errors.data_transacao.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="valor">Valor (R$) *</Label>
                <Input id="valor" type="number" step="0.01" {...form.register("valor", { valueAsNumber: true })} />
                {form.formState.errors.valor && <p className="text-xs text-destructive">{form.formState.errors.valor.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select value={tipoWatch} onValueChange={(v) => form.setValue("tipo_transacao", v as TipoTransacao)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIPO_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Conta *</Label>
                <Select value={form.watch("conta_id")} onValueChange={(v) => form.setValue("conta_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {contas?.map((c) => <SelectItem key={c.id} value={c.id}>{c.descricao}</SelectItem>)}
                  </SelectContent>
                </Select>
                {form.formState.errors.conta_id && <p className="text-xs text-destructive">{form.formState.errors.conta_id.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Ação</Label>
                <Select value={form.watch("acao_id") ?? ""} onValueChange={(v) => form.setValue("acao_id", v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhuma</SelectItem>
                    {acoes?.map((a) => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{tipoWatch === TipoTransacao.RECEITA ? "Tipo de Receita" : "Tipo de Despesa"}</Label>
                {tipoWatch === TipoTransacao.RECEITA ? (
                  <Select value={String(form.watch("receita_id") || "")} onValueChange={(v) => form.setValue("receita_id", Number(v))}>
                    <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                    <SelectContent>
                      {receitas?.map((r) => <SelectItem key={r.id} value={String(r.id)}>{r.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Select value={String(form.watch("despesa_id") || "")} onValueChange={(v) => form.setValue("despesa_id", Number(v))}>
                    <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                    <SelectContent>
                      {despesas?.map((d) => <SelectItem key={d.id} value={String(d.id)}>{d.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2">
                <Label>Pessoa</Label>
                <Select value={form.watch("pessoa_id") ?? ""} onValueChange={(v) => form.setValue("pessoa_id", v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhuma</SelectItem>
                    {pessoas?.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome_completo}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="observacao">Observação</Label>
              <Textarea id="observacao" {...form.register("observacao")} rows={2} />
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
        title="Excluir lançamento"
        description="Tem certeza que deseja excluir este lançamento? Esta ação não pode ser desfeita."
      />
    </div>
  )
}
