import { createClient } from '@supabase/supabase-js'
import { APP_REDEFINIR_SENHA_URL } from '@/config/app'
import { AuthService, type AuthUser } from './auth.service'
import { supabase, supabaseAnonKey, supabaseUrl } from './supabase'

export type UserRole =
  | 'master'
  | 'administrador'
  | 'operador'
  | 'financeiro'

export type UsuarioEmpresa = {
  id: string
  user_id: string
  empresa_id: number
  nome: string | null
  email: string | null
  perfil: UserRole
  status: number
  created_at?: string
}

export type CreateUsuarioPayload = {
  nome: string
  email: string
  perfil: UserRole
}

export type CreateUsuarioResult = {
  usuario: UsuarioEmpresa
  inviteSent: boolean
}

const PERFIL_LABEL: Record<UserRole, string> = {
  master: 'Master',
  administrador: 'Administrador',
  operador: 'Operador',
  financeiro: 'Financeiro',
}

export function formatPerfil(perfil: string) {
  return PERFIL_LABEL[perfil as UserRole] ?? perfil
}

export function isUsuarioAtivo(usuario: Pick<UsuarioEmpresa, 'status'>) {
  return usuario.status === 1
}

export function formatUsuarioStatus(status: number) {
  return status === 1 ? 'Ativo' : 'Inativo'
}

function getUser() {
  const user = AuthService.getCachedUser()
  if (!user?.empresa_id) {
    throw new Error('Empresa não encontrada para o usuário logado')
  }
  return user as AuthUser & { empresa_id: number }
}

function assertNotSelf(targetUserId: string) {
  const current = AuthService.getCachedUser()
  if (current?.id === targetUserId) {
    throw new Error('Você não pode alterar o próprio usuário')
  }
}

function formatAuthError(error: { message?: string; status?: number }) {
  const msg = (error.message ?? '').toLowerCase()

  if (msg.includes('already registered') || msg.includes('already exists')) {
    return 'Este e-mail já está cadastrado'
  }
  if (msg.includes('invalid email')) {
    return 'E-mail inválido'
  }
  if (msg.includes('rate limit')) {
    return 'Limite de tentativas atingido. Aguarde e tente novamente'
  }

  return error.message || 'Erro ao convidar usuário'
}

function generateTempPassword() {
  return `${crypto.randomUUID().replace(/-/g, '')}Aa1!`
}

function createSignupClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

async function assertEmailDisponivel(empresaId: number, email: string) {
  const { data: existente } = await supabase
    .from('usuarios_empresas')
    .select('id, status')
    .eq('empresa_id', empresaId)
    .ilike('email', email)
    .maybeSingle()

  if (existente?.status === 1) {
    throw new Error('Já existe um usuário com este e-mail na empresa')
  }
  if (existente?.status === 0) {
    throw new Error(
      'Já existe um usuário inativo com este e-mail. Reative-o na lista de usuários.',
    )
  }
}

async function vincularUsuarioEmpresa(input: {
  userId: string
  empresaId: number
  nome: string
  email: string
  perfil: UserRole
}) {
  const { data, error } = await supabase
    .from('usuarios_empresas')
    .insert([
      {
        user_id: input.userId,
        empresa_id: input.empresaId,
        nome: input.nome,
        email: input.email,
        perfil: input.perfil,
        status: 1,
      },
    ])
    .select()
    .single()

  if (error) {
    throw new Error(
      `Conta criada no login, mas falhou ao vincular à empresa: ${error.message}`,
    )
  }

  return data as UsuarioEmpresa
}

async function inviteViaEdgeFunction(payload: {
  nome: string
  email: string
  perfil: UserRole
}): Promise<CreateUsuarioResult | null> {
  const { data, error } = await supabase.functions.invoke('invite-usuario', {
    body: payload,
  })

  if (error) return null

  const response = data as { usuario?: UsuarioEmpresa; error?: string } | null
  if (response?.error) {
    throw new Error(response.error)
  }

  if (response?.usuario) {
    return { usuario: response.usuario, inviteSent: true }
  }

  return null
}

async function inviteViaPasswordResetEmail(input: {
  nome: string
  email: string
  perfil: UserRole
  empresaId: number
}): Promise<CreateUsuarioResult> {
  const signupClient = createSignupClient()
  const tempPassword = generateTempPassword()

  const { data: authData, error: authError } = await signupClient.auth.signUp({
    email: input.email,
    password: tempPassword,
    options: {
      emailRedirectTo: APP_REDEFINIR_SENHA_URL,
      data: {
        nome: input.nome,
        perfil: input.perfil,
      },
    },
  })

  if (authError) {
    throw new Error(formatAuthError(authError))
  }

  const newUserId = authData.user?.id
  if (!newUserId) {
    throw new Error(
      'Não foi possível concluir o convite. Verifique o e-mail informado e tente novamente.',
    )
  }

  const usuario = await vincularUsuarioEmpresa({
    userId: newUserId,
    empresaId: input.empresaId,
    nome: input.nome,
    email: input.email,
    perfil: input.perfil,
  })

  const { error: resetError } = await signupClient.auth.resetPasswordForEmail(
    input.email,
    { redirectTo: APP_REDEFINIR_SENHA_URL },
  )

  if (resetError) {
    throw new Error(
      `Usuário vinculado, mas falhou ao enviar o e-mail para definir senha: ${resetError.message}`,
    )
  }

  return { usuario, inviteSent: true }
}

export const usuariosService = {
  async getAll(): Promise<UsuarioEmpresa[]> {
    const user = getUser()

    const { data, error } = await supabase
      .from('usuarios_empresas')
      .select('*')
      .eq('empresa_id', user.empresa_id)
      .order('status', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data ?? []) as UsuarioEmpresa[]
  },

  async create(payload: CreateUsuarioPayload): Promise<CreateUsuarioResult> {
    const user = getUser()
    const nome = payload.nome.trim()
    const email = payload.email.trim().toLowerCase()

    if (!nome) throw new Error('Informe o nome')
    if (!email) throw new Error('Informe o e-mail')

    await assertEmailDisponivel(user.empresa_id, email)

    const invitePayload = { nome, email, perfil: payload.perfil }

    const viaEdge = await inviteViaEdgeFunction(invitePayload)
    if (viaEdge) return viaEdge

    return inviteViaPasswordResetEmail({
      ...invitePayload,
      empresaId: user.empresa_id,
    })
  },

  async resendInvite(id: string): Promise<void> {
    const user = getUser()

    const { data: alvo, error: fetchError } = await supabase
      .from('usuarios_empresas')
      .select('email, user_id, status')
      .eq('id', id)
      .eq('empresa_id', user.empresa_id)
      .maybeSingle()

    if (fetchError) throw fetchError
    if (!alvo?.email) throw new Error('Usuário não encontrado')
    if (alvo.status !== 1) {
      throw new Error('Reative o usuário antes de reenviar o convite')
    }

    assertNotSelf(alvo.user_id)

    const signupClient = createSignupClient()
    const { error } = await signupClient.auth.resetPasswordForEmail(alvo.email, {
      redirectTo: APP_REDEFINIR_SENHA_URL,
    })

    if (error) throw error
  },

  async setStatus(id: string, status: 0 | 1): Promise<UsuarioEmpresa> {
    const user = getUser()

    const { data: alvo, error: fetchError } = await supabase
      .from('usuarios_empresas')
      .select('*')
      .eq('id', id)
      .eq('empresa_id', user.empresa_id)
      .maybeSingle()

    if (fetchError) throw fetchError
    if (!alvo) throw new Error('Usuário não encontrado')

    assertNotSelf(alvo.user_id)

    const { data, error } = await supabase
      .from('usuarios_empresas')
      .update({ status })
      .eq('id', id)
      .eq('empresa_id', user.empresa_id)
      .select()
      .single()

    if (error) throw error
    return data as UsuarioEmpresa
  },

  async delete(id: string): Promise<void> {
    const user = getUser()

    const { data: alvo, error: fetchError } = await supabase
      .from('usuarios_empresas')
      .select('user_id')
      .eq('id', id)
      .eq('empresa_id', user.empresa_id)
      .maybeSingle()

    if (fetchError) throw fetchError
    if (!alvo) throw new Error('Usuário não encontrado')

    assertNotSelf(alvo.user_id)

    const { error } = await supabase
      .from('usuarios_empresas')
      .delete()
      .eq('id', id)
      .eq('empresa_id', user.empresa_id)

    if (error) throw error
  },
}
