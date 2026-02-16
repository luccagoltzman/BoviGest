import { useState } from 'react'
import { Button, Card, Input, Table, Modal, ModalDetails } from '@/components/ui'
import type { DetailItem } from '@/components/ui'
import styles from './CustosOperacionais.module.scss'

const categorias = ['Transporte', 'Abate', 'Funcionários', 'Energia', 'Embalagem', 'Manutenção', 'Impostos', 'Outros']

interface CustoRow {
  id: string
  data: string
  categoria: string
  descricao: string
  valor: number
  centroCusto: string
}

const mock: CustoRow[] = [
  { id: '1', data: '2025-02-15', categoria: 'Energia', descricao: 'Conta de luz - sede', valor: 1200, centroCusto: 'Produção' },
  { id: '2', data: '2025-02-14', categoria: 'Transporte', descricao: 'Combustível - frota', valor: 3500, centroCusto: 'Logística' },
  { id: '3', data: '2025-02-10', categoria: 'Funcionários', descricao: 'Salários - fev/25', valor: 18500, centroCusto: 'Administrativo' },
  { id: '4', data: '2025-02-08', categoria: 'Embalagem', descricao: 'Caixas e plástico', valor: 890, centroCusto: 'Produção' },
  { id: '5', data: '2025-02-05', categoria: 'Manutenção', descricao: 'Manutenção câmara fria', valor: 2200, centroCusto: 'Produção' },
  { id: '6', data: '2025-02-01', categoria: 'Impostos', descricao: 'ISS e encargos', valor: 3100, centroCusto: 'Administrativo' },
  { id: '7', data: '2025-01-28', categoria: 'Abate', descricao: 'Taxa inspeção sanitária', valor: 450, centroCusto: 'Produção' },
  { id: '8', data: '2025-01-25', categoria: 'Outros', descricao: 'Material de escritório', valor: 320, centroCusto: 'Administrativo' },
]

export function CustosOperacionais() {
  const [detalhe, setDetalhe] = useState<CustoRow | null>(null)

  const columns = [
    { key: 'data', header: 'Data' },
    { key: 'categoria', header: 'Categoria' },
    { key: 'descricao', header: 'Descrição' },
    { key: 'valor', header: 'Valor', render: (r: CustoRow) => `R$ ${r.valor.toLocaleString('pt-BR')}` },
    { key: 'centroCusto', header: 'Centro de custo' },
    {
      key: 'acoes',
      header: 'Ações',
      render: (r: CustoRow) => (
        <Button variant="ghost" onClick={() => setDetalhe(r)}>
          Ver detalhes
        </Button>
      ),
    },
  ]

  const detalheItems = (r: CustoRow): DetailItem[] => [
    { label: 'Data', value: r.data },
    { label: 'Categoria', value: r.categoria },
    { label: 'Descrição', value: r.descricao },
    { label: 'Valor', value: `R$ ${r.valor.toLocaleString('pt-BR')}` },
    { label: 'Centro de custo', value: r.centroCusto },
  ]

  return (
    <div className={styles.page}>
      <h1 className="page-title">Custos operacionais gerais</h1>
      <Card title="Novo lançamento">
        <div className={styles.form}>
          <Input label="Data" type="date" />
          <Input label="Categoria" placeholder={categorias.join(', ')} />
          <Input label="Descrição" />
          <Input label="Valor (R$)" type="number" />
          <Input label="Centro de custo (opcional)" placeholder="Logística, Produção, Administrativo" />
          <div className={styles.actions}>
            <Button>Lançar</Button>
          </div>
        </div>
      </Card>
      <Card title="Lançamentos">
        <Table columns={columns} data={mock} keyExtractor={(r) => r.id} />
      </Card>
      <Modal open={!!detalhe} onClose={() => setDetalhe(null)} title="Detalhes do lançamento">
        {detalhe && <ModalDetails items={detalheItems(detalhe)} />}
      </Modal>
    </div>
  )
}
