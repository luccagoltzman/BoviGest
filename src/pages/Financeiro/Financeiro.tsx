import { useState } from 'react'
import { Button, Card, Input, Table, Modal, ModalDetails } from '@/components/ui'
import type { DetailItem } from '@/components/ui'
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
  { id: '1', descricao: 'Compra gado - Fazenda São João', tipo: 'pagar', valor: 108000, vencimento: '2025-02-25', status: 'Pendente' },
  { id: '2', descricao: 'Compra gado - Fazenda Boi Gordo (parcela 1/3)', tipo: 'pagar', valor: 54000, vencimento: '2025-02-22', status: 'Pendente' },
  { id: '3', descricao: 'Abate - Lote L-001', tipo: 'pagar', valor: 6750, vencimento: '2025-02-20', status: 'Pago' },
  { id: '4', descricao: 'Transporte - Viagem #12', tipo: 'pagar', valor: 1250, vencimento: '2025-02-18', status: 'Pago' },
  { id: '5', descricao: 'Venda - Super Carnes Ltda', tipo: 'receber', valor: 40000, vencimento: '2025-02-28', status: 'Pendente' },
  { id: '6', descricao: 'Venda - Açougue Central', tipo: 'receber', valor: 19200, vencimento: '2025-02-20', status: 'Pago' },
  { id: '7', descricao: 'Venda - Frigorífico Regional (parcela 2/3)', tipo: 'receber', valor: 26667, vencimento: '2025-03-15', status: 'Pendente' },
  { id: '8', descricao: 'Energia - Conta de luz', tipo: 'pagar', valor: 1200, vencimento: '2025-02-18', status: 'Pago' },
  { id: '9', descricao: 'Venda - Mercado do Produtor', tipo: 'receber', valor: 28800, vencimento: '2025-02-14', status: 'Pago' },
  { id: '10', descricao: 'Venda - Distribuidora Carnes Norte', tipo: 'receber', valor: 51200, vencimento: '2025-02-10', status: 'Atrasado' },
]

export function Financeiro() {
  const [detalhe, setDetalhe] = useState<ContaRow | null>(null)

  const columns = [
    { key: 'descricao', header: 'Descrição' },
    { key: 'tipo', header: 'Tipo', render: (r: ContaRow) => r.tipo === 'pagar' ? 'A pagar' : 'A receber' },
    { key: 'valor', header: 'Valor', render: (r: ContaRow) => `R$ ${r.valor.toLocaleString('pt-BR')}` },
    { key: 'vencimento', header: 'Vencimento' },
    { key: 'status', header: 'Status' },
    {
      key: 'acoes',
      header: 'Ações',
      render: (r: ContaRow) => (
        <Button variant="ghost" onClick={() => setDetalhe(r)}>
          Ver detalhes
        </Button>
      ),
    },
  ]

  const detalheItems = (r: ContaRow): DetailItem[] => [
    { label: 'Descrição', value: r.descricao },
    { label: 'Tipo', value: r.tipo === 'pagar' ? 'A pagar' : 'A receber' },
    { label: 'Valor', value: `R$ ${r.valor.toLocaleString('pt-BR')}` },
    { label: 'Vencimento', value: r.vencimento },
    { label: 'Status', value: r.status },
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
      <Modal open={!!detalhe} onClose={() => setDetalhe(null)} title="Detalhes do lançamento">
        {detalhe && <ModalDetails items={detalheItems(detalhe)} />}
      </Modal>
    </div>
  )
}
