import { Card } from '@/components/ui'
import styles from './Dashboard.module.scss'

export function Dashboard() {
  return (
    <div className={styles.page}>
      <h1 className="page-title">Dashboard</h1>
      <div className={styles.cards}>
        <Card title="Resumo do mês">
          <p className={styles.placeholder}>Compras, vendas e financeiro (em desenvolvimento).</p>
        </Card>
        <Card title="Ações rápidas">
          <p className={styles.placeholder}>Nova compra, nova venda, relatórios.</p>
        </Card>
      </div>
    </div>
  )
}
