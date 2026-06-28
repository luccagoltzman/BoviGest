import {
  formatCurrencyFromNumber,
  parseCurrencyInput,
} from '@/utils/masks'
import type { ContaPagamentoData } from '@/utils/contaPagamento'
import {
  emptyContaPagamento,
  type PagadorTipo,
} from '@/utils/contaPagamento'

export type CompraParcelaGerada = {
  numero_parcela: number
  total_parcelas: number
  valor: number
  data_vencimento: string
  data_pagamento: string | null
  forma_pagamento: string
  status: 'pendente' | 'pago'
}

export type ParcelaDraft = {
  valor: string
  data: string
  pago: boolean
  formaPagamento?: string
  pagadorTipo?: PagadorTipo
  contaOrigem?: ContaPagamentoData
}

export type CompraParcelaConfig = {
  parcelas: ParcelaDraft[]
  /** Fallback legado quando a parcela não informa forma */
  formaPagamento?: string
  contaPagamento?: ContaPagamentoData
}

function addDays(isoDate: string, days: number) {
  const [y, m, d] = isoDate.slice(0, 10).split('-').map(Number)
  const date = new Date(y, m - 1, d + days, 12, 0, 0)
  const ny = date.getFullYear()
  const nm = String(date.getMonth() + 1).padStart(2, '0')
  const nd = String(date.getDate()).padStart(2, '0')
  return `${ny}-${nm}-${nd}`
}

export function sugerirDatasParcelas(dataBase: string, qtd: number) {
  const base = dataBase.slice(0, 10)
  if (!base || qtd <= 0) return []

  return Array.from({ length: qtd }, (_, index) => addDays(base, index))
}

export function sugerirValoresParcelas(valorTotal: number, qtd: number) {
  if (valorTotal <= 0 || qtd <= 0) return []

  const valorBase = Math.floor((valorTotal / qtd) * 100) / 100
  const resto = Math.round((valorTotal - valorBase * qtd) * 100) / 100

  return Array.from({ length: qtd }, (_, index) => {
    const extra = index === qtd - 1 ? resto : 0
    const valor = Math.round((valorBase + extra) * 100) / 100
    return formatCurrencyFromNumber(valor)
  })
}

export function criarParcelasDraft(
  qtd: number,
  valorTotal: number,
  dataBase: string,
  anteriores: ParcelaDraft[] = [],
  formaPadrao = 'Pix',
) {
  const datas = sugerirDatasParcelas(dataBase, qtd)
  const valores = sugerirValoresParcelas(valorTotal, qtd)

  return Array.from({ length: qtd }, (_, index) => ({
    valor: anteriores[index]?.valor || valores[index] || '',
    data: anteriores[index]?.data || datas[index] || dataBase.slice(0, 10),
    pago: anteriores[index]?.pago ?? false,
    formaPagamento:
      anteriores[index]?.formaPagamento || formaPadrao,
    pagadorTipo: anteriores[index]?.pagadorTipo ?? 'proprio',
    contaOrigem: anteriores[index]?.contaOrigem ?? emptyContaPagamento(),
  }))
}

/** Resumo para o campo forma_pagamento da compra */
export function formaPagamentoResumoCompra(
  parcelas: ParcelaDraft[],
  fallback = 'Pix',
) {
  const formas = parcelas
    .map((p) => (p.formaPagamento || fallback).trim())
    .filter(Boolean)

  if (!formas.length) return fallback

  const unicas = [...new Set(formas)]
  return unicas.length === 1 ? unicas[0] : 'Variado'
}

export function gerarParcelasCompra(
  config: CompraParcelaConfig,
): CompraParcelaGerada[] {
  const parcelas = config.parcelas.filter((p) => p.valor && p.data)

  if (!parcelas.length) return []

  const qtd = parcelas.length

  return parcelas.map((parcela, index) => {
    const valor = parseCurrencyInput(parcela.valor)
    const data = parcela.data.slice(0, 10)
    const pago = parcela.pago

    return {
      numero_parcela: index + 1,
      total_parcelas: qtd,
      valor,
      data_vencimento: data,
      data_pagamento: pago ? data : null,
      forma_pagamento:
        parcela.formaPagamento || config.formaPagamento || 'Pix',
      status: pago ? 'pago' : 'pendente',
    }
  })
}

export function somaValoresParcelas(parcelas: ParcelaDraft[]) {
  return parcelas.reduce(
    (acc, p) => acc + parseCurrencyInput(p.valor || ''),
    0,
  )
}

export function conferemValoresParcelas(
  parcelas: ParcelaDraft[],
  valorTotal: number,
  tolerancia = 0.02,
) {
  if (!parcelas.length || valorTotal <= 0) return false
  if (!parcelas.every((p) => p.valor && p.data)) return false

  const soma = somaValoresParcelas(parcelas)
  return Math.abs(soma - valorTotal) < tolerancia
}

export function parcelasDraftValidas(parcelas: ParcelaDraft[]) {
  if (!parcelas.length) return false

  return parcelas.every((p) => {
    const valor = parseCurrencyInput(p.valor || '')
    return valor > 0 && Boolean(p.data?.trim())
  })
}

export function somaParcelasExcedeTotal(
  parcelas: ParcelaDraft[],
  valorTotal: number,
  tolerancia = 0.02,
) {
  if (valorTotal <= 0) return false
  return somaValoresParcelas(parcelas) > valorTotal + tolerancia
}

/** Soma das parcelas de 0 até index (inclusive) */
export function calcularRestanteAposParcelas(
  parcelas: ParcelaDraft[],
  ateIndexInclusive: number,
  valorTotal: number,
) {
  const soma = parcelas
    .slice(0, ateIndexInclusive + 1)
    .reduce((acc, p) => acc + parseCurrencyInput(p.valor || ''), 0)

  return Math.round((valorTotal - soma) * 100) / 100
}

/** Valor sugerido para a parcela imediatamente seguinte */
export function valorProximaParcelaSugerida(
  parcelas: ParcelaDraft[],
  indexAtual: number,
  valorTotal: number,
): number | null {
  if (indexAtual >= parcelas.length - 1) return null

  const restante = calcularRestanteAposParcelas(
    parcelas,
    indexAtual,
    valorTotal,
  )
  const qtdRestantes = parcelas.length - indexAtual - 1

  if (qtdRestantes <= 0) return null

  if (qtdRestantes === 1) {
    return Math.max(0, restante)
  }

  const valorBase = Math.floor((restante / qtdRestantes) * 100) / 100
  return Math.max(0, valorBase)
}

/** Preenche automaticamente as parcelas posteriores com o restante dividido */
export function redistribuirParcelasAposIndex(
  parcelas: ParcelaDraft[],
  indexAlterado: number,
  valorTotal: number,
): ParcelaDraft[] {
  const result = parcelas.map((p) => ({ ...p }))
  const restante = calcularRestanteAposParcelas(
    result,
    indexAlterado,
    valorTotal,
  )
  const qtdRestantes = result.length - indexAlterado - 1

  if (qtdRestantes <= 0) return result

  const valores = sugerirValoresParcelas(Math.max(0, restante), qtdRestantes)

  for (let j = 0; j < qtdRestantes; j++) {
    result[indexAlterado + 1 + j] = {
      ...result[indexAlterado + 1 + j],
      valor: valores[j] || '0',
    }
  }

  return result
}

export function resumoPagamentoCompra(
  parcelas: {
    status: string
    valor?: number
    data_pagamento?: string | null
  }[],
) {
  const total = parcelas.length
  const pagas = parcelas.filter((p) => p.status === 'pago')
  const pendentes = parcelas.filter((p) => p.status !== 'pago')

  const valorPago = pagas.reduce((acc, p) => acc + Number(p.valor || 0), 0)
  const valorPendente = pendentes.reduce(
    (acc, p) => acc + Number(p.valor || 0),
    0,
  )

  return {
    quitado: total > 0 && pagas.length === total,
    pagas: pagas.length,
    total,
    valorPago,
    valorPendente,
  }
}

export function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
