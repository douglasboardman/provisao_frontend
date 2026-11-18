import { Perfil } from "./enums"

export interface JwtPayload {
  sub: string
  username: string
  login: string
  perfil: Perfil
  igreja_id: string
  mfa_enrollment_required?: boolean
  mfa_recovery_recent?: boolean
  recursos?: Record<'governanca' | 'orgaos' | 'secretaria', boolean>
}

export interface LoginRequest {
  mfa_code?: string
  igreja_id: string
  login: string
  senha: string
}

export type LoginResponse = JwtPayload

export interface RegisterRequest {
  nome_usuario: string
  email_login: string
  igreja_id: string
}

export interface ForgotPasswordRequest {
  igreja_id: string
  email_login: string
}

export interface SetPasswordRequest {
  token: string
  nova_senha: string
}
