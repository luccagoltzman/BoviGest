import { supabase } from './supabase'

export interface AuthUser {
  id: string
  email: string
  empresa_id: number | null
}

const STORAGE_KEY = 'auth_user'

export const AuthService = {
  async login(email: string, password: string): Promise<AuthUser> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error

    const user = await this.me(data.user?.id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user)) 
    return user
  },

  async register(email: string, password: string): Promise<AuthUser> {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error

    const user = await this.me(data.user?.id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user)) 
    return user
  },

  async me(userId?: string): Promise<AuthUser> {
    const cached = localStorage.getItem(STORAGE_KEY)
    if (cached) return JSON.parse(cached)

    const { data: userData, error: userErr } = await supabase.auth.getUser()
    if (userErr) throw userErr
    const id = userId || userData.user?.id
    if (!id) throw new Error('Usuário não logado')

    const { data: vinculo } = await supabase
      .from('usuarios_empresas')
      .select('empresa_id')
      .eq('user_id', id)
      .single()

    const user: AuthUser = {
      id,
      email: userData.user?.email || '',
      empresa_id: vinculo?.empresa_id ?? null
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    return user
  },

  logout() {
    localStorage.removeItem(STORAGE_KEY)
    return supabase.auth.signOut()
  },

  getToken() {
    return supabase.auth.getSession().then(r => r.data.session?.access_token)
  },

  isAuthenticated() {
    return supabase.auth.getSession().then(r => !!r.data.session)
  },

  getCachedUser(): AuthUser | null {
    const cached = localStorage.getItem(STORAGE_KEY)
    return cached ? JSON.parse(cached) : null
  }
}