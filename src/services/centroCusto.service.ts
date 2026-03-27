import { AuthService } from './auth.service'
import { supabase } from './supabase'

function getUser() {
  const user = AuthService.getCachedUser()
  if (!user) throw new Error('Usuário não encontrado no cache')
  return user
}

export const custosOperacionaisService = {
  async getAll() {
    const user = getUser()
    const { data, error } = await supabase
      .from('custos_operacionais')
      .select('*')
      .eq('empresa_id', user.empresa_id)
      .order('data', { ascending: false })

    if (error) throw error
    return data
  },

  async getById(id: string) {
    const user = getUser()
    const { data, error } = await supabase
      .from('custos_operacionais')
      .select('*')
      .eq('id', id)
      .eq('empresa_id', user.empresa_id)
      .single()

    if (error) throw error
    return data
  },

  async create(payload: {
    data: string
    categoria: string
    descricao: string
    valor: number
    centroCusto?: string
  }) {
    const user = getUser()
    const { data, error } = await supabase
      .from('custos_operacionais')
      .insert([{ ...payload, empresa_id: user.empresa_id }])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async update(id: string, payload: {
    data?: string
    categoria?: string
    descricao?: string
    valor?: number
    centroCusto?: string
  }) {
    const user = getUser()
    const { data, error } = await supabase
      .from('custos_operacionais')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('empresa_id', user.empresa_id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async delete(id: string) {
    const user = getUser()
    const { error } = await supabase
      .from('custos_operacionais')
      .delete()
      .eq('id', id)
      .eq('empresa_id', user.empresa_id)

    if (error) throw error
  }
}