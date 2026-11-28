import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Pencil, Trash2, Users } from "lucide-react"
import { Button } from "../../components/ui/button"
import { DataTable, type Column } from "../../components/shared/DataTable"
import { CampoBusca } from "../../components/shared/CampoBusca"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { DeleteDialog } from "../../components/shared/DeleteDialog"
import { FamiliaViewDialog } from "../../components/shared/FamiliaViewDialog"
import { PessoaEditDialog } from "../../components/shared/PessoaEditDialog"
import { HistoricoMembresiaDialog } from "../../components/shared/HistoricoMembresiaDialog"
import { EmptyState } from "../../components/shared/EmptyState"
import { ErrorState } from "../../components/shared/ErrorState"
import { Badge } from "../../components/ui/badge"
import { usePermissions } from "../../hooks/use-permissions"
import { useModalStack } from "../../hooks/use-modal-stack"
import { toast } from "../../components/ui/use-toast"
import { pessoasApi } from "../../api/pessoas"
import { ApiRequestError } from "../../api/client"
import { Sexo } from "../../types/enums"
import { formatCpf } from "../../lib/formatters"
import { calcAge } from "../../lib/membresia-labels"
import { correspondeBusca, correspondeCpf, normalizarBusca } from "../../lib/busca"
import { useAuthStore } from "../../stores/auth"
import type { Pessoa } from "../../types/models"

const SEXO_LABELS: Record<Sexo, string> = { [Sexo.MASCULINO]: "Masculino", [Sexo.FEMININO]: "Feminino" }

export function PessoasPage() {
  const [deleteTarget, setDeleteTarget] = useState<Pessoa | null>(null)
  const [busca, setBusca] = useState("")
  const [sexo, setSexo] = useState("todos")
  const [familia, setFamilia] = useState("todas")
  const { canView, canCreate, canEdit, canDelete } = usePermissions("pessoas")
  const identidade = useAuthStore(s => `${s.user?.igreja_id}:${s.user?.sub}`)
  const queryClient = useQueryClient()
  const { current, hasBack, push, pop, closeAll } = useModalStack()

  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ["pessoas", identidade], queryFn: pessoasApi.list, enabled: canView })

  const deleteMut = useMutation({
    mutationFn: (id: string) => pessoasApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pessoas"] })
      queryClient.invalidateQueries({ queryKey: ["grupos-familiares"] })
      queryClient.invalidateQueries({ queryKey: ["eventos-membresia"] })
      toast({ title: "Pessoa excluída" })
      setDeleteTarget(null)
    },
    onError: (e) => toast({ title: "Erro", description: e instanceof ApiRequestError ? e.messages[0] : "Erro ao excluir", variant: "destructive" }),
  })

  const columns: Column<Pessoa>[] = [
    { key: "nome_completo", header: "Nome", sortable: true },
    { key: "idade", header: "Idade", render: (p) => <span>{calcAge(p.data_nascimento)}</span> },
    { key: "cpf", header: "CPF", render: (p) => <span>{p.cpf ? formatCpf(p.cpf) : "—"}</span> },
    { key: "sexo", header: "Sexo", render: (p) => <span>{SEXO_LABELS[p.sexo]}</span> },
    { key: "email", header: "E-mail", render: (p) => <span>{p.email ?? "—"}</span> },
    {
      key: "grupo",
      header: "Grupo Familiar",
      render: (p) => p.grupos_familiares ? (
        <Badge asChild variant="outline">
          <button type="button" onClick={(e) => { e.stopPropagation(); push({ type: "familia", grupo: p.grupos_familiares! }) }}>
            {p.grupos_familiares.nome_familia}
          </button>
        </Badge>
      ) : <span className="text-muted-foreground">—</span>,
    },
  ]

  const actions = (canEdit || canDelete)
    ? (item: Pessoa) => (
        <div className="flex gap-1">
          {canEdit && <Button aria-label={'Editar ' + item.nome_completo} variant="ghost" size="icon" onClick={() => push({ type: "pessoa-edit", pessoaId: item.id })}><Pencil size={16} /></Button>}
          {canDelete && <Button aria-label={'Excluir ' + item.nome_completo} variant="ghost" size="icon" onClick={() => setDeleteTarget(item)}><Trash2 size={16} className="text-destructive" /></Button>}
        </div>
      )
    : undefined

  const termo = normalizarBusca(busca)
  const filtradas = (data ?? []).filter(p =>
    (correspondeBusca(termo, p.nome_completo, p.email, p.grupos_familiares?.nome_familia) || correspondeCpf(termo, p.cpf)) &&
    (sexo === "todos" || p.sexo === sexo) &&
    (familia === "todas" || (familia === "com" ? !!p.grupo_familiar_id : !p.grupo_familiar_id))
  )

  return (
    <div className="space-y-4">
      <div className="surface flex flex-wrap items-end gap-3">
        {canView && <>
          <div className="min-w-48 flex-[2]">
            <CampoBusca rotulo="Buscar pessoas" placeholder="Nome, CPF, e-mail ou família" valor={busca} mudar={setBusca} />
          </div>
          <div className="min-w-36 flex-1 space-y-1.5">
            <label htmlFor="pessoas-sexo" className="text-sm font-medium">Sexo</label>
            <Select value={sexo} onValueChange={setSexo}>
              <SelectTrigger id="pessoas-sexo" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {Object.entries(SEXO_LABELS).map(([id, label]) => <SelectItem key={id} value={id}>{label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-40 flex-1 space-y-1.5">
            <label htmlFor="pessoas-familia" className="text-sm font-medium">Vínculo familiar</label>
            <Select value={familia} onValueChange={setFamilia}>
              <SelectTrigger id="pessoas-familia" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todos os vínculos</SelectItem>
                <SelectItem value="com">Com grupo familiar</SelectItem>
                <SelectItem value="sem">Sem grupo familiar</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(busca || sexo !== "todos" || familia !== "todas") && <Button variant="ghost" onClick={() => { setBusca(""); setSexo("todos"); setFamilia("todas") }}>Limpar filtros</Button>}
        </>}
        {canCreate && <Button className="ml-auto" onClick={() => push({ type: "pessoa-edit", pessoaId: null })}><Plus size={18} className="mr-2" />Nova Pessoa</Button>}
      </div>
      {canView && (isLoading ? (
        <div className="py-16 text-center text-muted-foreground">Carregando...</div>
      ) : isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : !data?.length ? (
        <EmptyState icon={Users} title="Nenhuma pessoa" description="Nenhuma pessoa cadastrada" />
      ) : !filtradas.length ? (
        <EmptyState icon={Users} title="Nenhuma pessoa encontrada" description="Altere a busca ou os filtros." />
      ) : (
        <DataTable data={filtradas} columns={columns} keyExtractor={(p) => p.id} actions={actions} pageResetKey={JSON.stringify([termo, sexo, familia])} />
      ))}

      {current?.type === "familia" && <FamiliaViewDialog
        grupo={current?.type === "familia" ? current.grupo : null}
        onClose={closeAll}
        onBack={hasBack ? pop : undefined}
        onEditPessoa={(id) => push({ type: "pessoa-edit", pessoaId: id })}
        onViewHistorico={(id) => push({ type: "historico", pessoaId: id })}
      />}

      <PessoaEditDialog
        pessoaId={current?.type === "pessoa-edit" ? current.pessoaId : null}
        open={current?.type === "pessoa-edit"}
        onClose={closeAll}
        onBack={hasBack ? pop : undefined}
      />

      {current?.type === "historico" && <HistoricoMembresiaDialog
        pessoaId={current?.type === "historico" ? current.pessoaId : null}
        open
        onClose={closeAll}
        onBack={hasBack ? pop : undefined}
      />}

      <DeleteDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
        loading={deleteMut.isPending}
        title="Excluir pessoa"
        description={`Tem certeza que deseja excluir "${deleteTarget?.nome_completo}"? Esta ação não pode ser desfeita.`}
      />
    </div>
  )
}
