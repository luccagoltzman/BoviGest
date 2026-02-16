import { Card } from '@/components/ui'
import styles from './Relatorios.module.scss'

const sections = [
  { title: 'Compras', items: ['Compras por período', 'Por fornecedor', 'Média kg / preço'] },
  { title: 'Estoque', items: ['Saldo atual', 'Giro de estoque', 'Perdas'] },
  { title: 'Vendas', items: ['Vendas por cliente', 'Produtos mais vendidos', 'Margem'] },
  { title: 'Financeiro', items: ['Caixa', 'Inadimplência', 'Lucro estimado'] },
]

export function Relatorios() {
  return (
    <div className={styles.page}>
      <h1 className="page-title">Relatórios gerenciais</h1>
      <div className={styles.grid}>
        {sections.map((s) => (
          <Card key={s.title} title={s.title}>
            <ul className={styles.list}>
              {s.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  )
}
