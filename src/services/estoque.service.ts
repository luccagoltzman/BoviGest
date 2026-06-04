import { AuthService } from './auth.service'
import { supabase } from './supabase'

function getUser() {
  const user = AuthService.getCachedUser()
  if (!user) throw new Error('Usuário não encontrado no cache')
  return user
}

export const estoqueService = {
  /*
  |--------------------------------------------------------------------------
  | LISTAGEM MOVIMENTAÇÕES (COM ITENS)
  |--------------------------------------------------------------------------
  */

  async getMovimentacoes(
    page = 1,
    limit = 10,
    search = '',
    startDate = '',
    endDate = '',
    lote = '',
    _corte = '',
    tipoMovimentacao: number | null = null,
  ) {
    const from = (page - 1) * limit
    const to = from + limit - 1
    const user = getUser()

    let query = supabase
      .from('estoque_movimentacoes')
      .select(
        `
        *,
        itens:estoque_movimentacao_itens(*)
      `,
        { count: 'exact' },
      )
      .eq('empresa_id', user.empresa_id)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(from, to)

    if (search) {
      query = query.or(
        `lote.ilike.%${search}%,observacoes.ilike.%${search}%`,
      )
    }

    if (startDate) query = query.gte('data_movimentacao', startDate)
    if (endDate) query = query.lte('data_movimentacao', endDate)
    if (lote) query = query.ilike('lote', `%${lote}%`)
    if (tipoMovimentacao !== null)
      query = query.eq('tipo_movimentacao', tipoMovimentacao)

    const { data, count, error } = await query

    if (error) throw error

    return {
      data,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    }
  },

  /*
  |--------------------------------------------------------------------------
  | GET BY ID (DETALHADO)
  |--------------------------------------------------------------------------
  */

  async getMovimentacaoById(id: number) {
    const user = getUser()

    const { data, error } = await supabase
      .from('estoque_movimentacoes')
      .select(
        `
        *,
        itens:estoque_movimentacao_itens(*)
      `,
      )
      .eq('id', id)
      .eq('empresa_id', user.empresa_id)
      .single()

    if (error) throw error

    return data
  },

  /*
  |--------------------------------------------------------------------------
  | CREATE MOVIMENTAÇÃO
  |--------------------------------------------------------------------------
  */

  async createMovimentacao(payload: any) {
    const user = getUser()

    const { data, error } = await supabase
      .from('estoque_movimentacoes')
      .insert({
        empresa_id: user.empresa_id,
        lote: payload.lote,
        tipo_movimentacao: payload.tipo_movimentacao,
        peso_bruto_kg: payload.peso_bruto_kg,
        peso_liquido_kg: payload.peso_liquido_kg,
        data_movimentacao: payload.data_movimentacao,
        observacoes: payload.observacoes,
        referencia_venda_id: payload.venda_id
      })
      .select()
      .single()

    if (error) throw error

    return data
  },

  /*
  |--------------------------------------------------------------------------
  | ITENS (PADRÃO ESTOQUE REAL)
  |--------------------------------------------------------------------------
  */

  async createMovimentacaoItem(itens: any[]) {
    const user = getUser()

    const payload = itens.map(i => ({
      empresa_id: user.empresa_id,
      movimentacao_id: i.movimentacao_id,
      corte: i.corte,
      peso_bruto_kg: i.peso_bruto_kg,
      peso_liquido_kg: i.peso_liquido_kg,
      agrupamento_id: i.agrupamento_id,
      quantidade_pecas: i.quantidade_pecas
    }))
    const { data, error } = await supabase
      .from('estoque_movimentacao_itens')
      .insert(payload)
      .select()

    if (error) throw error

    return data
  },

  /*
  |--------------------------------------------------------------------------
  | UPDATE MOVIMENTAÇÃO (SEM QUEBRAR ITENS)
  |--------------------------------------------------------------------------
  */

  async updateMovimentacao(id: number, payload: any) {
    const user = getUser()

    const { data, error } = await supabase
      .from('estoque_movimentacoes')
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('empresa_id', user.empresa_id)
      .select()
      .single()

    if (error) throw error

    return data
  },

  /*
  |--------------------------------------------------------------------------
  | REPLACE ITENS (EDIÇÃO SEGURA)
  |--------------------------------------------------------------------------
  */

  async replaceMovimentacaoItens(movimentacaoId: number, itens: any[]) {
    const user = getUser()

    await supabase
      .from('estoque_movimentacao_itens')
      .delete()
      .eq('movimentacao_id', movimentacaoId)
      .eq('empresa_id', user.empresa_id)

    if (!itens.length) return []

    const payload = itens.map(i => ({
      empresa_id: user.empresa_id,
      movimentacao_id: movimentacaoId,
      corte: i.corte,
      peso_bruto_kg: i.peso_bruto_kg,
      peso_liquido_kg: i.peso_liquido_kg,
      agrupamento_id: i.agrupamento_id,
      quantidade_pecas: i.quantidade_pecas

    }))

    const { data, error } = await supabase
      .from('estoque_movimentacao_itens')
      .insert(payload)
      .select()

    if (error) throw error

    return data
  },

  /*
  |--------------------------------------------------------------------------
  | ESTOQUE ATUAL (VIEW)
  |--------------------------------------------------------------------------
  */

  async getEstoqueAtual(search = '', lote = '', corte = '') {
    const user = getUser()

    let query = supabase
      .from('vw_estoque_atual')
      .select('*')
      .eq('empresa_id', user.empresa_id)

    if (search) {
      query = query.or(
        `corte.ilike.%${search}%`,
      )
    }

    if (lote) query = query.ilike('lote', `%${lote}%`)
    if (corte) query = query.ilike('corte', `%${corte}%`)

    const { data, error } = await query

    if (error) return []

    return data || []
  },

  /*
  |--------------------------------------------------------------------------
  | DELETE MOVIMENTAÇÃO
  |--------------------------------------------------------------------------
  */

  async deleteMovimentacao(id: number) {
    const user = getUser()

    const { error } = await supabase
      .from('estoque_movimentacoes')
      .delete()
      .eq('id', id)
      .eq('empresa_id', user.empresa_id)

    if (error) throw error
  },

  async deleteByReferencia(referencia: number) {
    const user = getUser()

    const { error } = await supabase
      .from('estoque_movimentacoes')
      .delete()
      .eq('referencia_venda_id', referencia)
      .eq('empresa_id', user.empresa_id)

    if (error) throw error
  },

}