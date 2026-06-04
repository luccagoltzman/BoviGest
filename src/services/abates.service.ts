import { AuthService } from './auth.service'
import { supabase } from './supabase'

function getUser() {
  const user = AuthService.getCachedUser()

  if (!user) {
    throw new Error('Usuário não encontrado no cache')
  }

  return user
}

export const abatesService = {
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
        .from('abates')
        .select('*', { count: 'exact' })
        .eq('empresa_id', user.empresa_id)
        .order('data_abate', { ascending: false })
        .range(from, to)

      if (search) {
        query = query.or(`
          lote.ilike.%${search}%,
          tipo_animal.ilike.%${search}%,
          abatedouro.ilike.%${search}%
        `)
      }

      if (startDate) {
        query = query.gte('data_abate', startDate)
      }

      if (endDate) {
        query = query.lte('data_abate', endDate)
      }

      const { data, count, error } = await query

      if (error) {
        throw error
      }

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

  async getById(id: number) {
    const user = getUser()

    const { data, error } = await supabase
      .from('abates')
      .select('*')
      .eq('id', id)
      .eq('empresa_id', user.empresa_id)
      .single()

    if (error) {
      throw error
    }

    return data
  },

  async create(payload: any) {
    const user = getUser()

    const { data, error } = await supabase
      .from('abates')
      .insert([
        {
          ...payload,
          empresa_id: user.empresa_id,
        },
      ])
      .select()
      .single()

    if (error) {
      throw error
    }

    return data
  },

  async update(id: number, payload: any) {
    const user = getUser()

    const { data, error } = await supabase
      .from('abates')
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('empresa_id', user.empresa_id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return data
  },

  async delete(id: number) {
    const user = getUser()

    const { error } = await supabase
      .from('abates')
      .delete()
      .eq('id', id)
      .eq('empresa_id', user.empresa_id)

    if (error) {
      throw error
    }
  },
}