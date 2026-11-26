import { BookUser as PageIcon } from "lucide-react"
import { WorkspaceHeader } from "../../components/shared/Workspace"
import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { ScrollText, FilterX } from "lucide-react"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../../components/ui/select"
import { DataTable, type Column } from "../../components/shared/DataTable"
import { EmptyState } from "../../components/shared/EmptyState"
import { ErrorState } from "../../components/shared/ErrorState"
import { pessoasApi } from "../../api/pessoas"
import { eventosMembresiaApi } from "../../api/eventos-membresia"
import { Sexo, MembresiaRol } from "../../types/enums"
import { MOTIVACAO_LABELS } from "../../lib/membresia-labels"
import { dataCivilLocal, formatarDataCivil } from "../../lib/membresia-temporal"
import { useEnumRelations } from "../../hooks/use-enum-relations"

import { CampoBusca } from "../../components/shared/CampoBusca"
import { correspondeBusca, correspondeCpf, normalizarBusca } from "../../lib/busca"
import { useAuthStore } from "../../stores/auth"
import { CATEGORY_ORDER, CATEGORY_LABELS, CATEGORY_COLORS, INDETERMINADO, NAO_ARROLADO, montarRol, resumirRol, type MemberView } from "./dados-rol"

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

export function RolMembrosPage({ dentroDaArea = false }: { dentroDaArea?: boolean }) {
  const [filters, setFilters] = useState<Filters>(initialFilters)
  const identidade = useAuthStore(s => `${s.user?.igreja_id}:${s.user?.sub}`)

  const { data: pessoas, isLoading: loadingPessoas, isError: errorPessoas, error: errPessoas, refetch: refetchPessoas } = useQuery({ queryKey: ["pessoas", identidade], queryFn: pessoasApi.list })
  const { data: eventos, isLoading: loadingEventos, isError: errorEventos, error: errEventos, refetch: refetchEventos } = useQuery({ queryKey: ["eventos-membresia", identidade], queryFn: eventosMembresiaApi.list })

  const { getFilter } = useEnumRelations("membresia")

  const admMotivacoes = useMemo(() => {
    const allowed = getFilter("Motivações de Admissão", "ADMISSAO")
    return allowed.map((k) => [k, MOTIVACAO_LABELS[k as keyof typeof MOTIVACAO_LABELS] ?? k] as const)
  }, [getFilter])

  const isLoading = loadingPessoas || loadingEventos

  // Sem fuso da igreja cadastrado, a referência é a data civil deste dispositivo.
  const hoje = dataCivilLocal(new Date())
  const members = useMemo(() => montarRol(pessoas ?? [], eventos ?? [], hoje), [pessoas, eventos, hoje])
  const summary = useMemo(() => resumirRol(members), [members])
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

  const totalMembers = members.length

  const ROL_BADGE_COLORS: Record<string, string> = {
    [MembresiaRol.COMUNGANTES]: "bg-[#6C4CAF]/10 text-[#6C4CAF] border-[#6C4CAF]/20",
    [MembresiaRol.NAO_COMUNGANTES]: "bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/20",
    [MembresiaRol.ROL_SEPARADO]: "bg-[#CA8A04]/10 text-[#CA8A04] border-[#CA8A04]/20",
    [MembresiaRol.EXCLUIDOS]: "bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/20",
    [NAO_ARROLADO]: "bg-[#9CA3AF]/10 text-[#9CA3AF] border-[#9CA3AF]/20",
    [INDETERMINADO]: "bg-amber-100 text-amber-900 border-amber-300",
  }

  const columns: Column<MemberView>[] = [
    { key: "nome", header: "Nome", sortable: true },
    { key: "idade", header: "Idade", render: (m) => <span>{m.idade}</span>, sortable: true },
    { key: "admissao", header: "Modalidade Admissão", render: (m) => <span className="text-sm">{m.admissaoLabel}</span> },
    {
      key: "rol",
      header: "Rol",
      render: (m) => (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${ROL_BADGE_COLORS[m.rolKey] ?? ""}`}>
          {m.rolLabel}
        </span>
      ),
    },
    { key: "tempo", header: "Tempo no Rol", render: (m) => <span className="text-sm text-muted-foreground">{m.tempoRolFormatted}</span> },
  ]

  return (
    <div className={dentroDaArea ? "space-y-5" : "workspace"}>
      {dentroDaArea
        ? <p className="text-sm text-muted-foreground">Composição em {formatarDataCivil(hoje)}, pela data deste dispositivo.</p>
        : <WorkspaceHeader icon={PageIcon} title="Rol de Membros" description="Composição na data civil deste dispositivo. Eventos futuros não alteram o rol atual." />}

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
          {/* Summary cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {summary.map((s) => (
              <div
                key={s.key}
                className="rounded-lg border bg-card p-4 border-l-4"
                style={{ borderLeftColor: s.color }}
              >
                <div className="text-2xl font-bold">{s.count}</div>
                <div className="text-sm text-muted-foreground">{s.label}</div>
                {totalMembers > 0 && (
                  <div className="text-xs text-muted-foreground mt-1">{s.percent.toFixed(1)}%</div>
                )}
              </div>
            ))}
          </div>

          {/* Composition bar */}
          <div className="space-y-2">
            <div className="h-3 rounded-full overflow-hidden flex bg-muted">
              {summary
                .filter((s) => s.count > 0)
                .map((s) => (
                  <div
                    key={s.key}
                    className="h-full transition-all duration-300"
                    style={{ width: `${s.percent}%`, backgroundColor: s.color }}
                    title={`${s.label}: ${s.count} (${s.percent.toFixed(1)}%)`}
                  />
                ))}
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              {summary
                .filter((s) => s.count > 0)
                .map((s) => (
                  <div key={s.key} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.label}
                  </div>
                ))}
            </div>
          </div>

          {/* Filters + Table */}
          <div className="grid items-start gap-5 lg:grid-cols-[16rem_minmax(0,1fr)]">
            {/* Filters sidebar */}
            <aside className="rounded-lg border bg-card p-4 space-y-5 lg:sticky lg:top-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Filtros</h3>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => setFilters(initialFilters)}>
                    <FilterX size={14} />
                    Limpar
                  </Button>
                )}
              </div>

              {/* Rol */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground">Rol</Label>
                <div className="space-y-1.5">
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
              </div>

              {/* Idade */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground">Idade</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                  <SelectTrigger aria-label="Sexo" className="h-8 text-sm"><SelectValue /></SelectTrigger>
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
                  <SelectTrigger aria-label="Forma de admissão" className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {admMotivacoes.map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Tempo no Rol */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground">Tempo no Rol (meses)</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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

              {filtered.length !== members.length && (
                <div className="text-xs text-muted-foreground pt-2 border-t">
                  Exibindo {filtered.length} de {members.length} pessoas
                </div>
              )}
            </aside>

            {/* Table */}
            <div className="min-w-0 space-y-4">
              <div className="surface">
                <CampoBusca rotulo="Buscar no rol" placeholder="Nome, CPF ou família" valor={filters.busca}
                  mudar={busca => setFilters(f => ({ ...f, busca }))} />
              </div>
              {filtered.length ? <DataTable data={filtered} columns={columns} keyExtractor={m => m.id}
                pageResetKey={JSON.stringify(filters)} /> :
                <EmptyState icon={ScrollText} title="Nenhuma pessoa encontrada" description="Altere a busca ou os filtros." />}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
