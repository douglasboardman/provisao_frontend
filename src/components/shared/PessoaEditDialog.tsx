import { useCanAccessModule, usePermissions } from "../../hooks/use-permissions"
import { SeletorPessoa } from './SeletorPessoa'
import { useState, useCallback, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Loader2, ArrowLeft } from "lucide-react"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { MaskedInput } from "../ui/masked-input"
import { unformat } from "../../lib/formatters"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "../ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../ui/select"
import { toast } from "../ui/use-toast"
import { pessoasApi } from "../../api/pessoas"
import { gruposFamiliaresApi } from "../../api/grupos-familiares"
import { tratamentosApi } from "../../api/tratamentos"
import { profissoesApi } from "../../api/profissoes"
import { ApiRequestError } from "../../api/client"
import { useAuthStore } from "../../stores/auth"
import { Sexo, EstadoCivil, EstadoBrasil } from "../../types/enums"
import type { Pessoa } from "../../types/models"

const SEXO_LABELS: Record<Sexo, string> = { [Sexo.MASCULINO]: "Masculino", [Sexo.FEMININO]: "Feminino" }
const EC_LABELS: Record<EstadoCivil, string> = { [EstadoCivil.SOLTEIRO]: "Solteiro(a)", [EstadoCivil.CASADO]: "Casado(a)", [EstadoCivil.DIVORCIADO]: "Divorciado(a)", [EstadoCivil.VIUVO]: "Viúvo(a)" }

const schema = z.object({
  nome_completo: z.string().min(1, "Nome é obrigatório"),
  cpf: z.string().optional().or(z.literal("")),
  data_nascimento: z.string().min(1, "Data de nascimento é obrigatória"),
  sexo: z.nativeEnum(Sexo),
  estado_civil: z.nativeEnum(EstadoCivil).optional().or(z.literal("" as EstadoCivil)),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  telefone_celular: z.string().optional().or(z.literal("")),
  cep: z.string().optional().or(z.literal("")),
  logradouro: z.string().optional().or(z.literal("")),
  numero: z.string().optional().or(z.literal("")),
  complemento: z.string().optional().or(z.literal("")),
  bairro: z.string().optional().or(z.literal("")),
  cidade: z.string().optional().or(z.literal("")),
  estado: z.nativeEnum(EstadoBrasil).optional().or(z.literal("" as EstadoBrasil)),
  grupo_familiar_id: z.string().optional().or(z.literal("")),
  tratamento_id: z.number().int().optional().or(z.literal(0)),
  profissao_id: z.uuid().or(z.literal("")),
  conjuge_id: z.string().optional().or(z.literal("")),
})

type FormData = z.infer<typeof schema>

function clean(d: FormData): Partial<Pessoa> {
  const result: Partial<Pessoa> & { telefone_celular?: string } = { nome_completo: d.nome_completo, data_nascimento: d.data_nascimento, sexo: d.sexo }
  if (d.cpf) result.cpf = d.cpf
  if (d.estado_civil) result.estado_civil = d.estado_civil
  if (d.email) result.email = d.email
  if (d.telefone_celular) result.telefone_celular = d.telefone_celular
  if (d.cep) result.cep = d.cep
  if (d.logradouro) result.logradouro = d.logradouro
  if (d.numero) result.numero = d.numero
  if (d.complemento) result.complemento = d.complemento
  if (d.bairro) result.bairro = d.bairro
  if (d.cidade) result.cidade = d.cidade
  if (d.estado) result.estado = d.estado
  if (d.grupo_familiar_id) result.grupo_familiar_id = d.grupo_familiar_id
  if (d.tratamento_id) result.tratamento_id = d.tratamento_id
  if (d.conjuge_id) result.conjuge_id = d.conjuge_id
  return result
}

interface PessoaEditDialogProps {
  pessoaId: string | null
  open: boolean
  onClose: () => void
  onBack?: () => void
}

export function PessoaEditDialog({ pessoaId, open, onClose, onBack }: PessoaEditDialogProps) {
  const queryClient = useQueryClient()
  const consultaPessoas = useCanAccessModule('pessoas')
  const consultaTratamentos = useCanAccessModule('tratamentos')
  const consultaProfissoes = useCanAccessModule('profissoes')
  const familias = usePermissions('grupos-familiares')
  const igrejaId = useAuthStore(s => s.user?.igreja_id)
  const [formReady, setFormReady] = useState(false)
  const [fetchingCep, setFetchingCep] = useState(false)
  const [cepReady, setCepReady] = useState(false)
  const [cepLocked, setCepLocked] = useState({ logradouro: false, bairro: false, cidade: false, estado: false })
  const [grupoDialogOpen, setGrupoDialogOpen] = useState(false)
  const [novoGrupoNome, setNovoGrupoNome] = useState("")

  const handleDone = onBack ?? onClose

  const { data: allPessoas } = useQuery({ queryKey: ["pessoas"], queryFn: pessoasApi.list, enabled: open && consultaPessoas })
  const { data: grupos } = useQuery({ queryKey: ["grupos-familiares"], queryFn: gruposFamiliaresApi.list, enabled: open && familias.canView })
  const { data: tratamentos } = useQuery({ queryKey: ["tratamentos"], queryFn: tratamentosApi.list, enabled: open && consultaTratamentos })
  const profissoes = useQuery({ queryKey: ["profissoes", igrejaId], queryFn: profissoesApi.list, enabled: open && !!igrejaId && consultaProfissoes })

  const pessoa = pessoaId ? allPessoas?.find((p) => p.id === pessoaId) ?? null : null
  const isEdit = !!pessoaId

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { nome_completo: "", cpf: "", data_nascimento: "", sexo: Sexo.MASCULINO, estado_civil: "" as EstadoCivil, email: "", telefone_celular: "", cep: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "" as EstadoBrasil, grupo_familiar_id: "", tratamento_id: 0, profissao_id: "", conjuge_id: "" },
  })
  const profissaoAlterada = !!form.formState.dirtyFields.profissao_id

  useEffect(() => {
    if (!open) { setFormReady(false); return }
    if (formReady) return
    if (isEdit && pessoa) {
      const hasCep = !!pessoa.logradouro || !!pessoa.bairro || !!pessoa.cidade || !!pessoa.estado
      setCepReady(hasCep)
      setCepLocked({ logradouro: !!pessoa.logradouro, bairro: !!pessoa.bairro, cidade: !!pessoa.cidade, estado: !!pessoa.estado })
      form.reset({
        nome_completo: pessoa.nome_completo,
        cpf: pessoa.cpf ?? "",
        data_nascimento: pessoa.data_nascimento.split("T")[0],
        sexo: pessoa.sexo,
        estado_civil: pessoa.estado_civil ?? ("" as EstadoCivil),
        email: pessoa.email ?? "",
        telefone_celular: pessoa.telefone ?? "",
        cep: pessoa.cep ?? "",
        logradouro: pessoa.logradouro ?? "",
        numero: pessoa.numero ?? "",
        complemento: pessoa.complemento ?? "",
        bairro: pessoa.bairro ?? "",
        cidade: pessoa.cidade ?? "",
        estado: pessoa.estado ?? ("" as EstadoBrasil),
        grupo_familiar_id: pessoa.grupo_familiar_id ?? "",
        tratamento_id: pessoa.tratamento_id ?? 0,
        profissao_id: pessoa.profissao_id ?? "",
        conjuge_id: pessoa.conjuge_id ?? "",
      })
      setFormReady(true)
    } else if (!isEdit) {
      form.reset()
      setCepReady(false)
      setCepLocked({ logradouro: false, bairro: false, cidade: false, estado: false })
      setFormReady(true)
    }
  }, [open, isEdit, pessoa, formReady, form])

  const lookupCep = useCallback(async () => {
    const raw = unformat(form.getValues("cep") ?? "")
    if (raw.length !== 8) return
    setFetchingCep(true)
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cep/v1/${raw}`)
      if (!res.ok) {
        toast({ title: "CEP não encontrado", description: "Verifique o CEP informado", variant: "destructive" })
        setCepLocked({ logradouro: false, bairro: false, cidade: false, estado: false })
        return
      }
      const data = await res.json()
      form.setValue("logradouro", data.street ?? "")
      form.setValue("bairro", data.neighborhood ?? "")
      form.setValue("cidade", data.city ?? "")
      form.setValue("estado", (data.state ?? "") as EstadoBrasil)
      setCepReady(true)
      setCepLocked({ logradouro: !!data.street, bairro: !!data.neighborhood, cidade: !!data.city, estado: !!data.state })
    } catch {
      toast({ title: "Erro ao consultar CEP", variant: "destructive" })
      setCepLocked({ logradouro: false, bairro: false, cidade: false, estado: false })
    } finally {
      setFetchingCep(false)
    }
  }, [form])

  const createMut = useMutation({
    mutationFn: (d: FormData) => pessoasApi.create({
      ...clean(d), ...(d.profissao_id ? { profissao_id: d.profissao_id } : {}),
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["pessoas"] }); toast({ title: "Pessoa criada com sucesso" }); handleDone() },
    onError: (e) => toast({ title: "Erro", description: e instanceof ApiRequestError ? e.messages[0] : "Erro ao criar", variant: "destructive" }),
  })

  const updateMut = useMutation({
    mutationFn: ({ dados, profissaoAlterada }: { dados: FormData; profissaoAlterada: boolean }) => pessoasApi.update(pessoaId!, {
      ...clean(dados), ...(profissaoAlterada ? { profissao_id: dados.profissao_id || null } : {}),
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["pessoas"] }); toast({ title: "Pessoa atualizada" }); handleDone() },
    onError: (e) => toast({ title: "Erro", description: e instanceof ApiRequestError ? e.messages[0] : "Erro ao atualizar", variant: "destructive" }),
  })

  const createGrupoMut = useMutation({
    mutationFn: (nome: string) => gruposFamiliaresApi.create({ nome_familia: nome }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["grupos-familiares"] })
      form.setValue("grupo_familiar_id", created.id)
      toast({ title: "Grupo familiar criado" })
      setGrupoDialogOpen(false)
      setNovoGrupoNome("")
    },
    onError: (e) => toast({ title: "Erro", description: e instanceof ApiRequestError ? e.messages[0] : "Erro ao criar grupo", variant: "destructive" }),
  })

  function onSubmit(d: FormData) {
    if (isEdit) updateMut.mutate({ dados: d, profissaoAlterada })
    else createMut.mutate(d)
  }

  const isPending = createMut.isPending || updateMut.isPending

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          {onBack && (
            <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
              <ArrowLeft size={16} />
              Voltar
            </button>
          )}
          <DialogTitle>{isEdit ? "Editar" : "Nova"} Pessoa</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Dados Pessoais</h3>
            <div className="space-y-2">
              <Label htmlFor="pe_nome">Nome Completo *</Label>
              <Input id="pe_nome" {...form.register("nome_completo")} />
              {form.formState.errors.nome_completo && <p className="text-xs text-destructive">{form.formState.errors.nome_completo.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pe_cpf">CPF</Label>
                <MaskedInput id="pe_cpf" mask="cpf" value={form.watch("cpf") ?? ""} onValueChange={(raw) => form.setValue("cpf", raw)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pe_nasc">Data de Nascimento *</Label>
                <Input id="pe_nasc" type="date" {...form.register("data_nascimento")} />
                {form.formState.errors.data_nascimento && <p className="text-xs text-destructive">{form.formState.errors.data_nascimento.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sexo *</Label>
                <Select value={form.watch("sexo")} onValueChange={(v) => form.setValue("sexo", v as Sexo)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(SEXO_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Estado Civil</Label>
                <Select value={form.watch("estado_civil") ?? ""} onValueChange={(v) => form.setValue("estado_civil", v as EstadoCivil)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(EC_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tratamento</Label>
              <Select
                disabled={!consultaTratamentos}
                value={form.watch("tratamento_id") ? String(form.watch("tratamento_id")) : ""}
                onValueChange={(v) => form.setValue("tratamento_id", v ? Number(v) : 0)}
              >
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {tratamentos?.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.abreviacao} — {t.descricao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pe_profissao">Profissão</Label>
              <Select
                value={form.watch("profissao_id") || "sem-profissao"}
                disabled={!profissoes.isSuccess}
                onValueChange={v => form.setValue("profissao_id", v === "sem-profissao" ? "" : v, { shouldDirty: true })}
              >
                <SelectTrigger id="pe_profissao"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sem-profissao">Não informada</SelectItem>
                  {profissoes.data?.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
              {profissoes.isError && <p role="alert" className="text-xs text-destructive">Não foi possível carregar as profissões.</p>}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Contato</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pe_email">E-mail</Label>
                <Input id="pe_email" type="email" {...form.register("email")} />
                {form.formState.errors.email && <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="pe_tel">Telefone</Label>
                <Input id="pe_tel" {...form.register("telefone_celular")} />
              </div>
            </div>
          </div>

          <div className="space-y-4 relative">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Endereço</h3>
            {fetchingCep && (
              <div className="absolute inset-0 bg-background/80 z-10 flex items-center justify-center rounded-lg">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 size={18} className="animate-spin" />
                  Consultando CEP...
                </div>
              </div>
            )}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pe_cep">CEP</Label>
                <MaskedInput id="pe_cep" mask="cep" value={form.watch("cep") ?? ""} onValueChange={(raw) => form.setValue("cep", raw)} onBlur={lookupCep} disabled={fetchingCep} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="pe_logr">Logradouro</Label>
                <Input id="pe_logr" {...form.register("logradouro")} disabled={fetchingCep || !cepReady || cepLocked.logradouro} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pe_num">Número</Label>
                <Input id="pe_num" {...form.register("numero")} disabled={fetchingCep || !cepReady} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="pe_comp">Complemento</Label>
                <Input id="pe_comp" {...form.register("complemento")} disabled={fetchingCep || !cepReady} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pe_bairro">Bairro</Label>
                <Input id="pe_bairro" {...form.register("bairro")} disabled={fetchingCep || !cepReady || cepLocked.bairro} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pe_cidade">Cidade</Label>
                <Input id="pe_cidade" {...form.register("cidade")} disabled={fetchingCep || !cepReady || cepLocked.cidade} />
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Input value={form.watch("estado") ?? ""} disabled={fetchingCep || !cepReady || cepLocked.estado} />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Vínculo</h3>
            <div className="space-y-2">
              <Label>Grupo Familiar</Label>
              <div className="flex gap-2">
                <Select disabled={!familias.canView} value={form.watch("grupo_familiar_id") ?? ""} onValueChange={(v) => form.setValue("grupo_familiar_id", v)}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {grupos?.map((g) => <SelectItem key={g.id} value={g.id}>{g.nome_familia}</SelectItem>)}
                  </SelectContent>
                </Select>
                {familias.canCreate && <Button type="button" variant="outline" size="default" onClick={() => setGrupoDialogOpen(true)}>
                  <Plus size={16} className="mr-1" />Novo Grupo
                </Button>}
              </div>
            </div>
            {consultaPessoas && <div className="space-y-2">
              <Label>Cônjuge</Label>
              <SeletorPessoa
                value={form.watch("conjuge_id") ?? ""}
                onChange={(v) => form.setValue("conjuge_id", v)}
                rotulo="Cônjuge"
                opcoes={allPessoas?.filter((p) => p.id !== pessoaId).map(p => ({ id: p.id, nome: p.nome_completo }))} />
            </div>}
          </div>

          <Dialog open={grupoDialogOpen} onOpenChange={setGrupoDialogOpen}>
            <DialogContent className="max-w-sm" onPointerDownOutside={(e) => e.preventDefault()}>
              <DialogHeader>
                <DialogTitle>Novo Grupo Familiar</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pe_novo_grupo">Nome da Família *</Label>
                  <Input id="pe_novo_grupo" value={novoGrupoNome} onChange={(e) => setNovoGrupoNome(e.target.value)} placeholder="Ex: Família Silva" />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => { setGrupoDialogOpen(false); setNovoGrupoNome("") }}>Cancelar</Button>
                  <Button type="button" disabled={!novoGrupoNome.trim() || createGrupoMut.isPending} onClick={() => createGrupoMut.mutate(novoGrupoNome.trim())}>
                    {createGrupoMut.isPending ? "Criando..." : "Criar"}
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleDone}>Cancelar</Button>
            <Button type="submit" disabled={isPending || fetchingCep}>
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
