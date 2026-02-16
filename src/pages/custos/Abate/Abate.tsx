import { Button, Card, Input, Table } from '@/components/ui'
import styles from './Abate.module.scss'

interface AbateRow {
  id: string
  data: string
  lote: string
  qtdAnimais: number
  pesoBruto: number
  pesoLiquido: number
  rendimento: number
  custoTotal: number
}

const mock: AbateRow[] = [
  { id: '1', data: '2025-02-11', lote: 'L-001', qtdAnimais: 15, pesoBruto: 4500, pesoLiquido: 2250, rendimento: 50, custoTotal: 6750 },
]

export function Abate() {
  const columns = [
    { key: 'data', header: 'Data' },
    { key: 'lote', header: 'Lote' },
    { key: 'qtdAnimais', header: 'Qtd. animais' },
    { key: 'pesoBruto', header: 'Peso bruto (kg)' },
    { key: 'pesoLiquido', header: 'Peso líquido (kg)' },
    { key: 'rendimento', header: 'Rendimento (%)' },
    { key: 'custoTotal', header: 'Custo total', render: (r: AbateRow) => `R$ ${r.custoTotal.toLocaleString('pt-BR')}` },
  ]

  return (
    <div className={styles.page}>
      <h1 className="page-title">Custos de abate</h1>
      <Card title="Registro de abate">
        <div className={styles.form}>
          <Input label="Data" type="date" />
          <Input label="Lote" />
          <Input label="Quantidade de animais" type="number" />
          <Input label="Peso bruto (kg)" type="number" />
          <Input label="Peso líquido (kg)" type="number" />
          <Input label="Valor do abate (R$)" type="number" />
          <Input label="Taxas / inspeção (R$)" type="number" />
          <div className={styles.actions}>
            <Button>Registrar abate</Button>
          </div>
        </div>
      </Card>
      <Card title="Histórico de abates">
        <Table columns={columns} data={mock} keyExtractor={(r) => r.id} />
      </Card>
    </div>
  )
}
