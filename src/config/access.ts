import type { UserRole } from '@/services/usuarios.service'
import { AuthService } from '@/services/auth.service'

export type { UserRole }

export function getCurrentUserRole(): UserRole | null {
  return AuthService.getCachedUser()?.perfil ?? null
}

export function canAccessSettings(role: UserRole | null) {
  return role === 'master'
}
