import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  BarChart3,
  LayoutDashboard,
  Package,
  RefreshCw,
  Scale,
  ShoppingCart,
  TrendingUp,
  Truck,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react'
import { Button, Card, Input } from '@/components/ui'
import { DashboardCalendar, DashboardCharts } from '@/components/dashboard'
import {
  CardFooter,
  DataTable,
  formatCurrency,
  formatDateBr,
  formatKg,
  formatPeriodLabel,
  KpiCard,
  LoadingBox,
  RankingList,
  reportStyles as styles,
} from '@/components/relatorios'
import {
  getDefaultPeriod,
  relatoriosService,
  type RelatorioDados,
} from '@/services/relatorios.service'
import { getHojeIso } from '@/services/calendario.service'

const quickActions = [
  {
    to: '/compras',
    label: 'Nova compra',
    hint: 'Registrar entrada de gado',
    icon: ShoppingCart,
  },
  {
    to: '/vendas',
    label: 'Nova venda',
    hint: 'Lançar movimentação',
    icon: TrendingUp,
  },
  {
    to: '/fornecedores',
    label: 'Fornecedores',
    hint: 'Cadastrar ou consultar',
    icon: Truck,
  },
  {
    to: '/clientes',
    label: 'Clientes',
    hint: 'Cadastrar ou consultar',
    icon: Users,
  },
  {
    to: '/processamento',
    label: 'Estoque',
    hint: 'Registrar movimentação',
    icon: Package,
  },
  {
    to: '/relatorios',
    label: 'Relatórios',
    hint: 'Análise completa',
    icon: BarChart3,
  },
] as const

export function Dashboard() {
  const defaultPeriod = getDefaultPeriod()
  const hoje = getHojeIso()

  const [startDate, setStartDate] = useState(defaultPeriod.startDate)
  const [endDate, setEndDate] = useState(defaultPeriod.endDate)
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(hoje)
  const [filterByDay, setFilterByDay] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<RelatorioDados | null>(null)

  async function carregar(filtro?: { start: string; end: string }) {
    try {
      setLoading(true)
      const relatorio = await relatoriosService.buscar({
        startDate: filtro?.start ?? startDate,
        endDate: filtro?.end ?? endDate,
      })
      setData(relatorio)
    } catch {
      toast.error('Erro ao carregar o dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  function aplicarFiltroDia(isoDate: string) {
    setSelectedCalendarDate(isoDate)
    setFilterByDay(isoDate)
    setStartDate(isoDate)
    setEndDate(isoDate)
    carregar({ start: isoDate, end: isoDate })
  }

  function limparFiltroDia() {
    const period = getDefaultPeriod()
    setFilterByDay(null)
    setSelectedCalendarDate(hoje)
    setStartDate(period.startDate)
    setEndDate(period.endDate)
    carregar({ start: period.startDate, end: period.endDate })
  }

  function aplicarMesAtual() {
    const period = getDefaultPeriod()
    setFilterByDay(null)
    setStartDate(period.startDate)
    setEndDate(period.endDate)
    carregar({ start: period.startDate, end: period.endDate })
  }

  const kpis = data?.kpis
  const periodLabel = filterByDay
    ? formatDateBr(filterByDay)
    : formatPeriodLabel(startDate, endDate)
  const resultadoClass =
    kpis && kpis.resultadoEstimado < 0 ? styles.negative : styles.positive

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className="page-title">Dashboard</h1>
          <p className={styles.subtitle}>
            {data
              ? filterByDay
                ? `Indicadores do dia ${periodLabel}`
                : `Visão geral de ${periodLabel}`
              : 'Indicadores principais do seu negócio'}
          </p>
        </div>
      </header>

      <div className={styles.toolbar}>
        <div className={styles.toolbarFields}>
          <Input
            label="Data inicial"
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value)
              setFilterByDay(null)
            }}
          />
          <Input
            label="Data final"
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value)
              setFilterByDay(null)
            }}
          />
        </div>
        <div className={styles.toolbarActions}>
          <Button
            onClick={() => {
              setFilterByDay(null)
              carregar()
            }}
            disabled={loading}
          >
            <RefreshCw size={16} style={{ marginRight: 6 }} />
            {loading ? 'Atualizando...' : 'Atualizar'}
          </Button>
          <Button variant="outline" onClick={aplicarMesAtual}>
            Mês atual
          </Button>
        </div>
      </div>

      <div className={styles.content}>
        <DashboardCalendar
          selectedDate={selectedCalendarDate}
          filterDate={filterByDay}
          onSelectDate={aplicarFiltroDia}
          onClearFilter={limparFiltroDia}
        />

        {loading && !data && (
          <LoadingBox message="Carregando indicadores..." />
        )}

        {data && kpis && (
          <>
            <div className={styles.kpiGrid}>
              <KpiCard
                label="Compras"
                value={formatCurrency(kpis.totalCompras)}
                sub={`${kpis.qtdCompras} registros no período`}
                icon={<ShoppingCart />}
                iconClass={styles.kpiIconCompras}
              />
              <KpiCard
                label="Vendas"
                value={formatCurrency(kpis.totalVendas)}
                sub={`${kpis.vendasFinalizadas} finalizadas · ${kpis.vendasPendentes} pendentes`}
                icon={<TrendingUp />}
                iconClass={styles.kpiIconVendas}
              />
              <KpiCard
                label="Custos operacionais"
                value={formatCurrency(kpis.totalCustos)}
                sub="Despesas do período"
                icon={<Wallet />}
                iconClass={styles.kpiIconCustos}
              />
              <KpiCard
                label="Estoque atual"
                value={formatKg(kpis.estoqueLiquidoKg)}
                sub="Saldo líquido total"
                icon={<Scale />}
                iconClass={styles.kpiIconEstoque}
              />
              <KpiCard
                label="Vendas pendentes"
                value={String(kpis.vendasPendentes)}
                sub="Aguardando finalização"
                icon={<UserPlus />}
                iconClass={styles.kpiIconVendas}
              />
              <KpiCard
                label="Resultado estimado"
                value={formatCurrency(kpis.resultadoEstimado)}
                sub="Vendas − compras − custos"
                icon={<LayoutDashboard />}
                highlight
                valueClass={resultadoClass}
              />
            </div>

            <DashboardCharts
              kpis={kpis}
              serieFinanceira={data.serieFinanceira}
              vendasPorCorte={data.vendasPorCorte}
              estoquePorCorte={data.estoquePorCorte}
            />

            <Card title="Ações rápidas">
              <div className={styles.quickActionsGrid}>
                {quickActions.map((action) => {
                  const Icon = action.icon
                  return (
                    <Link
                      key={action.to}
                      to={action.to}
                      className={styles.quickAction}
                    >
                      <span className={styles.quickActionIcon}>
                        <Icon aria-hidden />
                      </span>
                      <span className={styles.quickActionLabel}>
                        {action.label}
                      </span>
                      <span className={styles.quickActionHint}>
                        {action.hint}
                      </span>
                    </Link>
                  )
                })}
              </div>
            </Card>

            <div className={styles.sectionGrid}>
              <Card title="Top fornecedores">
                <RankingList
                  rows={data.comprasPorFornecedor.slice(0, 5).map((r) => ({
                    label: r.nome,
                    value: formatCurrency(r.total),
                    numeric: r.total,
                    extra: `${r.qtd} compra(s)`,
                  }))}
                  empty="Sem compras no período."
                />
                <CardFooter
                  total={formatCurrency(kpis.totalCompras)}
                  totalLabel="Total em compras"
                  to="/compras"
                  linkLabel="Ver compras"
                />
              </Card>

              <Card title="Top clientes">
                <RankingList
                  rows={data.vendasPorCliente.slice(0, 5).map((r) => ({
                    label: r.nome,
                    value: formatCurrency(r.total),
                    numeric: r.total,
                    extra: `${r.qtd} venda(s)`,
                  }))}
                  empty="Sem vendas no período."
                />
                <CardFooter
                  total={formatCurrency(kpis.totalVendas)}
                  totalLabel="Total em vendas"
                  to="/vendas"
                  linkLabel="Ver vendas"
                />
              </Card>

              <Card title="Últimas compras">
                <DataTable
                  columns={['Data', 'Fornecedor', 'Valor', 'Status']}
                  rows={
                    data.comprasRecentes.length === 0
                      ? null
                      : data.comprasRecentes.slice(0, 5).map((row) => [
                          formatDateBr(row.data),
                          (row.fornecedor as { nome?: string } | null)?.nome ||
                            '—',
                          formatCurrency(Number(row.valor_total || 0)),
                          row.status || '—',
                        ])
                  }
                  emptyMessage="Nenhuma compra no período."
                />
                <CardFooter to="/compras" linkLabel="Abrir compras" />
              </Card>

              <Card title="Últimas vendas">
                <DataTable
                  columns={['Data', 'Cliente', 'Total', 'Status']}
                  rows={
                    data.vendasRecentes.length === 0
                      ? null
                      : data.vendasRecentes.slice(0, 5).map((row) => [
                          formatDateBr(row.data_movimentacao),
                          (row.cliente as { nome?: string } | null)?.nome ||
                            '—',
                          formatCurrency(Number(row.valor_total || 0)),
                          row.movimentacao_status || '—',
                        ])
                  }
                  emptyMessage="Nenhuma venda no período."
                />
                <CardFooter to="/vendas" linkLabel="Abrir vendas" />
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
