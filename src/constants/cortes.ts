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

/** Carnes em excesso do processamento — venda por peso (kg) */
export const CORTE_RETALHO = 'Retalho'
export const REGRA_RETALHO =
  'Retalho = excesso de carnes do boi. Informe a quantidade de peças, o peso (kg) de cada uma e o valor por kg.'

/** Cortes vendidos por peso, peça a peça (mesmo fluxo de BANDA/casado) */
export const CORTES_PECA_SIMPLES = [
  'Dianteiro',
  'Traseiro',
  'Costela',
  CORTE_RETALHO,
] as const

export const REGRA_PECA_SIMPLES =
  'Informe a quantidade de peças e o peso (kg) de cada uma.'
