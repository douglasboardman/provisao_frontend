import { apiClient } from "./client"
import type { Lancamento } from "../types/models"
import type { PaginatedResponse } from "../types/api"

export interface LancamentosFilters {
  tipo?: string
  conta_id?: string
  page?: number
  mes?: number
  ano?: number
}

export interface BalancoMensal {
  mes: number
  ano: number
  total_receitas: number
  total_despesas: number
  saldo: number
  lancamentos: Lancamento[]
}

function buildQuery(filters?: LancamentosFilters): string {
  if (!filters) return ""
  const params = new URLSearchParams()
  if (filters.tipo) params.set("tipo", filters.tipo)
  if (filters.conta_id) params.set("conta_id", filters.conta_id)
  if (filters.page) params.set("page", String(filters.page))
  if (filters.mes !== undefined) params.set("mes", String(filters.mes))
  if (filters.ano !== undefined) params.set("ano", String(filters.ano))
  const qs = params.toString()
  return qs ? `?${qs}` : ""
}

export const lancamentosApi = {
  list: (filters?: LancamentosFilters) =>
    apiClient.get<PaginatedResponse<Lancamento>>(`lancamentos${buildQuery(filters)}`),

  balanco: (mes: number, ano: number) =>
    apiClient.get<BalancoMensal>(`lancamentos/balanco?mes=${mes}&ano=${ano}`),

  get: (id: string) =>
    apiClient.get<Lancamento>(`lancamentos/${id}`),

  create: (data: Partial<Lancamento>) =>
    apiClient.post<Lancamento>("lancamentos", data),

  update: (id: string, data: Partial<Lancamento>) =>
    apiClient.patch<Lancamento>(`lancamentos/${id}`, data),

  remove: (id: string) =>
    apiClient.delete<Lancamento>(`lancamentos/${id}`),
}
