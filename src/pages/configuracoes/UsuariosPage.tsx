import { AcessosDaConta, HistoricoAcessos } from './AtuacaoConta'
import { SeletorPessoa } from '../../components/shared/SeletorPessoa'
import { useState } from "react"
import { useSearchParams } from "react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Pencil, Trash2, UserCheck, Users, UserCog, Link2 } from "lucide-react"
import { Abas, type Aba } from "../../components/ui/abas"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "../../components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../../components/ui/select"
import { DataTable, type Column } from "../../components/shared/DataTable"
import { DeleteDialog } from "../../components/shared/DeleteDialog"
import { EmptyState } from "../../components/shared/EmptyState"
import { WorkspaceHeader } from "../../components/shared/Workspace"
import { Badge } from "../../components/ui/badge"
import { usePermissions } from "../../hooks/use-permissions"
import { toast } from "../../components/ui/use-toast"
import { useAuthStore } from "../../stores/auth"
import { AccessAuthoritiesPanel } from "./AccessAuthoritiesPanel"
import { EmailQueuePanel } from "./EmailQueuePanel"
import { AccessRequestsPanel } from "./AccessRequestsPanel"
import { usuariosApi } from "../../api/usuarios"
import { pessoasApi } from "../../api/pessoas"
import { ApiRequestError } from "../../api/client"
import { Perfil } from "../../types/enums"
import type { Usuario } from "../../types/models"

const PERFIL_LABELS: Record<Perfil, string> = {
  [Perfil.COMUM]: "Conta comum",
  [Perfil.ADMINISTRADOR]: "Administrador",
  [Perfil.AUDITOR]: "Auditor",
  [Perfil.OPERADOR]: "Operador",
  [Perfil.SECRETARIO]: "Secretário",
  [Perfil.TESOUREIRO]: "Tesoureiro",
  [Perfil.GESTOR]: "Gestor",
}

const schema = z.object({
  nome_usuario: z.string().min(1, "Nome é obrigatório"),
  email_login: z.string().trim().email("E-mail inválido"),
  perfil: z.nativeEnum(Perfil),
  ativo: z.boolean(),
})

type FormData = z.infer<typeof schema>

export function UsuariosPage() {
  const [parametros, definirParametros] = useSearchParams()
  const [acessos, abrirAcessos] = useState<Usuario | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [linkTarget, setLinkTarget] = useState<Usuario | null>(null)
  const [selectedPerson, setSelectedPerson] = useState("none")
  const [editing, setEditing] = useState<Usuario | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Usuario | null>(null)
  const perfilAtual = useAuthStore(s => s.user?.perfil)
  const { canView, canCreate, canEdit, canDelete } = usePermissions("usuarios")
  const { canView: podeVerSolicitacoes } = usePermissions("solicitacoes-acesso")
  const queryClient = useQueryClient()

  const { data, isPending, isError } = useQuery({ queryKey: ["usuarios"], queryFn: usuariosApi.list, enabled: canView })
  const usuarios = canView ? data ?? [] : []

  const { data: pessoas } = useQuery({ queryKey: ["pessoas"], queryFn: pessoasApi.list, enabled: !!linkTarget })
  const linkMut = useMutation({
    mutationFn: () => usuariosApi.vincularPessoa(linkTarget!.id, selectedPerson === "none" ? null : selectedPerson),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["usuarios"] }); setLinkTarget(null); toast({ title: "Vínculo atualizado" }) },
    onError: e => toast({ title: "Erro", description: e instanceof ApiRequestError ? e.messages[0] : "Não foi possível vincular", variant: "destructive" }),
  })

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { nome_usuario: "", email_login: "", perfil: Perfil.COMUM, ativo: true },
  })

  const saveMut = useMutation({
    mutationFn: (d: FormData) => {
      if (editing) {
        const payload: Partial<Usuario> = { nome_usuario: d.nome_usuario, email_login: d.email_login, perfil: d.perfil, ativo: d.ativo }
        return usuariosApi.update(editing.id, payload)
      }
      return usuariosApi.create({ nome_usuario: d.nome_usuario, email_login: d.email_login, perfil: d.perfil })
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["usuarios"] }); toast({ title: editing ? "Usuário atualizado" : "Conta criada inativa; envie o convite de ativação" }); closeDialog() },
    onError: (e) => toast({ title: "Erro", description: e instanceof ApiRequestError ? e.messages[0] : "Erro ao salvar", variant: "destructive" }),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => usuariosApi.remove(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["usuarios"] }); toast({ title: "Usuário excluído" }); setDeleteTarget(null) },
    onError: (e) => toast({ title: "Erro", description: e instanceof ApiRequestError ? e.messages[0] : "Erro ao excluir", variant: "destructive" }),
  })

  const activateMut = useMutation({
    mutationFn: (id: string) => usuariosApi.activate(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["usuarios"] }); toast({ title: "Aprovação registrada; convite na fila" }) },
    onError: (e) => toast({ title: "Erro", description: e instanceof ApiRequestError ? e.messages[0] : "Erro ao ativar", variant: "destructive" }),
  })

  function openCreate() {
    setEditing(null)
    form.reset({ nome_usuario: "", email_login: "", perfil: Perfil.COMUM, ativo: true })
    setDialogOpen(true)
  }

  function openEdit(item: Usuario) {
    setEditing(item)
    form.reset({ nome_usuario: item.nome_usuario, email_login: item.email_login, perfil: item.perfil, ativo: item.ativo })
    setDialogOpen(true)
  }

  function closeDialog() { setDialogOpen(false); setEditing(null) }

  const columns: Column<Usuario>[] = [
    { key: "nome_usuario", header: "Nome", sortable: true },
    { key: "email_login", header: "E-mail", render: (u) => <span className="text-sm">{u.email_login}</span> },
    { key: "perfil", header: "Perfil", render: (u) => <Badge variant="secondary">{PERFIL_LABELS[u.perfil]}</Badge> },
    {
      key: "ativo",
      header: "Status",
      render: (u) => (
        <Badge variant={u.ativo ? "success" : "outline"}>
          {u.ativo ? "Ativo" : "Inativo"}
        </Badge>
      ),
    },
  ]

  const actions = (canEdit || canDelete)
    ? (item: Usuario) => (
        <div className="flex gap-1">
          {canEdit && <Button variant="outline" onClick={() => abrirAcessos(item)}>Atuação</Button>}
          {canEdit && !item.ativo && (
            <Button variant="ghost" size="icon" onClick={() => activateMut.mutate(item.id)} title="Ativar">
              <UserCheck size={16} className="text-receita" />
            </Button>
          )}
          {canEdit && <Button variant="ghost" size="icon" title="Vincular pessoa" onClick={() => { setLinkTarget(item); setSelectedPerson(item.pessoa_id ?? "none") }}><Link2 size={16} /></Button>}
          {canEdit && <Button variant="ghost" size="icon" onClick={() => openEdit(item)}><Pencil size={16} /></Button>}
          {canDelete && <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(item)}><Trash2 size={16} className="text-destructive" /></Button>}
        </div>
      )
    : undefined

  const abas: Aba[] = []
  if (canView || canCreate) abas.push({
    id: "contas", nome: "Contas", manter: true,
    conteudo: !canView ? <p className="text-sm text-muted-foreground">A consulta de contas está indisponível.</p>
      : isPending ? <p role="status">Carregando contas…</p>
      : isError ? <p role="alert">Não foi possível carregar as contas.</p>
      : usuarios.length ? <DataTable data={usuarios} columns={columns} keyExtractor={u => u.id} actions={actions} />
      : <EmptyState icon={Users} title="Nenhum usuário" description="Nenhum usuário cadastrado" />,
  })
  if (podeVerSolicitacoes) abas.push({ id: "solicitacoes", nome: "Solicitações de acesso", conteudo: <AccessRequestsPanel /> })
  if (canCreate) abas.push(
    { id: "competencias", nome: "Competências", conteudo: <AccessAuthoritiesPanel usuarios={usuarios} /> },
    { id: "historico", nome: "Histórico", conteudo: <HistoricoAcessos usuarios={usuarios} /> },
  )
  if (perfilAtual === Perfil.ADMINISTRADOR) abas.push({ id: "emails", nome: "Envio de e-mails", conteudo: <EmailQueuePanel /> })
  const aba = abas.find(item => item.id === parametros.get("aba")) ?? abas[0]

  function selecionarAba(id: string) {
    if (id === aba?.id) return
    const proximos = new URLSearchParams(parametros)
    if (id === abas[0]?.id) proximos.delete("aba")
    else proximos.set("aba", id)
    definirParametros(proximos)
  }

  return (
    <div className="workspace">
      <WorkspaceHeader icon={UserCog} title="Usuários" description="Administração de contas e acessos">
        {aba?.id === "contas" && canCreate && (
          <Button onClick={openCreate}><Plus size={18} />Novo usuário</Button>
        )}
      </WorkspaceHeader>

      {aba ? <Abas titulo="Administração de usuários" abas={abas} ativa={aba.id} selecionar={selecionarAba} />
        : <p className="text-sm text-muted-foreground">Nenhuma seção disponível para esta conta.</p>}

      <Dialog open={!!acessos} onOpenChange={aberto => { if (!aberto) abrirAcessos(null) }}><DialogContent className="flex h-[min(46rem,calc(100dvh-2rem))] max-h-none max-w-4xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 px-4 pb-3 pt-5 pr-12 text-left sm:px-6 sm:pr-12">
          <DialogTitle className="text-xl leading-tight">Atuação de {acessos?.nome_usuario}</DialogTitle>
          <DialogDescription className="break-all">{acessos?.email_login}</DialogDescription>
        </DialogHeader>
        {acessos && <AcessosDaConta key={acessos.id} usuario={acessos}/>}
      </DialogContent></Dialog>
      <Dialog open={dialogOpen} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar" : "Novo"} Usuário</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((d) => saveMut.mutate(d))} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome_usuario">Nome *</Label>
              <Input id="nome_usuario" {...form.register("nome_usuario")} />
              {form.formState.errors.nome_usuario && <p className="text-xs text-destructive">{form.formState.errors.nome_usuario.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email_login">E-mail *</Label>
              <Input id="email_login" type="email" {...form.register("email_login")} />
              {form.formState.errors.email_login && <p className="text-xs text-destructive">{form.formState.errors.email_login.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Perfil *</Label>
              <Select value={form.watch("perfil")} onValueChange={(v) => form.setValue("perfil", v as Perfil)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PERFIL_LABELS).filter(([k]) => k === editing?.perfil ||
                    [Perfil.COMUM, Perfil.ADMINISTRADOR, Perfil.AUDITOR].some(p => p === k) &&
                    !(k === Perfil.COMUM && editing && [Perfil.GESTOR, Perfil.OPERADOR, Perfil.SECRETARIO, Perfil.TESOUREIRO].includes(editing.perfil))).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button>
              <Button type="submit" disabled={saveMut.isPending}>
                {saveMut.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!linkTarget} onOpenChange={(open) => { if (!open) setLinkTarget(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Vincular pessoa a {linkTarget?.nome_usuario}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Uma pessoa pode ter várias contas nesta igreja. Confirme a identidade antes de salvar. Alterar o vínculo encerra eventuais competências de aprovação deste usuário.</p>
          <SeletorPessoa value={selectedPerson} onChange={id => setSelectedPerson(id || "none")} rotulo="Pessoa" opcoes={[{ id: "none", nome: "Sem vínculo" }, ...(pessoas?.map(p => ({ id: p.id, nome: p.nome_completo })) ?? [])]} />
          <DialogFooter><Button type="button" onClick={() => linkMut.mutate()} disabled={linkMut.isPending || !pessoas}>Salvar vínculo</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
        loading={deleteMut.isPending}
        title="Excluir usuário"
        description={`Tem certeza que deseja excluir "${deleteTarget?.nome_usuario}"? Esta ação não pode ser desfeita.`}
      />
    </div>
  )
}
