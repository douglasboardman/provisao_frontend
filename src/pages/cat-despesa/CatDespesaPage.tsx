import { Tags as PageIcon } from "lucide-react"
import { WorkspaceHeader } from "../../components/shared/Workspace"
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Pencil, Trash2, Tag, ChevronRight } from "lucide-react"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { ColorPicker } from "../../components/ui/color-picker"
import { Checkbox } from "../../components/ui/checkbox"
import { Badge } from "../../components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog"
import { DeleteDialog } from "../../components/shared/DeleteDialog"
import { EmptyState } from "../../components/shared/EmptyState"
import { usePermissions } from "../../hooks/use-permissions"
import { toast } from "../../components/ui/use-toast"
import { catDespesaApi } from "../../api/cat-despesa"
import { despesasApi } from "../../api/despesas"
import { ApiRequestError } from "../../api/client"
import type { CatDespesa, Despesa } from "../../types/models"

const catSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  cor_hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Cor inválida").optional().or(z.literal("")),
})
type CatFormData = z.infer<typeof catSchema>

const tipoSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  requer_pessoa: z.boolean(),
  requer_acao: z.boolean(),
  requer_conta: z.boolean(),
  requer_comprovante: z.boolean(),
})
type TipoFormData = z.infer<typeof tipoSchema>
const TIPO_DEFAULTS: TipoFormData = { nome: "", requer_pessoa: false, requer_acao: false, requer_conta: false, requer_comprovante: false }
const REQUISITO_LABELS = { requer_pessoa: "Pessoa", requer_acao: "Ação", requer_conta: "Conta", requer_comprovante: "Comprovante" } as const

export function CatDespesaPage() {
  const [selectedCat, setSelectedCat] = useState<CatDespesa | null>(null)
  const [catDialogOpen, setCatDialogOpen] = useState(false)
  const [editingCat, setEditingCat] = useState<CatDespesa | null>(null)
  const [deleteCatTarget, setDeleteCatTarget] = useState<CatDespesa | null>(null)
  const [tipoDialogOpen, setTipoDialogOpen] = useState(false)
  const [editingTipo, setEditingTipo] = useState<Despesa | null>(null)
  const [deleteTipoTarget, setDeleteTipoTarget] = useState<Despesa | null>(null)

  const permCat = usePermissions("cat-despesa")
  const permTipo = usePermissions("despesas")
  const queryClient = useQueryClient()

  const { data: categorias = [], isLoading: loadingCats } = useQuery({
    queryKey: ["cat-despesa"],
    queryFn: catDespesaApi.list,
  })
  const { data: allTipos = [], isLoading: loadingTipos } = useQuery({
    queryKey: ["despesas"],
    queryFn: despesasApi.list,
  })

  const tiposDaCategoria = selectedCat ? allTipos.filter((t) => t.cat_despesa_id === selectedCat.id) : []

  const catForm = useForm<CatFormData>({ resolver: zodResolver(catSchema), defaultValues: { nome: "", cor_hex: "" } })
  const tipoForm = useForm<TipoFormData>({ resolver: zodResolver(tipoSchema), defaultValues: TIPO_DEFAULTS })

  const createCatMut = useMutation({
    mutationFn: (d: CatFormData) => catDespesaApi.create({ nome: d.nome, cor_hex: d.cor_hex || undefined }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["cat-despesa"] }); toast({ title: "Categoria criada" }); closeCatDialog() },
    onError: (e) => toast({ title: "Erro", description: e instanceof ApiRequestError ? e.messages[0] : "Erro ao criar", variant: "destructive" }),
  })
  const updateCatMut = useMutation({
    mutationFn: ({ id, d }: { id: number; d: CatFormData }) => catDespesaApi.update(id, { nome: d.nome, cor_hex: d.cor_hex || undefined }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["cat-despesa"] }); toast({ title: "Categoria atualizada" }); closeCatDialog() },
    onError: (e) => toast({ title: "Erro", description: e instanceof ApiRequestError ? e.messages[0] : "Erro ao atualizar", variant: "destructive" }),
  })
  const deleteCatMut = useMutation({
    mutationFn: (id: number) => catDespesaApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cat-despesa"] })
      if (selectedCat?.id === deleteCatTarget?.id) setSelectedCat(null)
      toast({ title: "Categoria excluída" })
      setDeleteCatTarget(null)
    },
    onError: (e) => toast({ title: "Erro", description: e instanceof ApiRequestError ? e.messages[0] : "Erro ao excluir", variant: "destructive" }),
  })

  const createTipoMut = useMutation({
    mutationFn: (d: TipoFormData) => despesasApi.create({ ...d, cat_despesa_id: selectedCat!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["despesas"] })
      queryClient.invalidateQueries({ queryKey: ["cat-despesa"] })
      toast({ title: "Despesa criada" })
      closeTipoDialog()
    },
    onError: (e) => toast({ title: "Erro", description: e instanceof ApiRequestError ? e.messages[0] : "Erro ao criar", variant: "destructive" }),
  })
  const updateTipoMut = useMutation({
    mutationFn: ({ id, d }: { id: number; d: TipoFormData }) => despesasApi.update(id, { ...d, cat_despesa_id: selectedCat!.id }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["despesas"] }); toast({ title: "Despesa atualizada" }); closeTipoDialog() },
    onError: (e) => toast({ title: "Erro", description: e instanceof ApiRequestError ? e.messages[0] : "Erro ao atualizar", variant: "destructive" }),
  })
  const deleteTipoMut = useMutation({
    mutationFn: (id: number) => despesasApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["despesas"] })
      queryClient.invalidateQueries({ queryKey: ["cat-despesa"] })
      toast({ title: "Despesa excluída" })
      setDeleteTipoTarget(null)
    },
    onError: (e) => toast({ title: "Erro", description: e instanceof ApiRequestError ? e.messages[0] : "Erro ao excluir", variant: "destructive" }),
  })

  function openCreateCat() { setEditingCat(null); catForm.reset({ nome: "", cor_hex: "" }); setCatDialogOpen(true) }
  function openEditCat(item: CatDespesa) { setEditingCat(item); catForm.reset({ nome: item.nome, cor_hex: item.cor_hex ?? "" }); setCatDialogOpen(true) }
  function closeCatDialog() { setCatDialogOpen(false); setEditingCat(null); catForm.reset() }
  function onSubmitCat(d: CatFormData) { editingCat ? updateCatMut.mutate({ id: editingCat.id, d }) : createCatMut.mutate(d) }

  function openCreateTipo() { setEditingTipo(null); tipoForm.reset(TIPO_DEFAULTS); setTipoDialogOpen(true) }
  function openEditTipo(item: Despesa) {
    setEditingTipo(item)
    tipoForm.reset({ nome: item.nome, requer_pessoa: item.requer_pessoa, requer_acao: item.requer_acao, requer_conta: item.requer_conta, requer_comprovante: item.requer_comprovante })
    setTipoDialogOpen(true)
  }
  function closeTipoDialog() { setTipoDialogOpen(false); setEditingTipo(null); tipoForm.reset(TIPO_DEFAULTS) }
  function onSubmitTipo(d: TipoFormData) { editingTipo ? updateTipoMut.mutate({ id: editingTipo.id, d }) : createTipoMut.mutate(d) }

  return (
    <div className="workspace">
      <WorkspaceHeader icon={PageIcon} title="Categorias de Despesa" description="Gerencie as categorias e suas despesas" />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(240px,340px)_minmax(0,1fr)] gap-6" style={{ minHeight: "520px" }}>
        {/* Painel esquerdo: categorias */}
        <div className="flex flex-col border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <span className="text-sm font-semibold text-foreground">Categorias</span>
            {permCat.canCreate && (
              <Button size="sm" onClick={openCreateCat}>
                <Plus size={14} className="mr-1" />Nova Categoria
              </Button>
            )}
          </div>

          {loadingCats ? (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">Carregando...</div>
          ) : !categorias.length ? (
            <div className="flex-1 flex items-center justify-center p-4">
              <EmptyState icon={Tag} title="Nenhuma categoria" description="Crie a primeira categoria de despesa" />
            </div>
          ) : (
            <ul className="flex-1 overflow-y-auto divide-y divide-border">
              {categorias.map((cat) => (
                <li
                  key={cat.id}
                  onClick={() => setSelectedCat(cat)}
                  className={`group flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-muted/40 ${
                    selectedCat?.id === cat.id ? "bg-purple-light/15 border-l-2 border-purple" : "border-l-2 border-transparent"
                  }`}
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0 border border-border"
                    style={{ backgroundColor: cat.cor_hex ?? "hsl(var(--muted-foreground))" }}
                  />
                  <span className="flex-1 text-sm font-medium truncate">{cat.nome}</span>
                  <Badge variant="secondary" className="text-xs tabular-nums">{cat._count?.despesas ?? 0}</Badge>
                  {(permCat.canEdit || permCat.canDelete) && (
                    <div
                      className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {permCat.canEdit && (
                        <button className="p-1 rounded hover:bg-muted" onClick={() => openEditCat(cat)}>
                          <Pencil size={13} />
                        </button>
                      )}
                      {permCat.canDelete && (
                        <button className="p-1 rounded hover:bg-muted text-destructive" onClick={() => setDeleteCatTarget(cat)}>
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  )}
                  <ChevronRight
                    size={14}
                    className={`flex-shrink-0 text-muted-foreground transition-opacity ${selectedCat?.id === cat.id ? "opacity-100" : "opacity-20"}`}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Painel direito: tipos da categoria selecionada */}
        <div className="flex flex-col border border-border rounded-2xl overflow-hidden">
          {!selectedCat ? (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
              Selecione uma categoria para ver as despesas
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                <div className="flex items-center gap-2">
                  {selectedCat.cor_hex && (
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: selectedCat.cor_hex }} />
                  )}
                  <span className="text-sm font-semibold text-foreground">{selectedCat.nome}</span>
                </div>
                {permTipo.canCreate && (
                  <Button size="sm" onClick={openCreateTipo}>
                    <Plus size={14} className="mr-1" />Nova Despesa
                  </Button>
                )}
              </div>

              {loadingTipos ? (
                <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">Carregando...</div>
              ) : !tiposDaCategoria.length ? (
                <div className="flex-1 flex items-center justify-center p-4">
                  <EmptyState icon={Tag} title="Nenhuma despesa" description={`Nenhuma despesa em "${selectedCat.nome}"`} />
                </div>
              ) : (
                <ul className="flex-1 overflow-y-auto divide-y divide-border">
                  {tiposDaCategoria.map((tipo) => (
                    <li key={tipo.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors">
                      <span className="flex-1 text-sm font-medium">{tipo.nome}</span>
                      <div className="flex gap-1 flex-wrap">
                        {tipo.requer_pessoa && <Badge variant="secondary" className="text-xs">Pessoa</Badge>}
                        {tipo.requer_acao && <Badge variant="secondary" className="text-xs">Ação</Badge>}
                        {tipo.requer_conta && <Badge variant="secondary" className="text-xs">Conta</Badge>}
                        {tipo.requer_comprovante && <Badge variant="secondary" className="text-xs">Comprovante</Badge>}
                      </div>
                      {(permTipo.canEdit || permTipo.canDelete) && (
                        <div className="flex gap-1">
                          {permTipo.canEdit && (
                            <Button variant="ghost" size="icon" onClick={() => openEditTipo(tipo)}><Pencil size={14} /></Button>
                          )}
                          {permTipo.canDelete && (
                            <Button variant="ghost" size="icon" onClick={() => setDeleteTipoTarget(tipo)}>
                              <Trash2 size={14} className="text-destructive" />
                            </Button>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>

      {/* Dialog: categoria */}
      <Dialog open={catDialogOpen} onOpenChange={(o) => !o && closeCatDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCat ? "Editar" : "Nova"} Categoria de Despesa</DialogTitle>
          </DialogHeader>
          <form onSubmit={catForm.handleSubmit(onSubmitCat)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cat-nome">Nome *</Label>
              <Input id="cat-nome" {...catForm.register("nome")} />
              {catForm.formState.errors.nome && <p className="text-xs text-destructive">{catForm.formState.errors.nome.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <ColorPicker value={catForm.watch("cor_hex")} onChange={(v) => catForm.setValue("cor_hex", v)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeCatDialog}>Cancelar</Button>
              <Button type="submit" disabled={createCatMut.isPending || updateCatMut.isPending}>
                {createCatMut.isPending || updateCatMut.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: tipo */}
      <Dialog open={tipoDialogOpen} onOpenChange={(o) => !o && closeTipoDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTipo ? "Editar" : "Nova"} Despesa</DialogTitle>
          </DialogHeader>
          <form onSubmit={tipoForm.handleSubmit(onSubmitTipo)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tipo-nome">Nome *</Label>
              <Input id="tipo-nome" {...tipoForm.register("nome")} />
              {tipoForm.formState.errors.nome && <p className="text-xs text-destructive">{tipoForm.formState.errors.nome.message}</p>}
            </div>
            <div className="space-y-3">
              <Label>Requisitos do lançamento</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(["requer_pessoa", "requer_acao", "requer_conta", "requer_comprovante"] as const).map((f) => (
                  <label key={f} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={tipoForm.watch(f)} onCheckedChange={(v) => tipoForm.setValue(f, !!v)} />
                    {REQUISITO_LABELS[f]}
                  </label>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeTipoDialog}>Cancelar</Button>
              <Button type="submit" disabled={createTipoMut.isPending || updateTipoMut.isPending}>
                {createTipoMut.isPending || updateTipoMut.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DeleteDialog
        open={!!deleteCatTarget}
        onOpenChange={(o) => !o && setDeleteCatTarget(null)}
        onConfirm={() => deleteCatTarget && deleteCatMut.mutate(deleteCatTarget.id)}
        loading={deleteCatMut.isPending}
        title="Excluir categoria"
        description={`Tem certeza que deseja excluir "${deleteCatTarget?.nome}"? Os tipos vinculados ficarão sem categoria.`}
      />
      <DeleteDialog
        open={!!deleteTipoTarget}
        onOpenChange={(o) => !o && setDeleteTipoTarget(null)}
        onConfirm={() => deleteTipoTarget && deleteTipoMut.mutate(deleteTipoTarget.id)}
        loading={deleteTipoMut.isPending}
        title="Excluir despesa"
        description={`Tem certeza que deseja excluir "${deleteTipoTarget?.nome}"?`}
      />
    </div>
  )
}
