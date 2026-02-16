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
  { id: '1', nome: 'Açougue Central', doc: '98.765.432/0001-10', telefone: '(16) 98888-1111', limiteCredito: 'R$ 50.000', status: 'Ativo' },
  { id: '2', nome: 'Super Carnes Ltda', doc: '87.654.321/0001-20', telefone: '(16) 97777-2222', limiteCredito: 'R$ 80.000', status: 'Ativo' },
  { id: '3', nome: 'Frigorífico Regional', doc: '76.543.210/0001-30', telefone: '(17) 96666-3333', limiteCredito: 'R$ 120.000', status: 'Ativo' },
  { id: '4', nome: 'Açougue do Bairro', doc: '65.432.109/0001-40', telefone: '(16) 95555-4444', limiteCredito: 'R$ 25.000', status: 'Ativo' },
  { id: '5', nome: 'Restaurante Churrascaria', doc: '54.321.098/0001-50', telefone: '(16) 94444-5555', limiteCredito: 'R$ 35.000', status: 'Ativo' },
  { id: '6', nome: 'Mercado do Produtor', doc: '43.210.987/0001-60', telefone: '(18) 93333-6666', limiteCredito: 'R$ 60.000', status: 'Ativo' },
  { id: '7', nome: 'Distribuidora Carnes Norte', doc: '32.109.876/0001-70', telefone: '(19) 92222-7777', limiteCredito: 'R$ 90.000', status: 'Inadimplente' },
  { id: '8', nome: 'Açougue Premium', doc: '21.098.765/0001-80', telefone: '(16) 91111-8888', limiteCredito: 'R$ 40.000', status: 'Ativo' },
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
