import { apiClient } from './client'
import type { OficialResumo } from './oficiais'
export interface VinculoPastoral { id: string; modalidade: string; concilio: string; ato: string; data_inicio: string; data_fim: string | null; exercicio_institucional: boolean; evidencia: string }
export interface Pastor extends OficialResumo {
  funcao: 'PRESIDENTE' | 'AUXILIAR'
  eventos: { data_efeito: string; autoridade: string; evidencia: string }[]
  vinculo_na_data: VinculoPastoral | null
  vinculos_pastorais: VinculoPastoral[]
  presidencias_conselho: { id: string; inicio: string; fim: string | null }[]
}
export interface CadastroPastor { pessoa_id: string; funcao: 'PRESIDENTE' | 'AUXILIAR'; ordenacao?: { data: string; responsavel: string; documento: string }; modalidade: string; concilio: string; ato: string; inicio: string; evidencia: string }
export const pastoresApi = {
  listar: (data: string) => apiClient.get<Pastor[]>(`pastores?${new URLSearchParams({ data })}`),
  cadastrar: (dados: CadastroPastor) => apiClient.post<{ id: string }>('pastores', dados),
}
