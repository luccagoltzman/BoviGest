import { Navigate, Outlet } from 'react-router-dom'
import { AuthService } from '@/services/auth.service'

export function ProtectedRoute() {
  const isAuth = AuthService.isAuthenticated()

  if (!isAuth) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}