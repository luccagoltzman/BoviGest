import { CORTE_BD } from '@/constants/cortes'

export interface PecaBandaAbate {
  numero: number
  corte: string
  dianteiro_kg: number
  traseiro_kg: number
}

function round2(value: number) {
  return Math.round(value * 100) / 100
}

/** Gera qtd_animais × 2 peças do tipo Banda (BD). */
export function gerarPecasBandaPorAbate(
  qtdAnimais: number,
  pesoCarcacaKg: number,
): PecaBandaAbate[] {
  const qtdPecas = Math.max(0, Math.floor(Number(qtdAnimais) || 0) * 2)
  if (qtdPecas === 0) return []

  const pesoPorBanda =
    Number(pesoCarcacaKg) > 0 ? Number(pesoCarcacaKg) / qtdPecas : 0
  const metade = pesoPorBanda / 2

  return Array.from({ length: qtdPecas }, (_, index) => ({
    numero: index + 1,
    corte: CORTE_BD,
    dianteiro_kg: round2(metade),
    traseiro_kg: round2(metade),
  }))
}

export function calcularPesoTotalPecas(pecas: PecaBandaAbate[]) {
  return pecas.reduce(
    (acc, peca) => acc + Number(peca.dianteiro_kg || 0) + Number(peca.traseiro_kg || 0),
    0,
  )
}

/** Quantidade de vísceras gerada por abate (1 por animal). */
export function gerarQuantidadeViscerasPorAbate(qtdAnimais: number) {
  return Math.max(0, Math.floor(Number(qtdAnimais) || 0))
}

export function viscerasDefaultValuesPorAbate(
  qtdAnimais: number,
  lote?: string,
) {
  const quantidade = gerarQuantidadeViscerasPorAbate(qtdAnimais)
  const loteLabel = lote?.trim()

  return {
    tipo: 1,
    quantidade,
    observacao: loteLabel
      ? `Entrada automática — abate (${loteLabel})`
      : 'Entrada automática — abate',
  }
}

/** Formato esperado pelo ProcessamentoModal. */
export function pecasParaModalProcessamento(pecas: PecaBandaAbate[]) {
  return pecas.map((peca) => {
    const dianteiro = Number(peca.dianteiro_kg || 0)
    const traseiro = Number(peca.traseiro_kg || 0)

    return {
      corte: CORTE_BD,
      peso_liquido_kg: String(dianteiro + traseiro),
      quantidade_pecas: '1',
      tipo_movimentacao: '1',
      agrupamento_id: crypto.randomUUID(),
      composicoes: [
        { tipo_corte: 'Dianteiro', peso_kg: String(dianteiro) },
        { tipo_corte: 'Traseiro', peso_kg: String(traseiro) },
      ],
    }
  })
}
