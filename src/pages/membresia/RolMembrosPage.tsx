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
import { Sexo, MembresiaRol, TipoEvento, MotivacaoEvento } from "../../types/enums"
import type { EventoMembresia } from "../../types/models"
import { ROL_LABELS, MOTIVACAO_LABELS, calcAge } from "../../lib/membresia-labels"
import { dataCivilLocal, eventoMembresiaVigente } from "../../lib/membresia-temporal"
import { useEnumRelations } from "../../hooks/use-enum-relations"

const NAO_ARROLADO = "NAO_ARROLADO"
const INDETERMINADO = "INDETERMINADO"

const CATEGORY_ORDER = [
  MembresiaRol.COMUNGANTES,
  MembresiaRol.NAO_COMUNGANTES,
  MembresiaRol.ROL_SEPARADO,
  MembresiaRol.EXCLUIDOS,
  NAO_ARROLADO,
  INDETERMINADO,
] as const

const CATEGORY_LABELS: Record<string, string> = {
  ...ROL_LABELS,
  [NAO_ARROLADO]: "Não Arrolados",
  [INDETERMINADO]: "Histórico indeterminado",
}

const CATEGORY_COLORS: Record<string, string> = {
  [MembresiaRol.COMUNGANTES]: "#6C4CAF",
  [MembresiaRol.NAO_COMUNGANTES]: "#2563EB",
  [MembresiaRol.ROL_SEPARADO]: "#CA8A04",
  [MembresiaRol.EXCLUIDOS]: "#DC2626",
  [NAO_ARROLADO]: "#9CA3AF",
  [INDETERMINADO]: "#B45309",
}

type MemberView = {
  id: string
  nome: string
  idade: number
  sexo: Sexo
  rolKey: string
  rolLabel: string
  admissaoMotivacao: MotivacaoEvento | null
  admissaoLabel: string
  tempoRolMeses: number | null
  tempoRolFormatted: string
}

type Filters = {
  idadeMin: string
  idadeMax: string
  sexo: string
  roles: Record<string, boolean>
  admissao: string
  tempoMin: string
  tempoMax: string
}

const initialFilters: Filters = {
  idadeMin: "",
  idadeMax: "",
  sexo: "",
  roles: Object.fromEntries(CATEGORY_ORDER.map((k) => [k, true])),
  admissao: "",
  tempoMin: "",
  tempoMax: "",
}

function getTempoRolMonths(dataEvento: string): number {
  const [ano, mes, dia] = dataEvento.slice(0, 10).split('-').map(Number)
  const d = new Date(ano, mes - 1, dia)
  const now = new Date()
  let months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth())
  if (now.getDate() < d.getDate()) months--
  return Math.max(0, months)
}

function formatTempoRol(dataEvento: string): string {
  const months = getTempoRolMonths(dataEvento)
  const y = Math.floor(months / 12)
  const m = months % 12

  if (y === 0) {
    if (m === 0) return "< 1 mês"
    return m === 1 ? "há 1 mês" : `há ${m} meses`
  }

  const yStr = y === 1 ? "1 ano" : `${y} anos`
  if (m === 0) return `há ${yStr}`
  const mStr = m === 1 ? "1 mês" : `${m} meses`
  return `há ${yStr} e ${mStr}`
}

export function RolMembrosPage() {
  const [filters, setFilters] = useState<Filters>(initialFilters)

  const { data: pessoas, isLoading: loadingPessoas, isError: errorPessoas, error: errPessoas, refetch: refetchPessoas } = useQuery({ queryKey: ["pessoas"], queryFn: pessoasApi.list })
  const { data: eventos, isLoading: loadingEventos, isError: errorEventos, error: errEventos, refetch: refetchEventos } = useQuery({ queryKey: ["eventos-membresia"], queryFn: eventosMembresiaApi.list })

  const { getFilter } = useEnumRelations("membresia")

  const admMotivacoes = useMemo(() => {
    const allowed = getFilter("Motivações de Admissão", "ADMISSAO")
    return allowed.map((k) => [k, MOTIVACAO_LABELS[k as keyof typeof MOTIVACAO_LABELS] ?? k] as const)
  }, [getFilter])

  const isLoading = loadingPessoas || loadingEventos

  // Sem fuso da igreja cadastrado, a referência é a data civil deste dispositivo.
  const hoje = dataCivilLocal(new Date())
  const estados = useMemo(() => {
    const grupos = new Map<string, EventoMembresia[]>()
    for (const evento of eventos ?? []) { const grupo = grupos.get(evento.pessoa_id) ?? []; grupo.push(evento); grupos.set(evento.pessoa_id, grupo) }
    const mapa = new Map<string, ReturnType<typeof eventoMembresiaVigente>>()
    for (const [pessoaId, grupo] of grupos) mapa.set(pessoaId, eventoMembresiaVigente(grupo, hoje))
    return mapa
  }, [eventos, hoje])
  const admissionMap = useMemo(() => {
    const grupos = new Map<string, EventoMembresia[]>()
    for (const evento of eventos ?? []) if (evento.tipo_evento === TipoEvento.ADMISSAO) { const grupo = grupos.get(evento.pessoa_id) ?? []; grupo.push(evento); grupos.set(evento.pessoa_id, grupo) }
    const mapa = new Map<string, EventoMembresia>()
    for (const [pessoaId, grupo] of grupos) { const vigente = eventoMembresiaVigente(grupo, hoje); if (vigente.situacao === 'DEFINIDO') mapa.set(pessoaId, vigente.evento) }
    return mapa
  }, [eventos, hoje])

  const members: MemberView[] = useMemo(() => {
    if (!pessoas) return []
    return pessoas.map((p) => {
      const estado = estados.get(p.id)
      const lastEvent = estado?.situacao === 'DEFINIDO' ? estado.evento : undefined
      const admEvent = admissionMap.get(p.id)
      const rolKey = estado?.situacao === 'AMBIGUO' ? INDETERMINADO : lastEvent ? lastEvent.rol : NAO_ARROLADO
      const tempoRolMeses = lastEvent ? getTempoRolMonths(lastEvent.data_evento) : null
      return {
        id: p.id,
        nome: p.nome_completo,
        idade: calcAge(p.data_nascimento),
        sexo: p.sexo,
        rolKey,
        rolLabel: CATEGORY_LABELS[rolKey] ?? rolKey,
        admissaoMotivacao: admEvent?.motivacao_evento ?? null,
        admissaoLabel: admEvent ? MOTIVACAO_LABELS[admEvent.motivacao_evento] ?? "" : "—",
        tempoRolMeses,
        tempoRolFormatted: lastEvent ? formatTempoRol(lastEvent.data_evento) : "—",
      }
    })
  }, [pessoas, estados, admissionMap])

  const summary = useMemo(() => {
    const counts: Record<string, number> = Object.fromEntries(CATEGORY_ORDER.map((k) => [k, 0]))
    for (const m of members) counts[m.rolKey] = (counts[m.rolKey] ?? 0) + 1
    const total = members.length
    return CATEGORY_ORDER.map((key) => ({
      key,
      label: CATEGORY_LABELS[key],
      count: counts[key] ?? 0,
      percent: total > 0 ? ((counts[key] ?? 0) / total) * 100 : 0,
      color: CATEGORY_COLORS[key],
    }))
  }, [members])

  const filtered = useMemo(() => {
    return members.filter((m) => {
      if (!filters.roles[m.rolKey]) return false
      if (filters.idadeMin && m.idade < Number(filters.idadeMin)) return false
      if (filters.idadeMax && m.idade > Number(filters.idadeMax)) return false
      if (filters.sexo && m.sexo !== filters.sexo) return false
      if (filters.admissao && m.admissaoMotivacao !== filters.admissao) return false
      if (filters.tempoMin && (m.tempoRolMeses === null || m.tempoRolMeses < Number(filters.tempoMin))) return false
      if (filters.tempoMax && (m.tempoRolMeses === null || m.tempoRolMeses > Number(filters.tempoMax))) return false
      return true
    })
  }, [members, filters])

  const hasActiveFilters = useMemo(() => {
    return filters.idadeMin !== "" || filters.idadeMax !== "" ||
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
    <div className="workspace">
      <WorkspaceHeader icon={PageIcon} title="Rol de Membros" description="Composição na data civil deste dispositivo. Eventos futuros não alteram o rol atual." />

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
          <div className="grid grid-cols-[260px_1fr] gap-6 items-start">
            {/* Filters sidebar */}
            <aside className="rounded-lg border bg-card p-4 space-y-5 sticky top-4">
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
                    value={filters.idadeMin}
                    onChange={(e) => setFilters((f) => ({ ...f, idadeMin: e.target.value }))}
                    className="h-8 text-sm"
                  />
                  <Input
                    type="number"
                    placeholder="Máx"
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
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
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
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
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
                    value={filters.tempoMin}
                    onChange={(e) => setFilters((f) => ({ ...f, tempoMin: e.target.value }))}
                    className="h-8 text-sm"
                  />
                  <Input
                    type="number"
                    placeholder="Máx"
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
            <DataTable
              data={filtered}
              columns={columns}
              keyExtractor={(m) => m.id}
            />
          </div>
        </>
      )}
    </div>
  )
}
