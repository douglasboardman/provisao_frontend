
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export function LancamentosTable() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Lançamentos Financeiros" 
        subtitle="Registre entradas e saídas de caixa associando a contas e planos de despesa." 
      />

      <div className="flex items-center gap-4">
        <Input placeholder="Filtrar por descrição..." className="max-w-xs bg-white" />
        <Button className="bg-receita hover:bg-receita/90 text-white font-medium">Nova Receita</Button>
        <Button className="bg-despesa hover:bg-despesa/90 text-white font-medium">Nova Despesa</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="rounded-md border-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="h-12 px-6 text-left align-middle font-medium text-muted-foreground w-[120px]">Data</th>
                  <th className="h-12 px-6 text-left align-middle font-medium text-muted-foreground w-[100px]">Tipo</th>
                  <th className="h-12 px-6 text-left align-middle font-medium text-muted-foreground">Descrição</th>
                  <th className="h-12 px-6 text-left align-middle font-medium text-muted-foreground">Conta</th>
                  <th className="h-12 px-6 text-right align-middle font-medium text-muted-foreground">Valor</th>
                  <th className="h-12 px-6 text-right align-middle font-medium text-muted-foreground w-[100px]">Status</th>
                </tr>
              </thead>
              <tbody>
                {/* Mock data */}
                <tr className="border-b transition-colors hover:bg-muted/50">
                  <td className="px-6 py-4 font-medium">07/04/2026</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center rounded-md bg-receita/10 px-2 py-1 text-xs font-bold text-receita ring-1 ring-inset ring-receita/20 gap-1 uppercase tracking-wider">
                      ENT
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-foreground">Dízimos do Mês - Abril</td>
                  <td className="px-6 py-4 text-muted-foreground text-sm">Banco do Brasil</td>
                  <td className="px-6 py-4 text-right font-medium text-receita">R$ 15.200,00</td>
                  <td className="px-6 py-4 text-right text-xs"><span className="text-receita border border-receita py-1 px-2 rounded font-semibold bg-receita/5">Efetivado</span></td>
                </tr>
                <tr className="border-b transition-colors hover:bg-muted/50">
                  <td className="px-6 py-4 font-medium">05/04/2026</td>
                  <td className="px-6 py-4">
                     <span className="inline-flex items-center rounded-md bg-despesa/10 px-2 py-1 text-xs font-bold text-despesa ring-1 ring-inset ring-despesa/20 gap-1 uppercase tracking-wider">
                      SAI
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-foreground">Conta de Energia Elétrica</td>
                  <td className="px-6 py-4 text-muted-foreground text-sm">Caixa Itaú</td>
                  <td className="px-6 py-4 text-right font-medium text-despesa">R$ 850,00</td>
                  <td className="px-6 py-4 text-right text-xs"><span className="text-warning border border-warning py-1 px-2 rounded font-semibold bg-warning/5">Pendente</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
