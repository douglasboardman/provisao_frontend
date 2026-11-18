import { apiClient } from "./client"
import type { CatDespesa } from "../types/models"

export const catDespesaApi = {
  list: () =>
    apiClient.get<CatDespesa[]>("cat-despesa"),

  get: (id: number) =>
    apiClient.get<CatDespesa>(`cat-despesa/${id}`),

  create: (data: Partial<CatDespesa>) =>
    apiClient.post<CatDespesa>("cat-despesa", data),

  update: (id: number, data: Partial<CatDespesa>) =>
    apiClient.patch<CatDespesa>(`cat-despesa/${id}`, data),

  remove: (id: number) =>
    apiClient.delete<CatDespesa>(`cat-despesa/${id}`),
}
