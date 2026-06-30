import { pecasPrevistasPorAnimais } from '@/constants/cortes'
import { Input } from '@/components/ui'
import { parseIntegerInput } from '@/utils/masks'
import styles from './PecasPrevistasPesosFields.module.scss'

type Props = {
  quantidadeAnimais: string | number
  pesoBrutoDianteiro: string
  pesoBrutoTraseiro: string
  onChangePesoDianteiro: (value: string) => void
  onChangePesoTraseiro: (value: string) => void
  className?: string
  disabled?: boolean
}

export function PecasPrevistasPesosFields({
  quantidadeAnimais,
  pesoBrutoDianteiro,
  pesoBrutoTraseiro,
  onChangePesoDianteiro,
  onChangePesoTraseiro,
  className,
  disabled = false,
}: Props) {
  const qtd =
    typeof quantidadeAnimais === 'string'
      ? parseIntegerInput(quantidadeAnimais)
      : Math.max(0, Math.floor(Number(quantidadeAnimais) || 0))

  const { qtd_dianteiro, qtd_traseiro } = pecasPrevistasPorAnimais(qtd)
  const camposDesabilitados = disabled || qtd <= 0

  return (
    <section className={[styles.wrap, className].filter(Boolean).join(' ')}>
      <p className={styles.titulo}>Peças previstas no estoque</p>
      {qtd > 0 ? (
        <p className={styles.animaisHint}>
          {qtd} {qtd === 1 ? 'animal' : 'animais'} · 2 dianteiros e 2 traseiros
          por animal. Ao salvar a compra, os pesos informados entram no estoque
          (use o romaneio para detalhar peça a peça).
        </p>
      ) : (
        <p className={styles.animaisHint}>
          Informe a quantidade de animais para calcular as peças.
        </p>
      )}

      <div className={styles.grid}>
        <div className={styles.col}>
          <div className={styles.qtdLinha}>
            <span className={styles.qtdLabel}>Dianteiros</span>
            <strong className={styles.qtdValor}>
              {qtd > 0 ? qtd_dianteiro : '—'}
            </strong>
          </div>
          <Input
            label="Peso bruto total (kg)"
            mask="decimal"
            value={pesoBrutoDianteiro}
            disabled={camposDesabilitados}
            onChange={(e) => onChangePesoDianteiro(e.target.value)}
          />
        </div>

        <div className={styles.col}>
          <div className={styles.qtdLinha}>
            <span className={styles.qtdLabel}>Traseiros</span>
            <strong className={styles.qtdValor}>
              {qtd > 0 ? qtd_traseiro : '—'}
            </strong>
          </div>
          <Input
            label="Peso bruto total (kg)"
            mask="decimal"
            value={pesoBrutoTraseiro}
            disabled={camposDesabilitados}
            onChange={(e) => onChangePesoTraseiro(e.target.value)}
          />
        </div>
      </div>
    </section>
  )
}
