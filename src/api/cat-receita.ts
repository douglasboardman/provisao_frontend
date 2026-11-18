import { apiClient } from "./client"
import type { CatReceita } from "../types/models"

export const catReceitaApi = {
  list: () =>
    apiClient.get<CatReceita[]>("cat-receita"),

  get: (id: number) =>
    apiClient.get<CatReceita>(`cat-receita/${id}`),

  create: (data: Partial<CatReceita>) =>
    apiClient.post<CatReceita>("cat-receita", data),

  update: (id: number, data: Partial<CatReceita>) =>
    apiClient.patch<CatReceita>(`cat-receita/${id}`, data),

  remove: (id: number) =>
    apiClient.delete<CatReceita>(`cat-receita/${id}`),
}
