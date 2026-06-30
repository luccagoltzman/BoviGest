import { AuthService } from './auth.service'
import { supabase } from './supabase'

function getUser() {
  const user = AuthService.getCachedUser()

  if (!user) {
    throw new Error('Usuário não encontrado no cache')
  }

  return user
}

export type ResumoClienteVendas = {
  cliente_id: string
  cliente: {
    id: string
    nome: string
    nome_empresa?: string | null
    telefone?: string | null
  }
  ultimaCompra: string
  qtdVendas: number
  qtdItens: number
  cortes: string[]
  valorTotal: number
}

function agregarResumoPorCliente(
  movimentacoes: Array<{
    cliente_id: string
    data_movimentacao: string
    valor_total: number
    cliente?:
      | ResumoClienteVendas['cliente']
      | ResumoClienteVendas['cliente'][]
    itens?: Array<{ tipo_corte?: string }>
  }>,
): ResumoClienteVendas[] {
  const map = new Map<string, ResumoClienteVendas>()

  for (const mov of movimentacoes) {
    const clienteId = mov.cliente_id
    if (!clienteId) continue

    const clienteRaw = mov.cliente as
      | ResumoClienteVendas['cliente']
      | ResumoClienteVendas['cliente'][]
      | undefined
    const clienteInfo = Array.isArray(clienteRaw) ? clienteRaw[0] : clienteRaw

    const existente = map.get(clienteId)
    const cortesSet = new Set(existente?.cortes ?? [])
    const qtdItensMov = mov.itens?.length ?? 0

    for (const item of mov.itens ?? []) {
      if (item.tipo_corte) cortesSet.add(item.tipo_corte)
    }

    if (!existente) {
      map.set(clienteId, {
        cliente_id: clienteId,
        cliente: clienteInfo ?? {
          id: clienteId,
          nome: 'Cliente',
        },
        ultimaCompra: mov.data_movimentacao,
        qtdVendas: 1,
        qtdItens: qtdItensMov,
        cortes: Array.from(cortesSet),
        valorTotal: Number(mov.valor_total ?? 0),
      })
      continue
    }

    if (mov.data_movimentacao > existente.ultimaCompra) {
      existente.ultimaCompra = mov.data_movimentacao
    }

    existente.qtdVendas += 1
    existente.qtdItens += qtdItensMov
    existente.cortes = Array.from(cortesSet)
    existente.valorTotal += Number(mov.valor_total ?? 0)

    if (clienteInfo?.nome) {
      existente.cliente = clienteInfo
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    b.ultimaCompra.localeCompare(a.ultimaCompra),
  )
}

export const movimentacoesClientesService = {
  async getAll(
    page = 1,
    limit = 10,
    search = '',
    startDate = '',
    endDate = '',
    clienteId = '',
  ) {
    const from = (page - 1) * limit
    const to = from + limit - 1

    try {
      const user = getUser()

      let query = supabase
        .from('movimentacoes_clientes')
        .select(
          `
          *,
          cliente:clientes(
            id,
            nome,
            nome_empresa,
            telefone
          ),
          itens:movimentacao_itens(
            *,
            composicoes:movimentacao_item_composicoes(*)
          )
        `,
          {
            count: 'exact',
          },
        )
        .eq('empresa_id', user.empresa_id)
        .order('created_at', {
          ascending: false,
        })
        .range(from, to)

      if (clienteId) {
        query = query.eq('cliente_id', clienteId)
      } else if (search.trim()) {
        const termo = search.trim()
        const { data: clientesMatch, error: clientesError } = await supabase
          .from('clientes')
          .select('id')
          .eq('empresa_id', user.empresa_id)
          .or(
            `nome.ilike.%${termo}%,nome_empresa.ilike.%${termo}%,doc.ilike.%${termo}%`,
          )

        if (clientesError) {
          throw clientesError
        }

        const ids = (clientesMatch || []).map((c) => c.id)

        if (!ids.length) {
          return {
            data: [],
            total: 0,
            page,
            limit,
            totalPages: 0,
          }
        }

        query = query.in('cliente_id', ids)
      }

      if (startDate) {
        query = query.gte('data_movimentacao', startDate)
      }

      if (endDate) {
        query = query.lte('data_movimentacao', endDate)
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
      .from('movimentacoes_clientes')
      .select(
        `
        *,
        cliente:clientes(
          id,
          nome,
          telefone,
          endereco
        ),
        itens:movimentacao_itens(
          *,
          composicoes:movimentacao_item_composicoes(*)
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

    const { itens = [], ...movimentacao } = payload

    const valorTotal = itens.reduce(
      (acc: number, item: any) => acc + Number(item.valor_total || 0),
      0
    )

    const { data: movimentacaoData, error: movimentacaoError } = await supabase
      .from('movimentacoes_clientes')
      .insert([
        {
          ...movimentacao,
          empresa_id: user.empresa_id,
          valor_total: valorTotal,
        },
      ])
      .select()
      .single()

    if (movimentacaoError) {
      throw movimentacaoError
    }

    for (const item of itens) {
      const { composicoes = [], ...itemData } = item

      const { data: itemInserted, error: itemError } = await supabase
        .from('movimentacao_itens')
        .insert([
          {
            movimentacao_cliente_id: movimentacaoData.id,
            ...itemData,
          },
        ])
        .select()
        .single()

      if (itemError) {
        throw itemError
      }

      if (composicoes.length) {
        const composicoesPayload = composicoes.map((composicao: any) => ({
          movimentacao_item_id: itemInserted.id,
          tipo_corte: composicao.tipo_corte,
          peso_kg: composicao.peso_kg,
        }))

        const { error: composicaoError } = await supabase
          .from('movimentacao_item_composicoes')
          .insert(composicoesPayload)

        if (composicaoError) {
          throw composicaoError
        }
      }
    }

    return movimentacaoData
  },

  async update(id: number, payload: any) {
    const user = getUser()

    const { itens = [], ...movimentacao } = payload

    const valorTotal = itens.reduce(
      (acc: number, item: any) => acc + Number(item.valor_total || 0),
      0
    )

    const { data: movimentacaoData, error: movimentacaoError } = await supabase
      .from('movimentacoes_clientes')
      .update({
        ...movimentacao,
        valor_total: valorTotal,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('empresa_id', user.empresa_id)
      .select()
      .single()

    if (movimentacaoError) {
      throw movimentacaoError
    }

    const { data: itensAtuais } = await supabase
      .from('movimentacao_itens')
      .select('id')
      .eq('movimentacao_cliente_id', id)

    const idsItens = itensAtuais?.map((item) => item.id) || []

    if (idsItens.length) {
      await supabase
        .from('movimentacao_item_composicoes')
        .delete()
        .in('movimentacao_item_id', idsItens)

      await supabase
        .from('movimentacao_itens')
        .delete()
        .eq('movimentacao_cliente_id', id)
    }

    for (const item of itens) {
      const { composicoes = [], ...itemData } = item

      const { data: itemInserted, error: itemError } = await supabase
        .from('movimentacao_itens')
        .insert([
          {
            movimentacao_cliente_id: id,
            ...itemData,
          },
        ])
        .select()
        .single()

      if (itemError) {
        throw itemError
      }

      if (composicoes.length) {
        const composicoesPayload = composicoes.map((composicao: any) => ({
          movimentacao_item_id: itemInserted.id,
          tipo_corte: composicao.tipo_corte,
          peso_kg: composicao.peso_kg,
        }))

        const { error: composicaoError } = await supabase
          .from('movimentacao_item_composicoes')
          .insert(composicoesPayload)

        if (composicaoError) {
          throw composicaoError
        }
      }
    }

    return movimentacaoData
  },

  async delete(id: number) {
    const user = getUser()

    const { error } = await supabase
      .from('movimentacoes_clientes')
      .delete()
      .eq('id', id)
      .eq('empresa_id', user.empresa_id)

    if (error) {
      throw error
    }
  },
  async listarResumoPorCliente(
    page = 1,
    limit = 10,
    search = '',
    startDate = '',
    endDate = '',
    clienteId = '',
  ) {
    try {
      const user = getUser()

      let query = supabase
        .from('movimentacoes_clientes')
        .select(
          `
          id,
          cliente_id,
          data_movimentacao,
          valor_total,
          cliente:clientes(
            id,
            nome,
            nome_empresa,
            telefone
          ),
          itens:movimentacao_itens(
            tipo_corte,
            peso_total_kg
          )
        `,
        )
        .eq('empresa_id', user.empresa_id)
        .order('data_movimentacao', { ascending: false })

      if (clienteId) {
        query = query.eq('cliente_id', clienteId)
      } else if (search.trim()) {
        const termo = search.trim()
        const { data: clientesMatch, error: clientesError } = await supabase
          .from('clientes')
          .select('id')
          .eq('empresa_id', user.empresa_id)
          .or(
            `nome.ilike.%${termo}%,nome_empresa.ilike.%${termo}%,doc.ilike.%${termo}%`,
          )

        if (clientesError) {
          throw clientesError
        }

        const ids = (clientesMatch || []).map((c) => c.id)

        if (!ids.length) {
          return {
            data: [],
            total: 0,
            page,
            limit,
            totalPages: 0,
          }
        }

        query = query.in('cliente_id', ids)
      }

      if (startDate) {
        query = query.gte('data_movimentacao', startDate)
      }

      if (endDate) {
        query = query.lte('data_movimentacao', endDate)
      }

      const { data, error } = await query

      if (error) {
        throw error
      }

      const resumo = agregarResumoPorCliente(data || [])
      const total = resumo.length
      const totalPages = Math.ceil(total / limit) || 0
      const from = (page - 1) * limit

      return {
        data: resumo.slice(from, from + limit),
        total,
        page,
        limit,
        totalPages,
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

  async getByCliente(clienteId: string, startDate = '', endDate = '') {
    const user = getUser()

    let query = supabase
      .from('movimentacoes_clientes')
      .select(
        `
      *,
      itens:movimentacao_itens(
        *,
        composicoes:movimentacao_item_composicoes(*)
      )
    `
      )
      .eq('empresa_id', user.empresa_id)
      .eq('cliente_id', clienteId)
      .order('data_movimentacao', {
        ascending: false,
      })

    if (startDate) {
      query = query.gte('data_movimentacao', startDate)
    }

    if (endDate) {
      query = query.lte('data_movimentacao', endDate)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    return data || []
  },

  async getTotalValorByCliente(clienteId: string) {
    const user = getUser()

    const { data, error } = await supabase
      .from('movimentacoes_clientes')
      .select('valor_total')
      .eq('empresa_id', user.empresa_id)
      .eq('cliente_id', clienteId)

    if (error) throw error

    return (data || []).reduce(
      (acc, row) => acc + Number(row.valor_total || 0),
      0,
    )
  },
}
