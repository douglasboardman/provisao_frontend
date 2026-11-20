import { apiClient } from "./client"
import type { RegraRelacaoEnum } from "../types/models"

export const regrasRelacaoEnumApi = {
  getByModulo: (modulo: string) =>
    apiClient.get<RegraRelacaoEnum[]>(`regras-relacao-enum/modulo/${modulo}`),

  getEnums: () =>
    apiClient.get<Record<string, string[]>>("regras-relacao-enum/enums"),

  list: () =>
    apiClient.get<RegraRelacaoEnum[]>("regras-relacao-enum"),

  get: (id: string) =>
    apiClient.get<RegraRelacaoEnum>(`regras-relacao-enum/${id}`),

  create: (data: Partial<RegraRelacaoEnum>) =>
    apiClient.post<RegraRelacaoEnum>("regras-relacao-enum", data),

  update: (id: string, data: Partial<RegraRelacaoEnum>) =>
    apiClient.patch<RegraRelacaoEnum>(`regras-relacao-enum/${id}`, data),

  remove: (id: string) =>
    apiClient.delete(`regras-relacao-enum/${id}`),

  replaceValores: (id: string, valores: { valor_classificador: string; valor_classificado: string }[]) =>
    apiClient.put<RegraRelacaoEnum>(`regras-relacao-enum/${id}/valores`, { valores }),

  replaceValoresMembresia: (id: string, valores: { valor_classificador: string; valor_classificado: string }[]) =>
    apiClient.put<RegraRelacaoEnum>(`regras-relacao-enum/modulo/membresia/${encodeURIComponent(id)}/valores`, { valores }),
}
