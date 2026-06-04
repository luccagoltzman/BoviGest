import { AuthService } from './auth.service'
import { supabase } from './supabase'

function getUser() {
  const user = AuthService.getCachedUser()

  if (!user) {
    throw new Error('Usuário não encontrado no cache')
  }

  return user
}

export const comprasService = {
  async getAll(
    page = 1,
    limit = 10,
    search = '',
    startDate = '',
    endDate = '',
    condicao = ''
  ) {
    const from = (page - 1) * limit
    const to = from + limit - 1

    try {
      const user = getUser()

      let query = supabase
        .from('compras')
        .select(
          `
        *,
        fornecedor:fornecedores (
          id,
          nome
        )
      `,
          { count: 'exact' }
        )
        .eq('empresa_id', user.empresa_id)
        .order('created_at', { ascending: false })
        .range(from, to)

      if (search) {
        query = query.or(`
        tipo_gado.ilike.%${search}%,
        status.ilike.%${search}%
      `)
      }

      if (startDate) {
        query = query.gte('data', startDate)
      }

      if (endDate) {
        query = query.lte('data', endDate)
      }

      if (condicao !== '') {
        query = query.eq('condicao_gado', Number(condicao))
      }

      const { data, count, error } = await query

      if (error) {
        throw error
      }

      const ids = (data || []).map(item => item.id)

      let viagensMap: Record<number, any> = {}

      if (ids.length) {
        const { data: viagens } = await supabase
          .from('viagens')
          .select('referencia_id, custo_total')
          .eq('empresa_id', user.empresa_id)
          .eq('referencia_tipo', 'compra')
          .in('referencia_id', ids)

        viagensMap = Object.fromEntries(
          (viagens || []).map(item => [
            item.referencia_id,
            item
          ])
        )
      }

      const comprasComViagem = (data || []).map(compra => {
        const viagem = viagensMap[compra.id]

        const subtotal = Number(compra.subtotal || 0)
        const imposto = Number(compra.valor_imposto || 0)
        const gta = Number(compra.gta_valor || 0)
        const viagemValor = Number(viagem?.custo_total || 0)

        return {
          ...compra,
          detalhes_custo: {
            subtotal,
            imposto,
            gta,
            viagem: viagemValor,
            total:
              subtotal +
              imposto +
              gta +
              viagemValor
          }
        }
      })

      return {
        data: comprasComViagem,
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      }
    } catch {
      return {
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0
      }
    }
  },
  async getById(id: number) {
    const user = getUser()

    const { data, error } = await supabase
      .from('compras')
      .select(
        `
        *,
        fornecedor:fornecedores (
          id,
          nome,
          doc,
          telefone
        )
      `
      )
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
      .from('compras')
      .insert([
        {
          ...payload,
          empresa_id: user.empresa_id,
        },
      ])
      .select(
        `
        *,
        fornecedor:fornecedores (
          id,
          nome
        )
      `
      )
      .single()

    if (error) {
      throw error
    }

    return data
  },

  async update(id: number, payload: any) {
    const user = getUser()

    const { data, error } = await supabase
      .from('compras')
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('empresa_id', user.empresa_id)
      .select(
        `
        *,
        fornecedor:fornecedores (
          id,
          nome
        )
      `
      )
      .single()

    if (error) {
      throw error
    }

    return data
  },

  async delete(id: number) {
    const user = getUser()

    const { error } = await supabase
      .from('compras')
      .delete()
      .eq('id', id)
      .eq('empresa_id', user.empresa_id)

    if (error) {
      throw error
    }
  },
}
