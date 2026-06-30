import type { RomaneioItem } from '@/services/romaneios.service'
import { estoqueService } from '@/services/estoque.service'
import { parseDecimalInput } from '@/utils/masks'

export type EstoqueItemEntrada = {
  corte: string
  peso_bruto_kg: number
  peso_liquido_kg: number
  quantidade_pecas: number
  agrupamento_id: string | null
}

function parsePeso(value: unknown) {
  if (value === null || value === undefined || value === '') return 0
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  return parseDecimalInput(String(value))
}

export function romaneioItensParaEstoque(itens: RomaneioItem[]): EstoqueItemEntrada[] {
  const result: EstoqueItemEntrada[] = []

  for (const item of itens) {
    const agrupamentoId = `compra-animal-${item.ordem}`
    const pecas: Array<{ peso: unknown; corte: string }> = [
      { peso: item.dianteiro_1, corte: 'Dianteiro' },
      { peso: item.dianteiro_2, corte: 'Dianteiro' },
      { peso: item.traseiro_1, corte: 'Traseiro' },
      { peso: item.traseiro_2, corte: 'Traseiro' },
    ]

    for (const peca of pecas) {
      const peso = parsePeso(peca.peso)
      if (peso <= 0) continue

      result.push({
        corte: peca.corte,
        peso_bruto_kg: peso,
        peso_liquido_kg: peso,
        quantidade_pecas: 1,
        agrupamento_id: agrupamentoId,
      })
    }
  }

  return result
}

export function pesosSimplesParaEstoque(
  pesoDianteiro: number,
  pesoTraseiro: number,
): EstoqueItemEntrada[] {
  const result: EstoqueItemEntrada[] = []

  if (pesoDianteiro > 0) {
    result.push({
      corte: 'Dianteiro',
      peso_bruto_kg: pesoDianteiro,
      peso_liquido_kg: pesoDianteiro,
      quantidade_pecas: 1,
      agrupamento_id: null,
    })
  }

  if (pesoTraseiro > 0) {
    result.push({
      corte: 'Traseiro',
      peso_bruto_kg: pesoTraseiro,
      peso_liquido_kg: pesoTraseiro,
      quantidade_pecas: 1,
      agrupamento_id: null,
    })
  }

  return result
}

export function somarPesoItensEstoque(itens: EstoqueItemEntrada[]) {
  return itens.reduce((acc, item) => acc + Number(item.peso_liquido_kg || 0), 0)
}

export async function criarEntradaEstoqueCompra(params: {
  compraId: number
  lote: string
  dataMovimentacao: string
  itens: EstoqueItemEntrada[]
  observacao?: string
}) {
  if (!params.itens.length) {
    throw new Error('Informe ao menos um peso para registrar a entrada')
  }

  const existente = await estoqueService.getByReferenciaCompra(params.compraId)
  if (existente) {
    await estoqueService.deleteByReferenciaCompra(params.compraId)
  }

  const pesoTotal = somarPesoItensEstoque(params.itens)

  const mov = await estoqueService.createMovimentacao({
    lote: params.lote,
    tipo_movimentacao: 1,
    data_movimentacao: params.dataMovimentacao,
    observacoes:
      params.observacao?.trim() ||
      `Entrada automática — compra #${params.compraId}`,
    peso_bruto_kg: pesoTotal,
    peso_liquido_kg: pesoTotal,
    referencia_compra_id: params.compraId,
  })

  await estoqueService.createMovimentacaoItem(
    params.itens.map((item) => ({
      ...item,
      movimentacao_id: mov.id,
    })),
  )

  return mov
}
