import {
  CORTE_CASADO,
  PECAS_POR_LADO_CASADO,
} from '@/constants/cortes'

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
  return (tipo || '').toLowerCase() === 'visceras'
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
  return [
    { tipo_corte: 'Dianteiro', peso_kg: '' },
    { tipo_corte: 'Traseiro', peso_kg: '' },
  ]
}

export function getComposicaoResumo(composicoes: ComposicaoItem[] = []) {
  const dianteiro = composicoes
    .filter((c) => c.tipo_corte.toLowerCase().includes('diant'))
    .reduce((acc, c) => acc + Number(c.peso_kg || 0), 0)
  const traseiro = composicoes
    .filter((c) => c.tipo_corte.toLowerCase().includes('tras'))
    .reduce((acc, c) => acc + Number(c.peso_kg || 0), 0)

  return { dianteiro, traseiro }
}

/** Soma o peso (kg) de todas as peças da composição */
export function pesoTotalComposicao(composicoes: ComposicaoItem[] = []) {
  return composicoes.reduce((acc, c) => acc + Number(c.peso_kg || 0), 0)
}

export function formatResumoCasado(
  quantidadeCasados: number,
  composicoes: ComposicaoItem[] = [],
) {
  const pecas = pecasPorLadoFromCasados(quantidadeCasados)
  let resumo = `${quantidadeCasados} casado${quantidadeCasados !== 1 ? 's' : ''} · ${pecas} diant. + ${pecas} tras.`

  const { dianteiro, traseiro } = getComposicaoResumo(composicoes)
  const pesoTotal = dianteiro + traseiro
  if (dianteiro > 0 || traseiro > 0) {
    resumo += ` · ${dianteiro.toFixed(2)} kg diant. + ${traseiro.toFixed(2)} kg tras.`
    if (pesoTotal > 0) {
      resumo += ` (${pesoTotal.toFixed(2)} kg total)`
    }
  }

  return resumo
}

export function labelQuantidadeCorte(tipo: string) {
  if (isCorteCasado(tipo)) return 'Quantidade de casados'
  if (isVisceraCorte(tipo)) return 'Total de unidades'
  if (isCorteBanda(tipo)) return null
  return 'Peso total KG'
}

export function labelValorUnitarioCorte(tipo: string) {
  if (isVisceraCorte(tipo)) return 'Valor por unidade'
  return 'Valor por KG'
}

export function corteUsesQuantidade(tipo: string) {
  return isCorteCasado(tipo) || isVisceraCorte(tipo)
}

export function normalizeTipoCorte(tipo: string) {
  if (isCorteCasado(tipo)) return CORTE_CASADO
  return tipo
}
