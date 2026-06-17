import { usuariosService, type UserRole } from './usuarios.service'
import { supabase } from './supabase'

export interface AuthUser {
  id: string
  email: string
  empresa_id: number | null
  perfil: UserRole | null
}

const STORAGE_KEY = 'auth_user'

function formatAuthError(error: { message?: string }) {
  const msg = (error.message ?? '').toLowerCase()

  if (msg.includes('already registered') || msg.includes('already exists')) {
    return 'Este e-mail já possui conta. Faça login ou use outro e-mail.'
  }
  if (msg.includes('invalid email')) {
    return 'E-mail inválido'
  }
  if (msg.includes('password')) {
    return 'Senha fraca. Use pelo menos 6 caracteres.'
  }
  if (msg.includes('rate limit')) {
    return 'Limite de tentativas atingido. Aguarde e tente novamente.'
  }
  if (msg.includes('email not confirmed')) {
    return 'E-mail ainda não confirmado. Desative a confirmação de e-mail no Supabase ou confirme o endereço.'
  }

  return error.message || 'Erro de autenticação'
}

function persistUser(user: AuthUser) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
}

async function loadAuthUser(userId: string, email: string): Promise<AuthUser> {
  let { data: vinculo, error } = await supabase
    .from('usuarios_empresas')
    .select('empresa_id, status, perfil')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error

  if (!vinculo) {
    try {
      await usuariosService.completarCadastro('')
    } catch {
      // Ignora se não houver convite pendente
    }

    const retry = await supabase
      .from('usuarios_empresas')
      .select('empresa_id, status, perfil')
      .eq('user_id', userId)
      .maybeSingle()

    if (retry.error) throw retry.error
    vinculo = retry.data
  }

  if (!vinculo || vinculo.status !== 1) {
    await supabase.auth.signOut()
    localStorage.removeItem(STORAGE_KEY)
    throw new Error('Usuário inativo, sem autorização ou cadastro pendente')
  }

  const user: AuthUser = {
    id: userId,
    email,
    empresa_id: vinculo.empresa_id,
    perfil: vinculo.perfil as UserRole,
  }

  persistUser(user)
  return user
}

export const AuthService = {
  async syncSession(): Promise<AuthUser | null> {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    if (error) throw error
    if (!session?.user?.id) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }

    const cached = AuthService.getCachedUser()
    if (
      cached?.id === session.user.id &&
      cached.empresa_id != null &&
      cached.perfil != null
    ) {
      return cached
    }

    return loadAuthUser(
      session.user.id,
      session.user.email ?? cached?.email ?? '',
    )
  },

  async login(email: string, password: string): Promise<AuthUser> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw new Error(formatAuthError(error))

    return loadAuthUser(data.user?.id ?? '', data.user?.email ?? email)
  },

  async registerAuthorizedUser(input: {
    nome: string
    email: string
    password: string
  }): Promise<AuthUser> {
    const nome = input.nome.trim()
    const email = input.email.trim().toLowerCase()

    if (!nome) throw new Error('Informe o nome completo')
    if (!email) throw new Error('Informe o e-mail')

    const verificacao = await usuariosService.verificarEmailCadastro(email)
    if (!verificacao.autorizado) {
      throw new Error(
        'Este e-mail não foi autorizado. Peça ao administrador para liberar seu acesso.',
      )
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password: input.password,
      options: {
        data: { nome },
      },
    })

    if (error) throw new Error(formatAuthError(error))

    const userId = data.user?.id
    if (!userId) {
      throw new Error('Não foi possível criar a conta. Tente novamente.')
    }

    if (!data.session) {
      const { data: loginData, error: loginError } =
        await supabase.auth.signInWithPassword({
          email,
          password: input.password,
        })

      if (loginError) {
        throw new Error(
          'Conta criada, mas não foi possível entrar automaticamente. Faça login com o e-mail e a senha informados.',
        )
      }

      await usuariosService.completarCadastro(nome)
      return loadAuthUser(
        loginData.user?.id ?? userId,
        loginData.user?.email ?? email,
      )
    }

    await usuariosService.completarCadastro(nome)
    return loadAuthUser(userId, data.user?.email ?? email)
  },

  async me(userId?: string): Promise<AuthUser> {
    if (!userId) {
      const synced = await AuthService.syncSession()
      if (synced) return synced
    }

    const { data: userData, error: userErr } = await supabase.auth.getUser()
    if (userErr) throw userErr
    const id = userId || userData.user?.id
    if (!id) throw new Error('Usuário não logado')

    return loadAuthUser(id, userData.user?.email || '')
  },

  logout() {
    localStorage.removeItem(STORAGE_KEY)
    return supabase.auth.signOut()
  },

  getToken() {
    return supabase.auth.getSession().then((r) => r.data.session?.access_token)
  },

  async isAuthenticated() {
    const user = await AuthService.syncSession()
    return !!user
  },

  getCachedUser(): AuthUser | null {
    const cached = localStorage.getItem(STORAGE_KEY)
    return cached ? JSON.parse(cached) : null
  },
}
