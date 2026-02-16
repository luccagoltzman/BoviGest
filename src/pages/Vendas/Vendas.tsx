import { useState } from 'react'
import { Button, Card, Input, Table, Modal, ModalDetails } from '@/components/ui'
import type { DetailItem } from '@/components/ui'
import styles from './Vendas.module.scss'

interface VendaRow {
  id: string
  cliente: string
  data: string
  totalKg: number
  valorTotal: number
  status: string
}

const mock: VendaRow[] = [
  { id: '1', cliente: 'Açougue Central', data: '2025-02-12', totalKg: 80, valorTotal: 12000, status: 'Pago' },
]

export function Vendas() {
  const [detalhe, setDetalhe] = useState<VendaRow | null>(null)

  const columns = [
    { key: 'cliente', header: 'Cliente' },
    { key: 'data', header: 'Data' },
    { key: 'totalKg', header: 'Total (kg)' },
    { key: 'valorTotal', header: 'Valor total', render: (r: VendaRow) => `R$ ${r.valorTotal.toLocaleString('pt-BR')}` },
    { key: 'status', header: 'Status' },
    {
      key: 'acoes',
      header: 'Ações',
      render: (r: VendaRow) => (
        <Button variant="ghost" onClick={() => setDetalhe(r)}>
          Ver detalhes
        </Button>
      ),
    },
  ]

  const detalheItems = (r: VendaRow): DetailItem[] => [
    { label: 'Cliente', value: r.cliente },
    { label: 'Data', value: r.data },
    { label: 'Total (kg)', value: r.totalKg },
    { label: 'Valor total', value: `R$ ${r.valorTotal.toLocaleString('pt-BR')}` },
    { label: 'Status', value: r.status },
  ]

  return (
    <div className={styles.page}>
      <h1 className="page-title">Vendas</h1>
      <Card title="Nova venda">
        <div className={styles.form}>
          <Input label="Cliente" />
          <Input label="Data" type="date" />
          <Input label="Produto / corte" />
          <Input label="Quantidade (kg)" type="number" />
          <Input label="Preço por kg (R$)" type="number" />
          <Input label="Desconto / acréscimo (opcional)" type="number" />
          <Input label="Forma de pagamento" placeholder="À vista, parcelado..." />
          <div className={styles.actions}>
            <Button>Registrar venda</Button>
          </div>
        </div>
      </Card>
      <Card title="Histórico de vendas">
        <Table columns={columns} data={mock} keyExtractor={(r) => r.id} />
      </Card>
      <Modal open={!!detalhe} onClose={() => setDetalhe(null)} title="Detalhes da venda">
        {detalhe && <ModalDetails items={detalheItems(detalhe)} />}
      </Modal>
    </div>
  )
}
