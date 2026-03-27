import { AuthService } from './auth.service'
import { supabase } from './supabase'

function getUser() {
    const user = AuthService.getCachedUser()
    if (!user) throw new Error('Usuário não encontrado no cache')
    return user
}

export const fornecedoresService = {
  async getAll() {
    const user = getUser()
    const { data, error } = await supabase
      .from('fornecedores')
      .select('*')
      .eq('empresa_id', user.empresa_id)
      .neq('status', 0)
      .order('updated_at', { ascending: false })

    if (error) throw error
    return data
  },

  async getById(id: string) {
    const user = getUser()
    const { data, error } = await supabase
      .from('fornecedores')
      .select('*')
      .eq('id', id)
      .eq('empresa_id', user.empresa_id)
      .eq('status', 1)
      .single()

    if (error) throw error
    return data
  },

  async create(payload: any) {
    const user = getUser()
    const { data, error } = await supabase
      .from('fornecedores')
      .insert([{ ...payload, status: 1, empresa_id: user.empresa_id }])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async update(id: string, payload: any) {
    const user = getUser()
    const { data, error } = await supabase
      .from('fornecedores')
      .update({
        ...payload,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('empresa_id', user.empresa_id)
      .eq('status', 1)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async delete(id: string) {
    const user = getUser()
    const { error } = await supabase
      .from('fornecedores')
      .update({ status: 0 })
      .eq('id', id)
      .eq('empresa_id', user.empresa_id)

    if (error) throw error
  }
}