export const STATUS_VENDA = {
  PENDENTE: 0,
  PAGO: 1,
  PARCIAL: 2,
  CANCELADO: 3,
  AGENDADO: 4,
} as const

export const STATUS_VENDA_LABEL = {
  [STATUS_VENDA.PENDENTE]:
    'Pendente',

  [STATUS_VENDA.PAGO]:
    'Pago',

  [STATUS_VENDA.PARCIAL]:
    'Parcial',

  [STATUS_VENDA.CANCELADO]:
    'Cancelado',

  [STATUS_VENDA.AGENDADO]:
    'Agendado',
} as const

export type StatusVenda =
  (typeof STATUS_VENDA)[keyof typeof STATUS_VENDA]