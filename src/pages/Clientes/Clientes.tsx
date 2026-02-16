import { useState } from 'react'
import { Button, Card, Input, Table, Modal, ModalDetails } from '@/components/ui'
import type { DetailItem } from '@/components/ui'
import styles from './Clientes.module.scss'

interface ClienteRow {
  id: string
  nome: string
  doc: string
  telefone: string
  limiteCredito: string
  status: string
}

const mock: ClienteRow[] = [
  { id: '1', nome: 'Açougue Central', doc: '98.765.432/0001-10', telefone: '(11) 98888-8888', limiteCredito: 'R$ 50.000', status: 'Ativo' },
]

export function Clientes() {
  const [detalhe, setDetalhe] = useState<ClienteRow | null>(null)

  const columns = [
    { key: 'nome', header: 'Nome / Empresa' },
    { key: 'doc', header: 'CPF/CNPJ' },
    { key: 'telefone', header: 'Telefone / WhatsApp' },
    { key: 'limiteCredito', header: 'Limite de crédito' },
    { key: 'status', header: 'Status' },
    {
      key: 'acoes',
      header: 'Ações',
      render: (r: ClienteRow) => (
        <Button variant="ghost" onClick={() => setDetalhe(r)}>
          Ver detalhes
        </Button>
      ),
    },
  ]

  const detalheItems = (r: ClienteRow): DetailItem[] => [
    { label: 'Nome / Empresa', value: r.nome },
    { label: 'CPF/CNPJ', value: r.doc },
    { label: 'Telefone / WhatsApp', value: r.telefone },
    { label: 'Limite de crédito', value: r.limiteCredito },
    { label: 'Status', value: r.status },
  ]

  return (
    <div className={styles.page}>
      <h1 className="page-title">Clientes</h1>
      <Card title="Novo cliente">
        <div className={styles.form}>
          <Input label="Nome / Empresa" />
          <Input label="CPF / CNPJ" />
          <Input label="Telefone / WhatsApp" />
          <Input label="Endereço" />
          <Input label="Limite de crédito (opcional)" type="number" />
          <div className={styles.actions}>
            <Button>Cadastrar</Button>
          </div>
        </div>
      </Card>
      <Card title="Lista de clientes">
        <Table columns={columns} data={mock} keyExtractor={(r) => r.id} />
      </Card>
      <Modal open={!!detalhe} onClose={() => setDetalhe(null)} title="Detalhes do cliente">
        {detalhe && <ModalDetails items={detalheItems(detalhe)} />}
      </Modal>
    </div>
  )
}
