import { AuthService } from './auth.service'
import { supabase } from './supabase'

export type TipoAtividadeCalendario =
  | 'compra'
  | 'venda'
  | 'custo'
  | 'abate'
  | 'estoque'
  | 'viscera'

export type AtividadeCalendario = {
  id: string
  tipo: TipoAtividadeCalendario
  data: string
  titulo: string
  descricao: string
  valor?: number
  rota: string
}

export type ResumoDiaCalendario = {
  data: string
  total: number
  tipos: Partial<Record<TipoAtividadeCalendario, number>>
}

export type CalendarioMesDados = {
  ano: number
  mes: number
  inicio: string
  fim: string
  resumoPorDia: Record<string, ResumoDiaCalendario>
  atividades: AtividadeCalendario[]
}

function getEmpresaId() {
  const user = AuthService.getCachedUser()
  if (!user?.empresa_id) {
    throw new Error('Usuário não encontrado no cache')
  }
  return user.empresa_id
}

function isoDateOnly(value: string) {
  return (value || '').slice(0, 10)
}

function getMonthRange(ano: number, mes: number) {
  const inicio = new Date(ano, mes - 1, 1)
  const fim = new Date(ano, mes, 0)
  return {
    inicio: inicio.toISOString().slice(0, 10),
    fim: fim.toISOString().slice(0, 10),
  }
}

function criarResumoVazio(data: string): ResumoDiaCalendario {
  return { data, total: 0, tipos: {} }
}

function registrarAtividade(
  mapa: Record<string, ResumoDiaCalendario>,
  data: string,
  tipo: TipoAtividadeCalendario,
) {
  if (!data) return
  if (!mapa[data]) mapa[data] = criarResumoVazio(data)
  mapa[data].total += 1
  mapa[data].tipos[tipo] = (mapa[data].tipos[tipo] || 0) + 1
}

function montarResumo(atividades: AtividadeCalendario[]) {
  const mapa: Record<string, ResumoDiaCalendario> = {}

  for (const atividade of atividades) {
    registrarAtividade(mapa, atividade.data, atividade.tipo)
  }

  return mapa
}

export const calendarioService = {
  async buscarMes(ano: number, mes: number): Promise<CalendarioMesDados> {
    const empresaId = getEmpresaId()
    const { inicio, fim } = getMonthRange(ano, mes)

    const [
      compras,
      vendas,
      custos,
      abates,
      estoque,
      visceras,
    ] = await Promise.all([
      supabase
        .from('compras')
        .select('id, data, valor_total, status, fornecedor:fornecedores(nome)')
        .eq('empresa_id', empresaId)
        .gte('data', inicio)
        .lte('data', fim),
      supabase
        .from('movimentacoes_clientes')
        .select('id, data_movimentacao, valor_total, movimentacao_status, cliente:clientes(nome)')
        .eq('empresa_id', empresaId)
        .gte('data_movimentacao', inicio)
        .lte('data_movimentacao', fim),
      supabase
        .from('custos_operacionais')
        .select('id, data, categoria, valor')
        .eq('empresa_id', empresaId)
        .gte('data', inicio)
        .lte('data', fim),
      supabase
        .from('abates')
        .select('id, data_abate, lote, tipo_animal, qtd_animais, valor_total')
        .eq('empresa_id', empresaId)
        .gte('data_abate', inicio)
        .lte('data_abate', fim),
      supabase
        .from('estoque_movimentacoes')
        .select('id, data_movimentacao, lote, tipo_movimentacao, peso_liquido_kg, observacoes')
        .eq('empresa_id', empresaId)
        .gte('data_movimentacao', inicio)
        .lte('data_movimentacao', fim),
      supabase
        .from('movimentacoes_visceras')
        .select('id, created_at, tipo, quantidade, observacao')
        .eq('empresa_id', empresaId)
        .gte('created_at', `${inicio}T00:00:00`)
        .lte('created_at', `${fim}T23:59:59`),
    ])

    const errors = [
      compras.error,
      vendas.error,
      custos.error,
      abates.error,
      estoque.error,
      visceras.error,
    ].filter(Boolean)

    if (errors.length > 0) {
      throw errors[0]
    }

    const atividades: AtividadeCalendario[] = []

    for (const row of compras.data || []) {
      const data = isoDateOnly(row.data)
      atividades.push({
        id: `compra-${row.id}`,
        tipo: 'compra',
        data,
        titulo: 'Compra',
        descricao:
          (row.fornecedor as { nome?: string } | null)?.nome || 'Fornecedor',
        valor: Number(row.valor_total || 0),
        rota: '/compras',
      })
    }

    for (const row of vendas.data || []) {
      const data = isoDateOnly(row.data_movimentacao)
      atividades.push({
        id: `venda-${row.id}`,
        tipo: 'venda',
        data,
        titulo: 'Venda',
        descricao:
          (row.cliente as { nome?: string } | null)?.nome || 'Cliente',
        valor: Number(row.valor_total || 0),
        rota: '/vendas',
      })
    }

    for (const row of custos.data || []) {
      const data = isoDateOnly(row.data)
      atividades.push({
        id: `custo-${row.id}`,
        tipo: 'custo',
        data,
        titulo: row.categoria || 'Custo operacional',
        descricao: 'Despesa registrada',
        valor: Number(row.valor || 0),
        rota: '/custos/operacionais',
      })
    }

    for (const row of abates.data || []) {
      const data = isoDateOnly(row.data_abate)
      atividades.push({
        id: `abate-${row.id}`,
        tipo: 'abate',
        data,
        titulo: `Abate ${row.lote || ''}`.trim(),
        descricao: `${row.qtd_animais} animal(is) · ${row.tipo_animal || '—'}`,
        valor: Number(row.valor_total || 0),
        rota: '/custos/abate',
      })
    }

    for (const row of estoque.data || []) {
      const data = isoDateOnly(row.data_movimentacao)
      const entrada = row.tipo_movimentacao === 1
      atividades.push({
        id: `estoque-${row.id}`,
        tipo: 'estoque',
        data,
        titulo: entrada ? 'Entrada em estoque' : 'Saída de estoque',
        descricao: row.lote || row.observacoes || 'Movimentação',
        valor: Number(row.peso_liquido_kg || 0),
        rota: '/processamento',
      })
    }

    for (const row of visceras.data || []) {
      const data = isoDateOnly(row.created_at)
      const entrada = row.tipo === 1
      atividades.push({
        id: `viscera-${row.id}`,
        tipo: 'viscera',
        data,
        titulo: entrada ? 'Entrada de vísceras' : 'Saída de vísceras',
        descricao: row.observacao || `${row.quantidade} unidade(s)`,
        valor: Number(row.quantidade || 0),
        rota: '/visceras',
      })
    }

    atividades.sort((a, b) => {
      const byDate = b.data.localeCompare(a.data)
      if (byDate !== 0) return byDate
      return a.titulo.localeCompare(b.titulo)
    })

    return {
      ano,
      mes,
      inicio,
      fim,
      resumoPorDia: montarResumo(atividades),
      atividades,
    }
  },
}

export function getHojeIso() {
  return new Date().toISOString().slice(0, 10)
}

export function formatMesAno(ano: number, mes: number) {
  const date = new Date(ano, mes - 1, 1)
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}
