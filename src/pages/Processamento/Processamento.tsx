import { Button, Card, Input, Table } from '@/components/ui'
import styles from './Processamento.module.scss'

interface EstoqueRow {
  id: string
  lote: string
  corte: string
  pesoKg: number
  dataEntrada: string
}

const mock: EstoqueRow[] = [
  { id: '1', lote: 'L-001', corte: 'Dianteiro', pesoKg: 120, dataEntrada: '2025-02-10' },
]

export function Processamento() {
  const columns = [
    { key: 'lote', header: 'Lote' },
    { key: 'corte', header: 'Tipo de corte' },
    { key: 'pesoKg', header: 'Peso (kg)' },
    { key: 'dataEntrada', header: 'Data entrada' },
  ]

  return (
    <div className={styles.page}>
      <h1 className="page-title">Processamento / Estoque</h1>
      <Card title="Entrada – conversão em carne">
        <div className={styles.form}>
          <Input label="Lote" />
          <Input label="Peso bruto (kg)" type="number" />
          <Input label="Peso líquido (kg)" type="number" />
          <Input label="Tipo de corte" placeholder="Dianteiro, traseiro, costela..." />
          <Input label="Quebra / perdas (%)" type="number" />
          <div className={styles.actions}>
            <Button>Registrar entrada</Button>
          </div>
        </div>
      </Card>
      <Card title="Estoque atual">
        <Table columns={columns} data={mock} keyExtractor={(r) => r.id} />
      </Card>
    </div>
  )
}
