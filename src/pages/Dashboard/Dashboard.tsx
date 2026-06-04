import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui'
import {
  getDefaultPeriod,
  relatoriosService,
} from '@/services/relatorios.service'
import styles from './Dashboard.module.scss'

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [kpis, setKpis] = useState({
    totalCompras: 0,
    qtdCompras: 0,
    totalVendas: 0,
    qtdVendas: 0,
    vendasPendentes: 0,
    resultadoEstimado: 0,
  })

  useEffect(() => {
    async function carregar() {
      try {
        const period = getDefaultPeriod()
        const relatorio = await relatoriosService.buscar(period)
        setKpis(relatorio.kpis)
      } finally {
        setLoading(false)
      }
    }

    carregar()
  }, [])

  const periodoLabel = new Date().toLocaleDateString('pt-BR', {
    month: 'short',
    year: '2-digit',
  })

  return (
    <div className={styles.page}>
      <h1 className="page-title">Dashboard</h1>

      <div className={styles.cards}>
        <Card title={`Compras no mês (${periodoLabel})`}>
          <p className={styles.valor}>
            {loading ? '...' : formatCurrency(kpis.totalCompras)}
          </p>
          <p className={styles.sub}>
            {loading ? '' : `${kpis.qtdCompras} compras registradas`}
          </p>
        </Card>

        <Card title={`Vendas no mês (${periodoLabel})`}>
          <p className={styles.valor}>
            {loading ? '...' : formatCurrency(kpis.totalVendas)}
          </p>
          <p className={styles.sub}>
            {loading ? '' : `${kpis.qtdVendas} movimentações`}
          </p>
        </Card>

        <Card title="Vendas pendentes">
          <p className={styles.valorReceber}>
            {loading ? '...' : kpis.vendasPendentes}
          </p>
          <p className={styles.sub}>Aguardando finalização</p>
        </Card>

        <Card title="Resultado estimado">
          <p
            className={
              kpis.resultadoEstimado >= 0
                ? styles.valorReceber
                : styles.valorPagar
            }
          >
            {loading ? '...' : formatCurrency(kpis.resultadoEstimado)}
          </p>
          <p className={styles.sub}>Vendas − compras − custos</p>
        </Card>
      </div>

      <Card title="Ações rápidas" className={styles.acoes}>
        <div className={styles.links}>
          <Link to="/compras">Nova compra</Link>
          <Link to="/vendas">Nova venda</Link>
          <Link to="/fornecedores">Cadastrar fornecedor</Link>
          <Link to="/clientes">Cadastrar cliente</Link>
          <Link to="/processamento">Registrar estoque</Link>
          <Link to="/relatorios">Relatórios completos</Link>
        </div>
      </Card>
    </div>
  )
}
