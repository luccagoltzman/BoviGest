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
  { id: '1', fornecedor: 'Fazenda São João', data: '2025-02-14', qtdAnimais: 12, pesoTotal: 3600, valorTotal: 108000, mediaKg: 30, mediaAnimal: 9000, status: 'Pago' },
  { id: '2', fornecedor: 'Fazenda Santa Maria', data: '2025-02-12', qtdAnimais: 20, pesoTotal: 6200, valorTotal: 186000, mediaKg: 30, mediaAnimal: 9300, status: 'Pago' },
  { id: '3', fornecedor: 'Rancho do Vale', data: '2025-02-10', qtdAnimais: 15, pesoTotal: 4500, valorTotal: 135000, mediaKg: 30, mediaAnimal: 9000, status: 'Pago' },
  { id: '4', fornecedor: 'Fazenda Boi Gordo', data: '2025-02-08', qtdAnimais: 18, pesoTotal: 5400, valorTotal: 162000, mediaKg: 30, mediaAnimal: 9000, status: 'Parcelado' },
  { id: '5', fornecedor: 'Fazenda São João', data: '2025-02-05', qtdAnimais: 10, pesoTotal: 3100, valorTotal: 93000, mediaKg: 31, mediaAnimal: 9300, status: 'Pago' },
  { id: '6', fornecedor: 'Sítio Esperança', data: '2025-02-01', qtdAnimais: 8, pesoTotal: 2400, valorTotal: 72000, mediaKg: 30, mediaAnimal: 9000, status: 'Pago' },
  { id: '7', fornecedor: 'Fazenda Santa Maria', data: '2025-01-28', qtdAnimais: 22, pesoTotal: 6820, valorTotal: 204600, mediaKg: 31, mediaAnimal: 9300, status: 'Pago' },
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
