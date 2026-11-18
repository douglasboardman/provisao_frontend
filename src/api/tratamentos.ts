import { apiClient } from "./client"
import type { Tratamento } from "../types/models"

export const tratamentosApi = {
  list: () =>
    apiClient.get<Tratamento[]>("tratamentos"),

  get: (id: number) =>
    apiClient.get<Tratamento>(`tratamentos/${id}`),

  create: (data: Partial<Tratamento>) =>
    apiClient.post<Tratamento>("tratamentos", data),

  update: (id: number, data: Partial<Tratamento>) =>
    apiClient.patch<Tratamento>(`tratamentos/${id}`, data),

  remove: (id: number) =>
    apiClient.delete<Tratamento>(`tratamentos/${id}`),
}
