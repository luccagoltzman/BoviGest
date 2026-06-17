import { AuthService, type AuthUser } from './auth.service'
import { supabase } from './supabase'

export type UserRole =
  | 'master'
  | 'administrador'
  | 'operador'
  | 'financeiro'

/** 0 inativo, 1 ativo, 2 aguardando cadastro */
export type UsuarioStatus = 0 | 1 | 2

export type UsuarioEmpresa = {
  id: string
  user_id: string | null
  empresa_id: number
  nome: string | null
  email: string | null
  perfil: UserRole
  status: UsuarioStatus
  created_at?: string
}

export type CreateUsuarioPayload = {
  email: string
  perfil: UserRole
  nome?: string
}

export type CreateUsuarioResult = {
  usuario: UsuarioEmpresa
}

export type VerificarEmailCadastroResult = {
  autorizado: boolean
  perfil?: UserRole
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

export function isUsuarioPendente(usuario: Pick<UsuarioEmpresa, 'status'>) {
  return usuario.status === 2
}

export function formatUsuarioStatus(status: number) {
  if (status === 2) return 'Pendente cadastro'
  return status === 1 ? 'Ativo' : 'Inativo'
}

export function isMasterPerfil(perfil: string) {
  return perfil === 'master'
}

export function canManageUsuario(
  target: Pick<UsuarioEmpresa, 'perfil'>,
  actorPerfil: UserRole | null | undefined,
) {
  if (isMasterPerfil(target.perfil) && actorPerfil !== 'master') {
    return false
  }
  return true
}

const MASTER_PROTECTED_MSG =
  'Usuários Master são protegidos e só podem ser gerenciados por outro Master.'

function getUser() {
  const user = AuthService.getCachedUser()
  if (!user?.empresa_id) {
    throw new Error('Empresa não encontrada para o usuário logado')
  }
  if (!user.perfil) {
    throw new Error('Perfil não encontrado. Faça login novamente.')
  }
  return user as AuthUser & { empresa_id: number; perfil: UserRole }
}

function assertCanManageUsuario(
  alvo: Pick<UsuarioEmpresa, 'perfil'>,
  actorPerfil: UserRole,
) {
  if (!canManageUsuario(alvo, actorPerfil)) {
    throw new Error(MASTER_PROTECTED_MSG)
  }
}

function assertCanAssignPerfil(perfil: UserRole, actorPerfil: UserRole) {
  if (isMasterPerfil(perfil) && actorPerfil !== 'master') {
    throw new Error('Apenas usuários Master podem autorizar o perfil Master.')
  }
}

function assertNotSelf(targetUserId: string | null | undefined) {
  if (!targetUserId) return
  const current = AuthService.getCachedUser()
  if (current?.id === targetUserId) {
    throw new Error('Você não pode alterar o próprio usuário')
  }
}

async function assertEmailDisponivel(empresaId: number, email: string) {
  const { data: existente } = await supabase
    .from('usuarios_empresas')
    .select('id, status')
    .eq('empresa_id', empresaId)
    .ilike('email', email)
    .maybeSingle()

  if (existente?.status === 1) {
    throw new Error('Já existe um usuário ativo com este e-mail')
  }
  if (existente?.status === 2) {
    throw new Error(
      'Este e-mail já está autorizado e aguarda cadastro. O usuário pode acessar a tela de cadastro.',
    )
  }
  if (existente?.status === 0) {
    throw new Error(
      'Já existe um usuário inativo com este e-mail. Reative-o na lista de usuários.',
    )
  }
}

export const usuariosService = {
  async verificarEmailCadastro(
    email: string,
  ): Promise<VerificarEmailCadastroResult> {
    const { data, error } = await supabase.rpc('verificar_email_cadastro', {
      p_email: email.trim().toLowerCase(),
    })

    if (error) throw new Error(error.message)

    const result = data as VerificarEmailCadastroResult | null
    return result ?? { autorizado: false }
  },

  async completarCadastro(nome: string) {
    const { data, error } = await supabase.rpc('completar_cadastro_usuario', {
      p_nome: nome.trim(),
    })

    if (error) throw new Error(error.message)
    return data as {
      empresa_id: number
      perfil: UserRole
      nome: string
    }
  },

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
    const email = payload.email.trim().toLowerCase()
    const nome = payload.nome?.trim() || null

    if (!email) throw new Error('Informe o e-mail')

    assertCanAssignPerfil(payload.perfil, user.perfil)
    await assertEmailDisponivel(user.empresa_id, email)

    const { data, error } = await supabase
      .from('usuarios_empresas')
      .insert([
        {
          empresa_id: user.empresa_id,
          email,
          nome,
          perfil: payload.perfil,
          status: 2,
          user_id: null,
        },
      ])
      .select()
      .single()

    if (error) throw new Error(error.message)

    return { usuario: data as UsuarioEmpresa }
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
    if (alvo.status === 2) {
      throw new Error(
        'Usuário ainda não concluiu o cadastro. Aguarde ou exclua a autorização.',
      )
    }

    assertNotSelf(alvo.user_id)
    assertCanManageUsuario(alvo, user.perfil)

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
      .select('user_id, perfil')
      .eq('id', id)
      .eq('empresa_id', user.empresa_id)
      .maybeSingle()

    if (fetchError) throw fetchError
    if (!alvo) throw new Error('Usuário não encontrado')

    assertNotSelf(alvo.user_id)
    assertCanManageUsuario(alvo, user.perfil)

    const { error } = await supabase
      .from('usuarios_empresas')
      .delete()
      .eq('id', id)
      .eq('empresa_id', user.empresa_id)

    if (error) throw error
  },
}
