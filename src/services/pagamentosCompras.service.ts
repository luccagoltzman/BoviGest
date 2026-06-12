import { gerarParcelasCompra, type CompraParcelaConfig } from '@/utils/compraParcelas'
import { AuthService } from './auth.service'
import { supabase } from './supabase'

export type CompraParcela = {
  id: number
  empresa_id: number
  compra_id: number
  numero_parcela: number
  total_parcelas: number
  valor: number
  data_vencimento: string
  data_pagamento: string | null
  forma_pagamento: string | null
  status: 'pendente' | 'pago'
  compra?: {
    id: number
    data: string
    fornecedor?: { nome?: string } | null
  } | null
}

function getUser() {
  const user = AuthService.getCachedUser()

  if (!user) {
    throw new Error('Usuário não encontrado no cache')
  }

  return user
}

function statusExibicao(parcela: CompraParcela) {
  if (parcela.status === 'pago') return 'Pago'

  const hoje = new Date()
  hoje.setHours(12, 0, 0, 0)
  const vencimento = new Date(`${parcela.data_vencimento.slice(0, 10)}T12:00:00`)

  if (vencimento < hoje) return 'Atrasado'

  return 'Pendente'
}

export const pagamentosComprasService = {
  async createForCompra(compraId: number, config: CompraParcelaConfig) {
    const user = getUser()
    const parcelas = gerarParcelasCompra(config)

    if (!parcelas.length) return []

    const rows = parcelas.map((parcela) => ({
      empresa_id: user.empresa_id,
      compra_id: compraId,
      ...parcela,
    }))

    const { data, error } = await supabase
      .from('compras_parcelas')
      .insert(rows)
      .select('*')

    if (error) throw error

    return (data || []) as CompraParcela[]
  },

  async getByCompraId(compraId: number) {
    const user = getUser()

    const { data, error } = await supabase
      .from('compras_parcelas')
      .select('*')
      .eq('empresa_id', user.empresa_id)
      .eq('compra_id', compraId)
      .order('numero_parcela')

    if (error) throw error

    return (data || []) as CompraParcela[]
  },

  async getResumoByCompraIds(compraIds: number[]) {
    if (!compraIds.length) return {} as Record<number, CompraParcela[]>

    const user = getUser()

    const { data, error } = await supabase
      .from('compras_parcelas')
      .select('*')
      .eq('empresa_id', user.empresa_id)
      .in('compra_id', compraIds)
      .order('numero_parcela')

    if (error) throw error

    return (data || []).reduce<Record<number, CompraParcela[]>>((acc, row) => {
      const parcela = row as CompraParcela

      if (!acc[parcela.compra_id]) {
        acc[parcela.compra_id] = []
      }

      acc[parcela.compra_id].push(parcela)

      return acc
    }, {})
  },

  async listarParaFinanceiro(startDate = '', endDate = '') {
    const user = getUser()

    let query = supabase
      .from('compras_parcelas')
      .select(
        `
        *,
        compra:compras (
          id,
          data,
          fornecedor:fornecedores ( nome )
        )
      `,
      )
      .eq('empresa_id', user.empresa_id)
      .order('data_vencimento', { ascending: true })

    if (startDate) {
      query = query.gte('data_vencimento', startDate)
    }

    if (endDate) {
      query = query.lte('data_vencimento', endDate)
    }

    const { data, error } = await query

    if (error) throw error

    return ((data || []) as CompraParcela[]).map((parcela) => ({
      ...parcela,
      statusExibicao: statusExibicao(parcela),
    }))
  },

  async listarParaRelatorios() {
    const user = getUser()

    let query = supabase
      .from('compras_parcelas')
      .select('id, compra_id, valor, data_vencimento, data_pagamento, status')
      .eq('empresa_id', user.empresa_id)

    const { data, error } = await query

    if (error) throw error

    return (data || []) as Pick<
      CompraParcela,
      'id' | 'compra_id' | 'valor' | 'data_vencimento' | 'data_pagamento' | 'status'
    >[]
  },

  async atualizarPendente(
    id: number,
    payload: {
      valor?: number
      data_vencimento?: string
      forma_pagamento?: string
    },
  ) {
    const user = getUser()

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (payload.valor !== undefined && payload.valor > 0) {
      updateData.valor = payload.valor
    }

    if (payload.data_vencimento) {
      updateData.data_vencimento = payload.data_vencimento
    }

    if (payload.forma_pagamento) {
      updateData.forma_pagamento = payload.forma_pagamento
    }

    const { data, error } = await supabase
      .from('compras_parcelas')
      .update(updateData)
      .eq('id', id)
      .eq('empresa_id', user.empresa_id)
      .eq('status', 'pendente')
      .select('*')
      .single()

    if (error) throw error

    return data as CompraParcela
  },

  async configurarParcelas(compraId: number, config: CompraParcelaConfig) {
    const parcelas = await this.getByCompraId(compraId)

    if (parcelas.length) {
      throw new Error('Esta compra já possui parcelas cadastradas')
    }

    return this.createForCompra(compraId, config)
  },

  async marcarComoPago(
    id: number,
    payload: {
      data_pagamento?: string
      forma_pagamento?: string
      valor?: number
    } = {},
  ) {
    const user = getUser()
    const dataPagamento =
      payload.data_pagamento || new Date().toISOString().slice(0, 10)

    const updateData: Record<string, unknown> = {
      status: 'pago',
      data_pagamento: dataPagamento,
      updated_at: new Date().toISOString(),
    }

    if (payload.forma_pagamento) {
      updateData.forma_pagamento = payload.forma_pagamento
    }

    if (payload.valor !== undefined && payload.valor > 0) {
      updateData.valor = payload.valor
    }

    const { data, error } = await supabase
      .from('compras_parcelas')
      .update(updateData)
      .eq('id', id)
      .eq('empresa_id', user.empresa_id)
      .select('*')
      .single()

    if (error) throw error

    await this.syncCompraQuitacao(data.compra_id)

    return data as CompraParcela
  },

  async syncCompraQuitacao(compraId: number) {
    const user = getUser()
    const parcelas = await this.getByCompraId(compraId)
    const quitado =
      parcelas.length > 0 && parcelas.every((p) => p.status === 'pago')

    await supabase
      .from('compras')
      .update({
        pagamento_quitado: quitado,
        updated_at: new Date().toISOString(),
      })
      .eq('id', compraId)
      .eq('empresa_id', user.empresa_id)
  },

  async deleteByCompra(compraId: number) {
    const user = getUser()

    const { error } = await supabase
      .from('compras_parcelas')
      .delete()
      .eq('compra_id', compraId)
      .eq('empresa_id', user.empresa_id)

    if (error) throw error
  },

  async regenerarForCompra(compraId: number, config: CompraParcelaConfig) {
    const parcelas = await this.getByCompraId(compraId)
    const temPagas = parcelas.some((p) => p.status === 'pago')

    if (temPagas) {
      throw new Error('Não é possível regenerar parcelas com pagamentos já realizados')
    }

    await this.deleteByCompra(compraId)
    return this.createForCompra(compraId, config)
  },
}
