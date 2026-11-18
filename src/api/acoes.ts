import { apiClient } from "./client"
import type { Acao } from "../types/models"

export const acoesApi = {
  list: () =>
    apiClient.get<Acao[]>("acoes"),

  get: (id: string) =>
    apiClient.get<Acao>(`acoes/${id}`),

  create: (data: Partial<Acao>) =>
    apiClient.post<Acao>("acoes", data),

  update: (id: string, data: Partial<Acao>) =>
    apiClient.patch<Acao>(`acoes/${id}`, data),

  remove: (id: string) =>
    apiClient.delete<Acao>(`acoes/${id}`),
}
