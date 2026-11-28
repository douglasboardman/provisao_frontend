import { ArrowLeft, BookUser as PageIcon, ScrollText, FilterX } from "lucide-react"
import { WorkspaceHeader } from "../../components/shared/Workspace"
import { useState, useMemo } from "react"
import { Link } from "react-router"
import { Badge } from "../../components/ui/badge"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../../components/ui/select"
import { DataTable, type Column } from "../../components/shared/DataTable"
import { EmptyState } from "../../components/shared/EmptyState"
import { ErrorState } from "../../components/shared/ErrorState"
import { Sexo, MembresiaRol } from "../../types/enums"
import { MOTIVACAO_LABELS } from "../../lib/membresia-labels"
import { useEnumRelations } from "../../hooks/use-enum-relations"

import { CampoBusca } from "../../components/shared/CampoBusca"
import { correspondeBusca, correspondeCpf, normalizarBusca } from "../../lib/busca"
import { CATEGORY_ORDER, CATEGORY_LABELS, CATEGORY_COLORS, NAO_ARROLADO, ROTAS_ROL, resumirRol, type CategoriaRol, type MemberView } from "./dados-rol"

import { useDadosRol } from "./useDadosRol"

type Filters = {
  busca: string
  idadeMin: string
  idadeMax: string
  sexo: string
  roles: Record<string, boolean>
  admissao: string
  tempoMin: string
  tempoMax: string
}

const initialFilters: Filters = {
  busca: "",
  idadeMin: "",
  idadeMax: "",
  sexo: "",
  roles: Object.fromEntries(CATEGORY_ORDER.map((k) => [k, true])),
  admissao: "",
  tempoMin: "",
  tempoMax: "",
}

const ROL_BADGE_COLORS: Record<CategoriaRol, string> = {
  [MembresiaRol.COMUNGANTES]: "bg-[#6C4CAF]/10 text-[#6C4CAF] border-[#6C4CAF]/20",
  [MembresiaRol.NAO_COMUNGANTES]: "bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/20",
  [MembresiaRol.ROL_SEPARADO]: "bg-[#CA8A04]/10 text-[#A16207] border-[#CA8A04]/20",
  [MembresiaRol.EXCLUIDOS]: "bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/20",
  [NAO_ARROLADO]: "bg-muted text-muted-foreground border-border",
}

const colunasCadastro: Column<MemberView>[] = [
  { key: "nome", header: "Nome", sortable: true },
  { key: "idade", header: "Idade", sortable: true },
  { key: "ultimaMovimentacaoLabel", header: "Mod. admissão/demissão" },
]

const colunaTempo: Column<MemberView> = {
  key: "tempoRolFormatted", header: "Tempo no rol",
  render: m => <span className="text-sm text-muted-foreground">{m.tempoRolFormatted}</span>,
}

const colunasListagem: Column<MemberView>[] = [
  ...colunasCadastro,
  {
    key: "rol", header: "Rol",
    render: m => (
      <Badge asChild variant="outline" className={`font-medium ${ROL_BADGE_COLORS[m.rolKey]}`}>
        <Link to={`/rol-membros/${ROTAS_ROL[m.rolKey]}`}>{m.rolLabel}</Link>
      </Badge>
    ),
  },
  colunaTempo,
]

const colunasCategoria = [...colunasCadastro, colunaTempo]

export function RolMembrosPage() {
  const dados = useDadosRol()
  return <div className="workspace">
    <WorkspaceHeader icon={PageIcon} title="Rol de Membros" />
    <IndicadoresRol dados={dados} />
    <ListagemRol dados={dados} />
  </div>
}

export function ListagemRol({ dados }: { dados: ReturnType<typeof useDadosRol> }) {
  const { pessoas, members, pendencias, isLoading, errorPessoas, errPessoas, refetchPessoas, errorEventos, errEventos, refetchEventos } = dados
  const [filters, setFilters] = useState<Filters>(initialFilters)
  const { getFilter } = useEnumRelations("membresia")

  const admMotivacoes = useMemo(() => {
    const allowed = getFilter("Motivações de Admissão", "ADMISSAO")
    return allowed.map((k) => [k, MOTIVACAO_LABELS[k as keyof typeof MOTIVACAO_LABELS] ?? k] as const)
  }, [getFilter])

  const termo = normalizarBusca(filters.busca)

  const filtered = useMemo(() => {
    return members.filter((m) => {
      if (!correspondeBusca(termo, m.nome, m.familia) && !correspondeCpf(termo, m.cpf)) return false
      if (!filters.roles[m.rolKey]) return false
      if (filters.idadeMin && m.idade < Number(filters.idadeMin)) return false
      if (filters.idadeMax && m.idade > Number(filters.idadeMax)) return false
      if (filters.sexo && m.sexo !== filters.sexo) return false
      if (filters.admissao && m.admissaoMotivacao !== filters.admissao) return false
      if (filters.tempoMin && (m.tempoRolMeses === null || m.tempoRolMeses < Number(filters.tempoMin))) return false
      if (filters.tempoMax && (m.tempoRolMeses === null || m.tempoRolMeses > Number(filters.tempoMax))) return false
      return true
    })
  }, [members, filters, termo])

  const hasActiveFilters = useMemo(() => {
    return filters.busca !== "" || filters.idadeMin !== "" || filters.idadeMax !== "" ||
      filters.sexo !== "" || filters.admissao !== "" ||
      filters.tempoMin !== "" || filters.tempoMax !== "" ||
      Object.values(filters.roles).some((v) => !v)
  }, [filters])

  function updateRole(key: string, checked: boolean) {
    setFilters((f) => ({ ...f, roles: { ...f.roles, [key]: checked } }))
  }

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="py-16 text-center text-muted-foreground">Carregando...</div>
      ) : errorPessoas ? (
        <ErrorState error={errPessoas} onRetry={() => refetchPessoas()} />
      ) : errorEventos ? (
        <ErrorState error={errEventos} onRetry={() => refetchEventos()} />
      ) : !pessoas?.length ? (
        <EmptyState icon={ScrollText} title="Nenhuma pessoa" description="Nenhuma pessoa cadastrada" />
      ) : (
        <>
          {pendencias > 0 && <p role="alert" className="text-sm">Cadastros fora do rol até a conferência da documentação ou da ordem dos atos ({pendencias}).</p>}
          <div className="surface sm:p-4">
            <CampoBusca rotulo="Buscar no rol" placeholder="Nome, CPF ou família" valor={filters.busca}
              mudar={busca => setFilters(f => ({ ...f, busca }))} />
          </div>
          <div className="grid items-start gap-4 lg:grid-cols-[15rem_minmax(0,1fr)]">
            <aside aria-label="Filtros do rol" className="surface space-y-3 sm:p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-muted-foreground">Filtros</h2>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => setFilters(initialFilters)}>
                    <FilterX size={14} />
                    Limpar
                  </Button>
                )}
              </div>

              <fieldset className="space-y-2">
                <legend className="text-xs font-semibold text-muted-foreground">Rol</legend>
                <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-1">
                  {CATEGORY_ORDER.map((key) => (
                    <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.roles[key]}
                        onChange={(e) => updateRole(key, e.target.checked)}
                        className="accent-primary rounded"
                      />
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CATEGORY_COLORS[key] }} />
                      {CATEGORY_LABELS[key]}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                {/* Idade */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground">Idade</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      placeholder="Mín"
                      aria-label="Idade mínima"
                      min={0}
                      value={filters.idadeMin}
                      onChange={(e) => setFilters((f) => ({ ...f, idadeMin: e.target.value }))}
                      className="h-8 text-sm"
                    />
                    <Input
                      type="number"
                      placeholder="Máx"
                      aria-label="Idade máxima"
                      min={0}
                      value={filters.idadeMax}
                      onChange={(e) => setFilters((f) => ({ ...f, idadeMax: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>

                {/* Sexo */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground">Sexo</Label>
                  <Select value={filters.sexo || "all"} onValueChange={(v) => setFilters((f) => ({ ...f, sexo: v === "all" ? "" : v }))}>
                    <SelectTrigger aria-label="Sexo" className="h-8 w-full text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value={Sexo.MASCULINO}>Masculino</SelectItem>
                      <SelectItem value={Sexo.FEMININO}>Feminino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Forma de Admissão */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground">Forma de Admissão</Label>
                  <Select value={filters.admissao || "all"} onValueChange={(v) => setFilters((f) => ({ ...f, admissao: v === "all" ? "" : v }))}>
                    <SelectTrigger aria-label="Forma de admissão" className="h-8 w-full text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {admMotivacoes.map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tempo no Rol */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground">Tempo no Rol (meses)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      placeholder="Mín"
                      aria-label="Tempo mínimo no rol em meses"
                      min={0}
                      value={filters.tempoMin}
                      onChange={(e) => setFilters((f) => ({ ...f, tempoMin: e.target.value }))}
                      className="h-8 text-sm"
                    />
                    <Input
                      type="number"
                      placeholder="Máx"
                      aria-label="Tempo máximo no rol em meses"
                      min={0}
                      value={filters.tempoMax}
                      onChange={(e) => setFilters((f) => ({ ...f, tempoMax: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              </div>
              {filtered.length !== members.length && (
                <div className="text-xs text-muted-foreground pt-2 border-t">
                  Exibindo {filtered.length} de {members.length} pessoas
                </div>
              )}
            </aside>
            <div className="min-w-0">
              {filtered.length ? <DataTable data={filtered} columns={colunasListagem} keyExtractor={m => m.id}
                pageResetKey={JSON.stringify(filters)} /> :
                <EmptyState icon={ScrollText} title="Nenhuma pessoa encontrada" description="Altere a busca ou os filtros." />}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

const filtrosIniciaisCategoria = {
  busca: "", idadeMin: "", idadeMax: "", admissao: "", demissao: "", tempoMin: "", tempoMax: "",
}

function estaNaFaixa(valor: number | null, min: string, max: string) {
  if (!min && !max) return true
  return valor !== null && (!min || valor >= Number(min)) && (!max || valor <= Number(max))
}

function FiltroFaixaRol({ titulo, rotuloMin, rotuloMax, min, max, mudarMin, mudarMax }: {
  titulo: string; rotuloMin: string; rotuloMax: string; min: string; max: string
  mudarMin: (valor: string) => void; mudarMax: (valor: string) => void
}) {
  return <fieldset className="min-w-0 space-y-1.5">
    <legend className="text-sm font-medium">{titulo}</legend>
    <div className="grid grid-cols-2 gap-2">
      <Input type="number" min={0} placeholder="Mín" aria-label={rotuloMin} value={min} onChange={e => mudarMin(e.target.value)} />
      <Input type="number" min={0} placeholder="Máx" aria-label={rotuloMax} value={max} onChange={e => mudarMax(e.target.value)} />
    </div>
  </fieldset>
}

function FiltroModalidadeRol({ titulo, campo, pessoas, valor, mudar }: {
  titulo: string; campo: "admissaoMotivacao" | "demissaoMotivacao"; pessoas: MemberView[]
  valor: string; mudar: (valor: string) => void
}) {
  const opcoes = [...new Set(pessoas.flatMap(p => p[campo] ?? []))]
    .map(chave => ({ chave, nome: MOTIVACAO_LABELS[chave] ?? chave }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))

  return <div className="min-w-0 space-y-1.5">
    <Label className="block leading-5" htmlFor={`filtro-rol-${campo}`}>{titulo}</Label>
    <Select value={opcoes.length ? valor || "todas" : ""} disabled={!opcoes.length} onValueChange={v => mudar(v === "todas" ? "" : v)}>
      <SelectTrigger id={`filtro-rol-${campo}`}><SelectValue placeholder="Sem registros" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="todas">Todas</SelectItem>
        {opcoes.map(({ chave, nome }) => <SelectItem key={chave} value={chave}>{nome}</SelectItem>)}
      </SelectContent>
    </Select>
  </div>
}

export function ListagemCategoriaRol({ dados, categoria }: { dados: ReturnType<typeof useDadosRol>; categoria: CategoriaRol }) {
  const { members, isLoading, errorPessoas, errPessoas, refetchPessoas, errorEventos, errEventos, refetchEventos } = dados
  const [filtros, setFiltros] = useState(filtrosIniciaisCategoria)
  const pessoas = members.filter(m => m.rolKey === categoria)
  const termo = normalizarBusca(filtros.busca)
  const filtradas = pessoas.filter(p => correspondeBusca(termo, p.nome)
    && estaNaFaixa(p.idade, filtros.idadeMin, filtros.idadeMax)
    && (!filtros.admissao || p.admissaoMotivacao === filtros.admissao)
    && (!filtros.demissao || p.demissaoMotivacao === filtros.demissao)
    && estaNaFaixa(p.tempoRolMeses, filtros.tempoMin, filtros.tempoMax))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
  const filtrando = Object.values(filtros).some(Boolean)

  function atualizar(campo: keyof typeof filtrosIniciaisCategoria, valor: string) {
    setFiltros(atuais => ({ ...atuais, [campo]: valor }))
  }

  return <section className="space-y-4" aria-labelledby="titulo-categoria-rol">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 id="titulo-categoria-rol" className="font-heading text-xl font-semibold">{CATEGORY_LABELS[categoria]}</h2>
      <Link to="/rol-membros" className="inline-flex items-center gap-2 rounded-sm text-sm font-medium text-purple hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple">
        <ArrowLeft size={16} aria-hidden="true" /> Voltar à listagem
      </Link>
    </div>
    {isLoading ? <p role="status">Carregando...</p>
      : errorPessoas ? <ErrorState error={errPessoas} onRetry={refetchPessoas} />
      : errorEventos ? <ErrorState error={errEventos} onRetry={refetchEventos} />
      : <>
        <section className="surface space-y-4 sm:p-4" aria-label="Busca e filtros do rol">
          <div className="flex flex-wrap items-end justify-end gap-3">
            <div className="min-w-44 flex-1">
              <CampoBusca rotulo="Buscar por nome" placeholder="Nome da pessoa" valor={filtros.busca} mudar={v => atualizar("busca", v)} />
            </div>
            <Button type="button" variant="outline" onClick={() => setFiltros(filtrosIniciaisCategoria)} disabled={!filtrando}>
              <FilterX aria-hidden="true" size={16} /> Limpar filtros
            </Button>
          </div>
          <div className="grid items-end gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <FiltroFaixaRol titulo="Idade (anos)" rotuloMin="Idade mínima" rotuloMax="Idade máxima"
              min={filtros.idadeMin} max={filtros.idadeMax} mudarMin={v => atualizar("idadeMin", v)} mudarMax={v => atualizar("idadeMax", v)} />
            <FiltroModalidadeRol titulo="Modalidade de admissão" campo="admissaoMotivacao" pessoas={pessoas}
              valor={filtros.admissao} mudar={v => atualizar("admissao", v)} />
            <FiltroModalidadeRol titulo="Modalidade de demissão" campo="demissaoMotivacao" pessoas={pessoas}
              valor={filtros.demissao} mudar={v => atualizar("demissao", v)} />
            <FiltroFaixaRol titulo="Tempo no rol (meses)" rotuloMin="Tempo mínimo no rol em meses" rotuloMax="Tempo máximo no rol em meses"
              min={filtros.tempoMin} max={filtros.tempoMax} mudarMin={v => atualizar("tempoMin", v)} mudarMax={v => atualizar("tempoMax", v)} />
          </div>
        </section>
        {filtradas.length ? <DataTable data={filtradas} columns={colunasCategoria} keyExtractor={m => m.id}
          pageResetKey={JSON.stringify(filtros)} /> : <div className="surface text-sm text-muted-foreground" role="status">
          {pessoas.length ? "Nenhuma pessoa corresponde à busca e aos filtros." : "Nenhuma pessoa neste rol."}
        </div>}
      </>}
  </section>
}

export function IndicadoresRol({ dados, considerarNaoArrolados = false }: { dados: ReturnType<typeof useDadosRol>; considerarNaoArrolados?: boolean }) {
  const { members, isLoading, errorPessoas, errorEventos } = dados
  if (isLoading || errorPessoas || errorEventos || !members.length) return null
  const summary = resumirRol(members, considerarNaoArrolados)
  const segmentos = summary.filter(s => s.count > 0)

  return <section className="space-y-3" aria-label="Indicadores do rol">
    <div className={`grid grid-cols-2 gap-3 ${considerarNaoArrolados ? "sm:grid-cols-3 xl:grid-cols-5" : "lg:grid-cols-4"}`}>
      {summary.map((s) => (
        <div
          key={s.key}
          className="rounded-panel border bg-card p-4 border-l-4"
          style={{ borderLeftColor: s.color }}
        >
          <div className="text-2xl font-bold">{s.count}</div>
          <div className="text-sm text-muted-foreground">{s.label}</div>
          <div className="text-xs text-muted-foreground mt-1">{s.percent.toFixed(1)}%</div>
        </div>
      ))}
    </div>

    <div className="space-y-2">
      <div className="h-3 rounded-full overflow-hidden flex bg-muted">
        {segmentos.map((s) => (
            <div
              key={s.key}
              className="h-full transition-all duration-300"
              style={{ width: `${s.percent}%`, backgroundColor: s.color }}
              title={`${s.label}: ${s.count} (${s.percent.toFixed(1)}%)`}
            />
          ))}
      </div>
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        {segmentos.map((s) => (
            <div key={s.key} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
              {s.label}
            </div>
          ))}
      </div>
    </div>
  </section>
}
