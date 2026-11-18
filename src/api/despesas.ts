import { apiClient } from "./client"
import type { Despesa } from "../types/models"

export const despesasApi = {
  list: () =>
    apiClient.get<Despesa[]>("despesas"),

  get: (id: number) =>
    apiClient.get<Despesa>(`despesas/${id}`),

  create: (data: Partial<Despesa>) =>
    apiClient.post<Despesa>("despesas", data),

  update: (id: number, data: Partial<Despesa>) =>
    apiClient.patch<Despesa>(`despesas/${id}`, data),

  remove: (id: number) =>
    apiClient.delete<Despesa>(`despesas/${id}`),
}
