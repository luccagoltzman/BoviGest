export const TIPOS_GADO = ['Vaca', 'Boi', 'Bubalino'] as const

export type TipoGado = (typeof TIPOS_GADO)[number]

/** Inclui valor legado (texto livre) na lista ao editar registros antigos. */
export function opcoesTipoGado(valorAtual?: string | null): string[] {
  const atual = valorAtual?.trim()
  if (atual && !TIPOS_GADO.includes(atual as TipoGado)) {
    return [atual, ...TIPOS_GADO]
  }
  return [...TIPOS_GADO]
}
