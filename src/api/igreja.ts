import { apiClient } from "./client"
import type { Igreja } from "../types/models"

export interface IgrejaPublic {
  id: string
  nome: string
}

export const igrejaApi = {
  listPublic: () =>
    apiClient.get<IgrejaPublic[]>("igrejas"),

  listForRegistration: () =>
    apiClient.get<IgrejaPublic[]>("igrejas?cadastro=1"),

  getMe: () =>
    apiClient.get<Igreja>("igrejas/me"),

  updateMe: (data: Partial<Igreja>) =>
    apiClient.patch<Igreja>("igrejas/me", data),

  uploadLogo: (file: File) =>
    apiClient.upload<Igreja>("igrejas/me/logo", file),

  getCongregacoes: () =>
    apiClient.get<Igreja[]>("igrejas/me/congregacoes"),
}
