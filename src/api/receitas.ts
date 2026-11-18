import { apiClient } from "./client"
import type { Receita } from "../types/models"

export const receitasApi = {
  list: () =>
    apiClient.get<Receita[]>("receitas"),

  get: (id: number) =>
    apiClient.get<Receita>(`receitas/${id}`),

  create: (data: Partial<Receita>) =>
    apiClient.post<Receita>("receitas", data),

  update: (id: number, data: Partial<Receita>) =>
    apiClient.patch<Receita>(`receitas/${id}`, data),

  remove: (id: number) =>
    apiClient.delete<Receita>(`receitas/${id}`),
}
