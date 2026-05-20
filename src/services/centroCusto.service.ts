import { AuthService } from './auth.service'
import { supabase } from './supabase'

function getUser() {
  const user = AuthService.getCachedUser()
  if (!user) throw new Error('Usuário não encontrado no cache')
  return user
}

export const custosOperacionaisService = {
  async getAll(
    page = 1,
    limit = 10,
    search = '',
    startDate = '',
    endDate = ''
  ) {
    const from = (page - 1) * limit
    const to = from + limit - 1

    try {
      const user = getUser()

      let query = supabase
        .from('custos_operacionais')
        .select('*', { count: 'exact' })
        .eq('empresa_id', user.empresa_id)
        .order('data', { ascending: false })
        .range(from, to)

      if (search) {
        query = query.or(
          `descricao.ilike.%${search}%,categoria.ilike.%${search}%`
        )
      }

      if (startDate) {
        query = query.gte('data', startDate)
      }

      if (endDate) {
        query = query.lte('data', endDate)
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

  async update(
    id: string,
    payload: {
      data?: string
      categoria?: string
      descricao?: string
      valor?: number
      centroCusto?: string
    }
  ) {
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
  },
}
