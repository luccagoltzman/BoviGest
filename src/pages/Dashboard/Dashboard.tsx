import { Link } from 'react-router-dom'
import { Card } from '@/components/ui'
import styles from './Dashboard.module.scss'

const resumoMes = {
  comprasTotal: 789600,
  vendasTotal: 318800,
  aReceber: 117867,
  aPagar: 163250,
  comprasQtd: 7,
  vendasQtd: 10,
}

export function Dashboard() {
  return (
    <div className={styles.page}>
      <h1 className="page-title">Dashboard</h1>
      <div className={styles.cards}>
        <Card title="Compras no mês (fev/25)">
          <p className={styles.valor}>R$ {resumoMes.comprasTotal.toLocaleString('pt-BR')}</p>
          <p className={styles.sub}>{resumoMes.comprasQtd} compras registradas</p>
        </Card>
        <Card title="Vendas no mês (fev/25)">
          <p className={styles.valor}>R$ {resumoMes.vendasTotal.toLocaleString('pt-BR')}</p>
          <p className={styles.sub}>{resumoMes.vendasQtd} vendas realizadas</p>
        </Card>
        <Card title="A receber">
          <p className={styles.valorReceber}>R$ {resumoMes.aReceber.toLocaleString('pt-BR')}</p>
        </Card>
        <Card title="A pagar">
          <p className={styles.valorPagar}>R$ {resumoMes.aPagar.toLocaleString('pt-BR')}</p>
        </Card>
      </div>
      <Card title="Ações rápidas" className={styles.acoes}>
        <div className={styles.links}>
          <Link to="/compras">Nova compra</Link>
          <Link to="/vendas">Nova venda</Link>
          <Link to="/fornecedores">Cadastrar fornecedor</Link>
          <Link to="/clientes">Cadastrar cliente</Link>
          <Link to="/processamento">Registrar estoque</Link>
          <Link to="/visceras">Cadastrar víscera</Link>
          <Link to="/relatorios">Relatórios</Link>
        </div>
      </Card>
    </div>
  )
}
