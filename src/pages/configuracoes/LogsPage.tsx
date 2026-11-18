import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { FileText } from "lucide-react"
import { Button } from "../../components/ui/button"
import { DataTable, type Column } from "../../components/shared/DataTable"
import { EmptyState } from "../../components/shared/EmptyState"
import { Badge } from "../../components/ui/badge"
import { logsApi } from "../../api/logs"
import { LogAcao } from "../../types/enums"
import type { LogAtividade } from "../../types/models"

const ACAO_LABELS: Record<LogAcao, string> = {
  [LogAcao.DOWNLOAD]: "Download",
  [LogAcao.CRIACAO]: "Criação",
  [LogAcao.ATUALIZACAO]: "Atualização",
  [LogAcao.EXCLUSAO]: "Exclusão",
  [LogAcao.LOGIN_SUCESSO]: "Login",
  [LogAcao.LOGIN_FALHA]: "Login Falhou",
}

const ACAO_VARIANTS: Record<LogAcao, "success" | "secondary" | "destructive" | "warning" | "outline"> = {
  [LogAcao.DOWNLOAD]: "outline",
  [LogAcao.CRIACAO]: "success",
  [LogAcao.ATUALIZACAO]: "secondary",
  [LogAcao.EXCLUSAO]: "destructive",
  [LogAcao.LOGIN_SUCESSO]: "outline",
  [LogAcao.LOGIN_FALHA]: "warning",
}

export function LogsPage() {
  const [page, setPage] = useState(1)

  const { data: response, isLoading } = useQuery({
    queryKey: ["logs", page],
    queryFn: () => logsApi.list(page),
  })

  const logs = response?.data ?? []
  const meta = response?.meta

  const columns: Column<LogAtividade>[] = [
    {
      key: "created_at",
      header: "Data/Hora",
      render: (item) => <span className="text-sm font-mono">{new Date(item.created_at).toLocaleString("pt-BR")}</span>,
    },
    {
      key: "acao",
      header: "Ação",
      render: (item) => <Badge variant={ACAO_VARIANTS[item.acao]}>{ACAO_LABELS[item.acao]}</Badge>,
    },
    { key: "tabela_afetada", header: "Tabela", render: (item) => <span className="text-sm">{item.tabela_afetada}</span> },
    { key: "usuario", header: "Usuário", render: (item) => <span className="text-sm">{item.tabela_afetada === "mfa_recuperacao_emergencial" ? "Autorização externa; alvo: " : ""}{item.usuarios?.nome_usuario ?? item.usuario_id.slice(0, 8)}</span> },
    { key: "ip_address", header: "IP", render: (item) => <span className="text-xs font-mono">{item.ip_address ?? "—"}</span> },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-heading font-bold">Logs de Atividade</h2>
        <p className="text-sm text-muted-foreground">Histórico de ações realizadas no sistema</p>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-muted-foreground">Carregando...</div>
      ) : !logs.length ? (
        <EmptyState icon={FileText} title="Nenhum log" description="Nenhuma atividade registrada" />
      ) : (
        <>
          <DataTable data={logs} columns={columns} keyExtractor={(item) => item.id} />
          {meta && meta.total_pages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button variant="outline" size="sm" disabled={meta.page <= 1} onClick={() => setPage((p) => p - 1)}>
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {meta.page} de {meta.total_pages}
              </span>
              <Button variant="outline" size="sm" disabled={meta.page >= meta.total_pages} onClick={() => setPage((p) => p + 1)}>
                Próxima
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
