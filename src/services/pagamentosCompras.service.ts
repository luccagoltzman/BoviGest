import { gerarParcelasCompra, type CompraParcelaConfig } from '@/utils/compraParcelas'
import {
  contaPagamentoToDb,
  pagadorParcelaToDb,
  stripParcelaPagamentoDbFields,
  isMissingContaPagamentoColumnError,
  AVISO_SQL_CONTA_PAGAMENTO,
  type PagadorTipo,
} from '@/utils/contaPagamento'
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
  pagamento_banco?: string | null
  pagamento_agencia?: string | null
  pagamento_conta?: string | null
  pagamento_tipo_conta?: string | null
  pagamento_titular?: string | null
  pagamento_pix_tipo?: string | null
  pagamento_pix_chave?: string | null
  pagador_tipo?: PagadorTipo | string | null
  origem_banco?: string | null
  origem_agencia?: string | null
  origem_conta?: string | null
  origem_tipo_conta?: string | null
  origem_titular?: string | null
  origem_pix_tipo?: string | null
  origem_pix_chave?: string | null
  compra?: {
    id: number
    data: string
    fornecedor?: {
      nome?: string
      banco?: string | null
      agencia?: string | null
      conta?: string | null
      tipo_conta?: string | null
      titular_conta?: string | null
      pix_tipo?: string | null
      pix_chave?: string | null
    } | null
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

let lastAvisoContaPagamento: string | null = null

function registrarAvisoContaPagamento() {
  lastAvisoContaPagamento = AVISO_SQL_CONTA_PAGAMENTO
}

async function insertParcelasRows(rows: Record<string, unknown>[]) {
  const primeiro = await supabase
    .from('compras_parcelas')
    .insert(rows)
    .select('*')

  if (!primeiro.error) {
    return (primeiro.data || []) as CompraParcela[]
  }

  if (isMissingContaPagamentoColumnError(primeiro.error)) {
    const stripped = rows.map((row) => stripParcelaPagamentoDbFields(row))
    const retry = await supabase
      .from('compras_parcelas')
      .insert(stripped)
      .select('*')

    if (retry.error) throw retry.error

    registrarAvisoContaPagamento()
    return (retry.data || []) as CompraParcela[]
  }

  throw primeiro.error
}

async function updateParcelaRow(
  id: number,
  empresaId: number,
  updateData: Record<string, unknown>,
  options?: { status?: string },
) {
  let query = supabase
    .from('compras_parcelas')
    .update(updateData)
    .eq('id', id)
    .eq('empresa_id', empresaId)

  if (options?.status) {
    query = query.eq('status', options.status)
  }

  const primeiro = await query.select('*').single()

  if (!primeiro.error) {
    return primeiro.data as CompraParcela
  }

  if (isMissingContaPagamentoColumnError(primeiro.error)) {
    let retryQuery = supabase
      .from('compras_parcelas')
      .update(stripParcelaPagamentoDbFields(updateData))
      .eq('id', id)
      .eq('empresa_id', empresaId)

    if (options?.status) {
      retryQuery = retryQuery.eq('status', options.status)
    }

    const retry = await retryQuery.select('*').single()
    if (retry.error) throw retry.error

    registrarAvisoContaPagamento()
    return retry.data as CompraParcela
  }

  throw primeiro.error
}

export const pagamentosComprasService = {
  consumeAvisoContaPagamento() {
    const aviso = lastAvisoContaPagamento
    lastAvisoContaPagamento = null
    return aviso
  },
  async createForCompra(compraId: number, config: CompraParcelaConfig) {
    const user = getUser()
    const drafts = config.parcelas.filter((p) => p.valor && p.data)
    const parcelas = gerarParcelasCompra(config)

    if (!parcelas.length) return []

    const contaDb = config.contaPagamento
      ? contaPagamentoToDb(config.contaPagamento)
      : {}

    const rows = parcelas.map((parcela, index) => {
      const draft = drafts[index]
      const pagadorDb =
        parcela.status === 'pago' && draft
          ? pagadorParcelaToDb(
              draft.pagadorTipo || 'proprio',
              draft.contaOrigem,
            )
          : pagadorParcelaToDb('proprio')

      return {
        empresa_id: user.empresa_id,
        compra_id: compraId,
        ...parcela,
        ...contaDb,
        ...pagadorDb,
      }
    })

    return insertParcelasRows(rows)
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
          fornecedor:fornecedores (
            nome,
            banco,
            agencia,
            conta,
            tipo_conta,
            titular_conta,
            pix_tipo,
            pix_chave
          )
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
      contaPagamento?: import('@/utils/contaPagamento').ContaPagamentoData
      pagadorTipo?: PagadorTipo
      contaOrigem?: import('@/utils/contaPagamento').ContaPagamentoData
    },
  ) {
    return this.atualizarParcela(id, payload)
  },

  async atualizarParcela(
    id: number,
    payload: {
      valor?: number
      data_vencimento?: string
      data_pagamento?: string | null
      forma_pagamento?: string
      contaPagamento?: import('@/utils/contaPagamento').ContaPagamentoData
      pagadorTipo?: PagadorTipo
      contaOrigem?: import('@/utils/contaPagamento').ContaPagamentoData
      status?: 'pendente' | 'pago'
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

    if (payload.data_pagamento !== undefined) {
      updateData.data_pagamento = payload.data_pagamento
    }

    if (payload.forma_pagamento) {
      updateData.forma_pagamento = payload.forma_pagamento
    }

    if (payload.status) {
      updateData.status = payload.status
      if (payload.status === 'pendente') {
        updateData.data_pagamento = null
        Object.assign(
          updateData,
          pagadorParcelaToDb('proprio'),
        )
      }
    }

    if (payload.contaPagamento) {
      Object.assign(updateData, contaPagamentoToDb(payload.contaPagamento))
    }

    if (payload.pagadorTipo) {
      Object.assign(
        updateData,
        pagadorParcelaToDb(payload.pagadorTipo, payload.contaOrigem),
      )
    }

    const data = await updateParcelaRow(id, user.empresa_id!, updateData)

    await this.syncCompraQuitacao(data.compra_id)

    return data
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
      contaPagamento?: import('@/utils/contaPagamento').ContaPagamentoData
      pagadorTipo?: PagadorTipo
      contaOrigem?: import('@/utils/contaPagamento').ContaPagamentoData
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

    if (payload.contaPagamento) {
      Object.assign(updateData, contaPagamentoToDb(payload.contaPagamento))
    }

    if (payload.pagadorTipo) {
      Object.assign(
        updateData,
        pagadorParcelaToDb(payload.pagadorTipo, payload.contaOrigem),
      )
    }

    const data = await updateParcelaRow(id, user.empresa_id!, updateData)

    await this.syncCompraQuitacao(data.compra_id)

    return data
  },

  async syncCompraQuitacao(compraId: number) {
    const user = getUser()
    const parcelas = await this.getByCompraId(compraId)
    const valorTotal = await this.getValorTotalCompra(compraId)
    const valorPago = parcelas
      .filter((p) => p.status === 'pago')
      .reduce((acc, p) => acc + Number(p.valor || 0), 0)

    const quitado =
      valorTotal > 0 && valorPago >= valorTotal - 0.02

    await supabase
      .from('compras')
      .update({
        pagamento_quitado: quitado,
        qtd_parcelas: parcelas.length,
        updated_at: new Date().toISOString(),
      })
      .eq('id', compraId)
      .eq('empresa_id', user.empresa_id)
  },

  async getValorTotalCompra(compraId: number) {
    const user = getUser()

    const { data: compra, error } = await supabase
      .from('compras')
      .select('subtotal, valor_imposto, gta_valor, valor_total')
      .eq('id', compraId)
      .eq('empresa_id', user.empresa_id)
      .single()

    if (error || !compra) {
      return 0
    }

    const { data: viagem } = await supabase
      .from('viagens')
      .select('custo_total')
      .eq('referencia_id', compraId)
      .eq('referencia_tipo', 'compra')
      .maybeSingle()

    const viagemValor = Number(viagem?.custo_total || 0)

    if (viagemValor > 0) {
      return (
        Number(compra.subtotal || 0) +
        Number(compra.valor_imposto || 0) +
        Number(compra.gta_valor || 0) +
        viagemValor
      )
    }

    return Number(compra.valor_total || 0)
  },

  async adicionarParcelas(compraId: number, config: CompraParcelaConfig) {
    const user = getUser()
    const existentes = await this.getByCompraId(compraId)
    const drafts = config.parcelas.filter((p) => p.valor && p.data)
    const novas = gerarParcelasCompra(config)

    if (!novas.length) return []

    const maxNumero = existentes.reduce(
      (max, parcela) => Math.max(max, parcela.numero_parcela),
      0,
    )
    const novoTotal = existentes.length + novas.length
    const contaDb = config.contaPagamento
      ? contaPagamentoToDb(config.contaPagamento)
      : {}

    const rows = novas.map((parcela, index) => {
      const draft = drafts[index]
      const pagadorDb =
        parcela.status === 'pago' && draft
          ? pagadorParcelaToDb(
              draft.pagadorTipo || 'proprio',
              draft.contaOrigem,
            )
          : pagadorParcelaToDb('proprio')

      return {
        empresa_id: user.empresa_id,
        compra_id: compraId,
        ...parcela,
        numero_parcela: maxNumero + index + 1,
        total_parcelas: novoTotal,
        ...contaDb,
        ...pagadorDb,
      }
    })

    const data = await insertParcelasRows(rows)

    if (existentes.length > 0) {
      const { error: updateError } = await supabase
        .from('compras_parcelas')
        .update({ total_parcelas: novoTotal })
        .eq('compra_id', compraId)
        .eq('empresa_id', user.empresa_id)

      if (updateError) throw updateError
    }

    await this.syncCompraQuitacao(compraId)

    return data
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

  async excluirParcela(id: number) {
    const user = getUser()

    const { data: parcela, error } = await supabase
      .from('compras_parcelas')
      .select('compra_id')
      .eq('id', id)
      .eq('empresa_id', user.empresa_id)
      .single()

    if (error || !parcela) {
      throw error || new Error('Parcela não encontrada')
    }

    const compraId = parcela.compra_id

    const { error: deleteError } = await supabase
      .from('compras_parcelas')
      .delete()
      .eq('id', id)
      .eq('empresa_id', user.empresa_id)

    if (deleteError) throw deleteError

    const restantes = await this.getByCompraId(compraId)
    const novoTotal = restantes.length

    if (novoTotal > 0) {
      await Promise.all(
        restantes.map((item, index) =>
          supabase
            .from('compras_parcelas')
            .update({
              numero_parcela: index + 1,
              total_parcelas: novoTotal,
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.id)
            .eq('empresa_id', user.empresa_id),
        ),
      )
    }

    await this.syncCompraQuitacao(compraId)
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
