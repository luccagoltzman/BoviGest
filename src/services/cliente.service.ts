import { AuthService } from './auth.service'
import { supabase } from './supabase'
import toast from 'react-hot-toast'

function getUser() {
  const user = AuthService.getCachedUser()
  if (!user) {
    toast.error('Usuário não encontrado no cache')
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
      toast.error(`Erro ao buscar clientes: ${err.message}`)
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
      toast.success('Cliente criado com sucesso!')
      return data
    } catch (err: any) {
      toast.error(`Erro ao criar cliente: ${err.message}`)
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
      toast.success('Cliente atualizado com sucesso!')
      return data
    } catch (err: any) {
      toast.error(`Erro ao atualizar cliente: ${err.message}`)
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
      toast.success('Cliente excluído com sucesso!')
    } catch (err: any) {
      toast.error(`Erro ao excluir cliente: ${err.message}`)
      throw err
    }
  }
}