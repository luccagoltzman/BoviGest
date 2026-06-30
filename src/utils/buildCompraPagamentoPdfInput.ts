import { getLogoUrl } from '@/services/theme.service'
import { fornecedoresService } from '@/services/fornecedores.service'
import { pagamentosComprasService } from '@/services/pagamentosCompras.service'
import { contaPagamentoFromFornecedor } from '@/utils/contaPagamento'
import type { CompraPagamentoPdfInput } from '@/utils/compraPagamentoPdf'

export type CompraPagamentoPdfSource = {
  id: number
  fornecedor_id: string
  data: string
  adiantamento?: boolean
  quantidade_animais: number
  peso_total: number
  valor_kg: number
  tipo_gado?: string | null
  condicao_gado: number
  observacoes?: string | null
  subtotal?: number
  valor_imposto?: number
  gta_valor?: number
  valor_total?: number
  detalhes_custo?: { viagem?: number; total?: number }
  fornecedor?: {
    id: string
    nome: string
    doc?: string | null
    telefone?: string | null
  }
}

export async function buildCompraPagamentoPdfInput(
  compra: CompraPagamentoPdfSource,
): Promise<{
  pdfInput: CompraPagamentoPdfInput
  telefone: string
}> {
  const [parcelas, fornecedor] = await Promise.all([
    pagamentosComprasService.getByCompraId(compra.id),
    fornecedoresService.getById(compra.fornecedor_id).catch(() => null),
  ])

  const subtotal = compra.adiantamento
    ? Number(compra.valor_total || 0)
    : Number(compra.subtotal || 0)
  const imposto = compra.adiantamento ? 0 : Number(compra.valor_imposto || 0)
  const gta = compra.adiantamento ? 0 : Number(compra.gta_valor || 0)
  const viagem = compra.adiantamento
    ? 0
    : Number(compra.detalhes_custo?.viagem || 0)
  const total = compra.adiantamento
    ? Number(compra.valor_total || 0)
    : (compra.detalhes_custo?.total ?? subtotal + imposto + gta + viagem)

  const fornecedorNome =
    compra.fornecedor?.nome || fornecedor?.nome || 'Fornecedor'

  return {
    pdfInput: {
      compra: {
        id: compra.id,
        data: compra.data,
        adiantamento: compra.adiantamento,
        quantidade_animais: compra.quantidade_animais,
        peso_total: compra.peso_total,
        valor_kg: compra.valor_kg,
        tipo_gado: compra.tipo_gado,
        condicao_gado: compra.condicao_gado,
        observacoes: compra.observacoes,
        detalhes_custo: {
          subtotal,
          imposto,
          gta,
          viagem,
          total,
        },
      },
      fornecedorNome,
      fornecedorDoc: fornecedor?.doc || compra.fornecedor?.doc || null,
      fornecedorConta: fornecedor
        ? contaPagamentoFromFornecedor(fornecedor)
        : undefined,
      parcelas,
      logoUrl: getLogoUrl(),
    },
    telefone: fornecedor?.telefone || compra.fornecedor?.telefone || '',
  }
}
