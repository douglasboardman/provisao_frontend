import { ContactRound as PageIcon } from "lucide-react"
import { WorkspaceHeader } from "../../components/shared/Workspace"
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Pencil, Trash2, Users } from "lucide-react"
import { Button } from "../../components/ui/button"
import { DataTable, type Column } from "../../components/shared/DataTable"
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
import type { Pessoa } from "../../types/models"

const SEXO_LABELS: Record<Sexo, string> = { [Sexo.MASCULINO]: "Masculino", [Sexo.FEMININO]: "Feminino" }

export function PessoasPage() {
  const [deleteTarget, setDeleteTarget] = useState<Pessoa | null>(null)
  const { canCreate, canEdit, canDelete } = usePermissions("pessoas")
  const queryClient = useQueryClient()
  const { current, hasBack, push, pop, closeAll } = useModalStack()

  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ["pessoas"], queryFn: pessoasApi.list })

  const deleteMut = useMutation({
    mutationFn: (id: string) => pessoasApi.remove(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["pessoas"] }); toast({ title: "Pessoa excluída" }); setDeleteTarget(null) },
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
        <button type="button" onClick={(e) => { e.stopPropagation(); push({ type: "familia", grupo: p.grupos_familiares! }) }}>
          <Badge variant="outline" className="hover:bg-muted cursor-pointer transition-colors">{p.grupos_familiares.nome_familia}</Badge>
        </button>
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

  return (
    <div className="workspace">
      <WorkspaceHeader icon={PageIcon} title="Pessoas" description="Gerencie os membros e participantes">
        {canCreate && (
          <Button onClick={() => push({ type: "pessoa-edit", pessoaId: null })}><Plus size={18} className="mr-2" />Nova Pessoa</Button>
        )}
      </WorkspaceHeader>

      {isLoading ? (
        <div className="py-16 text-center text-muted-foreground">Carregando...</div>
      ) : isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : !data?.length ? (
        <EmptyState icon={Users} title="Nenhuma pessoa" description="Nenhuma pessoa cadastrada" />
      ) : (
        <DataTable data={data} columns={columns} keyExtractor={(p) => p.id} actions={actions} />
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
