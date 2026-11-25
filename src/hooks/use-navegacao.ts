import { useQuery } from '@tanstack/react-query'
import { autorizacaoApi } from '../api/autorizacao'
import { useAuthStore } from '../stores/auth'

export function useNavegacao() {
  const user = useAuthStore(s => s.user)
  return useQuery({
    queryKey: ['navegacao', user?.igreja_id, user?.sub],
    queryFn: autorizacaoApi.navegacao,
    enabled: !!user && !user.mfa_enrollment_required,
    retry: false,
    staleTime: 15_000,
    refetchInterval: 30_000,
  })
}
