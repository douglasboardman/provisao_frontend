import { describe, it, expect } from 'vitest'
import { eventoMembresiaVigente } from '../lib/membresia-temporal'
import type { EventoMembresia } from '../types/models'
const ev = (data: string, ordem: number | null, rol: string) => ({ data_evento: `${data}T00:00:00.000Z`, ordem_dia: ordem, rol }) as EventoMembresia
describe('rol por data civil', () => {
  it('ignora o futuro e inclui a data da consulta', () => {
    const atual = ev('2026-01-01', null, 'COMUNGANTES'), futuro = ev('2027-01-01', null, 'EXCLUIDOS')
    expect(eventoMembresiaVigente([futuro, atual], '2026-01-01')).toEqual({ situacao: 'DEFINIDO', evento: atual })
    expect(eventoMembresiaVigente([atual], '2025-12-31').situacao).toBe('SEM_EVENTO')
  })
  it('exige sequência completa no mesmo dia', () => {
    const a = ev('2026-01-01', 1, 'NAO_COMUNGANTES'), b = ev('2026-01-01', 2, 'COMUNGANTES')
    expect(eventoMembresiaVigente([a, b], '2026-01-01')).toEqual({ situacao: 'DEFINIDO', evento: b })
    expect(eventoMembresiaVigente([a, { ...b, ordem_dia: null }], '2026-01-01').situacao).toBe('AMBIGUO')
  })
})
