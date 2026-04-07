
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export function PessoasList() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Gestão de Pessoas" 
        subtitle="Gerencie todos os membros, congregados e contatos da congregação." 
      />

      <div className="flex items-center gap-4">
        <Input placeholder="Buscar pessoas por nome ou documento..." className="max-w-md bg-white" />
        <Button className="bg-lime text-black hover:bg-lime/90 font-medium">Nova Pessoa</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="rounded-md border-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="h-12 px-6 text-left align-middle font-medium text-muted-foreground w-[50px]">Foto</th>
                  <th className="h-12 px-6 text-left align-middle font-medium text-muted-foreground">Nome</th>
                  <th className="h-12 px-6 text-left align-middle font-medium text-muted-foreground">Status</th>
                  <th className="h-12 px-6 text-left align-middle font-medium text-muted-foreground">Telefone</th>
                  <th className="h-12 px-6 text-right align-middle font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {/* Mock data */}
                <tr className="border-b transition-colors hover:bg-muted/50">
                  <td className="px-6 py-4">
                     <div className="w-8 h-8 rounded-full bg-purple/10 text-purple flex items-center justify-center font-bold text-xs">
                        JP
                     </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-foreground">João Pedro Alves</td>
                  <td className="px-6 py-4"><span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold text-lime border-lime/20 bg-lime/10">Comungante</span></td>
                  <td className="px-6 py-4 text-muted-foreground">(11) 98765-4321</td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="sm" className="text-purple hover:text-purple-light">Editar</Button>
                  </td>
                </tr>
                <tr className="border-b transition-colors hover:bg-muted/50">
                  <td className="px-6 py-4">
                     <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-bold text-xs">
                        MA
                     </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-foreground">Maria Aparecida Silva</td>
                  <td className="px-6 py-4"><span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold text-muted-foreground border-border bg-muted">Congregado</span></td>
                  <td className="px-6 py-4 text-muted-foreground">(11) 91234-5678</td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="sm" className="text-purple hover:text-purple-light">Editar</Button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
