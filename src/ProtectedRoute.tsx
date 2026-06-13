import { Navigate, Outlet } from 'react-router-dom'
import { AuthService } from '@/services/auth.service'
import { useEffect, useState } from 'react'

export function ProtectedRoute() {
  const [loading, setLoading] = useState(true)
  const [isAuth, setIsAuth] = useState(false)

  useEffect(() => {
    AuthService.syncSession()
      .then((user) => {
        setIsAuth(!!user)
      })
      .catch(() => {
        setIsAuth(false)
      })
      .finally(() => {
        setLoading(false)
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
