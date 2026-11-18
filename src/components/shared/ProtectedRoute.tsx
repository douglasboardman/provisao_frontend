import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuthStore } from '../../stores/auth'

export function ProtectedRoute() {
  const location = useLocation()
  const status = useAuthStore(s => s.status)
  const user = useAuthStore(s => s.user)
  const restore = useAuthStore(s => s.restore)
  useEffect(() => { void restore() }, [restore])
  if (status !== 'ready') return <p>Verificando sessão...</p>
  if (user?.mfa_enrollment_required && location.pathname !== "/mfa-obrigatorio") return <Navigate to="/mfa-obrigatorio" replace />
  return user ? <Outlet /> : <Navigate to="/login" replace />
}
