import { apiClient } from "./client"
import type { EventoMembresia } from "../types/models"

export const eventosMembresiaApi = {
  ordenarUnico: (id: string, dados: { ordem: number; justificativa: string; autoridade: string; evidencia: string; idempotencia: string; ciente: true }) =>
    apiClient.post<unknown>(`eventos-membresia/${encodeURIComponent(id)}/ordem-inicial`, dados),
  list: () => apiClient.get<EventoMembresia[]>("eventos-membresia"),
  get: (id: string) => apiClient.get<EventoMembresia>(`eventos-membresia/${id}`),
  getByPessoa: (pessoaId: string) => apiClient.get<EventoMembresia[]>(`eventos-membresia/pessoa/${pessoaId}`),
  create: (data: Partial<EventoMembresia>) => apiClient.post<EventoMembresia>("eventos-membresia", data),
  update: (id: string, data: Partial<EventoMembresia>) => apiClient.patch<EventoMembresia>(`eventos-membresia/${id}`, data),
  remove: (id: string) => apiClient.delete<EventoMembresia>(`eventos-membresia/${id}`),
}
