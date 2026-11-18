import { useAuthStore } from '../stores/auth'

const chaves = {
  governanca: 'VITE_FEATURE_GOVERNANCA',
  orgaos: 'VITE_FEATURE_ORGAOS',
  secretaria: 'VITE_FEATURE_SECRETARIA',
} as const

export function useRecurso(recurso: keyof typeof chaves) {
  const habilitado = useAuthStore(s => s.user?.recursos?.[recurso])
  return import.meta.env[chaves[recurso]] === 'true' && habilitado !== false
}
