import { create } from 'zustand'
import type { JwtPayload } from '../types/auth'
import type { Perfil } from '../types/enums'
import { authApi } from '../api/auth'

// JWTs anteriores não são mais utilizados.
localStorage.removeItem('provisao_token')
interface AuthState {
  user: JwtPayload | null
  status: 'unknown' | 'loading' | 'ready'
  setAuth: (user: JwtPayload) => void
  restore: () => Promise<void>
  logout: () => Promise<void>
  isAuthenticated: () => boolean
  hasRole: (role: Perfil) => boolean
}
export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  status: 'unknown',
  setAuth: user => set({ user, status: 'ready' }),
  restore: async () => {
    if (get().status !== 'unknown') return
    set({ status: 'loading' })
    try { set({ user: await authApi.getProfile(), status: 'ready' }) }
    catch { set({ user: null, status: 'ready' }) }
  },
  logout: async () => { await authApi.logout(); set({ user: null, status: 'ready' }) },
  isAuthenticated: () => !!get().user,
  hasRole: role => get().user?.perfil === role,
}))
