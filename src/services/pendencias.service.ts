import { AuthService } from './auth.service'
import { supabase } from './supabase'

export type PendenciaItem = {
  id: string
  descricao: string
  valor: number
  vencimento: string
  status: 'Pendente' | 'Atrasado'
}

export type PendenciasDashboard = {
  aPagar: PendenciaItem[]
  aReceber: PendenciaItem[]
  totalPagar: number
  totalReceber: number
  qtdAtrasadasPagar: number
  qtdAtrasadasReceber: number
}

function getUser() {
  const user = AuthService.getCachedUser()
  if (!user?.empresa_id) {
    throw new Error('Usuário não encontrado no cache')
  }
  return user
}

function isoDateOnly(value: string) {
  return (value || '').slice(0, 10)
}

function statusPorVencimento(vencimento: string): 'Pendente' | 'Atrasado' {
  const hoje = new Date()
  hoje.setHours(12, 0, 0, 0)
  const data = new Date(`${isoDateOnly(vencimento)}T12:00:00`)

  if (data < hoje) return 'Atrasado'
  return 'Pendente'
}

function statusVendaPendente(
  dataMovimentacao: string,
  movimentacaoStatus: string,
): 'Pendente' | 'Atrasado' | null {
  const status = (movimentacaoStatus || 'pendente').toLowerCase()

  if (status === 'finalizado' || status === 'cancelado') {
    return null
  }

  return statusPorVencimento(dataMovimentacao)
}

function nomeCliente(cliente: {
  nome?: string | null
  nome_empresa?: string | null
} | null) {
  if (!cliente) return 'Cliente'

  const nome = cliente.nome?.trim()
  const empresa = cliente.nome_empresa?.trim()

  if (nome && empresa && nome !== empresa) {
    return `${nome} (${empresa})`
  }

  return nome || empresa || 'Cliente'
}

export const pendenciasService = {
  async buscarDashboard(): Promise<PendenciasDashboard> {
    const user = getUser()

    const [parcelasRes, vendasRes] = await Promise.all([
      supabase
        .from('compras_parcelas')
        .select(
          `
          id,
          valor,
          data_vencimento,
          status,
          numero_parcela,
          total_parcelas,
          compra:compras (
            fornecedor:fornecedores ( nome )
          )
        `,
        )
        .eq('empresa_id', user.empresa_id)
        .eq('status', 'pendente')
        .order('data_vencimento', { ascending: true }),
      supabase
        .from('movimentacoes_clientes')
        .select(
          `
          id,
          data_movimentacao,
          valor_total,
          movimentacao_status,
          cliente:clientes ( nome, nome_empresa )
        `,
        )
        .eq('empresa_id', user.empresa_id)
        .neq('movimentacao_status', 'finalizado')
        .neq('movimentacao_status', 'cancelado')
        .order('data_movimentacao', { ascending: true }),
    ])

    if (parcelasRes.error) throw parcelasRes.error
    if (vendasRes.error) throw vendasRes.error

    const aPagar: PendenciaItem[] = (parcelasRes.data || []).map((parcela) => {
      const fornecedor =
        (parcela.compra as { fornecedor?: { nome?: string } | null } | null)
          ?.fornecedor?.nome || 'Fornecedor'
      const parcelaLabel =
        parcela.total_parcelas > 1
          ? ` (${parcela.numero_parcela}/${parcela.total_parcelas})`
          : ''

      return {
        id: `parcela-${parcela.id}`,
        descricao: `Compra — ${fornecedor}${parcelaLabel}`,
        valor: Number(parcela.valor || 0),
        vencimento: parcela.data_vencimento,
        status: statusPorVencimento(parcela.data_vencimento),
      }
    })

    const aReceber: PendenciaItem[] = (vendasRes.data || [])
      .map((venda) => {
        const status = statusVendaPendente(
          venda.data_movimentacao,
          venda.movimentacao_status,
        )
        if (!status) return null

        const cliente = venda.cliente as {
          nome?: string | null
          nome_empresa?: string | null
        } | null

        return {
          id: `venda-${venda.id}`,
          descricao: `Venda — ${nomeCliente(cliente)}`,
          valor: Number(venda.valor_total || 0),
          vencimento: isoDateOnly(venda.data_movimentacao),
          status,
        }
      })
      .filter(Boolean) as PendenciaItem[]

    const totalPagar = aPagar.reduce((acc, item) => acc + item.valor, 0)
    const totalReceber = aReceber.reduce((acc, item) => acc + item.valor, 0)

    return {
      aPagar,
      aReceber,
      totalPagar,
      totalReceber,
      qtdAtrasadasPagar: aPagar.filter((item) => item.status === 'Atrasado')
        .length,
      qtdAtrasadasReceber: aReceber.filter(
        (item) => item.status === 'Atrasado',
      ).length,
    }
  },
}
