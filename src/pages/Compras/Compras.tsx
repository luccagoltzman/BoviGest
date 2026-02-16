import { useState } from 'react'
import { Button, Card, Input, Table, Modal, ModalDetails } from '@/components/ui'
import type { DetailItem } from '@/components/ui'
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
  const [detalhe, setDetalhe] = useState<CompraRow | null>(null)

  const columns = [
    { key: 'fornecedor', header: 'Fornecedor' },
    { key: 'data', header: 'Data' },
    { key: 'qtdAnimais', header: 'Qtd. animais' },
    { key: 'pesoTotal', header: 'Peso total (kg)' },
    { key: 'valorTotal', header: 'Valor total', render: (r: CompraRow) => `R$ ${r.valorTotal.toLocaleString('pt-BR')}` },
    { key: 'mediaKg', header: 'Média/kg' },
    { key: 'status', header: 'Status' },
    {
      key: 'acoes',
      header: 'Ações',
      render: (r: CompraRow) => (
        <Button variant="ghost" onClick={() => setDetalhe(r)}>
          Ver detalhes
        </Button>
      ),
    },
  ]

  const detalheItems = (r: CompraRow): DetailItem[] => [
    { label: 'Fornecedor', value: r.fornecedor },
    { label: 'Data', value: r.data },
    { label: 'Quantidade de animais', value: r.qtdAnimais },
    { label: 'Peso total (kg)', value: r.pesoTotal },
    { label: 'Valor total', value: `R$ ${r.valorTotal.toLocaleString('pt-BR')}` },
    { label: 'Média por kg', value: r.mediaKg },
    { label: 'Média por animal', value: `R$ ${r.mediaAnimal.toLocaleString('pt-BR')}` },
    { label: 'Status', value: r.status },
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
      <Modal open={!!detalhe} onClose={() => setDetalhe(null)} title="Detalhes da compra">
        {detalhe && <ModalDetails items={detalheItems(detalhe)} />}
      </Modal>
    </div>
  )
}
