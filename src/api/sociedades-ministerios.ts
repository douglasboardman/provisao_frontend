import { apiClient } from './client'

export const categoriasParticipacao = {
  LOCAL: 'Membro da igreja local',
  ESCOLA_DOMINICAL: 'Aluno da Escola Dominical',
  AUTORIZACAO_CONSELHO: 'Sócia autorizada pelo Conselho',
  COOPERADOR: 'Sócio cooperador',
}
export type CategoriaParticipacao = keyof typeof categoriasParticipacao
type Regra = {
  idade_minima: number
  idade_maxima: number | null
  escola_dominical: boolean
  diretoria_reduzida: boolean
  segundo_secretario_ucp: boolean
}

export const sociedadesMinisteriosApi = {
  consultar: (id: string, params: { data: string; busca?: string; supervisao?: string }) =>
    apiClient.get<{
      pode_gerir: boolean
      regra: Regra | null
      fonte: string | null
      cargos: { id: string; nome: string; codigo: string }[]
      sugestoes: { id: string; nome: string; categorias: CategoriaParticipacao[] }[]
    }>(`orgaos/institucional/${id}?${new URLSearchParams(params)}`),
  criarMinisterio: (dados: object) => apiClient.post<{ id: string; ato_id: string }>('orgaos/institucional/ministerios', dados),
  ato: (id: string, dados: object) => apiClient.post<{ id: string; ato_id: string }>(`orgaos/institucional/${id}/atos`, dados),
}
