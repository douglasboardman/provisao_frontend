import type { EventoMembresia } from '../types/models'

export function dataCivilLocal(agora: Date) {
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`
}
export function formatarDataCivil(data: string) { return data.slice(0, 10).split('-').reverse().join('/') }

export function eventoMembresiaVigente(eventos: EventoMembresia[], data: string):
  { situacao: 'SEM_EVENTO' } | { situacao: 'AMBIGUO' } | { situacao: 'DEFINIDO'; evento: EventoMembresia } {
  const vigentes = eventos.filter(e => e.data_evento.slice(0, 10) <= data)
  if (!vigentes.length) return { situacao: 'SEM_EVENTO' }
  const ultimoDia = vigentes.reduce((maior, evento) => evento.data_evento.slice(0, 10) > maior ? evento.data_evento.slice(0, 10) : maior, '')
  const mesmoDia = vigentes.filter(e => e.data_evento.slice(0, 10) === ultimoDia)
  if (mesmoDia.length === 1) return { situacao: 'DEFINIDO', evento: mesmoDia[0] }
  const ordens = mesmoDia.map(e => e.ordem_dia)
  if (ordens.some(o => o == null || !Number.isSafeInteger(o) || o <= 0) || new Set(ordens).size !== ordens.length) return { situacao: 'AMBIGUO' }
  return { situacao: 'DEFINIDO', evento: mesmoDia.reduce((a, b) => a.ordem_dia! > b.ordem_dia! ? a : b) }
}
