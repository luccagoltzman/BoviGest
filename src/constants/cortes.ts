/**
 * Tipos de corte disponíveis.
 * BD (banda) = Dianteiro + Traseiro (a soma dos dois é igual à BD).
 */
export const TIPOS_CORTE = [
  'Dianteiro',
  'Traseiro',
  'Costela',
  'BD (banda)', // Dianteiro + Traseiro juntos
  'Outro',
] as const

export type TipoCorte = (typeof TIPOS_CORTE)[number]

/** Corte BD (banda) é a soma de dianteiro + traseiro */
export const CORTE_BD = 'BD (banda)'
export const REGRA_BD = 'BD (banda) = Dianteiro + Traseiro (a soma dos dois é igual à BD)'
