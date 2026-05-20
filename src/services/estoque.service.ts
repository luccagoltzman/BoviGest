import { AuthService } from './auth.service'
import { supabase } from './supabase'

function getUser() {
  const user = AuthService.getCachedUser()

  if (!user) {
    throw new Error('Usuário não encontrado no cache')
  }

  return user
}

export const estoqueService = {
  /*
   |--------------------------------------------------------------------------
   | MOVIMENTAÇÕES
   |--------------------------------------------------------------------------
   */

  async getMovimentacoes(
    page = 1,
    limit = 10,
    search = '',
    startDate = '',
    endDate = '',
    lote = '',
    corte = '',
    tipoMovimentacao: number | null = null
  ) {
    const from = (page - 1) * limit
    const to = from + limit - 1

    try {
      const user = getUser()

      let query = supabase
        .from('estoque_movimentacoes')
        .select('*', { count: 'exact' })
        .eq('empresa_id', user.empresa_id)
        .order('data_movimentacao', {
          ascending: false,
        })
        .range(from, to)

      if (search) {
        query = query.or(
          `lote.ilike.%${search}%,corte.ilike.%${search}%,observacoes.ilike.%${search}%,referencia_tipo.ilike.%${search}%`
        )
      }

      if (startDate) {
        query = query.gte('data_movimentacao', startDate)
      }

      if (endDate) {
        query = query.lte('data_movimentacao', endDate)
      }

      if (lote) {
        query = query.ilike('lote', `%${lote}%`)
      }

      if (corte) {
        query = query.ilike('corte', `%${corte}%`)
      }

      if (tipoMovimentacao !== null) {
        query = query.eq('tipo_movimentacao', tipoMovimentacao)
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

  async getMovimentacaoById(id: number) {
    const user = getUser()

    const { data, error } = await supabase
      .from('estoque_movimentacoes')
      .select('*')
      .eq('id', id)
      .eq('empresa_id', user.empresa_id)
      .single()

    if (error) {
      throw error
    }

    return data
  },

  async createMovimentacao(payload: any) {
    const user = getUser()

    const { data, error } = await supabase
      .from('estoque_movimentacoes')
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

  async updateMovimentacao(id: number, payload: any) {
    const user = getUser()

    const { data, error } = await supabase
      .from('estoque_movimentacoes')
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

  async deleteMovimentacao(id: number) {
    const user = getUser()

    const { error } = await supabase
      .from('estoque_movimentacoes')
      .delete()
      .eq('id', id)
      .eq('empresa_id', user.empresa_id)

    if (error) {
      throw error
    }
  },

  /*
   |--------------------------------------------------------------------------
   | ESTOQUE ATUAL (VIEW)
   |--------------------------------------------------------------------------
   */

  async getEstoqueAtual(search = '', lote = '', corte = '') {
    try {
      const user = getUser()

      let query = supabase
        .from('vw_estoque_atual')
        .select('*')
        .eq('empresa_id', user.empresa_id)

      if (search) {
        query = query.or(`
          lote.ilike.%${search}%,
          corte.ilike.%${search}%
        `)
      }

      if (lote) {
        query = query.ilike('lote', `%${lote}%`)
      }

      if (corte) {
        query = query.ilike('corte', `%${corte}%`)
      }

      const { data, error } = await query

      if (error) {
        throw error
      }

      return data || []
    } catch {
      return []
    }
  },
  async getByLote(lote: string) {
    const { data, error } = await supabase
      .from('estoque_movimentacoes')
      .select('*')
      .eq('lote', lote)
      .single()

    if (error) {
      return null
    }

    return data
  },
}
