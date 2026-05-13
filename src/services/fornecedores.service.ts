import { AuthService } from './auth.service'
import { supabase } from './supabase'

function getUser() {
  const user = AuthService.getCachedUser()
  if (!user) throw new Error('Usuário não encontrado no cache')
  return user
}

export const fornecedoresService = {
  async getAll(page = 1, limit = 10, search = '', startDate = '', endDate = '') {
    const from = (page - 1) * limit
    const to = from + limit - 1

    try {
      const user = getUser()

      let query = supabase
        .from('fornecedores')
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