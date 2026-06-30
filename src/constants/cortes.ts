/**
 * Tipos de corte disponíveis.
 * BANDA = Dianteiro + Traseiro (a soma dos dois é igual à banda).
 * Casado (Boi/Bubalino) ou casada (Vaca) = 2 dianteiros + 2 traseiros por unidade.
 */
export const CORTES_CASADOS = [
  'Boi casado',
  'Vaca casada',
  'Bubalino casado',
] as const

export const CORTE_VACA_CASADA = 'Vaca casada'

export const TIPOS_CORTE = [
  'Dianteiro',
  'Traseiro',
  'Costela',
  'BANDA', // Dianteiro + Traseiro juntos
  ...CORTES_CASADOS,
  'Visceras',
  'Retalho',
] as const

export type TipoCorte = (typeof TIPOS_CORTE)[number]
export type CorteCasado = (typeof CORTES_CASADOS)[number]

/** Nome legado — registros antigos no banco */
export const CORTE_VACA_CASADA_LEGADO = 'Vaca casado'

/** Registro legado — mantido para leitura de vendas antigas */
export const CORTE_CASADO_LEGADO = 'Boi/Vaca casado'

/** Nome legado do corte banda (registros antigos no banco) */
export const CORTE_BANDA_LEGADO = 'BD (banda)'

/** Banda = dianteiro + traseiro */
export const CORTE_BD = 'BANDA'
export const REGRA_BD =
  'BANDA = Dianteiro + Traseiro por peça. Informe a quantidade e o peso (kg) de cada uma.'

/** 1 casado = 2 dianteiros + 2 traseiros */
export const PECAS_POR_LADO_CASADO = 2
export const REGRA_CASADO =
  'Cada unidade (Boi casado, Vaca casada ou Bubalino casado) = 2 dianteiros + 2 traseiros. Informe o peso (kg) de cada peça.'

/** Romaneio/compra: N animais → 2N dianteiros + 2N traseiros */
export function pecasPrevistasPorAnimais(quantidadeAnimais: number) {
  const qtd = Math.max(0, Math.floor(Number(quantidadeAnimais) || 0))
  const porLado = qtd * PECAS_POR_LADO_CASADO
  return { qtd_dianteiro: porLado, qtd_traseiro: porLado }
}

/** Carnes em excesso do processamento — vendido por peso (kg) */
export const CORTE_RETALHO = 'Retalho'
export const REGRA_RETALHO =
  'Informe quantos animais foram abatidos no dia, o peso total do retalho (kg) e o valor por kg.'

/** Cortes vendidos por peso, peça a peça (mesmo fluxo de BANDA/casado) */
export const CORTES_PECA_SIMPLES = [
  'Dianteiro',
  'Traseiro',
  'Costela',
] as const

export const REGRA_PECA_SIMPLES =
  'Informe a quantidade de peças e o peso (kg) de cada uma.'
