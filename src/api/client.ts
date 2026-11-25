import type { ApiError } from "../types/api"

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000"

export class ApiRequestError extends Error {
  constructor(
    public statusCode: number,
    public messages: string[],
    public code?: string,
  ) {
    super(messages[0] || "Erro na requisição")
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  decode: (response: Response) => Promise<T> = response => response.json(),
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  }

  headers["X-Provisao-Request"] = "1"

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json"
  }

  let response: Response
  try {
    response = await fetch(`${BASE_URL}/${path}`, {
      ...options,
      credentials: "include",
      headers,
    })
  } catch (networkError) {
    console.error(`[API] Network error on ${path}:`, networkError)
    throw networkError
  }

  if (!response.ok) {
    if (response.status === 401 && !path.startsWith("minha-assembleia") && !path.startsWith("assinaturas/convite/") && !["auth/login", "auth/profile", "auth/confirm-access", "auth/cancel-access", "auth/set-password", "auth/mfa/setup", "auth/mfa/activate", "auth/mfa/recovery", "auth/mfa/recovery/resume", "auth/mfa/recovery/confirm", "auth/mfa/policy", "auth/mfa/desativar-no-espelho"].includes(path)) {
      window.location.href = "/login"
      throw new ApiRequestError(401, ["Sessão expirada."])
    }

    const error: ApiError = await response.json().catch(() => ({
      statusCode: response.status,
      message: "Erro inesperado no servidor.",
    }))

    const messages = Array.isArray(error.message) ? error.message : [error.message]
    console.error(`[API] ${response.status} on ${path}:`, messages)
    throw new ApiRequestError(error.statusCode, messages, error.code)
  }

  if (response.status === 204) return undefined as T

  return decode(response)
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  postForm: <T>(path: string, body: FormData) => request<T>(path, { method: "POST", body }),

  postBlob: (path: string, body: unknown) =>
    request(path, { method: "POST", body: JSON.stringify(body) }, response => response.blob()),

  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  put: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(path: string) =>
    request<T>(path, { method: "DELETE" }),

  upload: <T>(path: string, file: File, fieldName = "file") => {
    const formData = new FormData()
    formData.append(fieldName, file)
    return request<T>(path, { method: "PATCH", body: formData })
  },
}
