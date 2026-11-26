import { MembresiaRol, TipoEvento, type MotivacaoEvento, type Sexo } from "../../types/enums"
import type { EventoMembresia, Pessoa } from "../../types/models"
import { ROL_LABELS, MOTIVACAO_LABELS, calcAge } from "../../lib/membresia-labels"
import { eventoMembresiaVigente } from "../../lib/membresia-temporal"

export const NAO_ARROLADO = "NAO_ARROLADO"
export const INDETERMINADO = "INDETERMINADO"

export const CATEGORY_ORDER = [
  MembresiaRol.COMUNGANTES,
  MembresiaRol.NAO_COMUNGANTES,
  MembresiaRol.ROL_SEPARADO,
  MembresiaRol.EXCLUIDOS,
  NAO_ARROLADO,
  INDETERMINADO,
] as const

export const CATEGORY_LABELS: Record<string, string> = {
  ...ROL_LABELS,
  [NAO_ARROLADO]: "Não Arrolados",
  [INDETERMINADO]: "Histórico indeterminado",
}

export const CATEGORY_COLORS: Record<string, string> = {
  [MembresiaRol.COMUNGANTES]: "#6C4CAF",
  [MembresiaRol.NAO_COMUNGANTES]: "#2563EB",
  [MembresiaRol.ROL_SEPARADO]: "#CA8A04",
  [MembresiaRol.EXCLUIDOS]: "#DC2626",
  [NAO_ARROLADO]: "#9CA3AF",
  [INDETERMINADO]: "#B45309",
}

export type MemberView = {
  id: string
  nome: string
  cpf: string | null
  familia?: string
  idade: number
  sexo: Sexo
  rolKey: string
  rolLabel: string
  admissaoMotivacao: MotivacaoEvento | null
  admissaoLabel: string
  tempoRolMeses: number | null
  tempoRolFormatted: string
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

export function montarRol(pessoas: Pessoa[], eventos: EventoMembresia[], hoje: string): MemberView[] {
  const grupos = new Map<string, EventoMembresia[]>()
  for (const evento of eventos) {
    const grupo = grupos.get(evento.pessoa_id) ?? []
    grupo.push(evento)
    grupos.set(evento.pessoa_id, grupo)
  }

  return pessoas.map(p => {
    const grupo = grupos.get(p.id) ?? []
    const estado = eventoMembresiaVigente(grupo, hoje)
    const admissao = eventoMembresiaVigente(grupo.filter(e => e.tipo_evento === TipoEvento.ADMISSAO), hoje)
    const lastEvent = estado.situacao === 'DEFINIDO' ? estado.evento : undefined
    const admEvent = admissao.situacao === 'DEFINIDO' ? admissao.evento : undefined
    const rolKey = estado.situacao === 'AMBIGUO' ? INDETERMINADO : lastEvent?.rol ?? NAO_ARROLADO

    return {
      id: p.id,
      nome: p.nome_completo,
      cpf: p.cpf,
      familia: p.grupos_familiares?.nome_familia,
      idade: calcAge(p.data_nascimento),
      sexo: p.sexo,
      rolKey,
      rolLabel: CATEGORY_LABELS[rolKey] ?? rolKey,
      admissaoMotivacao: admEvent?.motivacao_evento ?? null,
      admissaoLabel: admEvent ? MOTIVACAO_LABELS[admEvent.motivacao_evento] ?? "" : "—",
      tempoRolMeses: lastEvent ? getTempoRolMonths(lastEvent.data_evento) : null,
      tempoRolFormatted: lastEvent ? formatTempoRol(lastEvent.data_evento) : "—",
    }
  })
}

export function resumirRol(members: MemberView[]) {
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
}
