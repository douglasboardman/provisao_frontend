import axios, { AxiosError, AxiosInstance } from "axios"
import { useAuthStore } from "@/stores/useAuthStore"

/**
 * Cliente HTTP base da aplicação.
 * Aponta para a API NestJS do ProVisão (VITE_API_URL) e injeta
 * o JWT da sessão a partir do Zustand store.
 */
export const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
})

// ── Request interceptor: injeta Authorization: Bearer <token> ─────────────
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Response interceptor: desloga em 401 e propaga o erro ─────────────────
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token inválido ou expirado — limpa a sessão.
      // O redirect para /login é feito pelo <ProtectedRoute> no próximo render.
      useAuthStore.getState().logout()
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.href = "/login"
      }
    }
    return Promise.reject(error)
  },
)

/**
 * Extrai a mensagem de erro mais útil possível de uma resposta da API.
 * O Nest costuma devolver `{ message: string | string[], statusCode, error }`.
 */
export function extractApiErrorMessage(error: unknown, fallback = "Erro inesperado"): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string | string[] } | undefined
    const msg = data?.message
    if (Array.isArray(msg)) return msg.join(", ")
    if (typeof msg === "string") return msg
    return error.message || fallback
  }
  if (error instanceof Error) return error.message
  return fallback
}
