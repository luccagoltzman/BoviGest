import { usuariosService, type UserRole } from './usuarios.service'
import { supabase } from './supabase'

export interface AuthUser {
  id: string
  email: string
  nome: string | null
  empresa_id: number | null
  perfil: UserRole | null
}

const STORAGE_KEY = 'auth_user'
const SESSION_EXPIRES_KEY = 'auth_session_expires_at'
const WELCOME_MODAL_KEY = 'show_welcome_modal'
const SESSION_EXPIRED_NOTICE_KEY = 'auth_session_expired_notice'
const SESSION_TTL_MS = 24 * 60 * 60 * 1000

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

function setSessionExpiry() {
  localStorage.setItem(
    SESSION_EXPIRES_KEY,
    String(Date.now() + SESSION_TTL_MS),
  )
}

function clearSessionStorage() {
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(SESSION_EXPIRES_KEY)
}

async function enforceSessionExpiry() {
  if (!AuthService.isSessionExpired()) return false

  sessionStorage.setItem(SESSION_EXPIRED_NOTICE_KEY, '1')
  await supabase.auth.signOut()
  clearSessionStorage()
  return true
}

async function loadAuthUser(userId: string, email: string): Promise<AuthUser> {
  let { data: vinculo, error } = await supabase
    .from('usuarios_empresas')
    .select('empresa_id, status, perfil, nome')
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
      .select('empresa_id, status, perfil, nome')
      .eq('user_id', userId)
      .maybeSingle()

    if (retry.error) throw retry.error
    vinculo = retry.data
  }

  if (!vinculo || vinculo.status !== 1) {
    await supabase.auth.signOut()
    clearSessionStorage()
    throw new Error('Usuário inativo, sem autorização ou cadastro pendente')
  }

  const user: AuthUser = {
    id: userId,
    email,
    nome: vinculo.nome?.trim() || null,
    empresa_id: vinculo.empresa_id,
    perfil: vinculo.perfil as UserRole,
  }

  persistUser(user)
  setSessionExpiry()
  return user
}

export const AuthService = {
  async syncSession(): Promise<AuthUser | null> {
    if (await enforceSessionExpiry()) {
      return null
    }

    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    if (error) throw error
    if (!session?.user?.id) {
      clearSessionStorage()
      return null
    }

    if (AuthService.isSessionExpired()) {
      sessionStorage.setItem(SESSION_EXPIRED_NOTICE_KEY, '1')
      await supabase.auth.signOut()
      clearSessionStorage()
      return null
    }

    if (!localStorage.getItem(SESSION_EXPIRES_KEY)) {
      setSessionExpiry()
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

    const user = await loadAuthUser(data.user?.id ?? '', data.user?.email ?? email)
    AuthService.markWelcomeModalPending()
    return user
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

    let user: AuthUser

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
      user = await loadAuthUser(
        loginData.user?.id ?? userId,
        loginData.user?.email ?? email,
      )
    } else {
      await usuariosService.completarCadastro(nome)
      user = await loadAuthUser(userId, data.user?.email ?? email)
    }

    AuthService.markWelcomeModalPending()
    return user
  },

  async me(userId?: string): Promise<AuthUser> {
    if (await enforceSessionExpiry()) {
      throw new Error('Sessão expirada')
    }

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
    clearSessionStorage()
    sessionStorage.removeItem(WELCOME_MODAL_KEY)
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
    if (!cached) return null

    try {
      return JSON.parse(cached) as AuthUser
    } catch {
      return null
    }
  },

  isSessionExpired() {
    const raw = localStorage.getItem(SESSION_EXPIRES_KEY)
    if (!raw) return false

    const expiresAt = Number(raw)
    if (!Number.isFinite(expiresAt)) return false

    return Date.now() >= expiresAt
  },

  getSessionExpiresAt() {
    const raw = localStorage.getItem(SESSION_EXPIRES_KEY)
    if (!raw) return null

    const expiresAt = Number(raw)
    return Number.isFinite(expiresAt) ? expiresAt : null
  },

  markWelcomeModalPending() {
    sessionStorage.setItem(WELCOME_MODAL_KEY, '1')
  },

  shouldShowWelcomeModal() {
    return sessionStorage.getItem(WELCOME_MODAL_KEY) === '1'
  },

  clearWelcomeModalPending() {
    sessionStorage.removeItem(WELCOME_MODAL_KEY)
  },

  consumeSessionExpiredNotice() {
    const shouldNotify =
      sessionStorage.getItem(SESSION_EXPIRED_NOTICE_KEY) === '1'
    sessionStorage.removeItem(SESSION_EXPIRED_NOTICE_KEY)
    return shouldNotify
  },

  getDisplayName(user?: AuthUser | null) {
    const resolved = user ?? AuthService.getCachedUser()
    if (!resolved) return 'usuário'

    if (resolved.nome?.trim()) return resolved.nome.trim()

    const emailPart = resolved.email.split('@')[0]?.trim()
    return emailPart || 'usuário'
  },
}
