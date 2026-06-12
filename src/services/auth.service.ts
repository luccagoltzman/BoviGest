import { supabase } from './supabase'

export interface AuthUser {
  id: string
  email: string
  empresa_id: number | null
}

const STORAGE_KEY = 'auth_user'

async function loadAuthUser(userId: string, email: string): Promise<AuthUser> {
  const { data: vinculo, error } = await supabase
    .from('usuarios_empresas')
    .select('empresa_id, status')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error

  if (!vinculo || vinculo.status !== 1) {
    await supabase.auth.signOut()
    localStorage.removeItem(STORAGE_KEY)
    throw new Error('Usuário inativo ou sem acesso à empresa')
  }

  return {
    id: userId,
    email,
    empresa_id: vinculo.empresa_id,
  }
}

export const AuthService = {
  async login(email: string, password: string): Promise<AuthUser> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error

    const user = await loadAuthUser(
      data.user?.id ?? '',
      data.user?.email ?? email,
    )
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    return user
  },

  async register(email: string, password: string): Promise<AuthUser> {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error

    const user = await loadAuthUser(
      data.user?.id ?? '',
      data.user?.email ?? email,
    )
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    return user
  },

  async me(userId?: string): Promise<AuthUser> {
    const cached = localStorage.getItem(STORAGE_KEY)
    if (cached && !userId) return JSON.parse(cached)

    const { data: userData, error: userErr } = await supabase.auth.getUser()
    if (userErr) throw userErr
    const id = userId || userData.user?.id
    if (!id) throw new Error('Usuário não logado')

    const user = await loadAuthUser(id, userData.user?.email || '')
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    return user
  },

  logout() {
    localStorage.removeItem(STORAGE_KEY)
    return supabase.auth.signOut()
  },

  getToken() {
    return supabase.auth.getSession().then((r) => r.data.session?.access_token)
  },

  isAuthenticated() {
    return supabase.auth.getSession().then((r) => !!r.data.session)
  },

  getCachedUser(): AuthUser | null {
    const cached = localStorage.getItem(STORAGE_KEY)
    return cached ? JSON.parse(cached) : null
  },
}
