import { apiClient } from "./client"
import type { Pessoa } from "../types/models"

export const pessoasApi = {
  list: () =>
    apiClient.get<Pessoa[]>("pessoas"),

  get: (id: string) =>
    apiClient.get<Pessoa>(`pessoas/${id}`),

  create: (data: Partial<Pessoa>) =>
    apiClient.post<Pessoa>("pessoas", data),

  update: (id: string, data: Partial<Pessoa>) =>
    apiClient.patch<Pessoa>(`pessoas/${id}`, data),

  remove: (id: string) =>
    apiClient.delete<Pessoa>(`pessoas/${id}`),

  uploadFoto: (id: string, file: File) =>
    apiClient.upload<Pessoa>(`pessoas/atrib-foto-pessoa/${id}`, file),

  setFamilia: (idPessoa: string, idFamilia: string) =>
    apiClient.patch<Pessoa>(`pessoas/atrib-grupo-familiar/${idPessoa}/${idFamilia}`),
}
