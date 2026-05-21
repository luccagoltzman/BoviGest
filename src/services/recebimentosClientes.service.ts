import { AuthService } from './auth.service'
import { supabase } from './supabase'

function getUser() {
  const user = AuthService.getCachedUser()

  if (!user) {
    throw new Error('Usuário não encontrado no cache')
  }

  return user
}

export const recebimentosClientesService = {
  async getAll(
    page = 1,
    limit = 10,
    search = '',
    startDate = '',
    endDate = ''
  ) {
    const from = (page - 1) * limit
    const to = from + limit - 1

    const user = getUser()

    let query = supabase
      .from('recebimentos_clientes')
      .select(
        `
        *,
        cliente:clientes(
          id,
          nome,
          telefone
        )
      `,
        { count: 'exact' }
      )
      .eq('empresa_id', user.empresa_id)
      .order('data_recebimento', { ascending: false })
      .range(from, to)

    if (search) {
      query = query.or(`
        observacao.ilike.%${search}%,
        forma_pagamento.ilike.%${search}%,
        cliente.nome.ilike.%${search}%
      `)
    }

    if (startDate) {
      query = query.gte('data_recebimento', startDate)
    }

    if (endDate) {
      query = query.lte('data_recebimento', endDate)
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
  },

  async getById(id: number) {
    const user = getUser()

    const { data, error } = await supabase
      .from('recebimentos_clientes')
      .select(
        `
        *,
        cliente:clientes(
          id,
          nome,
          telefone,
          endereco
        )
      `
      )
      .eq('id', id)
      .eq('empresa_id', user.empresa_id)
      .single()

    if (error) throw error

    return data
  },

  async create(payload: any) {
    const user = getUser()

    const { data, error } = await supabase
      .from('recebimentos_clientes')
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

  async update(id: any, payload: any) {
    const user = getUser()

    const { data, error } = await supabase
      .from('recebimentos_clientes')
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
  },

  async delete(id: number) {
    const user = getUser()

    const { error } = await supabase
      .from('recebimentos_clientes')
      .delete()
      .eq('id', id)
      .eq('empresa_id', user.empresa_id)

    if (error) throw error
  },
  async getByCliente(clienteId: string, startDate = '', endDate = '') {
    const user = getUser()

    let query = supabase
      .from('recebimentos_clientes')
      .select('*')
      .eq('empresa_id', user.empresa_id)
      .eq('cliente_id', clienteId)
      .order('data_recebimento', {
        ascending: false,
      })

    if (startDate) {
      query = query.gte('data_recebimento', startDate)
    }

    if (endDate) {
      query = query.lte('data_recebimento', endDate)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    return data || []
  },
}
