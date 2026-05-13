import { Navigate, Outlet } from 'react-router-dom'
import { AuthService } from '@/services/auth.service'
import { useEffect, useState } from 'react'

export function ProtectedRoute() {
  const [loading, setLoading] = useState(true)
  const [isAuth, setIsAuth] = useState<boolean | null>(null)

  useEffect(() => {
    AuthService.isAuthenticated().then((authenticated) => {
      setIsAuth(authenticated)
      setLoading(false)

      if (!authenticated) {
        alert('Sessão expirada, faça login novamente.')
      }
    })
  }, [])

  if (loading) {
    return null
  }

  if (!isAuth) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}