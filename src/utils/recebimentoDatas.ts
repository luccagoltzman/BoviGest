export type RecebimentoDatas = {
  data_recebimento: string
  data_referencia?: string | null
}

export function isoDateOnly(value: string) {
  return value?.slice(0, 10) || ''
}

/** Período a que o pagamento se refere (extrato / saldo do período). */
export function dataReferenciaRecebimento(recebimento: RecebimentoDatas) {
  return isoDateOnly(recebimento.data_referencia || recebimento.data_recebimento)
}

export function recebimentoComDatasDistintas(recebimento: RecebimentoDatas) {
  const referencia = recebimento.data_referencia
    ? isoDateOnly(recebimento.data_referencia)
    : ''
  if (!referencia) return false

  return referencia !== isoDateOnly(recebimento.data_recebimento)
}

export function formatDateBr(value: string) {
  if (!value) return '—'
  return new Date(`${isoDateOnly(value)}T12:00:00`).toLocaleDateString('pt-BR')
}

export function detalheRecebimentoExtrato(recebimento: RecebimentoDatas & {
  forma_pagamento?: string
  nome_pagador?: string | null
  observacao?: string
}) {
  const partes = [
    recebimento.forma_pagamento,
    recebimento.nome_pagador?.trim()
      ? `Pagador: ${recebimento.nome_pagador.trim()}`
      : null,
    recebimento.observacao,
  ]
    .filter(Boolean)

  if (recebimentoComDatasDistintas(recebimento)) {
    partes.push(
      `Recebido em ${formatDateBr(recebimento.data_recebimento)}`,
    )
  }

  return partes.join(' · ') || '—'
}
