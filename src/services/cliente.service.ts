import { AuthService } from './auth.service'
import { supabase } from './supabase'

function getUser() {
  const user = AuthService.getCachedUser()
  if (!user) {
    throw new Error('Usuário não encontrado no cache')
  }
  return user
}

export const clientesService = {
  async getAll() {
    try {
      const user = getUser()
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('empresa_id', user.empresa_id)
        .neq('status', 0)
        .order('updated_at', { ascending: false })

      if (error) throw error
      return data
    } catch (err: any) {
      return []
    }
  },

  async create(payload: any) {
    try {
      const user = getUser()
      const { data, error } = await supabase
        .from('clientes')
        .insert([{ ...payload, status: 1, empresa_id: user.empresa_id }])
        .select()
        .single()

      if (error) throw error
      return data
    } catch (err: any) {
      throw err
    }
  },

  async update(id: string, payload: any) {
    try {
      const user = getUser()
      const { data, error } = await supabase
        .from('clientes')
        .update({
          ...payload,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('status', 1)
        .eq('empresa_id', user.empresa_id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (err: any) {
      throw err
    }
  },

  async delete(id: string) {
    try {
      const user = getUser()
      const { error } = await supabase
        .from('clientes')
        .update({ status: 0 })
        .eq('id', id)
        .eq('empresa_id', user.empresa_id)

      if (error) throw error
    } catch (err: any) {
      throw err
    }
  }
}