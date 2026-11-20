import { Scale as PageIcon } from "lucide-react"
import { WorkspaceHeader } from "../../components/shared/Workspace"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { TrendingUp, TrendingDown, Scale } from "lucide-react"
import { Button } from "../../components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { lancamentosApi } from "../../api/lancamentos"
import { TipoTransacao } from "../../types/enums"

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]

function currentYear() { return new Date().getFullYear() }
function currentMonth() { return new Date().getMonth() }

export function BalancoMensalPage() {
  const [mes, setMes] = useState(currentMonth())
  const [ano, setAno] = useState(currentYear())

  const { data: balanco, isLoading } = useQuery({
    queryKey: ["lancamentos", "balanco", ano, mes],
    queryFn: () => lancamentosApi.balanco(mes + 1, ano),
  })

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
  const years = Array.from({ length: 5 }, (_, i) => currentYear() - i)

  const totalReceitas = balanco?.total_receitas ?? 0
  const totalDespesas = balanco?.total_despesas ?? 0
  const saldo = balanco?.saldo ?? 0
  const lancamentos = balanco?.lancamentos ?? []

  return (
    <div className="workspace">
      <WorkspaceHeader icon={PageIcon} title="Balanço Mensal" description="Resumo financeiro por mês" />

      <div className="flex flex-wrap gap-3">
        <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MESES.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
          <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => { setMes(currentMonth()); setAno(currentYear()) }}>
          Mês Atual
        </Button>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-muted-foreground">Carregando...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card rounded-2xl border border-border p-6">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={20} className="text-receita" />
                <span className="text-sm text-muted-foreground font-sans">Total Receitas</span>
              </div>
              <p className="text-3xl font-heading font-bold text-receita">{fmt(totalReceitas)}</p>
            </div>
            <div className="bg-card rounded-2xl border border-border p-6">
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown size={20} className="text-despesa" />
                <span className="text-sm text-muted-foreground font-sans">Total Despesas</span>
              </div>
              <p className="text-3xl font-heading font-bold text-despesa">{fmt(totalDespesas)}</p>
            </div>
            <div className="bg-card rounded-2xl border border-border p-6">
              <div className="flex items-center gap-2 mb-3">
                <Scale size={20} className={saldo >= 0 ? "text-receita" : "text-despesa"} />
                <span className="text-sm text-muted-foreground font-sans">Saldo</span>
              </div>
              <p className={`text-3xl font-heading font-bold ${saldo >= 0 ? "text-receita" : "text-despesa"}`}>{fmt(saldo)}</p>
            </div>
          </div>

          {lancamentos.length > 0 && (
            <div className="bg-card rounded-2xl border border-border p-6">
              <h3 className="font-heading font-semibold mb-4">Lançamentos de {MESES[mes]} {ano}</h3>
              <div className="space-y-2">
                {lancamentos.map((l) => {
                  const descricao = l.tipo_transacao === TipoTransacao.RECEITA
                    ? (l.receitas?.nome ?? "Receita")
                    : (l.despesas?.nome ?? "Despesa")
                  return (
                    <div key={l.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${l.tipo_transacao === TipoTransacao.RECEITA ? "bg-receita" : "bg-despesa"}`} />
                        <div>
                          <p className="text-sm font-medium">{descricao}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(l.data_transacao).toLocaleDateString("pt-BR")}
                            {l.observacao && ` · ${l.observacao}`}
                          </p>
                        </div>
                      </div>
                      <span className={`font-mono font-medium ${l.tipo_transacao === TipoTransacao.RECEITA ? "text-receita" : "text-despesa"}`}>
                        {l.tipo_transacao === TipoTransacao.RECEITA ? "+" : "−"}{fmt(l.valor)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {lancamentos.length === 0 && !isLoading && (
            <div className="py-16 text-center text-muted-foreground">
              Nenhum lançamento encontrado em {MESES[mes]} {ano}
            </div>
          )}
        </>
      )}
    </div>
  )
}
