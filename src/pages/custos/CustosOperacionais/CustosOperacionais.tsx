import { Button, Card, Input, Table } from '@/components/ui'
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
  { id: '1', data: '2025-02-01', categoria: 'Energia', descricao: 'Conta de luz', valor: 1200, centroCusto: 'Produção' },
]

export function CustosOperacionais() {
  const columns = [
    { key: 'data', header: 'Data' },
    { key: 'categoria', header: 'Categoria' },
    { key: 'descricao', header: 'Descrição' },
    { key: 'valor', header: 'Valor', render: (r: CustoRow) => `R$ ${r.valor.toLocaleString('pt-BR')}` },
    { key: 'centroCusto', header: 'Centro de custo' },
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
    </div>
  )
}
