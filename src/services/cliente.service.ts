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
  async getAll(page = 1, limit = 10, search = '', startDate = '', endDate = '') {
    const from = (page - 1) * limit
    const to = from + limit - 1

    try {
      const user = getUser()

      let query = supabase
        .from('clientes')
        .select('*', { count: 'exact' })
        .eq('empresa_id', user.empresa_id)
        .neq('status', 0)
        .order('updated_at', { ascending: false })
        .range(from, to)

      if (search) {
        query = query.or(
          `nome.ilike.%${search}%,doc.ilike.%${search}%,telefone.ilike.%${search}%`
        )
      }

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
    } catch (err) {
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
  },

  async getOptions(search = '') {
    try {
      const user = getUser()

      let query = supabase
        .from('clientes')
        .select('id, nome')
        .eq('empresa_id', user.empresa_id)
        .eq('status', 1)
        .order('nome', {
          ascending: true,
        })
        .limit(20)

      if (search) {
        query = query.ilike(
          'nome',
          `%${search}%`
        )
      }

      const { data, error } =
        await query

      if (error) {
        throw error
      }

      return (
       data || []
      )
    } catch {
      return []
    }
  }
}