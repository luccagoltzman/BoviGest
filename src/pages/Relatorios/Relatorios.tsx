import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  ArrowRight,
  BarChart3,
  Package,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
  Wallet,
  Scale,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react'
import { Button, Card, Input } from '@/components/ui'
import {
  getDefaultPeriod,
  relatoriosService,
  type RelatorioDados,
} from '@/services/relatorios.service'
import styles from './Relatorios.module.scss'

type TabId = 'resumo' | 'compras' | 'vendas' | 'estoque' | 'custos'

const tabs: { id: TabId; label: string; icon: typeof BarChart3 }[] = [
  { id: 'resumo', label: 'Resumo', icon: BarChart3 },
  { id: 'compras', label: 'Compras', icon: ShoppingCart },
  { id: 'vendas', label: 'Vendas', icon: TrendingUp },
  { id: 'estoque', label: 'Estoque', icon: Package },
  { id: 'custos', label: 'Custos', icon: Wallet },
]

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const formatKg = (value: number) =>
  `${Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} kg`

const formatDateBr = (value: string) => {
  if (!value) return '—'
  const date = new Date(`${value.slice(0, 10)}T12:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('pt-BR')
}

const formatPeriodLabel = (start: string, end: string) =>
  `${formatDateBr(start)} — ${formatDateBr(end)}`

export function Relatorios() {
  const defaultPeriod = getDefaultPeriod()

  const [tab, setTab] = useState<TabId>('resumo')
  const [startDate, setStartDate] = useState(defaultPeriod.startDate)
  const [endDate, setEndDate] = useState(defaultPeriod.endDate)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<RelatorioDados | null>(null)

  async function carregar() {
    try {
      setLoading(true)

      const relatorio = await relatoriosService.buscar({
        startDate,
        endDate,
      })

      setData(relatorio)
    } catch {
      toast.error('Erro ao carregar relatórios')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  const kpis = data?.kpis
  const periodLabel = formatPeriodLabel(startDate, endDate)

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className="page-title">Relatórios gerenciais</h1>
          <p className={styles.subtitle}>
            {data
              ? `Dados consolidados de ${periodLabel}`
              : 'Indicadores e rankings do seu negócio'}
          </p>
        </div>
      </header>

      <div className={styles.toolbar}>
        <div className={styles.toolbarFields}>
          <Input
            label="Data inicial"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            label="Data final"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div className={styles.toolbarActions}>
          <Button onClick={carregar} disabled={loading}>
            <RefreshCw size={16} style={{ marginRight: 6 }} />
            {loading ? 'Atualizando...' : 'Atualizar'}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const period = getDefaultPeriod()
              setStartDate(period.startDate)
              setEndDate(period.endDate)
            }}
          >
            Mês atual
          </Button>
        </div>
      </div>

      <nav className={styles.tabs} aria-label="Seções do relatório">
        {tabs.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              type="button"
              className={[
                styles.tab,
                tab === item.id && styles.tabActive,
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => setTab(item.id)}
            >
              <Icon aria-hidden />
              {item.label}
            </button>
          )
        })}
      </nav>

      <div className={styles.content}>
        {loading && !data && (
          <div className={styles.loadingBox}>
            <div className={styles.spinner} aria-hidden />
            <span>Carregando relatórios...</span>
          </div>
        )}

        {data && tab === 'resumo' && (
          <>
            <div className={styles.kpiGrid}>
              <KpiCard
                label="Compras"
                value={formatCurrency(kpis!.totalCompras)}
                sub={`${kpis!.qtdCompras} registros no período`}
                icon={<ShoppingCart />}
                iconClass={styles.kpiIconCompras}
              />
              <KpiCard
                label="Vendas"
                value={formatCurrency(kpis!.totalVendas)}
                sub={`${kpis!.vendasFinalizadas} finalizadas · ${kpis!.vendasPendentes} pendentes`}
                icon={<TrendingUp />}
                iconClass={styles.kpiIconVendas}
              />
              <KpiCard
                label="Custos operacionais"
                value={formatCurrency(kpis!.totalCustos)}
                sub="Despesas do período"
                icon={<Wallet />}
                iconClass={styles.kpiIconCustos}
              />
              <KpiCard
                label="Estoque atual"
                value={formatKg(kpis!.estoqueLiquidoKg)}
                sub="Saldo líquido total"
                icon={<Scale />}
                iconClass={styles.kpiIconEstoque}
              />
              <KpiCard
                label="Movimentação"
                value={`+${formatKg(kpis!.entradasKg)}`}
                sub={`Saídas: ${formatKg(kpis!.saidasKg)} no período`}
                icon={<Package />}
                iconClass={styles.kpiIconEstoque}
              />
              <KpiCard
                label="Resultado estimado"
                value={formatCurrency(kpis!.resultadoEstimado)}
                sub="Vendas − compras − custos"
                icon={<BarChart3 />}
                highlight
              />
            </div>

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
                  total={formatCurrency(kpis!.totalCompras)}
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
                  total={formatCurrency(kpis!.totalVendas)}
                  totalLabel="Total em vendas"
                  to="/vendas"
                  linkLabel="Ver vendas"
                />
              </Card>
            </div>
          </>
        )}

        {data && tab === 'compras' && (
          <div className={styles.sectionGrid}>
            <Card title="Compras por fornecedor">
              <p className={styles.sectionIntro}>
                Ranking consolidado no período selecionado.
              </p>
              <RankingList
                rows={data.comprasPorFornecedor.map((r) => ({
                  label: r.nome,
                  value: formatCurrency(r.total),
                  numeric: r.total,
                  extra: `${r.qtd} registro(s)`,
                }))}
                empty="Nenhuma compra no período."
              />
            </Card>

            <Card title="Últimas compras" className={styles.sectionFull}>
              <DataTable
                columns={['Data', 'Fornecedor', 'Valor', 'Status']}
                rows={
                  data.comprasRecentes.length === 0
                    ? null
                    : data.comprasRecentes.map((row) => [
                        formatDateBr(row.data),
                        (row.fornecedor as { nome?: string } | null)?.nome ||
                          '—',
                        formatCurrency(Number(row.valor_total || 0)),
                        row.status || '—',
                      ])
                }
                emptyMessage="Nenhuma compra encontrada."
              />
              <CardFooter
                to="/compras"
                linkLabel="Abrir módulo de compras"
              />
            </Card>
          </div>
        )}

        {data && tab === 'vendas' && (
          <div className={styles.sectionGrid}>
            <Card title="Vendas por cliente">
              <RankingList
                rows={data.vendasPorCliente.map((r) => ({
                  label: r.nome,
                  value: formatCurrency(r.total),
                  numeric: r.total,
                  extra: `${r.qtd} movimentação(ões)`,
                }))}
                empty="Nenhuma venda no período."
              />
            </Card>

            <Card title="Vendas por corte">
              <RankingList
                rows={data.vendasPorCorte.map((r) => ({
                  label: r.corte,
                  value: formatCurrency(r.total),
                  numeric: r.total,
                  extra: formatKg(r.peso),
                }))}
                empty="Nenhum item de venda no período."
              />
            </Card>

            <Card title="Últimas movimentações" className={styles.sectionFull}>
              <DataTable
                columns={['Data', 'Cliente', 'Total', 'Status']}
                rows={
                  data.vendasRecentes.length === 0
                    ? null
                    : data.vendasRecentes.map((row) => [
                        formatDateBr(row.data_movimentacao),
                        (row.cliente as { nome?: string } | null)?.nome ||
                          '—',
                        formatCurrency(Number(row.valor_total || 0)),
                        row.movimentacao_status || '—',
                      ])
                }
                emptyMessage="Nenhuma venda encontrada."
              />
              <CardFooter to="/vendas" linkLabel="Abrir módulo de vendas" />
            </Card>
          </div>
        )}

        {data && tab === 'estoque' && (
          <div className={styles.sectionGrid}>
            <Card title="Saldo atual por corte">
              <RankingList
                rows={data.estoquePorCorte.map((r) => ({
                  label: r.corte,
                  value: formatKg(r.saldoKg),
                  numeric: r.saldoKg,
                }))}
                empty="Nenhum saldo em estoque."
              />
              <CardFooter
                total={formatKg(kpis!.estoqueLiquidoKg)}
                totalLabel="Total em estoque"
                to="/processamento"
                linkLabel="Abrir estoque"
              />
            </Card>

            <Card title="Movimentação no período">
              <div className={styles.miniKpiGrid}>
                <div className={styles.miniKpi}>
                  <ArrowDownLeft
                    size={20}
                    style={{ margin: '0 auto 0.5rem', color: 'var(--theme-primary)' }}
                  />
                  <span className={styles.miniKpiLabel}>Entradas</span>
                  <strong className={styles.miniKpiValue}>
                    {formatKg(kpis!.entradasKg)}
                  </strong>
                </div>
                <div className={`${styles.miniKpi} ${styles.miniKpiSaida}`}>
                  <ArrowUpRight
                    size={20}
                    style={{ margin: '0 auto 0.5rem', color: '#c2413a' }}
                  />
                  <span className={styles.miniKpiLabel}>Saídas</span>
                  <strong className={styles.miniKpiValue}>
                    {formatKg(kpis!.saidasKg)}
                  </strong>
                </div>
              </div>
            </Card>
          </div>
        )}

        {data && tab === 'custos' && (
          <div className={styles.sectionGrid}>
            <Card title="Custos por categoria">
              <RankingList
                rows={data.custosPorCategoria.map((r) => ({
                  label: r.nome,
                  value: formatCurrency(r.total),
                  numeric: r.total,
                  extra: `${r.qtd} lançamento(s)`,
                }))}
                empty="Nenhum custo no período."
              />
              <CardFooter
                total={formatCurrency(kpis!.totalCustos)}
                totalLabel="Total de custos"
                to="/custos/operacionais"
                linkLabel="Abrir custos operacionais"
              />
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

function KpiCard({
  label,
  value,
  sub,
  icon,
  iconClass,
  highlight,
  valueClass,
}: {
  label: string
  value: string
  sub: string
  icon?: React.ReactNode
  iconClass?: string
  highlight?: boolean
  valueClass?: string
}) {
  return (
    <article
      className={[
        styles.kpiCard,
        highlight && styles.kpiCardHighlight,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {icon && (
        <div className={[styles.kpiIcon, iconClass].filter(Boolean).join(' ')}>
          {icon}
        </div>
      )}
      <div className={styles.kpiBody}>
        <span className={styles.kpiLabel}>{label}</span>
        <strong className={[styles.kpiValue, valueClass].filter(Boolean).join(' ')}>
          {value}
        </strong>
        <p className={styles.kpiSub}>{sub}</p>
      </div>
    </article>
  )
}

function RankingList({
  rows,
  empty,
}: {
  rows: {
    label: string
    value: string
    numeric: number
    extra?: string
  }[]
  empty: string
}) {
  if (rows.length === 0) {
    return <p className={styles.empty}>{empty}</p>
  }

  const max = Math.max(...rows.map((r) => r.numeric), 1)

  return (
    <div className={styles.rankingList}>
      {rows.map((row, index) => {
        const percent = Math.round((row.numeric / max) * 100)
        return (
          <div key={`${row.label}-${index}`} className={styles.rankingItem}>
            <div className={styles.rankingRow}>
              <span
                className={[
                  styles.rankingRank,
                  index < 3 && styles.rankingRankTop,
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {index + 1}
              </span>
              <div className={styles.rankingMeta}>
                <span className={styles.rankingLabel}>{row.label}</span>
                {row.extra && (
                  <span className={styles.rankingExtra}>{row.extra}</span>
                )}
              </div>
              <span className={styles.rankingValue}>{row.value}</span>
            </div>
            <div className={styles.rankingBar}>
              <div
                className={styles.rankingBarFill}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function DataTable({
  columns,
  rows,
  emptyMessage,
}: {
  columns: string[]
  rows: (string | number)[][] | null
  emptyMessage: string
}) {
  if (!rows || rows.length === 0) {
    return <p className={styles.empty}>{emptyMessage}</p>
  }

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={
                    j === 0
                      ? styles.cellMuted
                      : j === columns.length - 2
                        ? styles.cellValue
                        : undefined
                  }
                >
                  {j === columns.length - 1 ? (
                    <StatusBadge status={String(cell)} />
                  ) : (
                    cell
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase()
  let variant = styles.badgeNeutral

  if (
    normalized.includes('finaliz') ||
    normalized.includes('pago') ||
    normalized.includes('conclu') ||
    normalized.includes('aprov')
  ) {
    variant = styles.badgeSuccess
  } else if (
    normalized.includes('pend') ||
    normalized.includes('abert') ||
    normalized.includes('aguard')
  ) {
    variant = styles.badgeWarning
  }

  return (
    <span className={[styles.badge, variant].join(' ')}>{status}</span>
  )
}

function CardFooter({
  total,
  totalLabel,
  to,
  linkLabel,
}: {
  total?: string
  totalLabel?: string
  to: string
  linkLabel: string
}) {
  return (
    <div className={styles.cardFooter}>
      {total && totalLabel ? (
        <span className={styles.cardTotal}>
          {totalLabel}: <strong>{total}</strong>
        </span>
      ) : (
        <span />
      )}
      <Link to={to} className={styles.moduleLink}>
        {linkLabel}
        <ArrowRight aria-hidden />
      </Link>
    </div>
  )
}
