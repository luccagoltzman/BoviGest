import { AuthService } from './auth.service'
import { supabase } from './supabase'

function getUser() {
  const user = AuthService.getCachedUser()

  if (!user) {
    throw new Error(
      'Usuário não encontrado no cache'
    )
  }

  return user
}

export const vendasService = {
  async getAll(
    page = 1,
    limit = 10,
    search = '',
    startDate = '',
    endDate = '',
    status = ''
  ) {
    const from = (page - 1) * limit
    const to = from + limit - 1

    try {
      const user = getUser()

      let query = supabase
        .from('vendas')
        .select(
          `
            *,
            cliente:clientes(
              id,
              nome,
              telefone
            )
          `,
          {
            count: 'exact',
          }
        )
        .eq(
          'empresa_id',
          user.empresa_id
        )
        .neq('status', 3)
        .order('data_venda', {
          ascending: false,
        })
        .range(from, to)

      if (search) {
        query = query.or(
          `corte.ilike.%${search}%,forma_pagamento.ilike.%${search}%`
        )
      }

      if (startDate) {
        query = query.gte(
          'data_venda',
          startDate
        )
      }

      if (endDate) {
        query = query.lte(
          'data_venda',
          endDate
        )
      }

      if (status !== '') {
        query = query.eq(
          'status',
          status
        )
      }

      const { data, count, error } =
        await query

      if (error) {
        throw error
      }

      return {
        data,
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil(
          (count || 0) / limit
        ),
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

    const { data, error } =
      await supabase
        .from('vendas')
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
        .eq(
          'empresa_id',
          user.empresa_id
        )
        .single()

    if (error) {
      throw error
    }

    return data
  },

  async create(payload: any) {
    const user = getUser()

    const { data, error } =
      await supabase
        .from('vendas')
        .insert([
          {
            ...payload,
            empresa_id:
              user.empresa_id,
          },
        ])
        .select()
        .single()

    if (error) {
      throw error
    }

    return data
  },

  async update(
    id: number,
    payload: any
  ) {
    const user = getUser()

    const { data, error } =
      await supabase
        .from('vendas')
        .update({
          ...payload,
          updated_at:
            new Date().toISOString(),
        })
        .eq('id', id)
        .eq(
          'empresa_id',
          user.empresa_id
        )
        .select()
        .single()

    if (error) {
      throw error
    }

    return data
  },

  async delete(id: number) {
    const user = getUser()

    const { error } =
      await supabase
        .from('vendas')
        .update({
          status: 3,
          updated_at:
            new Date().toISOString(),
        })
        .eq('id', id)
        .eq(
          'empresa_id',
          user.empresa_id
        )

    if (error) {
      throw error
    }
  },
}