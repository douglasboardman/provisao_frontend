import { motion } from "framer-motion"
import { ArrowUpRight, ArrowDownRight, Users, Target, Activity, RefreshCw, AlertCircle } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { PageHeader } from "@/components/shared/PageHeader"
import { Skeleton } from "@/components/ui/skeleton"
import { useDashboardResumo } from "./hooks"
import { formatCurrency, formatDate } from "@/lib/format"

/** Skeleton de um card KPI */
function KpiCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-4 rounded-full" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-36 mb-2" />
        <Skeleton className="h-3 w-48" />
      </CardContent>
    </Card>
  );
}

/** Skeleton de uma linha de lançamento */
function LancamentoRowSkeleton() {
  return (
    <tr className="border-b">
      {[1,2,3,4,5].map(i => (
        <td key={i} className="p-4">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

export function Dashboard() {
  const { data, isLoading, isError, refetch } = useDashboardResumo();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <PageHeader
        title="Dashboard"
        subtitle="Acompanhamento resumido e consolidado de indicadores vitais."
      />

      {/* Estado de erro */}
      {isError && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-destructive">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">Não foi possível carregar os dados do dashboard.</p>
          <button
            onClick={() => refetch()}
            className="ml-auto flex items-center gap-1 text-xs font-medium hover:underline"
          >
            <RefreshCw className="h-3 w-3" /> Tentar novamente
          </button>
        </div>
      )}

      {/* KPI Linha 1: Financeiro */}
      <div className="grid gap-4 md:grid-cols-3">
        {isLoading ? (
          <><KpiCardSkeleton /><KpiCardSkeleton /><KpiCardSkeleton /></>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Receitas (Mês)</CardTitle>
                <ArrowUpRight className="h-4 w-4 text-receita" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-receita">
                  {formatCurrency(data?.financeiro.receitas_mes ?? 0)}
                </div>
                <p className="text-xs text-muted-foreground">Entradas no mês corrente</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Despesas (Mês)</CardTitle>
                <ArrowDownRight className="h-4 w-4 text-despesa" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-despesa">
                  {formatCurrency(data?.financeiro.despesas_mes ?? 0)}
                </div>
                <p className="text-xs text-muted-foreground">Saídas no mês corrente</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Saldo Consolidado</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold font-heading ${(data?.financeiro.saldo_consolidado ?? 0) >= 0 ? 'text-receita' : 'text-despesa'}`}>
                  {formatCurrency(data?.financeiro.saldo_consolidado ?? 0)}
                </div>
                <p className="text-xs text-muted-foreground">Liquidez total nas contas</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* KPI Linha 2: Membresia e Ações */}
      <div className="grid gap-4 md:grid-cols-3">
        {isLoading ? (
          <><KpiCardSkeleton /><KpiCardSkeleton /><KpiCardSkeleton /></>
        ) : (
          <>
            <Card className="bg-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Comungantes</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data?.membresia.comungantes_ativos ?? 0}</div>
                <p className="text-xs text-muted-foreground">Membros ativos</p>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Não-Comungantes</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data?.membresia.congregados_ativos ?? 0}</div>
                <p className="text-xs text-muted-foreground">Congregados frequentadores</p>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ações em Andamento</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data?.acoes_em_andamento ?? 0}</div>
                <p className="text-xs text-muted-foreground">Sendo executadas no momento</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Últimos Lançamentos */}
      <div className="grid gap-4 grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle>Últimos Lançamentos</CardTitle>
            <CardDescription>Movimentações mais recentes das contas ativas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative w-full overflow-auto">
              <table className="w-full caption-bottom text-sm font-sans">
                <thead className="[&_tr]:border-b">
                  <tr className="border-b transition-colors hover:bg-muted/50">
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Data</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Tipo</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Conta</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Histórico</th>
                    <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Valor</th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {isLoading ? (
                    <><LancamentoRowSkeleton /><LancamentoRowSkeleton /><LancamentoRowSkeleton /></>
                  ) : !data?.ultimos_lancamentos.length ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground text-sm">
                        Nenhum lançamento registrado ainda.
                      </td>
                    </tr>
                  ) : data.ultimos_lancamentos.map((lanc) => {
                    const isReceita = lanc.tipo_transacao === 'RECEITA';
                    const descritivo = isReceita ? lanc.receitas?.nome : lanc.despesas?.nome;
                    return (
                      <tr key={lanc.id} className="border-b transition-colors hover:bg-muted/50">
                        <td className="p-4 align-middle text-sm">{formatDate(lanc.data_transacao)}</td>
                        <td className="p-4 align-middle">
                          <span className={`px-2 py-1 rounded-md text-xs font-semibold ${isReceita ? 'bg-receita/10 text-receita' : 'bg-despesa/10 text-despesa'}`}>
                            {isReceita ? 'Receita' : 'Despesa'}
                          </span>
                        </td>
                        <td className="p-4 align-middle text-sm">{lanc.contas?.descricao ?? '—'}</td>
                        <td className="p-4 align-middle text-sm">
                          {lanc.historico || descritivo || '—'}
                        </td>
                        <td className={`p-4 align-middle text-right font-medium text-sm ${isReceita ? 'text-receita' : 'text-despesa'}`}>
                          {isReceita ? '+' : '-'} {formatCurrency(Number(lanc.valor))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
