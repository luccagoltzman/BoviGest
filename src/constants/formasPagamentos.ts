export const FORMAS_PAGAMENTO = [
  'Dinheiro',
  'Pix',
  'Cartão de Débito',
  'Cartão de Crédito',
  'Transferência Bancária',
  'Boleto',
  'Cheque',
  'Fiado',
  'Outro',
] as const

export type FormaPagamento =
  (typeof FORMAS_PAGAMENTO)[number]