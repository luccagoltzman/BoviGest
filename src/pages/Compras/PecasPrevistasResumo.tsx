import { pecasPrevistasPorAnimais } from '@/constants/cortes'
import { parseIntegerInput } from '@/utils/masks'
import styles from './PesoMedioResumo.module.scss'

type Props = {
  quantidadeAnimais: string | number
  className?: string
}

export function PecasPrevistasResumo({ quantidadeAnimais, className }: Props) {
  const qtd =
    typeof quantidadeAnimais === 'string'
      ? parseIntegerInput(quantidadeAnimais)
      : Math.max(0, Math.floor(Number(quantidadeAnimais) || 0))

  const { qtd_dianteiro, qtd_traseiro } = pecasPrevistasPorAnimais(qtd)
  const temValor = qtd > 0

  return (
    <div className={[styles.resumo, className].filter(Boolean).join(' ')}>
      <span className={styles.label}>Peças previstas no estoque</span>
      <strong className={styles.valor}>
        {temValor
          ? `${qtd_dianteiro} dianteiro${qtd_dianteiro !== 1 ? 's' : ''} + ${qtd_traseiro} traseiro${qtd_traseiro !== 1 ? 's' : ''}`
          : '—'}
      </strong>
      {!temValor && (
        <small className={styles.hint}>
          2 dianteiros e 2 traseiros por animal (mesma regra do romaneio).
        </small>
      )}
      {temValor && (
        <small className={styles.hint}>
          {qtd} {qtd === 1 ? 'animal' : 'animais'} × 2 de cada lado
        </small>
      )}
    </div>
  )
}
