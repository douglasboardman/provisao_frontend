import { useQuery } from "@tanstack/react-query"
import { Users, ArrowRightLeft, FileSpreadsheet, KeySquare, TrendingUp, TrendingDown } from "lucide-react"
import { pessoasApi } from "../../api/pessoas"
import { lancamentosApi } from "../../api/lancamentos"
import { acoesApi } from "../../api/acoes"
import { contasApi } from "../../api/contas"
import { useAuthStore } from "../../stores/auth"
import { TipoTransacao } from "../../types/enums"
import type { LucideIcon } from "lucide-react"

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: string | number
  color: string
}

function StatCard({ icon: Icon, label, value, color }: StatCardProps) {
  return (
    <div className="bg-card rounded-2xl border border-border p-6 flex items-start gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground font-sans">{label}</p>
        <p className="text-2xl font-heading font-bold">{value}</p>
      </div>
    </div>
  )
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)

  const { data: pessoas } = useQuery({ queryKey: ["pessoas"], queryFn: pessoasApi.list })
  const { data: lancamentos } = useQuery({ queryKey: ["lancamentos-dash"], queryFn: () => lancamentosApi.list({ page: 1 }) })
  const { data: acoes } = useQuery({ queryKey: ["acoes"], queryFn: acoesApi.list })
  const { data: contas } = useQuery({ queryKey: ["contas"], queryFn: contasApi.list })

  const recents = lancamentos?.data ?? []
  const totalReceitas = recents.filter((l) => l.tipo_transacao === TipoTransacao.RECEITA).reduce((s, l) => s + l.valor, 0)
  const totalDespesas = recents.filter((l) => l.tipo_transacao === TipoTransacao.DESPESA).reduce((s, l) => s + l.valor, 0)

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-heading font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Bem-vindo, {user?.username ?? "Usuário"}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Pessoas" value={pessoas?.length ?? 0} color="bg-purple" />
        <StatCard icon={FileSpreadsheet} label="Ações" value={acoes?.length ?? 0} color="bg-info" />
        <StatCard icon={KeySquare} label="Contas" value={contas?.length ?? 0} color="bg-warning" />
        <StatCard icon={ArrowRightLeft} label="Lançamentos" value={lancamentos?.meta?.total ?? 0} color="bg-purple-light" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={20} className="text-receita" />
            <h3 className="font-heading font-semibold">Receitas (página atual)</h3>
          </div>
          <p className="text-3xl font-heading font-bold text-receita">{fmt(totalReceitas)}</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown size={20} className="text-despesa" />
            <h3 className="font-heading font-semibold">Despesas (página atual)</h3>
          </div>
          <p className="text-3xl font-heading font-bold text-despesa">{fmt(totalDespesas)}</p>
        </div>
      </div>

      {recents.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-6">
          <h3 className="font-heading font-semibold mb-4">Últimos Lançamentos</h3>
          <div className="space-y-3">
            {recents.slice(0, 5).map((l) => (
              <div key={l.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${l.tipo_transacao === TipoTransacao.RECEITA ? "bg-receita" : "bg-despesa"}`} />
                  <div>
                    <p className="text-sm font-medium">{l.observacao || (l.tipo_transacao === TipoTransacao.RECEITA ? "Receita" : "Despesa")}</p>
                    <p className="text-xs text-muted-foreground">{new Date(l.data_transacao).toLocaleDateString("pt-BR")}</p>
                  </div>
                </div>
                <span className={`font-mono font-medium ${l.tipo_transacao === TipoTransacao.RECEITA ? "text-receita" : "text-despesa"}`}>
                  {l.tipo_transacao === TipoTransacao.RECEITA ? "+" : "−"}{fmt(l.valor)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
