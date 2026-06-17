export function hojeIso() {
  return new Date().toISOString().split('T')[0]
}

export function defaultPeriodoRetroativo() {
  const fim = new Date()
  const inicio = new Date()
  inicio.setMonth(inicio.getMonth() - 1)

  return {
    inicio: inicio.toISOString().split('T')[0],
    fim: fim.toISOString().split('T')[0],
  }
}

export function formatDateBr(value: string) {
  if (!value) return '—'
  const date = new Date(`${value.slice(0, 10)}T12:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('pt-BR')
}

export function validarDataRetroativa(
  data: string,
  inicio: string,
  fim: string,
) {
  if (!inicio || !fim) {
    return 'Informe o período para os lançamentos retroativos.'
  }
  if (inicio > fim) {
    return 'A data inicial do período deve ser anterior à data final.'
  }
  if (!data) return 'Informe a data da peça.'
  if (data < inicio) {
    return `A data deve ser a partir de ${formatDateBr(inicio)}.`
  }
  if (data > fim) {
    return `A data deve ser até ${formatDateBr(fim)}.`
  }
  if (data > hojeIso()) {
    return 'Não é possível lançar vendas em datas futuras.'
  }
  return null
}

export function resolverDataItemVenda(
  item: { data_movimentacao?: string | null },
  modoRetroativo: boolean,
) {
  if (!modoRetroativo) return hojeIso()
  return item.data_movimentacao?.slice(0, 10) || hojeIso()
}

export function resolverDataCabecalhoMovimentacao(
  itens: { data_movimentacao?: string | null }[],
  modoRetroativo: boolean,
) {
  if (!modoRetroativo) return hojeIso()

  const datas = itens
    .map((item) => resolverDataItemVenda(item, true))
    .filter(Boolean)
    .sort()

  return datas[0] || hojeIso()
}

export function formatDatasMovimentacaoLabel(
  itens: { data_movimentacao?: string | null }[] | undefined,
  dataCabecalho?: string,
) {
  const datas = [
    ...new Set(
      (itens ?? [])
        .map((item) => item.data_movimentacao?.slice(0, 10))
        .filter(Boolean) as string[],
    ),
  ].sort()

  if (datas.length > 1) {
    return `${formatDateBr(datas[0])} – ${formatDateBr(datas[datas.length - 1])}`
  }

  if (datas.length === 1) {
    return formatDateBr(datas[0])
  }

  return formatDateBr(dataCabecalho || '')
}

export function dataItemParaExibicao(
  item: { data_movimentacao?: string | null } | null | undefined,
  dataCabecalho?: string,
) {
  return formatDateBr(item?.data_movimentacao?.slice(0, 10) || dataCabecalho || '')
}
