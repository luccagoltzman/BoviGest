import { PECAS_POR_LADO_CASADO } from '@/constants/cortes'
import { parseCurrencyInput, parseDecimalInput, parseIntegerInput } from '@/utils/masks'

export type ComposicaoItem = {
  tipo_corte: string
  peso_kg: number | string
}

export function isCorteBanda(tipo: string) {
  const t = (tipo || '').toLowerCase()
  return t.includes('banda') || t.includes('bd')
}

export function isCorteCasado(tipo: string) {
  return (tipo || '').toLowerCase().includes('casad')
}

export function isVisceraCorte(tipo: string) {
  const t = (tipo || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
  return t === 'visceras' || t === 'viscera' || t.includes('viscera')
}

export function isRetalhoCorte(tipo: string) {
  const t = (tipo || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
  return t === 'retalho' || t.includes('retalho')
}

export function isCorteComComposicao(tipo: string) {
  return isCorteBanda(tipo) || isCorteCasado(tipo)
}

/** 5 casados → 10 dianteiros + 10 traseiros */
export function pecasPorLadoFromCasados(quantidadeCasados: number) {
  return Math.max(0, quantidadeCasados) * PECAS_POR_LADO_CASADO
}

/** Composição vazia — preenchida ao informar a quantidade de casados */
export function buildComposicoesCasadoVazia(): ComposicaoItem[] {
  return syncComposicoesCasado(0, [])
}

/**
 * Gera 2×N dianteiros + 2×N traseiros (N = casados), preservando pesos já digitados.
 */
export function syncComposicoesCasado(
  quantidadeCasados: number,
  composicoes: ComposicaoItem[] = [],
): ComposicaoItem[] {
  const pecasPorLado = pecasPorLadoFromCasados(quantidadeCasados)
  if (pecasPorLado === 0) return []

  const pesosDiant = composicoes
    .filter((c) => c.tipo_corte.toLowerCase().includes('diant'))
    .map((c) => c.peso_kg ?? '')
  const pesosTras = composicoes
    .filter((c) => c.tipo_corte.toLowerCase().includes('tras'))
    .map((c) => c.peso_kg ?? '')

  const result: ComposicaoItem[] = []

  for (let i = 0; i < pecasPorLado; i++) {
    result.push({
      tipo_corte: `Dianteiro ${i + 1}`,
      peso_kg: pesosDiant[i] ?? '',
    })
  }

  for (let i = 0; i < pecasPorLado; i++) {
    result.push({
      tipo_corte: `Traseiro ${i + 1}`,
      peso_kg: pesosTras[i] ?? '',
    })
  }

  return result
}

export function normalizeCorteEstoque(tipoCorte: string) {
  const t = (tipoCorte || '').toLowerCase()
  if (t.includes('diant')) return 'Dianteiro'
  if (t.includes('tras')) return 'Traseiro'
  return tipoCorte
}

export function buildComposicoesBandaVazia(): ComposicaoItem[] {
  return syncComposicoesBanda(0, [])
}

/**
 * Gera N dianteiros + N traseiros (1 par por banda), preservando pesos já digitados.
 */
export function syncComposicoesBanda(
  quantidadeBandias: number,
  composicoes: ComposicaoItem[] = [],
): ComposicaoItem[] {
  const qty = Math.max(0, quantidadeBandias)
  if (qty === 0) return []

  const hasNumbered = composicoes.some((c) => /\d/.test(c.tipo_corte))

  let pesosDiant: ComposicaoItem['peso_kg'][] = []
  let pesosTras: ComposicaoItem['peso_kg'][] = []

  if (hasNumbered) {
    pesosDiant = composicoes
      .filter((c) => c.tipo_corte.toLowerCase().includes('diant'))
      .map((c) => c.peso_kg ?? '')
    pesosTras = composicoes
      .filter((c) => c.tipo_corte.toLowerCase().includes('tras'))
      .map((c) => c.peso_kg ?? '')
  } else if (composicoes.length) {
    const d = composicoes.find((c) =>
      c.tipo_corte.toLowerCase().includes('diant'),
    )
    const t = composicoes.find((c) =>
      c.tipo_corte.toLowerCase().includes('tras'),
    )
    pesosDiant = [d?.peso_kg ?? '']
    pesosTras = [t?.peso_kg ?? '']
  }

  const result: ComposicaoItem[] = []

  for (let i = 0; i < qty; i++) {
    result.push({
      tipo_corte: `Dianteiro ${i + 1}`,
      peso_kg: pesosDiant[i] ?? '',
    })
  }

  for (let i = 0; i < qty; i++) {
    result.push({
      tipo_corte: `Traseiro ${i + 1}`,
      peso_kg: pesosTras[i] ?? '',
    })
  }

  return result
}

export function formatResumoBanda(
  quantidadeBandias: number,
  composicoes: ComposicaoItem[] = [],
) {
  let resumo = `${quantidadeBandias} banda${quantidadeBandias !== 1 ? 's' : ''}`

  const { dianteiro, traseiro } = getComposicaoResumo(composicoes)
  if (dianteiro > 0 || traseiro > 0) {
    resumo += ` · ${dianteiro.toFixed(2)} kg diant. + ${traseiro.toFixed(2)} kg tras.`
  }

  return resumo
}

export function indiceComposicaoBanda(
  quantidadeBandias: number,
  bandaIndex: number,
  lado: 'dianteiro' | 'traseiro',
) {
  if (lado === 'dianteiro') return bandaIndex
  return quantidadeBandias + bandaIndex
}

function parseKg(value: number | string) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  return parseDecimalInput(String(value))
}

export function getComposicaoResumo(composicoes: ComposicaoItem[] = []) {
  const dianteiro = composicoes
    .filter((c) => c.tipo_corte.toLowerCase().includes('diant'))
    .reduce((acc, c) => acc + parseKg(c.peso_kg), 0)
  const traseiro = composicoes
    .filter((c) => c.tipo_corte.toLowerCase().includes('tras'))
    .reduce((acc, c) => acc + parseKg(c.peso_kg), 0)

  return { dianteiro, traseiro }
}

/** Soma o peso (kg) de todas as peças da composição */
export function pesoTotalComposicao(composicoes: ComposicaoItem[] = []) {
  return composicoes.reduce((acc, c) => acc + parseKg(c.peso_kg), 0)
}

export function formatResumoCasado(
  quantidadeCasados: number,
  composicoes: ComposicaoItem[] = [],
  _tipoCasado?: string,
) {
  const pecas = pecasPorLadoFromCasados(quantidadeCasados)
  let resumo = `${quantidadeCasados} un. · ${pecas} diant. + ${pecas} tras.`

  const { dianteiro, traseiro } = getComposicaoResumo(composicoes)
  if (dianteiro > 0 || traseiro > 0) {
    resumo += ` · ${dianteiro.toFixed(2)} kg diant. + ${traseiro.toFixed(2)} kg tras.`
  }

  return resumo
}

export function labelQuantidadeCorte(tipo: string) {
  if (isCorteCasado(tipo)) return 'Quantidade'
  if (isCorteBanda(tipo)) return 'Quantidade de bandas'
  if (isVisceraCorte(tipo)) return 'Unidades'
  return 'Peso (kg)'
}

export function labelValorUnitarioCorte(tipo: string) {
  if (isVisceraCorte(tipo)) return 'Valor por unidade'
  return 'Valor por KG'
}

export function corteUsesQuantidade(tipo: string) {
  return isCorteCasado(tipo) || isCorteBanda(tipo) || isVisceraCorte(tipo)
}

export function calcularValorTotalViscera(
  quantidade: unknown,
  valorUnidade: unknown,
) {
  const qty =
    typeof quantidade === 'number'
      ? quantidade
      : parseIntegerInput(String(quantidade ?? ''))
  const valor =
    typeof valorUnidade === 'number'
      ? valorUnidade
      : parseCurrencyInput(String(valorUnidade ?? '')) ||
        parseDecimalInput(String(valorUnidade ?? ''))

  return qty * valor
}

export function normalizeTipoCorte(tipo: string) {
  return tipo
}
