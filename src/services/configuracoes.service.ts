import { AuthService } from './auth.service'
import { supabase } from './supabase'

function getUser() {
  const user = AuthService.getCachedUser()

  if (!user) {
    throw new Error('Usuário não encontrado no cache')
  }

  return user
}

export const configuracoesService = {
  async get() {
    const user = getUser()

    const { data, error } = await supabase
      .from('configuracoes')
      .select('*')
      .eq('empresa_id', user.empresa_id)
      .single()

    if (error) throw error

    return data
  },

  async create(payload: any) {
    const user = getUser()

    const { data, error } = await supabase
      .from('configuracoes')
      .insert([
        {
          ...payload,
          empresa_id: user.empresa_id,
        },
      ])
      .select()
      .single()

    if (error) throw error

    return data
  },

  async update(payload: any) {
    const user = getUser()

    const { data, error } = await supabase
      .from('configuracoes')
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq('empresa_id', user.empresa_id)
      .select()
      .single()

    if (error) throw error

    return data
  },

  async upsert(payload: any) {
    getUser()

    const configuracao = await this.get().catch(() => null)

    if (configuracao) {
      return this.update(payload)
    }

    return this.create(payload)
  },
}
