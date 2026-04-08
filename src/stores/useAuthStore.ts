import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Perfis de usuário — espelha o enum `usuarios_perfil` do backend (Prisma).
 */
export type Perfil =
  | 'ADMINISTRADOR'
  | 'GESTOR'
  | 'TESOUREIRO'
  | 'OPERADOR'
  | 'AUDITOR'
  | 'SECRETARIO'

/**
 * Representa o payload devolvido por `GET /auth/profile`, que é o próprio
 * payload do JWT anexado à requisição pelo AuthGuard do backend.
 */
export interface AuthUser {
  sub: string          // id do usuário
  username: string     // nome_usuario
  login: string        // email_login
  perfil: Perfil
  igreja_id: string
}

interface AuthState {
  token: string | null
  user: AuthUser | null
  login: (token: string, user: AuthUser) => void
  logout: () => void
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      login: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
      isAuthenticated: () => !!get().token,
    }),
    {
      name: 'provisao-auth-storage',
    },
  ),
)
