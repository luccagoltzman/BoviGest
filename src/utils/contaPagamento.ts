export type ContaPagamentoData = {
  banco: string
  agencia: string
  conta: string
  tipo_conta: string
  titular_conta: string
  pix_tipo: string
  pix_chave: string
}

export const TIPOS_CONTA_PAGAMENTO = ['Corrente', 'Poupança'] as const
export const TIPOS_PIX_PAGAMENTO = [
  'CPF',
  'CNPJ',
  'E-mail',
  'Telefone',
  'Chave aleatória',
] as const

export function emptyContaPagamento(): ContaPagamentoData {
  return {
    banco: '',
    agencia: '',
    conta: '',
    tipo_conta: '',
    titular_conta: '',
    pix_tipo: '',
    pix_chave: '',
  }
}

export function contaPagamentoFromFornecedor(
  fornecedor:
    | Partial<Record<keyof ContaPagamentoData, string | null | undefined>>
    | null
    | undefined,
): ContaPagamentoData {
  if (!fornecedor) return emptyContaPagamento()

  return {
    banco: fornecedor.banco || '',
    agencia: fornecedor.agencia || '',
    conta: fornecedor.conta || '',
    tipo_conta: fornecedor.tipo_conta || '',
    titular_conta: fornecedor.titular_conta || '',
    pix_tipo: fornecedor.pix_tipo || '',
    pix_chave: fornecedor.pix_chave || '',
  }
}

export function contaPagamentoFromParcela(
  parcela: Partial<{
    pagamento_banco: string | null
    pagamento_agencia: string | null
    pagamento_conta: string | null
    pagamento_tipo_conta: string | null
    pagamento_titular: string | null
    pagamento_pix_tipo: string | null
    pagamento_pix_chave: string | null
  }>,
): ContaPagamentoData {
  return {
    banco: parcela.pagamento_banco || '',
    agencia: parcela.pagamento_agencia || '',
    conta: parcela.pagamento_conta || '',
    tipo_conta: parcela.pagamento_tipo_conta || '',
    titular_conta: parcela.pagamento_titular || '',
    pix_tipo: parcela.pagamento_pix_tipo || '',
    pix_chave: parcela.pagamento_pix_chave || '',
  }
}

export function contaPagamentoToDb(conta: ContaPagamentoData) {
  return {
    pagamento_banco: conta.banco.trim() || null,
    pagamento_agencia: conta.agencia.trim() || null,
    pagamento_conta: conta.conta.trim() || null,
    pagamento_tipo_conta: conta.tipo_conta || null,
    pagamento_titular: conta.titular_conta.trim() || null,
    pagamento_pix_tipo: conta.pix_tipo || null,
    pagamento_pix_chave: conta.pix_chave.trim() || null,
  }
}

export const PAGAMENTO_CONTA_DB_KEYS = [
  'pagamento_banco',
  'pagamento_agencia',
  'pagamento_conta',
  'pagamento_tipo_conta',
  'pagamento_titular',
  'pagamento_pix_tipo',
  'pagamento_pix_chave',
] as const

export function stripContaPagamentoDbFields<T extends Record<string, unknown>>(
  row: T,
): T {
  const copy = { ...row }
  for (const key of PAGAMENTO_CONTA_DB_KEYS) {
    delete copy[key]
  }
  return copy
}

export const AVISO_SQL_CONTA_PAGAMENTO =
  'Pagamento salvo, mas os dados bancários não foram gravados. Execute os scripts supabase/compras-parcelas-conta-pagamento.sql e supabase/compras-parcelas-pagador.sql no Supabase.'

export type PagadorTipo = 'proprio' | 'terceiro'

export const PAGADOR_TIPO_OPCOES: { value: PagadorTipo; label: string }[] = [
  { value: 'proprio', label: 'Eu / minha empresa' },
  { value: 'terceiro', label: 'Outra pessoa' },
]

export function pagadorTipoLabel(tipo?: string | null) {
  if (tipo === 'terceiro') return 'Outra pessoa'
  return 'Eu / minha empresa'
}

export function contaOrigemFromParcela(
  parcela: Partial<{
    origem_banco: string | null
    origem_agencia: string | null
    origem_conta: string | null
    origem_tipo_conta: string | null
    origem_titular: string | null
    origem_pix_tipo: string | null
    origem_pix_chave: string | null
  }>,
): ContaPagamentoData {
  return {
    banco: parcela.origem_banco || '',
    agencia: parcela.origem_agencia || '',
    conta: parcela.origem_conta || '',
    tipo_conta: parcela.origem_tipo_conta || '',
    titular_conta: parcela.origem_titular || '',
    pix_tipo: parcela.origem_pix_tipo || '',
    pix_chave: parcela.origem_pix_chave || '',
  }
}

export function contaOrigemToDb(conta: ContaPagamentoData) {
  return {
    origem_banco: conta.banco.trim() || null,
    origem_agencia: conta.agencia.trim() || null,
    origem_conta: conta.conta.trim() || null,
    origem_tipo_conta: conta.tipo_conta || null,
    origem_titular: conta.titular_conta.trim() || null,
    origem_pix_tipo: conta.pix_tipo || null,
    origem_pix_chave: conta.pix_chave.trim() || null,
  }
}

export function pagadorParcelaToDb(
  pagadorTipo: PagadorTipo,
  contaOrigem?: ContaPagamentoData,
) {
  if (pagadorTipo === 'proprio') {
    return {
      pagador_tipo: 'proprio' as const,
      origem_banco: null,
      origem_agencia: null,
      origem_conta: null,
      origem_tipo_conta: null,
      origem_titular: null,
      origem_pix_tipo: null,
      origem_pix_chave: null,
    }
  }

  return {
    pagador_tipo: 'terceiro' as const,
    ...contaOrigemToDb(contaOrigem || emptyContaPagamento()),
  }
}

export function validarPagadorParcela(
  pagadorTipo: PagadorTipo,
  contaOrigem: ContaPagamentoData,
  aoRegistrarPagamento = false,
) {
  if (!aoRegistrarPagamento) return null
  if (pagadorTipo !== 'terceiro') return null
  if (contaPagamentoTemDados(contaOrigem)) return null
  return 'Informe a conta bancária de origem quando o pagamento for feito por outra pessoa'
}

export const PAGADOR_ORIGEM_DB_KEYS = [
  'pagador_tipo',
  'origem_banco',
  'origem_agencia',
  'origem_conta',
  'origem_tipo_conta',
  'origem_titular',
  'origem_pix_tipo',
  'origem_pix_chave',
] as const

export function stripParcelaPagamentoDbFields<T extends Record<string, unknown>>(
  row: T,
): T {
  const copy = stripContaPagamentoDbFields(row)
  for (const key of PAGADOR_ORIGEM_DB_KEYS) {
    delete copy[key]
  }
  return copy
}

export function isMissingContaPagamentoColumnError(error: unknown) {
  if (!error || typeof error !== 'object') return false

  const record = error as { code?: string; message?: string }
  if (record.code !== 'PGRST204') return false

  const msg = record.message || ''
  return (
    msg.includes('pagamento_') ||
    msg.includes('origem_') ||
    msg.includes('pagador_tipo')
  )
}

export function contaPagamentoTemDados(conta: ContaPagamentoData) {
  return Boolean(
    conta.banco.trim() ||
      conta.agencia.trim() ||
      conta.conta.trim() ||
      conta.titular_conta.trim() ||
      conta.pix_chave.trim(),
  )
}
export function formatContaPagamentoResumo(conta: ContaPagamentoData) {
  const partes: string[] = []

  if (conta.banco.trim()) partes.push(conta.banco.trim())
  if (conta.agencia.trim()) partes.push(`Ag. ${conta.agencia.trim()}`)
  if (conta.conta.trim()) {
    const contaLabel = conta.tipo_conta
      ? `${conta.conta.trim()} (${conta.tipo_conta})`
      : conta.conta.trim()
    partes.push(`Cc ${contaLabel}`)
  }
  if (conta.titular_conta.trim()) {
    partes.push(`Titular: ${conta.titular_conta.trim()}`)
  }
  if (conta.pix_chave.trim()) {
    const tipoPix = conta.pix_tipo || 'PIX'
    partes.push(`${tipoPix}: ${conta.pix_chave.trim()}`)
  }

  return partes.length > 0 ? partes.join(' · ') : '—'
}

export function contaPagamentoToDetailItems(conta: ContaPagamentoData) {
  if (!contaPagamentoTemDados(conta)) return []

  const items: { label: string; value: string }[] = []

  if (conta.banco.trim()) items.push({ label: 'Banco', value: conta.banco.trim() })
  if (conta.agencia.trim()) {
    items.push({ label: 'Agência', value: conta.agencia.trim() })
  }
  if (conta.conta.trim()) {
    items.push({
      label: 'Conta',
      value: conta.tipo_conta
        ? `${conta.conta.trim()} (${conta.tipo_conta})`
        : conta.conta.trim(),
    })
  }
  if (conta.titular_conta.trim()) {
    items.push({ label: 'Titular', value: conta.titular_conta.trim() })
  }
  if (conta.pix_tipo.trim() || conta.pix_chave.trim()) {
    items.push({
      label: conta.pix_tipo.trim() ? `PIX (${conta.pix_tipo})` : 'PIX',
      value: conta.pix_chave.trim() || '—',
    })
  }

  return items
}
