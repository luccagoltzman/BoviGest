import { calcularPesoMedioAnimal, formatWeightKg } from '@/utils/masks'
import styles from './PesoMedioResumo.module.scss'

type Props = {
  pesoTotal: string | number
  quantidadeAnimais: string | number
  className?: string
  label?: string
  hint?: string
}

export function PesoMedioResumo({
  pesoTotal,
  quantidadeAnimais,
  className,
  label = 'Peso médio por animal',
  hint = 'Preencha a quantidade de animais e o peso total para calcular.',
}: Props) {
  const pesoMedio = calcularPesoMedioAnimal(pesoTotal, quantidadeAnimais)
  const temValor = pesoMedio > 0

  return (
    <div className={[styles.resumo, className].filter(Boolean).join(' ')}>
      <span className={styles.label}>{label}</span>
      <strong className={styles.valor}>
        {temValor ? `${formatWeightKg(pesoMedio)} kg` : '—'}
      </strong>
      {!temValor && (
        <small className={styles.hint}>{hint}</small>
      )}
    </div>
  )
}
