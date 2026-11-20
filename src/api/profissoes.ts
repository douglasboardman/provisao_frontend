import { apiClient } from "./client"
import type { Profissao } from "../types/models"

export const profissoesApi = {
  list: () => apiClient.get<Profissao[]>("profissoes"),
  create: (nome: string) => apiClient.post<Profissao>("profissoes", { nome }),
  update: (id: string, nome: string) => apiClient.patch<Profissao>(`profissoes/${encodeURIComponent(id)}`, { nome }),
  remove: (id: string) => apiClient.delete<{ id: string }>(`profissoes/${encodeURIComponent(id)}`),
}
