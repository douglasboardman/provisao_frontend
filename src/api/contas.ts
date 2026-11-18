import { apiClient } from "./client"
import type { Conta } from "../types/models"

export const contasApi = {
  list: () =>
    apiClient.get<Conta[]>("contas"),

  get: (id: string) =>
    apiClient.get<Conta>(`contas/${id}`),

  create: (data: Partial<Conta>) =>
    apiClient.post<Conta>("contas", data),

  update: (id: string, data: Partial<Conta>) =>
    apiClient.patch<Conta>(`contas/${id}`, data),

  remove: (id: string) =>
    apiClient.delete<Conta>(`contas/${id}`),
}
