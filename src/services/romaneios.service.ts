import { AuthService } from './auth.service'
import { supabase } from './supabase'
import { parseDecimalInput } from '@/utils/masks'

export type RomaneioItem = {
  id?: number
  ordem: number
  dianteiro_1: number | string
  dianteiro_2: number | string
  traseiro_1: number | string
  traseiro_2: number | string
  tipo: string
}

export type Romaneio = {
  id: number
  abate_id: number | null
  compra_id?: number | null
  fornecedor_id?: string | null
  fornecedor?: { id: string; nome: string } | null
  fornecedor_nome: string | null
  data_romaneio: string
  observacao: string | null
  itens?: RomaneioItem[]
}

export type SaveRomaneioAbatePayload = {
  abate_id: number
  data_romaneio: string
  fornecedor_id?: string | null
  fornecedor_nome?: string | null
  observacao?: string
  itens: RomaneioItem[]
}

export type SaveRomaneioCompraPayload = {
  compra_id: number
  data_romaneio: string
  fornecedor_id?: string | null
  fornecedor_nome?: string | null
  observacao?: string
  itens: RomaneioItem[]
}

export type SaveRomaneioPayload =
  | SaveRomaneioAbatePayload
  | SaveRomaneioCompraPayload

export type FornecedorOption = {
  id: string
  nome: string
}

function getUser() {
  const user = AuthService.getCachedUser()
  if (!user?.empresa_id) {
    throw new Error('Empresa não encontrada para o usuário logado')
  }
  return user
}

function parsePeso(value: unknown) {
  if (value === null || value === undefined || value === '') return 0
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  return parseDecimalInput(String(value))
}

function normalizeItem(item: RomaneioItem) {
  return {
    ordem: item.ordem,
    dianteiro_1: parsePeso(item.dianteiro_1),
    dianteiro_2: parsePeso(item.dianteiro_2),
    traseiro_1: parsePeso(item.traseiro_1),
    traseiro_2: parsePeso(item.traseiro_2),
    tipo: (item.tipo || 'VACA').trim().toUpperCase() || 'VACA',
  }
}

export function totalItemRomaneio(item: RomaneioItem) {
  return (
    parsePeso(item.dianteiro_1) +
    parsePeso(item.dianteiro_2) +
    parsePeso(item.traseiro_1) +
    parsePeso(item.traseiro_2)
  )
}

export function totaisRomaneio(itens: RomaneioItem[]) {
  return itens.reduce(
    (acc, item) => ({
      dianteiro_1: acc.dianteiro_1 + parsePeso(item.dianteiro_1),
      dianteiro_2: acc.dianteiro_2 + parsePeso(item.dianteiro_2),
      traseiro_1: acc.traseiro_1 + parsePeso(item.traseiro_1),
      traseiro_2: acc.traseiro_2 + parsePeso(item.traseiro_2),
      total: acc.total + totalItemRomaneio(item),
    }),
    {
      dianteiro_1: 0,
      dianteiro_2: 0,
      traseiro_1: 0,
      traseiro_2: 0,
      total: 0,
    },
  )
}

export function buildItensVazios(
  quantidade: number,
  tipoPadrao = 'VACA',
): RomaneioItem[] {
  return Array.from({ length: Math.max(0, quantidade) }, (_, index) => ({
    ordem: index + 1,
    dianteiro_1: '',
    dianteiro_2: '',
    traseiro_1: '',
    traseiro_2: '',
    tipo: tipoPadrao.trim().toUpperCase() || 'VACA',
  }))
}

export function renumberItens(itens: RomaneioItem[]) {
  return itens.map((item, index) => ({ ...item, ordem: index + 1 }))
}

export function mergeItensRomaneio(
  existentes: RomaneioItem[],
  quantidadeMinima: number,
  tipoPadrao = 'VACA',
) {
  const count = Math.max(quantidadeMinima, existentes.length, 1)
  const base = buildItensVazios(count, tipoPadrao)
  return base.map((linha) => {
    const salva = existentes.find((item) => item.ordem === linha.ordem)
    if (!salva) return linha
    return {
      ...linha,
      dianteiro_1: salva.dianteiro_1 ?? '',
      dianteiro_2: salva.dianteiro_2 ?? '',
      traseiro_1: salva.traseiro_1 ?? '',
      traseiro_2: salva.traseiro_2 ?? '',
      tipo: salva.tipo || linha.tipo,
    }
  })
}

/** Digitação livre de peso em kg (aceita vírgula ou ponto decimal). */
export function formatPesoKgInput(value: string) {
  const cleaned = value.replace(/[^\d,.]/g, '')
  if (!cleaned) return ''

  const lastComma = cleaned.lastIndexOf(',')
  const lastDot = cleaned.lastIndexOf('.')
  const sepIndex = Math.max(lastComma, lastDot)

  if (sepIndex < 0) {
    return cleaned.replace(/[,.]/g, '')
  }

  const intPart = cleaned.slice(0, sepIndex).replace(/[,.]/g, '')
  const decPart = cleaned.slice(sepIndex + 1).replace(/[,.]/g, '').slice(0, 2)
  const endsWithSep = cleaned.endsWith(',') || cleaned.endsWith('.')

  if (endsWithSep && !decPart) {
    return `${intPart || '0'},`
  }

  return decPart.length ? `${intPart || '0'},${decPart}` : intPart || '0'
}

function extrairFornecedor(
  value: FornecedorOption | FornecedorOption[] | null | undefined,
): FornecedorOption | null {
  if (!value) return null
  if (Array.isArray(value)) return value[0] ?? null
  return value.id ? value : null
}

function mapRomaneioRow(data: Record<string, unknown>): Romaneio {
  const itens = ((data.itens as RomaneioItem[]) || []).sort(
    (a, b) => a.ordem - b.ordem,
  )

  return {
    ...(data as Romaneio),
    fornecedor: extrairFornecedor(
      data.fornecedor as FornecedorOption | FornecedorOption[] | null,
    ),
    itens,
  }
}

async function getByLink(
  field: 'abate_id' | 'compra_id',
  id: number,
): Promise<Romaneio | null> {
  getUser()

  const { data, error } = await supabase
    .from('romaneios')
    .select(
      '*, fornecedor:fornecedores(id, nome), itens:romaneio_itens(*)',
    )
    .eq(field, id)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return mapRomaneioRow(data as Record<string, unknown>)
}

export const romaneiosService = {
  async suggestFornecedorParaAbate(params: {
    lote?: string
    dataAbate: string
    qtdAnimais: number
  }): Promise<FornecedorOption | null> {
    const user = getUser()
    const dataAbate = params.dataAbate.slice(0, 10)
    const lote = params.lote?.trim()

    if (lote) {
      const { data, error } = await supabase
        .from('compras')
        .select('fornecedor:fornecedores(id, nome)')
        .eq('empresa_id', user.empresa_id)
        .eq('condicao_gado', 0)
        .ilike('observacoes', `%${lote}%`)
        .order('data', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw error

      const fornecedor = extrairFornecedor(
        data?.fornecedor as FornecedorOption | FornecedorOption[] | null,
      )
      if (fornecedor?.id) return fornecedor
    }

    const { data, error } = await supabase
      .from('compras')
      .select('fornecedor:fornecedores(id, nome)')
      .eq('empresa_id', user.empresa_id)
      .eq('condicao_gado', 0)
      .eq('quantidade_animais', params.qtdAnimais)
      .lte('data', dataAbate)
      .order('data', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error

    const fornecedor = extrairFornecedor(
      data?.fornecedor as FornecedorOption | FornecedorOption[] | null,
    )
    return fornecedor?.id ? fornecedor : null
  },

  async getByAbateId(abateId: number): Promise<Romaneio | null> {
    return getByLink('abate_id', abateId)
  },

  async getByCompraId(compraId: number): Promise<Romaneio | null> {
    return getByLink('compra_id', compraId)
  },

  async save(payload: SaveRomaneioPayload): Promise<Romaneio> {
    const user = getUser()
    const itensNormalizados = payload.itens.map(normalizeItem)
    const isCompra = 'compra_id' in payload

    const romaneioBase = {
      empresa_id: user.empresa_id,
      abate_id: isCompra ? null : payload.abate_id,
      compra_id: isCompra ? payload.compra_id : null,
      data_romaneio: payload.data_romaneio,
      fornecedor_id: payload.fornecedor_id || null,
      fornecedor_nome: payload.fornecedor_nome?.trim() || null,
      observacao: payload.observacao?.trim() || null,
      updated_at: new Date().toISOString(),
    }

    const existente = isCompra
      ? await romaneiosService.getByCompraId(payload.compra_id)
      : await romaneiosService.getByAbateId(payload.abate_id)

    let romaneioId = existente?.id

    if (existente?.id) {
      const { error } = await supabase
        .from('romaneios')
        .update(romaneioBase)
        .eq('id', existente.id)

      if (error) throw error

      const { error: deleteError } = await supabase
        .from('romaneio_itens')
        .delete()
        .eq('romaneio_id', existente.id)

      if (deleteError) throw deleteError
    } else {
      const { data, error } = await supabase
        .from('romaneios')
        .insert([romaneioBase])
        .select()
        .single()

      if (error) throw error
      romaneioId = data.id
    }

    if (!romaneioId) {
      throw new Error('Não foi possível salvar o romaneio')
    }

    if (itensNormalizados.length) {
      const { error: itensError } = await supabase.from('romaneio_itens').insert(
        itensNormalizados.map((item) => ({
          ...item,
          romaneio_id: romaneioId,
        })),
      )

      if (itensError) throw itensError
    }

    const saved = isCompra
      ? await romaneiosService.getByCompraId(payload.compra_id)
      : await romaneiosService.getByAbateId(payload.abate_id)

    if (!saved) {
      throw new Error('Romaneio salvo, mas não foi possível recarregar')
    }

    return saved
  },
}
