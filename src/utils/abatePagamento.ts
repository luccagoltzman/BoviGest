export type SemanaRange = {
  inicio: string
  fim: string
}

/** Semana de segunda a domingo (referência em data ISO YYYY-MM-DD). */
export function semanaRangePorData(refDate: string): SemanaRange {
  const base = new Date(`${refDate.slice(0, 10)}T12:00:00`)
  const dia = base.getDay()
  const offsetSegunda = dia === 0 ? -6 : 1 - dia

  const segunda = new Date(base)
  segunda.setDate(base.getDate() + offsetSegunda)

  const domingo = new Date(segunda)
  domingo.setDate(segunda.getDate() + 6)

  return {
    inicio: segunda.toISOString().slice(0, 10),
    fim: domingo.toISOString().slice(0, 10),
  }
}

export function formatSemanaLabel(inicio: string, fim: string) {
  const fmt = (d: string) =>
    new Date(`${d.slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR')
  return `${fmt(inicio)} a ${fmt(fim)}`
}

export function vencimentoSemanalAbate(dataAbate: string) {
  return semanaRangePorData(dataAbate).fim
}
