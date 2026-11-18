import { apiClient } from "./client"
import type { LogAtividade } from "../types/models"
import type { PaginatedResponse } from "../types/api"

export const logsApi = {
  list: (page?: number) =>
    apiClient.get<PaginatedResponse<LogAtividade>>(
      `logs${page ? `?page=${page}` : ""}`,
    ),
}
