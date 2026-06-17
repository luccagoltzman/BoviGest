import { CORTE_BD, CORTE_RETALHO } from '@/constants/cortes'
import { estoqueService } from '@/services/estoque.service'

function round2(value: number) {
  return Math.round(value * 100) / 100
}

/** Quantidade de vísceras gerada por abate (1 por animal). */
export function gerarQuantidadeViscerasPorAbate(qtdAnimais: number) {
  return Math.max(0, Math.floor(Number(qtdAnimais) || 0))
}

export function viscerasDefaultValuesPorAbate(
  qtdAnimais: number,
  lote?: string,
) {
  const quantidade = gerarQuantidadeViscerasPorAbate(qtdAnimais)
  const loteLabel = lote?.trim()

  return {
    tipo: 1,
    quantidade,
    observacao: loteLabel
      ? `Entrada automática — abate (${loteLabel})`
      : 'Entrada automática — abate',
  }
}

/**
 * Gera um único item BD para o ProcessamentoModal:
 * quantidade total = qtd_animais × 2; pesos de dianteiro/traseiro editáveis pelo usuário.
 */
export function gerarItemBandaModalAbate(
  qtdAnimais: number,
  pesoCarcacaKg: number,
) {
  const qtdPecas = Math.max(0, Math.floor(Number(qtdAnimais) || 0) * 2)
  if (qtdPecas === 0) return []

  const pesoTotal = Number(pesoCarcacaKg) > 0 ? Number(pesoCarcacaKg) : 0
  const metade = pesoTotal > 0 ? round2(pesoTotal / 2) : 0

  return [
    {
      corte: CORTE_BD,
      peso_liquido_kg: pesoTotal > 0 ? String(pesoTotal) : '',
      quantidade_pecas: String(qtdPecas),
      tipo_movimentacao: '1',
      agrupamento_id: crypto.randomUUID(),
      composicoes: [
        { tipo_corte: 'Dianteiro', peso_kg: metade > 0 ? String(metade) : '' },
        { tipo_corte: 'Traseiro', peso_kg: metade > 0 ? String(metade) : '' },
      ],
    },
  ]
}

export async function criarEntradaRetalhoPorAbate(
  abateId: number,
  params: {
    data_abate: string
    lote: string
    peso_retalho_kg: number
  },
) {
  const peso = round2(Number(params.peso_retalho_kg) || 0)
  if (peso <= 0) return

  const lote = params.lote.trim() || `abate-${params.data_abate}`

  const mov = await estoqueService.createMovimentacao({
    lote,
    tipo_movimentacao: 1,
    data_movimentacao: params.data_abate,
    observacoes: 'Entrada automática — retalho do abate',
    peso_bruto_kg: peso,
    peso_liquido_kg: peso,
    referencia_abate_id: abateId,
  })

  await estoqueService.createMovimentacaoItem([
    {
      movimentacao_id: mov.id,
      corte: CORTE_RETALHO,
      peso_bruto_kg: peso,
      peso_liquido_kg: peso,
      quantidade_pecas: 1,
    },
  ])
}
