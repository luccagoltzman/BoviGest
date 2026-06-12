import { AuthService } from './auth.service'
import { supabase } from './supabase'

// ─── Tipos públicos ───────────────────────────────────────────

export type RelatorioFiltros = {
  startDate: string
  endDate: string
}

export type RelatorioKpis = {
  totalCompras: number
  totalComprasPagas: number
  totalComprasPendentes: number
  qtdCompras: number
  totalVendas: number
  qtdVendas: number
  vendasFinalizadas: number
  vendasPendentes: number
  totalCustos: number
  estoqueLiquidoKg: number
  entradasKg: number
  saidasKg: number
  resultadoEstimado: number
}

export type RankingItem = {
  nome: string
  total: number
  qtd: number
}

export type RankingCorte = {
  corte: string
  peso: number
  total: number
}

export type EstoqueSaldo = {
  corte: string
  saldoKg: number
}

export type CompraResumo = {
  id: number
  data: string
  valor_total: number
  status: string
  fornecedor?: { nome?: string } | null
}

export type VendaResumo = {
  id: number
  data_movimentacao: string
  valor_total: number
  movimentacao_status: string
  cliente?: { nome?: string } | null
}

export type PontoSerieDia = {
  data: string
  label: string
  compras: number
  vendas: number
}

export type RelatorioDados = {
  filtros: RelatorioFiltros
  kpis: RelatorioKpis
  serieFinanceira: PontoSerieDia[]
  comprasPorFornecedor: RankingItem[]
  vendasPorCliente: RankingItem[]
  vendasPorCorte: RankingCorte[]
  custosPorCategoria: RankingItem[]
  estoquePorCorte: EstoqueSaldo[]
  comprasRecentes: CompraResumo[]
  vendasRecentes: VendaResumo[]
}

// ─── Tipos internos (raw do banco) ────────────────────────────

type RawCompra = CompraResumo
type RawVenda = VendaResumo & {
  itens?: {
    tipo_corte?: string
    peso_total_kg?: number
    valor_total?: number
  }[]
}
type RawCusto = {
  categoria?: string
  valor?: number
}
type RawEstoque = {
  corte?: string
  saldo_liquido_kg?: number
}
type RawMovimentacaoEstoque = {
  tipo_movimentacao: number
  peso_liquido_kg?: number
  itens?: { peso_liquido_kg?: number }[]
}

type RawParcelaCompra = {
  id: number
  compra_id: number
  valor?: number
  data_vencimento?: string
  data_pagamento?: string | null
  status?: string
}

type RawRelatorio = {
  compras: RawCompra[]
  parcelasCompras: RawParcelaCompra[]
  vendas: RawVenda[]
  custos: RawCusto[]
  estoque: RawEstoque[]
  movimentacoesEstoque: RawMovimentacaoEstoque[]
}

// ─── Helpers ──────────────────────────────────────────────────

function getEmpresaId() {
  const user = AuthService.getCachedUser()

  if (!user?.empresa_id) {
    throw new Error('Usuário não encontrado no cache')
  }

  return user.empresa_id
}

function somarPorCampo<T>(
  lista: T[],
  chave: (item: T) => string,
  valor: (item: T) => number,
): RankingItem[] {
  const mapa = lista.reduce<Record<string, RankingItem>>((acc, item) => {
    const nome = chave(item) || 'Outros'

    if (!acc[nome]) {
      acc[nome] = { nome, total: 0, qtd: 0 }
    }

    acc[nome].total += valor(item)
    acc[nome].qtd += 1

    return acc
  }, {})

  return Object.values(mapa).sort((a, b) => b.total - a.total)
}

function pesoMovimentacaoEstoque(mov: RawMovimentacaoEstoque) {
  const pesoItens = (mov.itens || []).reduce(
    (acc, item) => acc + Number(item.peso_liquido_kg || 0),
    0,
  )

  return pesoItens > 0 ? pesoItens : Number(mov.peso_liquido_kg || 0)
}

function formatChartDayLabel(isoDate: string) {
  const date = new Date(`${isoDate.slice(0, 10)}T12:00:00`)
  if (Number.isNaN(date.getTime())) return isoDate
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function isoDateFromValue(value: string) {
  return value.slice(0, 10)
}

function eachDayInRange(startDate: string, endDate: string) {
  const start = isoDateFromValue(startDate)
  const end = isoDateFromValue(endDate)
  const [sy, sm, sd] = start.split('-').map(Number)
  const [ey, em, ed] = end.split('-').map(Number)
  const cursor = new Date(sy, sm - 1, sd, 12, 0, 0)
  const limit = new Date(ey, em - 1, ed, 12, 0, 0)
  const days: string[] = []

  if (Number.isNaN(cursor.getTime()) || Number.isNaN(limit.getTime())) {
    return days
  }

  while (cursor <= limit) {
    const y = cursor.getFullYear()
    const m = String(cursor.getMonth() + 1).padStart(2, '0')
    const d = String(cursor.getDate()).padStart(2, '0')
    days.push(`${y}-${m}-${d}`)
    cursor.setDate(cursor.getDate() + 1)
  }

  return days
}

function dataNoPeriodo(data: string, filtros: RelatorioFiltros) {
  const dia = isoDateFromValue(data || '')
  if (!dia) return false
  if (filtros.startDate && dia < filtros.startDate) return false
  if (filtros.endDate && dia > filtros.endDate) return false
  return true
}

function montarSerieFinanceira(
  compras: RawCompra[],
  parcelasCompras: RawParcelaCompra[],
  vendas: RawVenda[],
  filtros: RelatorioFiltros,
): PontoSerieDia[] {
  const map = new Map<string, { compras: number; vendas: number }>()
  const comprasComParcelas = new Set(parcelasCompras.map((p) => p.compra_id))

  const ensureDay = (dia: string) => {
    if (!map.has(dia)) {
      map.set(dia, { compras: 0, vendas: 0 })
    }
  }

  for (const parcela of parcelasCompras) {
    if (parcela.status !== 'pago' || !parcela.data_pagamento) continue

    const dia = isoDateFromValue(parcela.data_pagamento)
    if (!dia) continue

    ensureDay(dia)
    map.get(dia)!.compras += Number(parcela.valor || 0)
  }

  for (const compra of compras) {
    if (comprasComParcelas.has(compra.id)) continue

    const dia = isoDateFromValue(compra.data || '')
    if (!dia) continue
    ensureDay(dia)
    map.get(dia)!.compras += Number(compra.valor_total || 0)
  }

  for (const venda of vendas) {
    const dia = isoDateFromValue(venda.data_movimentacao || '')
    if (!dia) continue
    ensureDay(dia)
    map.get(dia)!.vendas += Number(venda.valor_total || 0)
  }

  if (filtros.startDate && filtros.endDate) {
    for (const dia of eachDayInRange(filtros.startDate, filtros.endDate)) {
      ensureDay(dia)
    }
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([data, valores]) => ({
      data,
      label: formatChartDayLabel(data),
      compras: valores.compras,
      vendas: valores.vendas,
    }))
}

// ─── Requisições unificadas ao Supabase ────────────────────────

async function buscarDadosBrutos(
  empresaId: number,
  filtros: RelatorioFiltros,
): Promise<RawRelatorio> {
  const [compras, parcelasCompras, vendas, custos, estoque, movimentacoesEstoque] =
    await Promise.all([
      buscarCompras(empresaId, filtros),
      buscarParcelasCompras(empresaId),
      buscarVendas(empresaId, filtros),
      buscarCustos(empresaId, filtros),
      buscarEstoqueAtual(empresaId),
      buscarMovimentacoesEstoque(empresaId, filtros),
    ])

  return { compras, parcelasCompras, vendas, custos, estoque, movimentacoesEstoque }
}

async function buscarParcelasCompras(empresaId: number) {
  const { data, error } = await supabase
    .from('compras_parcelas')
    .select('id, compra_id, valor, data_vencimento, data_pagamento, status')
    .eq('empresa_id', empresaId)

  if (error) throw error

  return (data || []) as RawParcelaCompra[]
}

async function buscarCompras(empresaId: number, filtros: RelatorioFiltros) {
  let query = supabase
    .from('compras')
    .select(
      `
      id,
      data,
      valor_total,
      status,
      fornecedor:fornecedores ( id, nome )
    `,
    )
    .eq('empresa_id', empresaId)
    .order('data', { ascending: false })

  if (filtros.startDate) query = query.gte('data', filtros.startDate)
  if (filtros.endDate) query = query.lte('data', filtros.endDate)

  const { data, error } = await query

  if (error) throw error

  return (data || []) as RawCompra[]
}

async function buscarVendas(empresaId: number, filtros: RelatorioFiltros) {
  let query = supabase
    .from('movimentacoes_clientes')
    .select(
      `
      id,
      data_movimentacao,
      valor_total,
      movimentacao_status,
      cliente:clientes ( id, nome ),
      itens:movimentacao_itens (
        tipo_corte,
        peso_total_kg,
        valor_total
      )
    `,
    )
    .eq('empresa_id', empresaId)
    .order('data_movimentacao', { ascending: false })

  if (filtros.startDate) {
    query = query.gte('data_movimentacao', filtros.startDate)
  }
  if (filtros.endDate) {
    query = query.lte('data_movimentacao', filtros.endDate)
  }

  const { data, error } = await query

  if (error) throw error

  return (data || []) as RawVenda[]
}

async function buscarCustos(empresaId: number, filtros: RelatorioFiltros) {
  let query = supabase
    .from('custos_operacionais')
    .select('id, data, categoria, valor')
    .eq('empresa_id', empresaId)
    .order('data', { ascending: false })

  if (filtros.startDate) query = query.gte('data', filtros.startDate)
  if (filtros.endDate) query = query.lte('data', filtros.endDate)

  const { data, error } = await query

  if (error) throw error

  return (data || []) as RawCusto[]
}

async function buscarEstoqueAtual(empresaId: number) {
  const { data, error } = await supabase
    .from('vw_estoque_atual')
    .select('corte, saldo_liquido_kg')
    .eq('empresa_id', empresaId)
    .order('corte')

  if (error) throw error

  return (data || []) as RawEstoque[]
}

async function buscarMovimentacoesEstoque(
  empresaId: number,
  filtros: RelatorioFiltros,
) {
  let query = supabase
    .from('estoque_movimentacoes')
    .select(
      `
      tipo_movimentacao,
      peso_liquido_kg,
      itens:estoque_movimentacao_itens ( peso_liquido_kg )
    `,
    )
    .eq('empresa_id', empresaId)
    .order('data_movimentacao', { ascending: false })

  if (filtros.startDate) {
    query = query.gte('data_movimentacao', filtros.startDate)
  }
  if (filtros.endDate) {
    query = query.lte('data_movimentacao', filtros.endDate)
  }

  const { data, error } = await query

  if (error) throw error

  return (data || []) as RawMovimentacaoEstoque[]
}

// ─── Montagem do relatório ────────────────────────────────────

function montarRelatorio(
  filtros: RelatorioFiltros,
  raw: RawRelatorio,
): RelatorioDados {
  const { compras, parcelasCompras, vendas, custos, estoque, movimentacoesEstoque } = raw

  const totalCompras = compras.reduce(
    (acc, row) => acc + Number(row.valor_total || 0),
    0,
  )

  const totalComprasPagas = parcelasCompras
    .filter(
      (p) =>
        p.status === 'pago' &&
        p.data_pagamento &&
        dataNoPeriodo(p.data_pagamento, filtros),
    )
    .reduce((acc, row) => acc + Number(row.valor || 0), 0)

  const totalComprasPendentes = parcelasCompras
    .filter((p) => p.status === 'pendente')
    .reduce((acc, row) => acc + Number(row.valor || 0), 0)

  const totalVendas = vendas.reduce(
    (acc, row) => acc + Number(row.valor_total || 0),
    0,
  )

  const totalCustos = custos.reduce(
    (acc, row) => acc + Number(row.valor || 0),
    0,
  )

  const vendasFinalizadas = vendas.filter(
    (v) => v.movimentacao_status === 'finalizado',
  ).length

  let entradasKg = 0
  let saidasKg = 0

  for (const mov of movimentacoesEstoque) {
    const peso = pesoMovimentacaoEstoque(mov)

    if (mov.tipo_movimentacao === 1) {
      entradasKg += peso
    } else {
      saidasKg += peso
    }
  }

  const vendasPorCorte = Object.values(
    vendas.reduce<Record<string, RankingCorte>>((acc, row) => {
      for (const item of row.itens || []) {
        const corte = item.tipo_corte || 'Sem corte'

        if (!acc[corte]) {
          acc[corte] = { corte, peso: 0, total: 0 }
        }

        acc[corte].peso += Number(item.peso_total_kg || 0)
        acc[corte].total += Number(item.valor_total || 0)
      }

      return acc
    }, {}),
  ).sort((a, b) => b.total - a.total)

  return {
    filtros,
    kpis: {
      totalCompras,
      totalComprasPagas,
      totalComprasPendentes,
      qtdCompras: compras.length,
      totalVendas,
      qtdVendas: vendas.length,
      vendasFinalizadas,
      vendasPendentes: vendas.length - vendasFinalizadas,
      totalCustos,
      estoqueLiquidoKg: estoque.reduce(
        (acc, row) => acc + Number(row.saldo_liquido_kg || 0),
        0,
      ),
      entradasKg,
      saidasKg,
      resultadoEstimado: totalVendas - totalCompras - totalCustos,
    },
    serieFinanceira: montarSerieFinanceira(
      compras,
      parcelasCompras,
      vendas,
      filtros,
    ),
    comprasPorFornecedor: somarPorCampo(
      compras,
      (r) => r.fornecedor?.nome || 'Sem fornecedor',
      (r) => Number(r.valor_total || 0),
    ),
    vendasPorCliente: somarPorCampo(
      vendas,
      (r) => r.cliente?.nome || 'Sem cliente',
      (r) => Number(r.valor_total || 0),
    ),
    vendasPorCorte,
    custosPorCategoria: somarPorCampo(
      custos,
      (r) => r.categoria || 'Outros',
      (r) => Number(r.valor || 0),
    ),
    estoquePorCorte: estoque
      .map((row) => ({
        corte: row.corte || 'Sem corte',
        saldoKg: Number(row.saldo_liquido_kg || 0),
      }))
      .sort((a, b) => b.saldoKg - a.saldoKg),
    comprasRecentes: compras.slice(0, 10),
    vendasRecentes: vendas.slice(0, 10),
  }
}

// ─── API pública ──────────────────────────────────────────────

export function getDefaultPeriod(): RelatorioFiltros {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)

  return {
    startDate: start.toISOString().split('T')[0],
    endDate: now.toISOString().split('T')[0],
  }
}

export const relatoriosService = {
  /**
   * Único ponto de entrada: busca tudo no banco em paralelo
   * e devolve o relatório já consolidado.
   */
  async buscar(filtros: RelatorioFiltros): Promise<RelatorioDados> {
    const empresaId = getEmpresaId()
    const raw = await buscarDadosBrutos(empresaId, filtros)

    return montarRelatorio(filtros, raw)
  },

  /** @deprecated Use buscar() */
  async getResumoCompleto(filtros: RelatorioFiltros) {
    return this.buscar(filtros)
  },
}
