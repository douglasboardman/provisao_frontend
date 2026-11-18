import { apiClient } from "./client"
import type {
  LoginRequest, LoginResponse, RegisterRequest,
  ForgotPasswordRequest, SetPasswordRequest, JwtPayload,
} from "../types/auth"

export const authApi = {
  login: (data: LoginRequest) =>
    apiClient.post<LoginResponse>("auth/login", data),

  register: (data: RegisterRequest) =>
    apiClient.post<{ message: string }>("auth/register", data),

  confirmAccess: (token: string) => apiClient.post<{ message: string }>("auth/confirm-access", { token }),

  cancelAccess: (token: string) => apiClient.post<{ message: string }>("auth/cancel-access", { token }),

  mfaStatus: () => apiClient.get<{ enabled: boolean; required: boolean }>("auth/mfa"),
  mfaSetup: (senha: string) => apiClient.post<{ secret: string; uri: string }>("auth/mfa/setup", { senha }),
  mfaActivate: (codigo: string) => apiClient.post<{ recovery_codes: string[] }>("auth/mfa/activate", { codigo }),
  mfaRecovery: (senha: string, codigo?: string) => apiClient.post<{ recovery_codes: string[] }>("auth/mfa/recovery", { senha, codigo }),
  mfaRecoveryResume: (senha: string) => apiClient.post<{ recovery_codes: string[] }>("auth/mfa/recovery/resume", { senha }),
  mfaRecoveryConfirm: (codigo: string) => apiClient.post<{ message: string }>("auth/mfa/recovery/confirm", { codigo }),
  mfaPolicy: (senha: string, codigo: string, obrigatorio: boolean) => apiClient.patch<{ required: boolean }>("auth/mfa/policy", { senha, codigo, obrigatorio }),

  logout: () => apiClient.post<void>("auth/logout"),

  getProfile: () =>
    apiClient.get<JwtPayload>("auth/profile"),

  forgotPassword: (data: ForgotPasswordRequest) =>
    apiClient.post<{ message: string }>("auth/forgot-password", data),

  setPassword: (data: SetPasswordRequest) =>
    apiClient.post<{ message: string }>("auth/set-password", data),
}
