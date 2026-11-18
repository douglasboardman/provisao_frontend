import { apiClient } from "./client"
import type { Usuario } from "../types/models"
import type { Perfil } from "../types/enums"

export interface CreateUsuarioPayload {
  nome_usuario: string
  email_login: string
  perfil: Perfil
}

export const usuariosApi = {
  list: () =>
    apiClient.get<Usuario[]>("usuarios"),

  get: (id: string) =>
    apiClient.get<Usuario>(`usuarios/${id}`),

  create: (data: CreateUsuarioPayload) =>
    apiClient.post<Usuario>("usuarios", data),

  update: (id: string, data: Partial<Usuario>) =>
    apiClient.patch<Usuario>(`usuarios/${id}`, data),

  vincularPessoa: (id: string, pessoa_id: string | null) =>
    apiClient.patch<{ pessoa_id: string | null }>(`usuarios/${id}/pessoa`, { pessoa_id }),

  remove: (id: string) =>
    apiClient.delete<Usuario>(`usuarios/${id}`),

  activate: (id: string) =>
    apiClient.patch<Usuario>(`usuarios/${id}/activate`),

  uploadProfileImage: (id: string, file: File) =>
    apiClient.upload<Usuario>(`usuarios/${id}/profile-image`, file),
}
