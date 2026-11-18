import { apiClient } from "./client"
import type { GrupoFamiliar } from "../types/models"

export const gruposFamiliaresApi = {
  list: () =>
    apiClient.get<GrupoFamiliar[]>("grupos-familiares"),

  get: (id: string) =>
    apiClient.get<GrupoFamiliar>(`grupos-familiares/${id}`),

  create: (data: Partial<GrupoFamiliar>) =>
    apiClient.post<GrupoFamiliar>("grupos-familiares", data),

  update: (id: string, data: Partial<GrupoFamiliar>) =>
    apiClient.patch<GrupoFamiliar>(`grupos-familiares/${id}`, data),

  remove: (id: string) =>
    apiClient.delete<GrupoFamiliar>(`grupos-familiares/${id}`),
}
