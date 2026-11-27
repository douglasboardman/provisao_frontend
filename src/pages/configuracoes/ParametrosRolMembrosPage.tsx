import { useState, useMemo, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Trash2, Save, RotateCcw } from "lucide-react"
import { Button } from "../../components/ui/button"
import { Badge } from "../../components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../../components/ui/select"
import { toast } from "../../components/ui/use-toast"
import { usePermissions } from "../../hooks/use-permissions"
import { useEnumRelations } from "../../hooks/use-enum-relations"
import { regrasRelacaoEnumApi } from "../../api/regras-relacao-enum"
import { ApiRequestError } from "../../api/client"
import type { RegraRelacaoEnum } from "../../types/models"
import { TipoRegra } from "../../types/enums"

function formatEnumValue(value: string): string {
  return value
    .replace(/_/g, " ")
    .split(" ")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ")
}

function RuleCard({
  regra,
  enumValues,
  canEdit,
}: {
  regra: RegraRelacaoEnum
  enumValues: Record<string, string[]>
  canEdit: boolean
}) {
  const queryClient = useQueryClient()
  const [localValores, setLocalValores] = useState(
    regra.valores.map((v) => ({ valor_classificador: v.valor_classificador, valor_classificado: v.valor_classificado })),
  )
  const [newClassificador, setNewClassificador] = useState("")
  const [newClassificado, setNewClassificado] = useState("")

  useEffect(() => {
    setLocalValores(
      regra.valores.map((v) => ({ valor_classificador: v.valor_classificador, valor_classificado: v.valor_classificado })),
    )
  }, [regra.valores])

  const isModified = useMemo(() => {
    const original = regra.valores.map((v) => `${v.valor_classificador}|${v.valor_classificado}`).sort()
    const current = localValores.map((v) => `${v.valor_classificador}|${v.valor_classificado}`).sort()
    return JSON.stringify(original) !== JSON.stringify(current)
  }, [regra.valores, localValores])

  const saveMut = useMutation({
    mutationFn: () => regrasRelacaoEnumApi.replaceValoresMembresia(regra.id, localValores),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["regras-relacao-enum"] })
      toast({ title: `"${regra.nome}" atualizada` })
    },
    onError: (e) => toast({
      title: "Erro ao salvar",
      description: e instanceof ApiRequestError ? e.messages[0] : "Erro inesperado",
      variant: "destructive",
    }),
  })

  const classificadorOptions = enumValues[regra.enum_classificador] ?? []
  const classificadoOptions = enumValues[regra.enum_classificado] ?? []

  function handleAdd() {
    if (!newClassificador || !newClassificado) return
    const exists = localValores.some(
      (v) => v.valor_classificador === newClassificador && v.valor_classificado === newClassificado,
    )
    if (exists) {
      toast({ title: "Valor já existe nesta regra", variant: "destructive" })
      return
    }
    setLocalValores([...localValores, { valor_classificador: newClassificador, valor_classificado: newClassificado }])
    setNewClassificado("")
  }

  function handleRemove(idx: number) {
    setLocalValores(localValores.filter((_, i) => i !== idx))
  }

  function handleDiscard() {
    setLocalValores(regra.valores.map((v) => ({ valor_classificador: v.valor_classificador, valor_classificado: v.valor_classificado })))
    setNewClassificador("")
    setNewClassificado("")
  }

  return (
    <div className="border border-border rounded-panel">
      <div className="p-4 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h3 className="font-semibold">{regra.nome}</h3>
            {regra.descricao && <p className="text-sm text-muted-foreground mt-0.5">{regra.descricao}</p>}
          </div>
          <Badge variant={regra.tipo_regra === TipoRegra.FILTRO ? "secondary" : "outline"}>
            {regra.tipo_regra}
          </Badge>
        </div>
        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
          <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{regra.enum_classificador}</span>
          <span>→</span>
          <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{regra.enum_classificado}</span>
        </div>
      </div>

      <div className="p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 font-medium text-muted-foreground">Classificador</th>
                <th className="text-left py-2 font-medium text-muted-foreground">Classificado</th>
                {canEdit && <th className="w-10" />}
              </tr>
            </thead>
            <tbody>
              {localValores.map((v, i) => (
                <tr key={`${v.valor_classificador}-${v.valor_classificado}`} className="border-b border-border/50">
                  <td className="py-2">{formatEnumValue(v.valor_classificador)}</td>
                  <td className="py-2">{formatEnumValue(v.valor_classificado)}</td>
                  {canEdit && (
                    <td className="py-2">
                      <Button variant="ghost" size="sm" aria-label={`Remover ${formatEnumValue(v.valor_classificado)}`} className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => handleRemove(i)}>
                        <Trash2 size={14} />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
              {localValores.length === 0 && (
                <tr>
                  <td colSpan={canEdit ? 3 : 2} className="py-4 text-center text-muted-foreground">
                    Nenhum valor configurado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {canEdit && (
          <div className="mt-4 space-y-3">
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Classificador</label>
                <Select value={newClassificador} onValueChange={setNewClassificador}>
                  <SelectTrigger aria-label="Classificador" className="h-8 text-sm"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    {classificadorOptions.map((v) => (
                      <SelectItem key={v} value={v}>{formatEnumValue(v)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Classificado</label>
                <Select value={newClassificado} onValueChange={setNewClassificado}>
                  <SelectTrigger aria-label="Classificado" className="h-8 text-sm"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    {classificadoOptions.map((v) => (
                      <SelectItem key={v} value={v}>{formatEnumValue(v)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="sm" className="h-8" onClick={handleAdd} disabled={!newClassificador || !newClassificado}>
                <Plus size={14} className="mr-1" /> Adicionar
              </Button>
            </div>

            {isModified && (
              <div className="flex gap-2 justify-end pt-2 border-t border-border">
                <Button variant="ghost" size="sm" onClick={handleDiscard}>
                  <RotateCcw size={14} className="mr-1" /> Descartar
                </Button>
                <Button size="sm" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
                  <Save size={14} className="mr-1" /> {saveMut.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function ParametrosRolMembrosPage() {
  const { canEdit } = usePermissions("regras-relacao-enum")

  const { regras, isLoading } = useEnumRelations("membresia")

  const { data: enumValues } = useQuery({
    queryKey: ["regras-relacao-enum", "enums"],
    queryFn: regrasRelacaoEnumApi.getEnums,
  })

  const filtros = useMemo(() => regras?.filter((r) => r.tipo_regra === TipoRegra.FILTRO) ?? [], [regras])
  const mapeamentos = useMemo(() => regras?.filter((r) => r.tipo_regra === TipoRegra.MAPEAMENTO) ?? [], [regras])

  if (isLoading) return <div className="py-16 text-center text-muted-foreground">Carregando...</div>

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-heading font-bold">Parâmetros do Rol de Membros</h2>
        <p className="text-sm text-muted-foreground">Configure as relações entre enums do módulo de membresia</p>
      </div>

      {filtros.length > 0 && (
        <section className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Regras de Filtro</h3>
            <p className="text-xs text-muted-foreground mt-1">Definem quais valores de um enum estão disponíveis dado o valor de outro</p>
          </div>
          <div className="grid gap-4">
            {filtros.map((r) => (
              <RuleCard key={r.id} regra={r} enumValues={enumValues ?? {}} canEdit={canEdit} />
            ))}
          </div>
        </section>
      )}

      {mapeamentos.length > 0 && (
        <section className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Regras de Mapeamento</h3>
            <p className="text-xs text-muted-foreground mt-1">Definem uma correspondência 1:1 entre valores de dois enums</p>
          </div>
          <div className="grid gap-4">
            {mapeamentos.map((r) => (
              <RuleCard key={r.id} regra={r} enumValues={enumValues ?? {}} canEdit={canEdit} />
            ))}
          </div>
        </section>
      )}

      {(!regras || regras.length === 0) && (
        <div className="py-16 text-center text-muted-foreground">
          Nenhuma regra configurada para o módulo de membresia
        </div>
      )}
    </div>
  )
}
