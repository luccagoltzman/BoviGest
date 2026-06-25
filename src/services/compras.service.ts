import {
  formaPagamentoResumoCompra,
  resumoPagamentoCompra,
} from '@/utils/compraParcelas'

import type { CompraParcelaConfig } from '@/utils/compraParcelas'

import { AuthService } from './auth.service'

import { pagamentosComprasService } from './pagamentosCompras.service'

import { romaneiosService } from './romaneios.service'

import { supabase } from './supabase'



function getUser() {

  const user = AuthService.getCachedUser()



  if (!user) {

    throw new Error('Usuário não encontrado no cache')

  }



  return user

}



export type PagamentoCompraInput = {
  parcelas: import('@/utils/compraParcelas').ParcelaDraft[]
  contaPagamento?: import('@/utils/contaPagamento').ContaPagamentoData
}



export const comprasService = {

  async getAll(

    page = 1,

    limit = 10,

    search = '',

    startDate = '',

    endDate = '',

    condicao = '',

    fornecedorId = '',

    pagamentoStatus = '',

  ) {

    const from = (page - 1) * limit

    const to = from + limit - 1



    try {

      const user = getUser()



      let query = supabase

        .from('compras')

        .select(

          `

        *,

        fornecedor:fornecedores (

          id,

          nome

        )

      `,

          { count: 'exact' }

        )

        .eq('empresa_id', user.empresa_id)

        .order('created_at', { ascending: false })

        .range(from, to)



      if (search) {

        query = query.or(`

        tipo_gado.ilike.%${search}%,

        status.ilike.%${search}%

      `)

      }



      if (startDate) {

        query = query.gte('data', startDate)

      }



      if (endDate) {

        query = query.lte('data', endDate)

      }



      if (condicao !== '') {

        query = query.eq('condicao_gado', Number(condicao))

      }



      if (fornecedorId) {

        query = query.eq('fornecedor_id', fornecedorId)

      }



      if (pagamentoStatus === 'quitado') {

        query = query.eq('pagamento_quitado', true)

      } else if (pagamentoStatus === 'pendente') {

        query = query.eq('pagamento_quitado', false).gt('qtd_parcelas', 0)

      } else if (pagamentoStatus === 'sem_parcelas') {

        query = query.or('qtd_parcelas.is.null,qtd_parcelas.eq.0')

      }



      const { data, count, error } = await query



      if (error) {

        throw error

      }



      const ids = (data || []).map(item => item.id)



      let viagensMap: Record<number, any> = {}

      let parcelasMap: Record<number, any[]> = {}



      let romaneiosMap = new Map<number, { id: number; data_romaneio: string }>()

      if (ids.length) {

        const [{ data: viagens }, parcelasResumo, romaneiosResumo] = await Promise.all([

          supabase

            .from('viagens')

            .select('referencia_id, custo_total')

            .eq('empresa_id', user.empresa_id)

            .eq('referencia_tipo', 'compra')

            .in('referencia_id', ids),

          pagamentosComprasService.getResumoByCompraIds(ids),

          romaneiosService.listarResumoPorCompraIds(ids),

        ])



        viagensMap = Object.fromEntries(

          (viagens || []).map(item => [

            item.referencia_id,

            item

          ])

        )

        parcelasMap = parcelasResumo

        romaneiosMap = romaneiosResumo

      }



      const comprasComViagem = (data || []).map(compra => {

        const viagem = viagensMap[compra.id]

        const parcelas = parcelasMap[compra.id] || []



        const subtotal = Number(compra.subtotal || 0)

        const imposto = Number(compra.valor_imposto || 0)

        const gta = Number(compra.gta_valor || 0)

        const viagemValor = Number(viagem?.custo_total || 0)



        return {

          ...compra,

          romaneio: romaneiosMap.get(compra.id) || null,

          detalhes_custo: {

            subtotal,

            imposto,

            gta,

            viagem: viagemValor,

            total:

              subtotal +

              imposto +

              gta +

              viagemValor

          },

          pagamento_resumo: {
            ...resumoPagamentoCompra(parcelas),
            forma_pagamento: compra.forma_pagamento || parcelas[0]?.forma_pagamento || null,
            detalhes: parcelas.map((p) => ({
              numero: p.numero_parcela,
              total: p.total_parcelas,
              valor: Number(p.valor || 0),
              status: p.status,
              data_pagamento: p.data_pagamento,
              data_vencimento: p.data_vencimento,
            })),
          },

        }

      })



      return {

        data: comprasComViagem,

        total: count || 0,

        page,

        limit,

        totalPages: Math.ceil((count || 0) / limit)

      }

    } catch {

      return {

        data: [],

        total: 0,

        page,

        limit,

        totalPages: 0

      }

    }

  },

  async getById(id: number) {

    const user = getUser()



    const { data, error } = await supabase

      .from('compras')

      .select(

        `

        *,

        fornecedor:fornecedores (

          id,

          nome,

          doc,

          telefone

        )

      `

      )

      .eq('id', id)

      .eq('empresa_id', user.empresa_id)

      .single()



    if (error) {

      throw error

    }



    return data

  },



  async create(payload: any, pagamento?: PagamentoCompraInput) {

    const user = getUser()



    const qtdParcelas = pagamento?.parcelas.length || 1

    const formaPagamento = pagamento
      ? formaPagamentoResumoCompra(pagamento.parcelas)
      : 'Pix'



    const { data, error } = await supabase

      .from('compras')

      .insert([

        {

          ...payload,

          empresa_id: user.empresa_id,

          qtd_parcelas: qtdParcelas,

          forma_pagamento: formaPagamento,

          pagamento_quitado: false,

        },

      ])

      .select(

        `

        *,

        fornecedor:fornecedores (

          id,

          nome

        )

      `

      )

      .single()



    if (error) {

      throw error

    }



    if (pagamento) {

      const parcelaConfig: CompraParcelaConfig = {
        parcelas: pagamento.parcelas,
        contaPagamento: pagamento.contaPagamento,
      }



      await pagamentosComprasService.createForCompra(data.id, parcelaConfig)
      await pagamentosComprasService.syncCompraQuitacao(data.id)

    }



    return data

  },



  async update(id: number, payload: any, pagamento?: PagamentoCompraInput) {

    const user = getUser()



    const updatePayload: Record<string, unknown> = {

      ...payload,

      updated_at: new Date().toISOString(),

    }



    if (pagamento) {

      updatePayload.qtd_parcelas = pagamento.parcelas.length

      updatePayload.forma_pagamento = formaPagamentoResumoCompra(
        pagamento.parcelas,
      )

      updatePayload.pagamento_quitado = pagamento.parcelas.every((p) => p.pago)

    }



    const { data, error } = await supabase

      .from('compras')

      .update(updatePayload)

      .eq('id', id)

      .eq('empresa_id', user.empresa_id)

      .select(

        `

        *,

        fornecedor:fornecedores (

          id,

          nome

        )

      `

      )

      .single()



    if (error) {

      throw error

    }



    if (pagamento) {

      const parcelaConfig: CompraParcelaConfig = {
        parcelas: pagamento.parcelas,
        contaPagamento: pagamento.contaPagamento,
      }



      await pagamentosComprasService.regenerarForCompra(id, parcelaConfig)

    }



    return data

  },



  async delete(id: number) {

    const user = getUser()



    await pagamentosComprasService.deleteByCompra(id)



    const { error } = await supabase

      .from('compras')

      .delete()

      .eq('id', id)

      .eq('empresa_id', user.empresa_id)



    if (error) {

      throw error

    }

  },

}


