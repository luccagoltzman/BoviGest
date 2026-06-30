import type { RomaneioItem } from '@/services/romaneios.service'
import { romaneiosService } from '@/services/romaneios.service'
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
  qtdDianteiro?: number,
  qtdTraseiro?: number,
): EstoqueItemEntrada[] {
  const result: EstoqueItemEntrada[] = []

  if (pesoDianteiro > 0) {
    result.push({
      corte: 'Dianteiro',
      peso_bruto_kg: pesoDianteiro,
      peso_liquido_kg: pesoDianteiro,
      quantidade_pecas: qtdDianteiro && qtdDianteiro > 0 ? qtdDianteiro : 1,
      agrupamento_id: null,
    })
  }

  if (pesoTraseiro > 0) {
    result.push({
      corte: 'Traseiro',
      peso_bruto_kg: pesoTraseiro,
      peso_liquido_kg: pesoTraseiro,
      quantidade_pecas: qtdTraseiro && qtdTraseiro > 0 ? qtdTraseiro : 1,
      agrupamento_id: null,
    })
  }

  return result
}

export function loteCompra(compra: { id: number; observacoes?: string | null }) {
  const obs = compra.observacoes?.trim()
  return obs || `compra-${compra.id}`
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

export async function compraTemRomaneioComPesos(compraId: number) {
  const romaneio = await romaneiosService.getByCompraId(compraId)
  if (!romaneio?.itens?.length) return false
  return romaneioItensParaEstoque(romaneio.itens).length > 0
}

export async function sincronizarEntradaEstoqueCompraSimples(params: {
  compraId: number
  data: string
  observacoes?: string | null
  pesoBrutoDianteiroKg: number
  pesoBrutoTraseiroKg: number
  qtdDianteiro?: number
  qtdTraseiro?: number
}) {
  const dianteiro = Number(params.pesoBrutoDianteiroKg) || 0
  const traseiro = Number(params.pesoBrutoTraseiroKg) || 0

  if (dianteiro <= 0 && traseiro <= 0) {
    await estoqueService.deleteByReferenciaCompra(params.compraId).catch(() => undefined)
    return null
  }

  const itens = pesosSimplesParaEstoque(
    dianteiro,
    traseiro,
    params.qtdDianteiro,
    params.qtdTraseiro,
  )

  return criarEntradaEstoqueCompra({
    compraId: params.compraId,
    lote: loteCompra({ id: params.compraId, observacoes: params.observacoes }),
    dataMovimentacao:
      params.data?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    itens,
  })
}

export async function sincronizarEntradaEstoqueCompraRomaneio(params: {
  compraId: number
  data: string
  observacoes?: string | null
}) {
  const romaneio = await romaneiosService.getByCompraId(params.compraId)
  if (!romaneio?.itens?.length) return null

  const itens = romaneioItensParaEstoque(romaneio.itens)
  if (!itens.length) return null

  return criarEntradaEstoqueCompra({
    compraId: params.compraId,
    lote: loteCompra({ id: params.compraId, observacoes: params.observacoes }),
    dataMovimentacao:
      params.data?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    itens,
    observacao: `Entrada via romaneio — compra #${params.compraId}`,
  })
}
