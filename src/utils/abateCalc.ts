/** 0 = por kg de carcaça | 1 = por animal */
export type TipoCobrancaAbate = 0 | 1

export interface AbateCalcInput {
  tipo_cobranca: TipoCobrancaAbate
  qtd_animais: number
  /** Peso vivo (kg) */
  peso_bruto_kg: number
  /** Peso de carcaça quente (kg) */
  peso_liquido_kg: number
  valor_unitario: number
  couro_deixado: number
  desconto_por_couro: number
  taxas: number
}

export interface AbateCalcResult {
  rendimento: number
  desconto_total: number
  valor_base: number
  valor_total: number
}

export function calcularAbate(input: AbateCalcInput): AbateCalcResult {
  const pesoVivo = Number(input.peso_bruto_kg) || 0
  const pesoCarcaca = Number(input.peso_liquido_kg) || 0
  const qtdAnimais = Number(input.qtd_animais) || 0
  const valorUnitario = Number(input.valor_unitario) || 0
  const couroDeixado = Number(input.couro_deixado) || 0
  const descontoPorCouro = Number(input.desconto_por_couro) || 0
  const taxas = Number(input.taxas) || 0

  const rendimento =
    pesoVivo > 0 ? (pesoCarcaca / pesoVivo) * 100 : 0

  const desconto_total = couroDeixado * descontoPorCouro

  const valor_base =
    input.tipo_cobranca === 0
      ? pesoCarcaca * valorUnitario
      : qtdAnimais * valorUnitario

  const valor_total = valor_base + taxas - desconto_total

  return {
    rendimento,
    desconto_total,
    valor_base,
    valor_total,
  }
}

export function tipoCobrancaLabel(tipo: TipoCobrancaAbate) {
  return tipo === 0 ? 'Por kg (carcaça)' : 'Por animal'
}

export function valorUnitarioLabel(tipo: TipoCobrancaAbate) {
  return tipo === 0 ? 'Valor por kg de carcaça (R$)' : 'Valor por animal (R$)'
}

export function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export function formatKg(value: number) {
  return `${Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} kg`
}

export function formatPercent(value: number) {
  return `${Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`
}
