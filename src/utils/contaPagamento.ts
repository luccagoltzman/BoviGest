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
