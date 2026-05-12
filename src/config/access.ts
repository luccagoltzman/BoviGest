export type UserRole = 'master' | 'administrador' | 'operador' | 'financeiro'

export const currentUserRole: UserRole = 'master'

export function canAccessSettings(role: UserRole) {
  return role === 'master'
}
