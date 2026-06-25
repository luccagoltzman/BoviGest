import { AuthService } from './auth.service'
import { romaneiosService } from './romaneios.service'
import { supabase } from './supabase'

function getUser() {
  const user = AuthService.getCachedUser()

  if (!user) {
    throw new Error('Usuário não encontrado no cache')
  }

  return user
}

export const abatesService = {
  async getAll(
    page = 1,
    limit = 10,
    search = '',
    startDate = '',
    endDate = ''
  ) {
    const from = (page - 1) * limit
    const to = from + limit - 1

    try {
      const user = getUser()

      let query = supabase
        .from('abates')
        .select(
          '*, prestador:prestadores_servico(id, nome)',
          { count: 'exact' },
        )
        .eq('empresa_id', user.empresa_id)
        .order('data_abate', { ascending: false })
        .range(from, to)

      if (search) {
        query = query.or(`
          lote.ilike.%${search}%,
          tipo_animal.ilike.%${search}%
        `)
      }

      if (startDate) {
        query = query.gte('data_abate', startDate)
      }

      if (endDate) {
        query = query.lte('data_abate', endDate)
      }

      const { data, count, error } = await query

      if (error) {
        throw error
      }

      const abateIds = (data || []).map((row) => row.id as number)
      const romaneiosMap =
        await romaneiosService.listarResumoPorAbateIds(abateIds)

      const dataComRomaneio = (data || []).map((row) => ({
        ...row,
        romaneio: romaneiosMap.get(row.id as number) || null,
      }))

      return {
        data: dataComRomaneio,
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      }
    } catch {
      return {
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      }
    }
  },

  async getById(id: number) {
    const user = getUser()

    const { data, error } = await supabase
      .from('abates')
      .select('*')
      .eq('id', id)
      .eq('empresa_id', user.empresa_id)
      .single()

    if (error) {
      throw error
    }

    return data
  },

  async create(payload: any) {
    const user = getUser()

    const { data, error } = await supabase
      .from('abates')
      .insert([
        {
          ...payload,
          empresa_id: user.empresa_id,
        },
      ])
      .select()
      .single()

    if (error) {
      throw error
    }

    return data
  },

  async update(id: number, payload: any) {
    const user = getUser()

    const { data, error } = await supabase
      .from('abates')
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('empresa_id', user.empresa_id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return data
  },

  async delete(id: number) {
    const user = getUser()

    const { error } = await supabase
      .from('abates')
      .delete()
      .eq('id', id)
      .eq('empresa_id', user.empresa_id)

    if (error) {
      throw error
    }
  },

  async listarRelatorio(startDate = '', endDate = '') {
    const user = getUser()

    let query = supabase
      .from('abates')
      .select('*')
      .eq('empresa_id', user.empresa_id)
      .order('data_abate', { ascending: true })

    if (startDate) {
      query = query.gte('data_abate', startDate)
    }

    if (endDate) {
      query = query.lte('data_abate', endDate)
    }

    const { data, error } = await query

    if (error) throw error

    const abateIds = (data || []).map((row) => row.id as number)
    const romaneiosMap =
      await romaneiosService.listarResumoPorAbateIds(abateIds)

    const romaneioIds = [...romaneiosMap.values()].map((item) => item.id)
    let romaneiosDetalhe = new Map<
      number,
      {
        data_romaneio: string
        fornecedor_nome: string | null
        fornecedor?: { nome: string } | null
      }
    >()

    if (romaneioIds.length) {
      const { data: romaneiosRows, error: romaneiosError } = await supabase
        .from('romaneios')
        .select(
          'id, data_romaneio, fornecedor_nome, fornecedor:fornecedores(nome)',
        )
        .eq('empresa_id', user.empresa_id)
        .in('id', romaneioIds)

      if (romaneiosError) throw romaneiosError

      for (const row of romaneiosRows || []) {
        const fornecedor = Array.isArray(row.fornecedor)
          ? row.fornecedor[0] ?? null
          : row.fornecedor
        romaneiosDetalhe.set(row.id, {
          data_romaneio: row.data_romaneio,
          fornecedor_nome: row.fornecedor_nome,
          fornecedor,
        })
      }
    }

    return (data || []).map((row) => {
      const resumo = romaneiosMap.get(row.id as number)
      const detalhe = resumo ? romaneiosDetalhe.get(resumo.id) : null

      return {
        ...row,
        romaneio: detalhe
          ? {
              data_romaneio: detalhe.data_romaneio,
              fornecedor_nome: detalhe.fornecedor_nome,
              fornecedor: detalhe.fornecedor,
            }
          : null,
      }
    })
  },
}