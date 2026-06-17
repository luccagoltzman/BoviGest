import {
  contaPagamentoTemDados,
  type ContaPagamentoData,
} from '@/utils/contaPagamento'
import styles from './ContaPagamentoResumo.module.scss'

type Props = {
  value: ContaPagamentoData
  titulo?: string
  hint?: string
  className?: string
}

export function ContaPagamentoResumo({
  value,
  titulo = 'Dados bancários',
  hint,
  className,
}: Props) {
  if (!contaPagamentoTemDados(value)) return null

  return (
    <section className={[styles.block, className].filter(Boolean).join(' ')}>
      <div>
        <h4 className={styles.title}>{titulo}</h4>
        {hint && <p className={styles.hint}>{hint}</p>}
      </div>

      <dl className={styles.grid}>
        {value.banco.trim() && (
          <div>
            <dt>Banco</dt>
            <dd>{value.banco}</dd>
          </div>
        )}
        {value.agencia.trim() && (
          <div>
            <dt>Agência</dt>
            <dd>{value.agencia}</dd>
          </div>
        )}
        {value.conta.trim() && (
          <div>
            <dt>Conta</dt>
            <dd>
              {value.conta}
              {value.tipo_conta ? ` (${value.tipo_conta})` : ''}
            </dd>
          </div>
        )}
        {value.titular_conta.trim() && (
          <div>
            <dt>Titular</dt>
            <dd>{value.titular_conta}</dd>
          </div>
        )}
        {value.pix_chave.trim() && (
          <div>
            <dt>{value.pix_tipo ? `PIX (${value.pix_tipo})` : 'PIX'}</dt>
            <dd>{value.pix_chave}</dd>
          </div>
        )}
      </dl>
    </section>
  )
}
