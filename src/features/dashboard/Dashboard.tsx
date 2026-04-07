import { motion } from "framer-motion"
import { ArrowUpRight, ArrowDownRight, Users, Target, Activity } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { PageHeader } from "@/components/shared/PageHeader"

export function Dashboard() {
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

      {/* KPI Line 1: Financeiro */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receitas (Mês)</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-receita" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-receita">R$ 45.231,89</div>
            <p className="text-xs text-muted-foreground">
              +12.5% em relação ao mês anterior
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas (Mês)</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-despesa" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-despesa">R$ 12.894,32</div>
            <p className="text-xs text-muted-foreground">
              -4.1% em relação ao mês anterior
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Consolidado</CardTitle>
            <Activity className="h-4 w-4 text-purple" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-heading">R$ 158.420,00</div>
            <p className="text-xs text-muted-foreground">
              Liquidez total disponivel nas contas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* KPI Line 2: Membresia e Groups */}
      <div className="grid gap-4 md:grid-cols-3">
         <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comungantes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">482</div>
            <p className="text-xs text-muted-foreground">
              Membros ativos
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Não-Comungantes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">129</div>
            <p className="text-xs text-muted-foreground">
              Congregados frequentadores
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ações em Andamento</CardTitle>
            <Target className="h-4 w-4 text-lime" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-lime-600">8</div>
            <p className="text-xs text-muted-foreground">
              Sendo executadas no momento
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Line 4: Lançamentos Recentes */}
      <div className="grid gap-4 grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle>Últimos Lançamentos</CardTitle>
            <CardDescription>Movimentações diárias consolidadas das contas ativas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative w-full overflow-auto">
              <table className="w-full caption-bottom text-sm font-sans">
                <thead className="[&_tr]:border-b">
                  <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Data</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Tipo</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Conta</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Histórico</th>
                    <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Valor</th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                   <tr className="border-b transition-colors hover:bg-muted/50">
                     <td className="p-4 align-middle">07/04/2026</td>
                     <td className="p-4 align-middle"><span className="px-2 py-1 bg-receita/10 text-receita rounded-md text-xs font-semibold">Receita</span></td>
                     <td className="p-4 align-middle">Banco do Brasil</td>
                     <td className="p-4 align-middle">Dízimos Consolidado</td>
                     <td className="p-4 align-middle text-right font-medium text-receita">R$ 15.200,00</td>
                   </tr>
                   <tr className="border-b transition-colors hover:bg-muted/50">
                     <td className="p-4 align-middle">06/04/2026</td>
                     <td className="p-4 align-middle"><span className="px-2 py-1 bg-despesa/10 text-despesa rounded-md text-xs font-semibold">Despesa</span></td>
                     <td className="p-4 align-middle">Caixa Itaú</td>
                     <td className="p-4 align-middle">Conta de Luz</td>
                     <td className="p-4 align-middle text-right font-medium text-despesa">R$ 850,00</td>
                   </tr>
                   <tr className="border-b transition-colors hover:bg-muted/50">
                     <td className="p-4 align-middle">05/04/2026</td>
                     <td className="p-4 align-middle"><span className="px-2 py-1 bg-receita/10 text-receita rounded-md text-xs font-semibold">Receita</span></td>
                     <td className="p-4 align-middle">Cofre Local</td>
                     <td className="p-4 align-middle">Ofertas Dinheiro</td>
                     <td className="p-4 align-middle text-right font-medium text-receita">R$ 1.902,50</td>
                   </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

    </motion.div>
  )
}
