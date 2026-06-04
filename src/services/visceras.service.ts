import { AuthService } from './auth.service'
import { supabase } from './supabase'

function getUser() {
  const user = AuthService.getCachedUser()

  if (!user) {
    throw new Error('Usuário não encontrado no cache')
  }

  return user
}

export const viscerasService = {
  async getAll(
    page = 1,
    limit = 10,
    startDate = '',
    endDate = ''
  ) {
    const from = (page - 1) * limit
    const to = from + limit - 1

    try {
      const user = getUser()

      let query = supabase
        .from('movimentacoes_visceras')
        .select('*', { count: 'exact' })
        .eq('empresa_id', user.empresa_id)
        .order('created_at', { ascending: false })
        .range(from, to)

      if (startDate) {
        query = query.gte('created_at', startDate)
      }

      if (endDate) {
        query = query.lte('created_at', endDate)
      }

      const { data, count, error } = await query

      if (error) throw error

      return {
        data,
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      }
    } catch {
      return {
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      }
    }
  },

  async create(payload: any) {
    try {
      const user = getUser()

      const { data, error } = await supabase
        .from('movimentacoes_visceras')
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
    } catch (err: any) {
      throw err
    }
  },

  async update(id: string, payload: any) {
    try {
      const user = getUser()

      const { data, error } = await supabase
        .from('movimentacoes_visceras')
        .update({
          ...payload,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
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
        .from('movimentacoes_visceras')
        .delete()
        .eq('id', id)
        .eq('empresa_id', user.empresa_id)

      if (error) throw error
    } catch (err: any) {
      throw err
    }
  },

  async getEstoque() {
    try {
      const user = getUser()

      const { data, error } = await supabase
        .from('estoque_visceras')
        .select('*')
        .eq('empresa_id', user.empresa_id)
        .single()

      if (error) throw error

      return data
    } catch {
      return {
        quantidade_atual: 0,
      }
    }
  },

    async deleteByReferencia(referencia: number) {
      const user = getUser()
  
      const { error } = await supabase
        .from('movimentacoes_visceras')
        .delete()
        .eq('referencia_venda_id', referencia)
        .eq('empresa_id', user.empresa_id)
  
      if (error) throw error
    },
  
}