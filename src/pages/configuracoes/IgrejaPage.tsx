import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { MaskedInput } from "../../components/ui/masked-input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../../components/ui/select"
import { usePermissions } from "../../hooks/use-permissions"
import { toast } from "../../components/ui/use-toast"
import { igrejaApi } from "../../api/igreja"
import { ApiRequestError } from "../../api/client"
import { EstadoBrasil } from "../../types/enums"
import { useEffect } from "react"

const schema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  cnpj: z.string().optional().or(z.literal("")),
  logradouro: z.string().optional().or(z.literal("")),
  numero: z.string().optional().or(z.literal("")),
  complemento: z.string().optional().or(z.literal("")),
  bairro: z.string().optional().or(z.literal("")),
  cidade: z.string().optional().or(z.literal("")),
  estado: z.nativeEnum(EstadoBrasil).optional().or(z.literal("" as EstadoBrasil)),
})

type FormData = z.infer<typeof schema>

export function IgrejaPage() {
  const { canEdit } = usePermissions("igreja")
  const queryClient = useQueryClient()

  const { data: igreja, isLoading } = useQuery({
    queryKey: ["igreja-me"],
    queryFn: igrejaApi.getMe,
  })

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { nome: "", cnpj: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "" as EstadoBrasil },
  })

  useEffect(() => {
    if (igreja) {
      form.reset({
        nome: igreja.nome,
        cnpj: igreja.cnpj ?? "",
        logradouro: igreja.logradouro ?? "",
        numero: igreja.numero ?? "",
        complemento: igreja.complemento ?? "",
        bairro: igreja.bairro ?? "",
        cidade: igreja.cidade ?? "",
        estado: igreja.estado ?? ("" as EstadoBrasil),
      })
    }
  }, [igreja, form])

  const updateMut = useMutation({
    mutationFn: (d: FormData) => igrejaApi.updateMe({
      nome: d.nome,
      cnpj: d.cnpj || undefined,
      logradouro: d.logradouro || undefined,
      numero: d.numero || undefined,
      complemento: d.complemento || undefined,
      bairro: d.bairro || undefined,
      cidade: d.cidade || undefined,
      estado: d.estado || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["igreja-me"] })
      toast({ title: "Dados da igreja atualizados" })
    },
    onError: (e) => toast({ title: "Erro", description: e instanceof ApiRequestError ? e.messages[0] : "Erro ao atualizar", variant: "destructive" }),
  })

  if (isLoading) return <div className="py-16 text-center text-muted-foreground">Carregando...</div>

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-heading font-bold">Dados da Igreja</h2>
        <p className="text-sm text-muted-foreground">Informações cadastrais da igreja</p>
      </div>

      <form onSubmit={form.handleSubmit((d) => updateMut.mutate(d))} className="space-y-6 max-w-2xl">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome *</Label>
            <Input id="nome" {...form.register("nome")} disabled={!canEdit} />
            {form.formState.errors.nome && <p className="text-xs text-destructive">{form.formState.errors.nome.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="cnpj">CNPJ</Label>
            <MaskedInput id="cnpj" mask="cnpj" value={form.watch("cnpj") ?? ""} onValueChange={(raw) => form.setValue("cnpj", raw)} disabled={!canEdit} />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Endereço</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="logradouro">Logradouro</Label>
              <Input id="logradouro" {...form.register("logradouro")} disabled={!canEdit} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="numero">Número</Label>
              <Input id="numero" {...form.register("numero")} disabled={!canEdit} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="complemento">Complemento</Label>
              <Input id="complemento" {...form.register("complemento")} disabled={!canEdit} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bairro">Bairro</Label>
              <Input id="bairro" {...form.register("bairro")} disabled={!canEdit} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cidade">Cidade</Label>
              <Input id="cidade" {...form.register("cidade")} disabled={!canEdit} />
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={form.watch("estado") ?? ""} onValueChange={(v) => form.setValue("estado", v as EstadoBrasil)} disabled={!canEdit}>
                <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                <SelectContent>
                  {Object.values(EstadoBrasil).map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {canEdit && (
          <Button type="submit" disabled={updateMut.isPending}>
            {updateMut.isPending ? "Salvando..." : "Salvar Alterações"}
          </Button>
        )}
      </form>
    </div>
  )
}
