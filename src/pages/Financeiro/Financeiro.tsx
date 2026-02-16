import { Button, Card, Input, Table } from '@/components/ui'
import styles from './Financeiro.module.scss'

interface ContaRow {
  id: string
  descricao: string
  tipo: 'pagar' | 'receber'
  valor: number
  vencimento: string
  status: string
}

const mock: ContaRow[] = [
  { id: '1', descricao: 'Compra gado - Fazenda São João', tipo: 'pagar', valor: 45000, vencimento: '2025-02-20', status: 'Pendente' },
  { id: '2', descricao: 'Venda - Açougue Central', tipo: 'receber', valor: 12000, vencimento: '2025-02-15', status: 'Pago' },
]

export function Financeiro() {
  const columns = [
    { key: 'descricao', header: 'Descrição' },
    { key: 'tipo', header: 'Tipo', render: (r: ContaRow) => r.tipo === 'pagar' ? 'A pagar' : 'A receber' },
    { key: 'valor', header: 'Valor', render: (r: ContaRow) => `R$ ${r.valor.toLocaleString('pt-BR')}` },
    { key: 'vencimento', header: 'Vencimento' },
    { key: 'status', header: 'Status' },
  ]

  return (
    <div className={styles.page}>
      <h1 className="page-title">Financeiro</h1>
      <div className={styles.grid}>
        <Card title="Contas a pagar">
          <Input label="Nova despesa - Descrição" />
          <Input label="Valor (R$)" type="number" />
          <Input label="Vencimento" type="date" />
          <Input label="Categoria" placeholder="Transporte, abate, etc." />
          <Button className={styles.btn}>Lançar</Button>
        </Card>
        <Card title="Contas a receber">
          <p className={styles.placeholder}>Recebimentos vinculados às vendas.</p>
        </Card>
      </div>
      <Card title="Fluxo de caixa">
        <Table columns={columns} data={mock} keyExtractor={(r) => r.id} />
      </Card>
    </div>
  )
}
