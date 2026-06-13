/**
 * Tipos de corte disponíveis.
 * BD (banda) = Dianteiro + Traseiro (a soma dos dois é igual à BD).
 * Boi/Vaca casado = 2 dianteiros + 2 traseiros por unidade (par boi + vaca).
 */
export const TIPOS_CORTE = [
  'Dianteiro',
  'Traseiro',
  'Costela',
  'BD (banda)', // Dianteiro + Traseiro juntos
  'Boi/Vaca casado',
  'Visceras',
] as const

export type TipoCorte = (typeof TIPOS_CORTE)[number]

/** Corte BD (banda) é a soma de dianteiro + traseiro */
export const CORTE_BD = 'BD (banda)'
export const REGRA_BD =
  'BD (banda) = Dianteiro + Traseiro (a soma dos dois é igual à BD)'

/** 1 casado (boi + vaca) = 2 dianteiros + 2 traseiros */
export const CORTE_CASADO = 'Boi/Vaca casado'
export const PECAS_POR_LADO_CASADO = 2
export const REGRA_CASADO =
  'Boi/Vaca casado: cada unidade = 2 dianteiros + 2 traseiros. Informe o peso (kg) de cada peça.'
