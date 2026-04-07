import { ReactNode } from 'react'
import { Navigate, Outlet } from 'react-router'
import { useAuthStore } from '../../stores/useAuthStore'

export const ProtectedRoute = ({ children }: { children?: ReactNode }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated())

  // Mocking auth temporarily
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children ? <>{children}</> : <Outlet />
}
