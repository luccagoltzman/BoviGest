/**
 * Tipos de corte disponíveis.
 * BD (banda) = Dianteiro + Traseiro (a soma dos dois é igual à BD).
 * Casado (Boi, Vaca ou Bubalino) = 2 dianteiros + 2 traseiros por unidade.
 */
export const CORTES_CASADOS = [
  'Boi casado',
  'Vaca casado',
  'Bubalino casado',
] as const

export const TIPOS_CORTE = [
  'Dianteiro',
  'Traseiro',
  'Costela',
  'BD (banda)', // Dianteiro + Traseiro juntos
  ...CORTES_CASADOS,
  'Visceras',
  'Retalho',
] as const

export type TipoCorte = (typeof TIPOS_CORTE)[number]
export type CorteCasado = (typeof CORTES_CASADOS)[number]

/** Registro legado — mantido para leitura de vendas antigas */
export const CORTE_CASADO_LEGADO = 'Boi/Vaca casado'

/** Corte BD (banda) é a soma de dianteiro + traseiro */
export const CORTE_BD = 'BD (banda)'
export const REGRA_BD =
  'BD (banda) = Dianteiro + Traseiro por banda. Informe a quantidade e o peso (kg) de cada peça.'

/** 1 casado = 2 dianteiros + 2 traseiros */
export const PECAS_POR_LADO_CASADO = 2
export const REGRA_CASADO =
  'Cada casado (Boi, Vaca ou Bubalino) = 2 dianteiros + 2 traseiros. Informe o peso (kg) de cada peça.'

/** Carnes em excesso do processamento — venda por peso (kg) */
export const CORTE_RETALHO = 'Retalho'
export const REGRA_RETALHO =
  'Retalho = excesso de carnes do boi. Informe a quantidade de peças, o peso (kg) de cada uma e o valor por kg.'

/** Cortes vendidos por peso, peça a peça (mesmo fluxo de BD/casado) */
export const CORTES_PECA_SIMPLES = [
  'Dianteiro',
  'Traseiro',
  'Costela',
  CORTE_RETALHO,
] as const

export const REGRA_PECA_SIMPLES =
  'Informe a quantidade de peças e o peso (kg) de cada uma.'
