import { calcularAbate, type TipoCobrancaAbate } from '@/utils/abateCalc'

export type AbateRelatorioRaw = {
  id: number
  data_abate: string
  lote?: string | null
  tipo_animal?: string | null
  tipo_cobranca?: TipoCobrancaAbate
  qtd_animais: number
  peso_bruto_kg: number
  peso_liquido_kg: number
  valor_unitario: number
  valor_total: number
  couro_deixado: number
  desconto_por_couro: number
  desconto_total: number
  taxas: number
  peso_retalho_kg?: number
  romaneio?:
    | {
        data_romaneio?: string | null
        fornecedor_nome?: string | null
        fornecedor?: { nome?: string | null } | null
      }
    | {
        data_romaneio?: string | null
        fornecedor_nome?: string | null
        fornecedor?: { nome?: string | null } | null
      }[]
    | null
}

export type AbateRelatorioLinha = {
  id: number
  dataAbate: string
  dataRomaneio: string | null
  lote: string
  fornecedor: string
  tipoAnimal: string
  qtdAnimais: number
  pesoVivoKg: number
  pesoCarcacaKg: number
  rendimento: number
  valorUnitario: number
  valorBase: number
  taxas: number
  couroDeixadoKg: number
  descontoPorCouro: number
  descontoTotal: number
  valorTotalPago: number
  pesoRetalhoKg: number
}

export type AbateRelatorioResumo = {
  qtdAbates: number
  qtdAnimais: number
  couroDeixadoKg: number
  descontoTotal: number
  valorBase: number
  taxas: number
  valorTotalPago: number
  pesoRetalhoKg: number
}

function resolverRomaneio(raw: AbateRelatorioRaw) {
  const romaneio = Array.isArray(raw.romaneio)
    ? raw.romaneio[0]
    : raw.romaneio

  const fornecedor =
    romaneio?.fornecedor?.nome?.trim() ||
    romaneio?.fornecedor_nome?.trim() ||
    null

  return {
    fornecedor,
    dataRomaneio: romaneio?.data_romaneio?.slice(0, 10) || null,
  }
}

export function montarLinhasRelatorioAbate(
  registros: AbateRelatorioRaw[],
): AbateRelatorioLinha[] {
  return registros.map((row) => {
    const tipoCobranca = (row.tipo_cobranca ?? 1) as TipoCobrancaAbate
    const calc = calcularAbate({
      tipo_cobranca: tipoCobranca,
      qtd_animais: Number(row.qtd_animais || 0),
      peso_bruto_kg: Number(row.peso_bruto_kg || 0),
      peso_liquido_kg: Number(row.peso_liquido_kg || 0),
      valor_unitario: Number(row.valor_unitario || 0),
      couro_deixado: Number(row.couro_deixado || 0),
      desconto_por_couro: Number(row.desconto_por_couro || 0),
      taxas: Number(row.taxas || 0),
    })

    const romaneio = resolverRomaneio(row)

    return {
      id: row.id,
      dataAbate: row.data_abate?.slice(0, 10) || '',
      dataRomaneio: romaneio.dataRomaneio,
      lote: row.lote?.trim() || '—',
      fornecedor: romaneio.fornecedor || '—',
      tipoAnimal: row.tipo_animal?.trim() || '—',
      qtdAnimais: Number(row.qtd_animais || 0),
      pesoVivoKg: Number(row.peso_bruto_kg || 0),
      pesoCarcacaKg: Number(row.peso_liquido_kg || 0),
      rendimento: calc.rendimento,
      valorUnitario: Number(row.valor_unitario || 0),
      valorBase: calc.valor_base,
      taxas: Number(row.taxas || 0),
      couroDeixadoKg: Number(row.couro_deixado || 0),
      descontoPorCouro: Number(row.desconto_por_couro || 0),
      descontoTotal: Number(row.desconto_total ?? calc.desconto_total),
      valorTotalPago: Number(row.valor_total ?? calc.valor_total),
      pesoRetalhoKg: Number(row.peso_retalho_kg || 0),
    }
  })
}

export function resumirRelatorioAbate(
  linhas: AbateRelatorioLinha[],
): AbateRelatorioResumo {
  return linhas.reduce(
    (acc, linha) => ({
      qtdAbates: acc.qtdAbates + 1,
      qtdAnimais: acc.qtdAnimais + linha.qtdAnimais,
      couroDeixadoKg: acc.couroDeixadoKg + linha.couroDeixadoKg,
      descontoTotal: acc.descontoTotal + linha.descontoTotal,
      valorBase: acc.valorBase + linha.valorBase,
      taxas: acc.taxas + linha.taxas,
      valorTotalPago: acc.valorTotalPago + linha.valorTotalPago,
      pesoRetalhoKg: acc.pesoRetalhoKg + linha.pesoRetalhoKg,
    }),
    {
      qtdAbates: 0,
      qtdAnimais: 0,
      couroDeixadoKg: 0,
      descontoTotal: 0,
      valorBase: 0,
      taxas: 0,
      valorTotalPago: 0,
      pesoRetalhoKg: 0,
    },
  )
}

export function formatDateBr(value: string) {
  if (!value) return '—'
  return new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR')
}

export function formatCurrencyBr(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatKgBr(value: number) {
  return `${Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} kg`
}

export function formatPercentBr(value: number) {
  return `${Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`
}
