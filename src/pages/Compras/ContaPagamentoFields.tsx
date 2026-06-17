import { Button, Input, Select } from '@/components/ui'
import { formatPixChaveInput } from '@/utils/masks'
import {
  TIPOS_CONTA_PAGAMENTO,
  TIPOS_PIX_PAGAMENTO,
  type ContaPagamentoData,
  contaPagamentoTemDados,
} from '@/utils/contaPagamento'
import styles from './ContaPagamentoFields.module.scss'

type Props = {
  value: ContaPagamentoData
  onChange: (value: ContaPagamentoData) => void
  onRestaurarFornecedor?: () => void
  titulo?: string
  hint?: string
  className?: string
}

export function ContaPagamentoFields({
  value,
  onChange,
  onRestaurarFornecedor,
  titulo = 'Conta para pagamento',
  hint = 'Preenchida automaticamente com os dados do fornecedor. Edite se o pagamento for para outra conta.',
  className,
}: Props) {
  function patch(partial: Partial<ContaPagamentoData>) {
    onChange({ ...value, ...partial })
  }

  return (
    <div className={[styles.block, className].filter(Boolean).join(' ')}>
      <div className={styles.blockHead}>
        <div>
          <h4 className={styles.blockTitle}>{titulo}</h4>
          <p className={styles.blockHint}>{hint}</p>
        </div>
        {onRestaurarFornecedor && (
          <Button type="button" variant="outline" onClick={onRestaurarFornecedor}>
            Usar conta do fornecedor
          </Button>
        )}
      </div>

      {!contaPagamentoTemDados(value) && (
        <p className={styles.avisoVazio}>
          O fornecedor não tem dados bancários cadastrados. Informe a conta
          manualmente ou atualize o cadastro do fornecedor.
        </p>
      )}

      <div className={styles.grid}>
        <Input
          label="Banco"
          placeholder="Ex.: Banco do Brasil"
          value={value.banco}
          onChange={(e) => patch({ banco: e.target.value })}
        />
        <Input
          label="Agência"
          value={value.agencia}
          onChange={(e) => patch({ agencia: e.target.value })}
        />
        <Input
          label="Conta"
          value={value.conta}
          onChange={(e) => patch({ conta: e.target.value })}
        />
        <Select
          label="Tipo de conta"
          options={[...TIPOS_CONTA_PAGAMENTO]}
          value={value.tipo_conta}
          onChange={(e) => patch({ tipo_conta: e.target.value })}
        />
        <Input
          label="Titular da conta"
          value={value.titular_conta}
          onChange={(e) => patch({ titular_conta: e.target.value })}
        />
        <Select
          label="Tipo de chave PIX"
          options={[...TIPOS_PIX_PAGAMENTO]}
          value={value.pix_tipo}
          onChange={(e) => patch({ pix_tipo: e.target.value })}
        />
        <Input
          label="Chave PIX"
          placeholder="Informe a chave conforme o tipo selecionado"
          value={value.pix_chave}
          onChange={(e) =>
            patch({
              pix_chave: formatPixChaveInput(value.pix_tipo, e.target.value),
            })
          }
        />
      </div>
    </div>
  )
}
