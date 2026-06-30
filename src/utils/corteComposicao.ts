import {
  PECAS_POR_LADO_CASADO,
  CORTES_PECA_SIMPLES,
  CORTE_BD,
  CORTE_VACA_CASADA,
  CORTE_VACA_CASADA_LEGADO,
} from '@/constants/cortes'
import { parseCurrencyInput, parseDecimalInput, parseIntegerInput } from '@/utils/masks'

export type ComposicaoItem = {
  tipo_corte: string
  peso_kg: number | string
}

export function isCorteBanda(tipo: string) {
  const t = (tipo || '').toLowerCase()
  return t.includes('banda') || t === 'bd' || t.includes('bd (')
}

/** Nome padronizado para exibição (inclui registros legados). */
export function labelCorteExibicao(tipo: string) {
  const normalizado = (tipo || '').trim()
  if (isCorteBanda(normalizado)) return CORTE_BD
  if (
    normalizado === CORTE_VACA_CASADA_LEGADO ||
    normalizado.toLowerCase() === 'vaca casado'
  ) {
    return CORTE_VACA_CASADA
  }
  return normalizado
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

export function isCortePecaSimples(tipo: string) {
  if (
    isCorteBanda(tipo) ||
    isCorteCasado(tipo) ||
    isVisceraCorte(tipo) ||
    isRetalhoCorte(tipo)
  ) {
    return false
  }

  const normalizado = (tipo || '').trim().toLowerCase()
  return CORTES_PECA_SIMPLES.some(
    (corte) => corte.toLowerCase() === normalizado,
  )
}

export function pesoRetalhoItem(item: {
  tipo_corte?: string
  peso_total_kg?: number | string
  composicoes?: ComposicaoItem[]
}) {
  if (!isRetalhoCorte(item.tipo_corte || '')) return 0

  const fromComps = pesoTotalComposicao(item.composicoes)
  if (fromComps > 0) return fromComps

  return parseDecimalInput(String(item.peso_total_kg ?? ''))
}

export function qtdAnimaisRetalhoItem(item: {
  qtd_animais_abate?: number | string | null
  peso_total_kg?: number | string
  composicoes?: ComposicaoItem[]
}) {
  const fromCol = parseIntegerInput(String(item.qtd_animais_abate ?? ''))
  if (fromCol > 0) return fromCol
  return 0
}

export function mediaRetalhoKgPorAnimal(peso: number, animais: number) {
  if (animais <= 0 || peso <= 0) return 0
  return peso / animais
}

export function formatMediaRetalhoLabel(peso: number, animais: number) {
  const media = mediaRetalhoKgPorAnimal(peso, animais)
  if (media <= 0) return ''
  return `${media.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} kg/animal`
}

export function formatResumoRetalho(item: {
  tipo_corte?: string
  peso_total_kg?: number | string
  qtd_animais_abate?: number | string | null
  composicoes?: ComposicaoItem[]
}) {
  const peso = pesoRetalhoItem(item)
  const animais = qtdAnimaisRetalhoItem(item)
  const partes: string[] = ['Retalho']

  if (animais > 0) {
    partes.push(`${animais} animal${animais !== 1 ? 'is' : ''}`)
  }
  if (peso > 0) {
    partes.push(`${peso.toFixed(2)} kg`)
  }

  const media = formatMediaRetalhoLabel(peso, animais)
  if (media) partes.push(`média ${media}`)

  return partes.join(' · ')
}

export function formatLinhasRetalhoExtrato(item: {
  tipo_corte?: string
  peso_total_kg?: number | string
  qtd_animais_abate?: number | string | null
  composicoes?: ComposicaoItem[]
}) {
  const animais = qtdAnimaisRetalhoItem(item)
  const peso = pesoRetalhoItem(item)
  const linhas: string[] = []

  if (animais > 0) {
    linhas.push(`${animais} animal${animais !== 1 ? 'is' : ''} abatido${animais !== 1 ? 's' : ''}`)
  }
  if (peso > 0) {
    linhas.push(
      `Peso: ${peso.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} kg`,
    )
  }

  const media = formatMediaRetalhoLabel(peso, animais)
  if (media) linhas.push(`Média: ${media}`)

  if (!linhas.length && item.composicoes?.length) {
    return formatLinhasComposicaoExtrato(item.composicoes)
  }

  return linhas
}

export type RetalhoResumoPeriodo = {
  animais: number
  peso: number
  valor: number
  porDia: Array<{ data: string; animais: number; peso: number; media: number }>
}

export function calcularRetalhoResumoPeriodo(
  movimentacoes: Array<{ data_movimentacao: string; itens?: any[] }>,
): RetalhoResumoPeriodo | null {
  let animais = 0
  let peso = 0
  let valor = 0
  const porDiaMap: Record<string, { animais: number; peso: number }> = {}

  for (const mov of movimentacoes) {
    for (const item of mov.itens || []) {
      if (!isRetalhoCorte(item.tipo_corte || '')) continue

      const itemAnimais = qtdAnimaisRetalhoItem(item)
      const itemPeso = pesoRetalhoItem(item)
      animais += itemAnimais
      peso += itemPeso
      valor += Number(item.valor_total ?? 0)

      const data = String(
        item.data_movimentacao || mov.data_movimentacao || '',
      ).slice(0, 10)

      if (data && (itemAnimais > 0 || itemPeso > 0)) {
        if (!porDiaMap[data]) porDiaMap[data] = { animais: 0, peso: 0 }
        porDiaMap[data].animais += itemAnimais
        porDiaMap[data].peso += itemPeso
      }
    }
  }

  if (peso <= 0 && animais <= 0 && valor <= 0) return null

  return {
    animais,
    peso,
    valor,
    porDia: Object.entries(porDiaMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([data, d]) => ({
        data,
        animais: d.animais,
        peso: d.peso,
        media: mediaRetalhoKgPorAnimal(d.peso, d.animais),
      })),
  }
}
export function hydrateRetalhoParaForm(item: {
  tipo_corte?: string
  peso_total_kg?: number | string
  qtd_animais_abate?: number | string | null
  composicoes?: ComposicaoItem[]
}) {
  if (!isRetalhoCorte(item.tipo_corte || '')) return item

  const comps = item.composicoes || []
  const pesoFromComps = pesoTotalComposicao(comps)
  const qtdAnimais = qtdAnimaisRetalhoItem(item)

  if (qtdAnimais > 0 || pesoFromComps <= 0) {
    return {
      ...item,
      qtd_animais_abate:
        qtdAnimais > 0 ? String(qtdAnimais) : String(item.qtd_animais_abate ?? ''),
      peso_total_kg: String(item.peso_total_kg ?? ''),
      composicoes: [],
    }
  }

  return {
    ...item,
    qtd_animais_abate: '',
    peso_total_kg: String(pesoFromComps),
    composicoes: [],
  }
}

export function isCorteComComposicao(tipo: string) {
  return isCorteBanda(tipo) || isCorteCasado(tipo) || isCortePecaSimples(tipo)
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

export function buildComposicoesPecasVazia(tipoCorte: string): ComposicaoItem[] {
  return syncComposicoesPecas(0, tipoCorte, [])
}

/**
 * Gera N peças do mesmo corte, preservando pesos já digitados.
 */
export function syncComposicoesPecas(
  quantidade: number,
  tipoCorte: string,
  composicoes: ComposicaoItem[] = [],
): ComposicaoItem[] {
  const qty = Math.max(0, quantidade)
  if (qty === 0) return []

  const baseName = (tipoCorte || 'Peça').trim()
  const pesosExistentes = composicoes.map((c) => c.peso_kg ?? '')

  const result: ComposicaoItem[] = []

  for (let i = 0; i < qty; i++) {
    result.push({
      tipo_corte: `${baseName} ${i + 1}`,
      peso_kg: pesosExistentes[i] ?? '',
    })
  }

  return result
}

export function formatResumoPecas(
  quantidade: number,
  tipoCorte: string,
  composicoes: ComposicaoItem[] = [],
) {
  const nome = (tipoCorte || 'Peça').trim()
  const nomeLower = nome.toLowerCase()
  let resumo = `${quantidade} ${nomeLower}${quantidade !== 1 ? 's' : ''}`

  const peso = pesoTotalComposicao(composicoes)
  if (peso > 0) {
    resumo += ` · ${peso.toFixed(2)} kg`
  }

  return resumo
}

/** Converte venda legada (peso total sem composições) para o formulário por peça. */
export function hydratePecaSimplesParaForm(item: {
  tipo_corte?: string
  peso_total_kg?: number | string
  composicoes?: ComposicaoItem[]
}) {
  if (!isCortePecaSimples(item.tipo_corte || '')) return item

  const comps = item.composicoes || []
  if (comps.length > 0) {
    const qty =
      parseIntegerInput(String(item.peso_total_kg ?? '')) || comps.length

    return {
      ...item,
      peso_total_kg: qty > 0 ? String(qty) : '',
      composicoes: syncComposicoesPecas(qty, item.tipo_corte || '', comps),
    }
  }

  const peso = parseDecimalInput(String(item.peso_total_kg ?? ''))
  if (peso <= 0) {
    return {
      ...item,
      peso_total_kg: '',
      composicoes: buildComposicoesPecasVazia(item.tipo_corte || ''),
    }
  }

  return {
    ...item,
    peso_total_kg: '1',
    composicoes: syncComposicoesPecas(1, item.tipo_corte || '', [
      { tipo_corte: `${item.tipo_corte} 1`, peso_kg: String(peso) },
    ]),
  }
}

export function pesoTotalItemMovimentacao(item: {
  tipo_corte?: string
  peso_total_kg?: number | string
  qtd_animais_abate?: number | string | null
  composicoes?: ComposicaoItem[]
}) {
  if (isRetalhoCorte(item.tipo_corte || '')) {
    return pesoRetalhoItem(item)
  }

  if (isCorteComComposicao(item.tipo_corte || '')) {
    const fromComps = pesoTotalComposicao(item.composicoes)
    if (fromComps > 0) return fromComps
  }

  if (isVisceraCorte(item.tipo_corte || '')) {
    return parseIntegerInput(String(item.peso_total_kg ?? ''))
  }

  return parseDecimalInput(String(item.peso_total_kg ?? ''))
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

/** Composições com peso informado (> 0). */
export function composicoesComPeso(composicoes: ComposicaoItem[] = []) {
  return composicoes.filter((c) => parseKg(c.peso_kg) > 0)
}

/** Linhas "Peça N: XX,XX kg" para extrato/PDF (banda, casado, traseiro, etc.). */
export function formatLinhasComposicaoExtrato(composicoes: ComposicaoItem[] = []) {
  return composicoesComPeso(composicoes).map(
    (c) =>
      `${c.tipo_corte}: ${parseKg(c.peso_kg).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} kg`,
  )
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
  if (isCortePecaSimples(tipo)) return 'Quantidade de peças'
  return 'Peso (kg)'
}

export function labelValorUnitarioCorte(tipo: string) {
  if (isVisceraCorte(tipo)) return 'Valor por unidade'
  return 'Valor por KG'
}

export function corteUsesQuantidade(tipo: string) {
  return (
    isCorteCasado(tipo) ||
    isCorteBanda(tipo) ||
    isVisceraCorte(tipo) ||
    isCortePecaSimples(tipo)
  )
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
