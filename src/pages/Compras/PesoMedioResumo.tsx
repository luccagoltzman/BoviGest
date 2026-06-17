import { calcularPesoMedioAnimal, formatWeightKg } from '@/utils/masks'
import styles from './PesoMedioResumo.module.scss'

type Props = {
  pesoTotal: string | number
  quantidadeAnimais: string | number
  className?: string
}

export function PesoMedioResumo({
  pesoTotal,
  quantidadeAnimais,
  className,
}: Props) {
  const pesoMedio = calcularPesoMedioAnimal(pesoTotal, quantidadeAnimais)
  const temValor = pesoMedio > 0

  return (
    <div className={[styles.resumo, className].filter(Boolean).join(' ')}>
      <span className={styles.label}>Peso médio por animal</span>
      <strong className={styles.valor}>
        {temValor ? `${formatWeightKg(pesoMedio)} kg` : '—'}
      </strong>
      {!temValor && (
        <small className={styles.hint}>
          Preencha a quantidade de animais e o peso total para calcular.
        </small>
      )}
    </div>
  )
}
