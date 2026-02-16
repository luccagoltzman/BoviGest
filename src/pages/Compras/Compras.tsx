import { useState } from 'react'
import { Button, Card, Input, Table } from '@/components/ui'
import styles from './Compras.module.scss'

interface CompraRow {
  id: string
  fornecedor: string
  data: string
  qtdAnimais: number
  pesoTotal: number
  valorTotal: number
  mediaKg: number
  mediaAnimal: number
  status: string
}

const mock: CompraRow[] = [
  {
    id: '1',
    fornecedor: 'Fazenda São João',
    data: '2025-02-10',
    qtdAnimais: 15,
    pesoTotal: 4500,
    valorTotal: 135000,
    mediaKg: 30,
    mediaAnimal: 9000,
    status: 'Pago',
  },
]

export function Compras() {
  const [data] = useState<CompraRow[]>(mock)

  const columns = [
    { key: 'fornecedor', header: 'Fornecedor' },
    { key: 'data', header: 'Data' },
    { key: 'qtdAnimais', header: 'Qtd. animais' },
    { key: 'pesoTotal', header: 'Peso total (kg)' },
    { key: 'valorTotal', header: 'Valor total', render: (r: CompraRow) => `R$ ${r.valorTotal.toLocaleString('pt-BR')}` },
    { key: 'mediaKg', header: 'Média/kg' },
    { key: 'status', header: 'Status' },
  ]

  return (
    <div className={styles.page}>
      <h1 className="page-title">Compras de Gado</h1>
      <Card title="Nova compra">
        <div className={styles.form}>
          <Input label="Fornecedor" placeholder="Selecione ou cadastre" />
          <Input label="Data" type="date" />
          <Input label="Quantidade de animais" type="number" />
          <Input label="Peso total (kg)" type="number" />
          <Input label="Valor total (R$)" type="number" />
          <Input label="Tipo de gado" placeholder="Opcional" />
          <Input label="Observações" placeholder="Opcional" />
          <div className={styles.actions}>
            <Button>Salvar compra</Button>
          </div>
        </div>
      </Card>
      <Card title="Histórico de compras">
        <Table columns={columns} data={data} keyExtractor={(r) => r.id} />
      </Card>
    </div>
  )
}
