import { Landmark as PageIcon } from "lucide-react"
import { WorkspaceHeader } from "../../components/shared/Workspace"
import { AutorizacoesFinanceiras } from '../secretaria/AutorizacoesFinanceiras'
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Pencil, Trash2, KeySquare } from "lucide-react"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
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
import { contasApi } from "../../api/contas"
import { ApiRequestError } from "../../api/client"
import { TipoConta } from "../../types/enums"
import type { Conta } from "../../types/models"

const TIPO_LABELS: Record<TipoConta, string> = {
  [TipoConta.CORRENTE]: "Corrente",
  [TipoConta.POUPANCA]: "Poupança",
  [TipoConta.INVESTIMENTO]: "Investimento",
  [TipoConta.CAIXA]: "Caixa",
}

const schema = z.object({
  descricao: z.string().min(1, "Descrição é obrigatória"),
  banco: z.string().optional().or(z.literal("")),
  tipo_conta: z.nativeEnum(TipoConta),
  num_conta: z.string().optional().or(z.literal("")),
  agencia: z.string().optional().or(z.literal("")),
  saldo_inicial: z.coerce.number<number>().min(0, "Saldo inicial não pode ser negativo"),
  cor_hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Cor inválida").optional().or(z.literal("")),
})

type FormData = z.infer<typeof schema>

export function ContasPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Conta | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Conta | null>(null)
  const { canCreate, canEdit, canDelete } = usePermissions("contas")
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ["contas"],
    queryFn: contasApi.list,
  })

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { descricao: "", banco: "", tipo_conta: TipoConta.CORRENTE, num_conta: "", agencia: "", saldo_inicial: 0, cor_hex: "" },
  })

  const createMut = useMutation({
    mutationFn: (d: FormData) => contasApi.create({ ...d, banco: d.banco || undefined, num_conta: d.num_conta || undefined, agencia: d.agencia || undefined, cor_hex: d.cor_hex || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contas"] })
      toast({ title: "Conta criada com sucesso" })
      closeDialog()
    },
    onError: (e) => toast({ title: "Erro", description: e instanceof ApiRequestError ? e.messages[0] : "Erro ao criar", variant: "destructive" }),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, d }: { id: string; d: FormData }) => contasApi.update(id, { ...d, banco: d.banco || undefined, num_conta: d.num_conta || undefined, agencia: d.agencia || undefined, cor_hex: d.cor_hex || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contas"] })
      toast({ title: "Conta atualizada" })
      closeDialog()
    },
    onError: (e) => toast({ title: "Erro", description: e instanceof ApiRequestError ? e.messages[0] : "Erro ao atualizar", variant: "destructive" }),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => contasApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contas"] })
      toast({ title: "Conta excluída" })
      setDeleteTarget(null)
    },
    onError: (e) => toast({ title: "Erro", description: e instanceof ApiRequestError ? e.messages[0] : "Erro ao excluir", variant: "destructive" }),
  })

  function openCreate() {
    setEditing(null)
    form.reset({ descricao: "", banco: "", tipo_conta: TipoConta.CORRENTE, num_conta: "", agencia: "", saldo_inicial: 0, cor_hex: "" })
    setDialogOpen(true)
  }

  function openEdit(item: Conta) {
    setEditing(item)
    form.reset({
      descricao: item.descricao,
      banco: item.banco ?? "",
      tipo_conta: item.tipo_conta,
      num_conta: item.num_conta ?? "",
      agencia: item.agencia ?? "",
      saldo_inicial: item.saldo_inicial,
      cor_hex: item.cor_hex ?? "",
    })
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

  const columns: Column<Conta>[] = [
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
    { key: "descricao", header: "Descrição", sortable: true },
    { key: "banco", header: "Banco", render: (item) => <span>{item.banco ?? "—"}</span> },
    { key: "tipo_conta", header: "Tipo", render: (item) => <Badge variant="secondary">{TIPO_LABELS[item.tipo_conta]}</Badge> },
    {
      key: "saldo_inicial",
      header: "Saldo Inicial",
      sortable: true,
      render: (item) => (
        <span className="font-mono">
          {Number(item.saldo_inicial).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </span>
      ),
    },
  ]

  const actions = (canEdit || canDelete)
    ? (item: Conta) => (
        <div className="flex gap-1">
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
    : undefined

  return (
    <div className="workspace">
      <WorkspaceHeader icon={PageIcon} title="Contas" description="Gerencie as contas bancárias e caixas">
        {canCreate && (
          <Button onClick={openCreate}>
            <Plus size={18} className="mr-2" />
            Nova Conta
          </Button>
        )}
      </WorkspaceHeader>

      {isLoading ? (
        <div className="py-16 text-center text-muted-foreground">Carregando...</div>
      ) : !data?.length ? (
        <EmptyState icon={KeySquare} title="Nenhuma conta" description="Nenhuma conta cadastrada" />
      ) : (
        <DataTable data={data} columns={columns} keyExtractor={(item) => item.id} actions={actions} />
      )}

      <AutorizacoesFinanceiras contas={data ?? []} selecao="contas" />

      <Dialog open={dialogOpen} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar" : "Nova"} Conta</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição *</Label>
              <Input id="descricao" {...form.register("descricao")} />
              {form.formState.errors.descricao && <p className="text-xs text-destructive">{form.formState.errors.descricao.message}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Conta *</Label>
                <Select value={form.watch("tipo_conta")} onValueChange={(v) => form.setValue("tipo_conta", v as TipoConta)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIPO_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="banco">Banco</Label>
                <Input id="banco" {...form.register("banco")} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="agencia">Agência</Label>
                <Input id="agencia" {...form.register("agencia")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="num_conta">Nº Conta</Label>
                <Input id="num_conta" {...form.register("num_conta")} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="saldo_inicial">Saldo Inicial *</Label>
                <Input id="saldo_inicial" type="number" step="0.01" {...form.register("saldo_inicial", { valueAsNumber: true })} />
                {form.formState.errors.saldo_inicial && <p className="text-xs text-destructive">{form.formState.errors.saldo_inicial.message}</p>}
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
        title="Excluir conta"
        description={`Tem certeza que deseja excluir "${deleteTarget?.descricao}"? Esta ação não pode ser desfeita.`}
      />
    </div>
  )
}
