import {
  contaPagamentoToDb,
  type ContaPagamentoData,
} from '@/utils/contaPagamento'
import { AuthService } from './auth.service'
import { supabase } from './supabase'

export type AbatePendentePagamento = {
  id: number
  data_abate: string
  lote: string
  tipo_animal: string
  qtd_animais: number
  valor_total: number
  pagamento_status: string
  prestador_id?: string | null
}

export type AbateBaixa = {
  id: number
  empresa_id: number
  prestador_id: string
  data_pagamento: string
  semana_inicio: string
  semana_fim: string
  valor_total: number
  forma_pagamento: string | null
  observacao: string | null
  pagamento_banco?: string | null
  pagamento_agencia?: string | null
  pagamento_conta?: string | null
  pagamento_tipo_conta?: string | null
  pagamento_titular?: string | null
  pagamento_pix_tipo?: string | null
  pagamento_pix_chave?: string | null
  prestador?: {
    id: string
    nome: string
    doc?: string | null
    telefone?: string | null
    banco?: string | null
    agencia?: string | null
    conta?: string | null
    tipo_conta?: string | null
    titular_conta?: string | null
    pix_tipo?: string | null
    pix_chave?: string | null
  } | null
  itens?: {
    id: number
    abate_id: number
    valor: number
    abate?: AbatePendentePagamento | null
  }[]
}

function getUser() {
  const user = AuthService.getCachedUser()
  if (!user?.empresa_id) {
    throw new Error('Empresa não encontrada para o usuário logado')
  }
  return user
}

const BAIXA_SELECT = `
  *,
  prestador:prestadores_servico(
    id,
    nome,
    doc,
    telefone,
    banco,
    agencia,
    conta,
    tipo_conta,
    titular_conta,
    pix_tipo,
    pix_chave
  ),
  itens:abates_baixa_itens(
    id,
    abate_id,
    valor,
    abate:abates(
      id,
      data_abate,
      lote,
      tipo_animal,
      qtd_animais,
      valor_total
    )
  )
`

export const pagamentosAbatesService = {
  async listarPendentes(params: {
    prestadorId?: string
    semanaInicio: string
    semanaFim: string
  }) {
    const user = getUser()

    let query = supabase
      .from('abates')
      .select(
        'id, data_abate, lote, tipo_animal, qtd_animais, valor_total, pagamento_status, prestador_id',
      )
      .eq('empresa_id', user.empresa_id)
      .eq('pagamento_status', 'pendente')
      .gte('data_abate', params.semanaInicio)
      .lte('data_abate', params.semanaFim)
      .order('data_abate', { ascending: true })

    if (params.prestadorId) {
      query = query.or(
        `prestador_id.eq.${params.prestadorId},prestador_id.is.null`,
      )
    }

    const { data, error } = await query
    if (error) throw error
    return (data || []) as AbatePendentePagamento[]
  },

  async criarBaixaSemanal(payload: {
    prestadorId: string
    dataPagamento: string
    semanaInicio: string
    semanaFim: string
    abateIds: number[]
    formaPagamento: string
    observacao?: string
    contaPagamento?: ContaPagamentoData
  }) {
    const user = getUser()

    if (!payload.abateIds.length) {
      throw new Error('Selecione ao menos um abate para a baixa')
    }

    const { data: abates, error: abatesError } = await supabase
      .from('abates')
      .select('id, valor_total, pagamento_status')
      .eq('empresa_id', user.empresa_id)
      .in('id', payload.abateIds)

    if (abatesError) throw abatesError

    const lista = abates || []
    if (lista.length !== payload.abateIds.length) {
      throw new Error('Um ou mais abates não foram encontrados')
    }

    const jaPagos = lista.filter((a) => a.pagamento_status === 'pago')
    if (jaPagos.length) {
      throw new Error('Há abates já quitados na seleção')
    }

    const valorTotal = lista.reduce(
      (acc, item) => acc + Number(item.valor_total || 0),
      0,
    )

    const baixaBase = {
      empresa_id: user.empresa_id,
      prestador_id: payload.prestadorId,
      data_pagamento: payload.dataPagamento,
      semana_inicio: payload.semanaInicio,
      semana_fim: payload.semanaFim,
      valor_total: valorTotal,
      forma_pagamento: payload.formaPagamento || null,
      observacao: payload.observacao?.trim() || null,
      updated_at: new Date().toISOString(),
      ...(payload.contaPagamento
        ? contaPagamentoToDb(payload.contaPagamento)
        : {}),
    }

    const { data: baixa, error: baixaError } = await supabase
      .from('abates_baixas')
      .insert([baixaBase])
      .select()
      .single()

    if (baixaError) throw baixaError

    const itens = lista.map((abate) => ({
      baixa_id: baixa.id,
      abate_id: abate.id,
      valor: Number(abate.valor_total || 0),
    }))

    const { error: itensError } = await supabase
      .from('abates_baixa_itens')
      .insert(itens)

    if (itensError) throw itensError

    const { error: updateError } = await supabase
      .from('abates')
      .update({
        pagamento_status: 'pago',
        data_pagamento: payload.dataPagamento,
        forma_pagamento: payload.formaPagamento || null,
        prestador_id: payload.prestadorId,
        baixa_id: baixa.id,
        updated_at: new Date().toISOString(),
      })
      .eq('empresa_id', user.empresa_id)
      .in('id', payload.abateIds)

    if (updateError) throw updateError

    return this.getById(baixa.id)
  },

  async getById(id: number): Promise<AbateBaixa> {
    const user = getUser()

    const { data, error } = await supabase
      .from('abates_baixas')
      .select(BAIXA_SELECT)
      .eq('id', id)
      .eq('empresa_id', user.empresa_id)
      .single()

    if (error) throw error
    return data as AbateBaixa
  },

  async listarBaixas(page = 1, limit = 10, startDate = '', endDate = '') {
    const user = getUser()
    const from = (page - 1) * limit
    const to = from + limit - 1

    let query = supabase
      .from('abates_baixas')
      .select(BAIXA_SELECT, { count: 'exact' })
      .eq('empresa_id', user.empresa_id)
      .order('data_pagamento', { ascending: false })

    if (startDate) {
      query = query.gte('data_pagamento', startDate)
    }

    if (endDate) {
      query = query.lte('data_pagamento', endDate)
    }

    const { data, count, error } = await query.range(from, to)

    if (error) throw error

    return {
      data: (data || []) as AbateBaixa[],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    }
  },

  async listarBaixasPorPeriodo(startDate: string, endDate: string) {
    const response = await this.listarBaixas(1, 200, startDate, endDate)
    return response.data
  },

  async marcarAbateIndividual(payload: {
    abateId: number
    prestadorId: string
    dataPagamento: string
    formaPagamento: string
    observacao?: string
    contaPagamento?: ContaPagamentoData
  }) {
    const user = getUser()

    const { data: abate, error: abateError } = await supabase
      .from('abates')
      .select('id, valor_total, pagamento_status, data_abate')
      .eq('id', payload.abateId)
      .eq('empresa_id', user.empresa_id)
      .single()

    if (abateError) throw abateError
    if (abate.pagamento_status === 'pago') {
      throw new Error('Este abate já está quitado')
    }

    const semanaInicio = payload.dataPagamento
    const semanaFim = payload.dataPagamento

    return this.criarBaixaSemanal({
      prestadorId: payload.prestadorId,
      dataPagamento: payload.dataPagamento,
      semanaInicio,
      semanaFim,
      abateIds: [payload.abateId],
      formaPagamento: payload.formaPagamento,
      observacao: payload.observacao,
      contaPagamento: payload.contaPagamento,
    })
  },

  async desfazerBaixa(baixaId: number) {
    const user = getUser()

    const baixa = await this.getById(baixaId)
    const abateIds = (baixa.itens || []).map((item) => item.abate_id)

    if (!abateIds.length) {
      throw new Error('Esta baixa não possui abates vinculados')
    }

    const { data: abates, error: abatesError } = await supabase
      .from('abates')
      .select('id, pagamento_status, baixa_id')
      .eq('empresa_id', user.empresa_id)
      .in('id', abateIds)

    if (abatesError) throw abatesError

    const lista = abates || []
    if (lista.length !== abateIds.length) {
      throw new Error('Um ou mais abates desta baixa não foram encontrados')
    }

    const inconsistentes = lista.filter(
      (abate) =>
        abate.pagamento_status !== 'pago' || Number(abate.baixa_id) !== baixaId,
    )
    if (inconsistentes.length) {
      throw new Error('Há abates desta baixa com status inconsistente')
    }

    const { error: updateError } = await supabase
      .from('abates')
      .update({
        pagamento_status: 'pendente',
        data_pagamento: null,
        forma_pagamento: null,
        baixa_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('empresa_id', user.empresa_id)
      .in('id', abateIds)

    if (updateError) throw updateError

    const { error: deleteError } = await supabase
      .from('abates_baixas')
      .delete()
      .eq('id', baixaId)
      .eq('empresa_id', user.empresa_id)

    if (deleteError) throw deleteError
  },

  async desfazerPagamentoAbate(abateId: number) {
    const user = getUser()

    const { data: abate, error: abateError } = await supabase
      .from('abates')
      .select('id, pagamento_status, baixa_id')
      .eq('id', abateId)
      .eq('empresa_id', user.empresa_id)
      .single()

    if (abateError) throw abateError

    if (abate.pagamento_status !== 'pago' || !abate.baixa_id) {
      throw new Error('Este abate não possui pagamento registrado')
    }

    await this.desfazerBaixa(Number(abate.baixa_id))
  },
}
