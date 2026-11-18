import { AutorizacoesFinanceiras } from '../secretaria/AutorizacoesFinanceiras'
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Pencil, Trash2, FileSpreadsheet } from "lucide-react"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Textarea } from "../../components/ui/textarea"
import { ColorPicker } from "../../components/ui/color-picker"
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
import { acoesApi } from "../../api/acoes"
import { pessoasApi } from "../../api/pessoas"
import { contasApi } from "../../api/contas"
import { ApiRequestError } from "../../api/client"
import type { Acao } from "../../types/models"

const schema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  descricao_detalhada: z.string().optional().or(z.literal("")),
  cor_hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Cor inválida").optional().or(z.literal("")),
  responsavel_pessoa_id: z.string().uuid("Responsável é obrigatório"),
  conta_id: z.string().uuid("Conta é obrigatória"),
  data_inicio: z.string().min(1, "Data de início é obrigatória"),
  data_fim: z.string().optional().or(z.literal("")),
  orcamento_receita: z.coerce.number<number>().min(0, "Não pode ser negativo"),
  orcamento_despesa: z.coerce.number<number>().min(0, "Não pode ser negativo"),
})

type FormData = z.infer<typeof schema>

export function AcoesPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Acao | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Acao | null>(null)
  const { canCreate, canEdit, canDelete } = usePermissions("acoes")
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({ queryKey: ["acoes"], queryFn: acoesApi.list })
  const { data: pessoas } = useQuery({ queryKey: ["pessoas"], queryFn: pessoasApi.list })
  const { data: contas } = useQuery({ queryKey: ["contas"], queryFn: contasApi.list })

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { nome: "", descricao_detalhada: "", cor_hex: "", responsavel_pessoa_id: "", conta_id: "", data_inicio: "", data_fim: "", orcamento_receita: 0, orcamento_despesa: 0 },
  })

  const createMut = useMutation({
    mutationFn: (d: FormData) => acoesApi.create({ ...d, descricao_detalhada: d.descricao_detalhada || undefined, cor_hex: d.cor_hex || undefined, data_fim: d.data_fim || undefined }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["acoes"] }); toast({ title: "Ação criada com sucesso" }); closeDialog() },
    onError: (e) => toast({ title: "Erro", description: e instanceof ApiRequestError ? e.messages[0] : "Erro ao criar", variant: "destructive" }),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, d }: { id: string; d: FormData }) => acoesApi.update(id, { ...d, descricao_detalhada: d.descricao_detalhada || undefined, cor_hex: d.cor_hex || undefined, data_fim: d.data_fim || undefined }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["acoes"] }); toast({ title: "Ação atualizada" }); closeDialog() },
    onError: (e) => toast({ title: "Erro", description: e instanceof ApiRequestError ? e.messages[0] : "Erro ao atualizar", variant: "destructive" }),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => acoesApi.remove(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["acoes"] }); toast({ title: "Ação excluída" }); setDeleteTarget(null) },
    onError: (e) => toast({ title: "Erro", description: e instanceof ApiRequestError ? e.messages[0] : "Erro ao excluir", variant: "destructive" }),
  })

  function openCreate() {
    setEditing(null)
    form.reset()
    setDialogOpen(true)
  }

  function openEdit(item: Acao) {
    setEditing(item)
    form.reset({
      nome: item.nome,
      descricao_detalhada: item.descricao_detalhada ?? "",
      cor_hex: item.cor_hex ?? "",
      responsavel_pessoa_id: item.responsavel_pessoa_id,
      conta_id: item.conta_id,
      data_inicio: item.data_inicio.split("T")[0],
      data_fim: item.data_fim?.split("T")[0] ?? "",
      orcamento_receita: item.orcamento_receita,
      orcamento_despesa: item.orcamento_despesa,
    })
    setDialogOpen(true)
  }

  function closeDialog() { setDialogOpen(false); setEditing(null); form.reset() }

  function onSubmit(d: FormData) {
    if (editing) updateMut.mutate({ id: editing.id, d })
    else createMut.mutate(d)
  }

  const columns: Column<Acao>[] = [
    {
      key: "cor_hex",
      header: "Cor",
      render: (item) =>
        item.cor_hex ? <div className="w-6 h-6 rounded-full border border-border" style={{ backgroundColor: item.cor_hex }} /> : <div className="w-6 h-6 rounded-full border border-border bg-muted" />,
    },
    { key: "nome", header: "Nome", sortable: true },
    {
      key: "responsavel",
      header: "Responsável",
      render: (item) => <span>{item.pessoas?.nome_completo ?? "—"}</span>,
    },
    {
      key: "conta",
      header: "Conta",
      render: (item) => item.contas ? <Badge variant="outline">{item.contas.descricao}</Badge> : <span>—</span>,
    },
    {
      key: "periodo",
      header: "Período",
      render: (item) => (
        <span className="text-xs">
          {new Date(item.data_inicio).toLocaleDateString("pt-BR")}
          {item.data_fim ? ` — ${new Date(item.data_fim).toLocaleDateString("pt-BR")}` : " — em andamento"}
        </span>
      ),
    },
    {
      key: "orcamento",
      header: "Orçamento (R/D)",
      render: (item) => (
        <span className="text-xs font-mono">
          <span className="text-receita">{Number(item.orcamento_receita).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
          {" / "}
          <span className="text-despesa">{Number(item.orcamento_despesa).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
        </span>
      ),
    },
  ]

  const actions = (canEdit || canDelete)
    ? (item: Acao) => (
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
          <h1 className="text-2xl font-heading font-bold">Ações</h1>
          <p className="text-sm text-muted-foreground">Gerencie as ações e projetos da igreja</p>
        </div>
        {canCreate && (
          <Button onClick={openCreate}><Plus size={18} className="mr-2" />Nova Ação</Button>
        )}
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-muted-foreground">Carregando...</div>
      ) : !data?.length ? (
        <EmptyState icon={FileSpreadsheet} title="Nenhuma ação" description="Nenhuma ação cadastrada" />
      ) : (
        <DataTable data={data} columns={columns} keyExtractor={(item) => item.id} actions={actions} />
      )}

      <AutorizacoesFinanceiras projetos={data ?? []} selecao="projetos" />

      <Dialog open={dialogOpen} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar" : "Nova"} Ação</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input id="nome" {...form.register("nome")} />
              {form.formState.errors.nome && <p className="text-xs text-destructive">{form.formState.errors.nome.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricao_detalhada">Descrição Detalhada</Label>
              <Textarea id="descricao_detalhada" {...form.register("descricao_detalhada")} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Responsável *</Label>
                <Select value={form.watch("responsavel_pessoa_id")} onValueChange={(v) => form.setValue("responsavel_pessoa_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {pessoas?.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome_completo}</SelectItem>)}
                  </SelectContent>
                </Select>
                {form.formState.errors.responsavel_pessoa_id && <p className="text-xs text-destructive">{form.formState.errors.responsavel_pessoa_id.message}</p>}
              </div>
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
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="data_inicio">Data Início *</Label>
                <Input id="data_inicio" type="date" {...form.register("data_inicio")} />
                {form.formState.errors.data_inicio && <p className="text-xs text-destructive">{form.formState.errors.data_inicio.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="data_fim">Data Fim</Label>
                <Input id="data_fim" type="date" {...form.register("data_fim")} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="orcamento_receita">Orçamento Receita *</Label>
                <Input id="orcamento_receita" type="number" step="0.01" {...form.register("orcamento_receita", { valueAsNumber: true })} />
                {form.formState.errors.orcamento_receita && <p className="text-xs text-destructive">{form.formState.errors.orcamento_receita.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="orcamento_despesa">Orçamento Despesa *</Label>
                <Input id="orcamento_despesa" type="number" step="0.01" {...form.register("orcamento_despesa", { valueAsNumber: true })} />
                {form.formState.errors.orcamento_despesa && <p className="text-xs text-destructive">{form.formState.errors.orcamento_despesa.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Cor</Label>
                <ColorPicker value={form.watch("cor_hex")} onChange={(v) => form.setValue("cor_hex", v)} />
              </div>
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
        title="Excluir ação"
        description={`Tem certeza que deseja excluir "${deleteTarget?.nome}"? Esta ação não pode ser desfeita.`}
      />
    </div>
  )
}
