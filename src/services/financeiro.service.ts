import { pagamentosComprasService } from './pagamentosCompras.service'
import { AuthService } from './auth.service'
import { supabase } from './supabase'
import {
  contaPagamentoFromFornecedor,
  contaPagamentoFromParcela,
  contaPagamentoTemDados,
  type ContaPagamentoData,
} from '@/utils/contaPagamento'
import { vencimentoSemanalAbate } from '@/utils/abatePagamento'

export type FinanceiroLancamento = {
  id: string
  descricao: string
  tipo: 'pagar' | 'receber'
  valor: number
  vencimento: string
  status: string
  formaPagamento?: string
  dataPagamento?: string
  parcelaId?: number
  contaPagamento?: ContaPagamentoData
  origem: 'compra' | 'custo' | 'abate' | 'venda' | 'recebimento'
}

function getUser() {
  const user = AuthService.getCachedUser()

  if (!user) {
    throw new Error('Usuário não encontrado no cache')
  }

  return user
}

function isoDateOnly(value: string) {
  return (value || '').slice(0, 10)
}

function statusVendaFinanceiro(dataMovimentacao: string, movimentacaoStatus: string) {
  const status = (movimentacaoStatus || 'pendente').toLowerCase()

  if (status === 'finalizado') {
    return 'Finalizado'
  }

  if (status === 'cancelado') {
    return 'Cancelado'
  }

  const hoje = new Date()
  hoje.setHours(12, 0, 0, 0)
  const data = new Date(`${isoDateOnly(dataMovimentacao)}T12:00:00`)

  if (data < hoje) {
    return 'Atrasado'
  }

  return 'Pendente'
}

async function listarCustosOperacionais(startDate: string, endDate: string) {
  const user = getUser()

  let query = supabase
    .from('custos_operacionais')
    .select('id, data, categoria, descricao, valor')
    .eq('empresa_id', user.empresa_id)
    .order('data', { ascending: true })

  if (startDate) {
    query = query.gte('data', startDate)
  }

  if (endDate) {
    query = query.lte('data', endDate)
  }

  const { data, error } = await query

  if (error) throw error

  return data || []
}

async function listarAbates(startDate: string, endDate: string) {
  const user = getUser()

  let query = supabase
    .from('abates')
    .select(
      `
      id,
      data_abate,
      lote,
      valor_total,
      pagamento_status,
      data_pagamento,
      forma_pagamento,
      prestador:prestadores_servico(
        nome,
        banco,
        agencia,
        conta,
        tipo_conta,
        titular_conta,
        pix_tipo,
        pix_chave
      )
    `,
    )
    .eq('empresa_id', user.empresa_id)
    .order('data_abate', { ascending: true })

  if (startDate) {
    query = query.gte('data_abate', startDate)
  }

  if (endDate) {
    query = query.lte('data_abate', endDate)
  }

  const { data, error } = await query

  if (error) throw error

  return data || []
}

async function listarVendas(startDate: string, endDate: string) {
  const user = getUser()

  let query = supabase
    .from('movimentacoes_clientes')
    .select(
      `
      id,
      data_movimentacao,
      valor_total,
      movimentacao_status,
      cliente:clientes (
        nome,
        nome_empresa
      )
    `,
    )
    .eq('empresa_id', user.empresa_id)
    .order('data_movimentacao', { ascending: true })

  if (startDate) {
    query = query.gte('data_movimentacao', startDate)
  }

  if (endDate) {
    query = query.lte('data_movimentacao', endDate)
  }

  const { data, error } = await query

  if (error) throw error

  return data || []
}

async function listarRecebimentos(startDate: string, endDate: string) {
  const user = getUser()

  let query = supabase
    .from('recebimentos_clientes')
    .select(
      `
      id,
      data_recebimento,
      valor,
      forma_pagamento,
      observacao,
      cliente:clientes (
        nome,
        nome_empresa
      )
    `,
    )
    .eq('empresa_id', user.empresa_id)
    .order('data_recebimento', { ascending: true })

  if (startDate) {
    query = query.gte('data_recebimento', startDate)
  }

  if (endDate) {
    query = query.lte('data_recebimento', endDate)
  }

  const { data, error } = await query

  if (error) throw error

  return data || []
}

function nomeCliente(cliente: {
  nome?: string | null
  nome_empresa?: string | null
} | null) {
  if (!cliente) return 'Cliente não informado'

  const nome = cliente.nome?.trim()
  const empresa = cliente.nome_empresa?.trim()

  if (nome && empresa && nome !== empresa) {
    return `${nome} (${empresa})`
  }

  return nome || empresa || 'Cliente não informado'
}

export const financeiroService = {
  async listarLancamentos(startDate = '', endDate = '') {
    const [parcelas, custos, abates, vendas, recebimentos] = await Promise.all([
      pagamentosComprasService.listarParaFinanceiro(startDate, endDate),
      listarCustosOperacionais(startDate, endDate),
      listarAbates(startDate, endDate),
      listarVendas(startDate, endDate),
      listarRecebimentos(startDate, endDate),
    ])

    const lancamentos: FinanceiroLancamento[] = []

    for (const parcela of parcelas) {
      const fornecedor =
        parcela.compra?.fornecedor?.nome || 'Fornecedor não informado'
      const parcelaLabel =
        parcela.total_parcelas > 1
          ? ` (parcela ${parcela.numero_parcela}/${parcela.total_parcelas})`
          : ''
      const contaSalva = contaPagamentoFromParcela(parcela)
      const contaFornecedor = contaPagamentoFromFornecedor(
        parcela.compra?.fornecedor,
      )
      const contaPagamento = contaPagamentoTemDados(contaSalva)
        ? contaSalva
        : contaFornecedor

      lancamentos.push({
        id: `compra-parcela-${parcela.id}`,
        descricao: `Compra gado - ${fornecedor}${parcelaLabel}`,
        tipo: 'pagar',
        valor: Number(parcela.valor || 0),
        vencimento: parcela.data_vencimento,
        dataPagamento: parcela.data_pagamento || undefined,
        status: parcela.statusExibicao,
        formaPagamento: parcela.forma_pagamento || undefined,
        parcelaId: parcela.id,
        contaPagamento,
        origem: 'compra',
      })
    }

    for (const custo of custos) {
      const titulo = [custo.categoria, custo.descricao]
        .filter(Boolean)
        .join(' - ')

      lancamentos.push({
        id: `custo-${custo.id}`,
        descricao: titulo || 'Despesa operacional',
        tipo: 'pagar',
        valor: Number(custo.valor || 0),
        vencimento: isoDateOnly(custo.data),
        status: 'Pago',
        origem: 'custo',
      })
    }

    for (const abate of abates) {
      const prestador = abate.prestador as {
        nome?: string | null
        banco?: string | null
        agencia?: string | null
        conta?: string | null
        tipo_conta?: string | null
        titular_conta?: string | null
        pix_tipo?: string | null
        pix_chave?: string | null
      } | null

      const pago = abate.pagamento_status === 'pago'
      const vencimento = pago
        ? isoDateOnly(abate.data_pagamento || abate.data_abate)
        : vencimentoSemanalAbate(abate.data_abate)

      let status: 'Pago' | 'Pendente' | 'Atrasado' = pago ? 'Pago' : 'Pendente'
      if (!pago) {
        const hoje = new Date()
        hoje.setHours(12, 0, 0, 0)
        const venc = new Date(`${vencimento}T12:00:00`)
        if (venc < hoje) status = 'Atrasado'
      }

      const prestadorNome = prestador?.nome?.trim()
      const loteLabel = abate.lote || abate.id

      lancamentos.push({
        id: `abate-${abate.id}`,
        descricao: prestadorNome
          ? `Abate - ${prestadorNome} - Lote ${loteLabel}`
          : `Abate - Lote ${loteLabel}`,
        tipo: 'pagar',
        valor: Number(abate.valor_total || 0),
        vencimento,
        dataPagamento: pago
          ? isoDateOnly(abate.data_pagamento || abate.data_abate)
          : undefined,
        status,
        formaPagamento: abate.forma_pagamento || undefined,
        contaPagamento: contaPagamentoTemDados(
          contaPagamentoFromFornecedor(prestador),
        )
          ? contaPagamentoFromFornecedor(prestador)
          : undefined,
        origem: 'abate',
      })
    }

    for (const venda of vendas) {
      const cliente = venda.cliente as {
        nome?: string | null
        nome_empresa?: string | null
      } | null

      lancamentos.push({
        id: `venda-${venda.id}`,
        descricao: `Venda - ${nomeCliente(cliente)}`,
        tipo: 'receber',
        valor: Number(venda.valor_total || 0),
        vencimento: isoDateOnly(venda.data_movimentacao),
        status: statusVendaFinanceiro(
          venda.data_movimentacao,
          venda.movimentacao_status,
        ),
        origem: 'venda',
      })
    }

    for (const recebimento of recebimentos) {
      const cliente = recebimento.cliente as {
        nome?: string | null
        nome_empresa?: string | null
      } | null
      const obs = recebimento.observacao?.trim()

      lancamentos.push({
        id: `recebimento-${recebimento.id}`,
        descricao: obs
          ? `Recebimento - ${nomeCliente(cliente)} (${obs})`
          : `Recebimento - ${nomeCliente(cliente)}`,
        tipo: 'receber',
        valor: Number(recebimento.valor || 0),
        vencimento: isoDateOnly(recebimento.data_recebimento),
        dataPagamento: isoDateOnly(recebimento.data_recebimento),
        status: 'Pago',
        formaPagamento: recebimento.forma_pagamento || undefined,
        origem: 'recebimento',
      })
    }

    lancamentos.sort((a, b) => {
      const byDate = a.vencimento.localeCompare(b.vencimento)
      if (byDate !== 0) return byDate
      return a.descricao.localeCompare(b.descricao)
    })

    return lancamentos
  },
}
