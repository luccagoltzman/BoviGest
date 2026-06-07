import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card } from '@/components/ui'
import { formatCurrency, formatKg, reportStyles } from '@/components/relatorios'
import type {
  EstoqueSaldo,
  PontoSerieDia,
  RankingCorte,
  RelatorioKpis,
} from '@/services/relatorios.service'
import styles from './DashboardCharts.module.scss'

const CHART_COLORS = {
  compras: '#2f80ed',
  vendas: '#18864b',
  custos: '#b7791f',
  estoque: '#256f3e',
  palette: ['#256f3e', '#38a169', '#2f80ed', '#d69e2e', '#18864b', '#667085'],
}

function formatAxisCurrency(value: number) {
  if (value >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}M`
  }
  if (value >= 1_000) {
    return `R$ ${(value / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}k`
  }
  return formatCurrency(value)
}

function formatAxisKg(value: number) {
  if (value >= 1_000) {
    return `${(value / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}t`
  }
  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg`
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { name?: string; value?: number; color?: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null

  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipTitle}>{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className={styles.tooltipRow}>
          <span>{entry.name}</span>
          <strong>{formatKg(Number(entry.value || 0))}</strong>
        </div>
      ))}
    </div>
  )
}

function KgTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { name?: string; value?: number }[]
  label?: string
}) {
  if (!active || !payload?.length) return null

  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipTitle}>{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className={styles.tooltipRow}>
          <span>{entry.name}</span>
          <strong>{formatKg(Number(entry.value || 0))}</strong>
        </div>
      ))}
    </div>
  )
}

function ChartLegend({
  items,
}: {
  items: { label: string; color: string }[]
}) {
  return (
    <div className={styles.chartLegend}>
      {items.map((item) => (
        <span key={item.label} className={styles.legendItem}>
          <span
            className={styles.legendDot}
            style={{ background: item.color }}
          />
          {item.label}
        </span>
      ))}
    </div>
  )
}

function hasSerieMovimento(serie: PontoSerieDia[]) {
  return serie.some((p) => p.compras > 0 || p.vendas > 0)
}

export function DashboardCharts({
  kpis,
  serieFinanceira,
  vendasPorCorte,
  estoquePorCorte,
}: {
  kpis: RelatorioKpis
  serieFinanceira: PontoSerieDia[]
  vendasPorCorte: RankingCorte[]
  estoquePorCorte: EstoqueSaldo[]
}) {
  const resumoFinanceiro = [
    { nome: 'Compras', valor: kpis.totalCompras, fill: CHART_COLORS.compras },
    { nome: 'Vendas', valor: kpis.totalVendas, fill: CHART_COLORS.vendas },
    { nome: 'Custos', valor: kpis.totalCustos, fill: CHART_COLORS.custos },
  ]

  const vendasCorte = vendasPorCorte.slice(0, 6).map((item) => ({
    nome:
      item.corte.length > 18 ? `${item.corte.slice(0, 16)}…` : item.corte,
    nomeCompleto: item.corte,
    total: item.total,
    peso: item.peso,
  }))

  const estoqueCorte = estoquePorCorte
    .filter((item) => item.saldoKg > 0)
    .slice(0, 6)
    .map((item) => ({
      nome:
        item.corte.length > 18 ? `${item.corte.slice(0, 16)}…` : item.corte,
      nomeCompleto: item.corte,
      saldoKg: item.saldoKg,
    }))

  const movimentacaoEstoque = [
    { nome: 'Entradas', valor: kpis.entradasKg, fill: CHART_COLORS.vendas },
    { nome: 'Saídas', valor: kpis.saidasKg, fill: CHART_COLORS.custos },
  ]

  return (
    <div className={styles.chartsSection}>
      <Card title="Evolução no período" className={styles.chartCard}>
        <p className={styles.chartIntro}>
          Compras e vendas consolidadas por dia no intervalo selecionado.
        </p>
        {!hasSerieMovimento(serieFinanceira) ? (
          <div className={styles.chartEmpty}>
            Nenhuma compra ou venda registrada neste período.
          </div>
        ) : (
          <>
            <div className={styles.chartWrap}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={serieFinanceira}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="fillCompras" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor={CHART_COLORS.compras}
                        stopOpacity={0.35}
                      />
                      <stop
                        offset="100%"
                        stopColor={CHART_COLORS.compras}
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                    <linearGradient id="fillVendas" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor={CHART_COLORS.vendas}
                        stopOpacity={0.35}
                      />
                      <stop
                        offset="100%"
                        stopColor={CHART_COLORS.vendas}
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="4 4"
                    stroke="rgba(17, 53, 31, 0.08)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#667085' }}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={24}
                  />
                  <YAxis
                    tickFormatter={formatAxisCurrency}
                    tick={{ fontSize: 11, fill: '#667085' }}
                    tickLine={false}
                    axisLine={false}
                    width={72}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="compras"
                    name="Compras"
                    stroke={CHART_COLORS.compras}
                    fill="url(#fillCompras)"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="vendas"
                    name="Vendas"
                    stroke={CHART_COLORS.vendas}
                    fill="url(#fillVendas)"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <ChartLegend
              items={[
                { label: 'Compras', color: CHART_COLORS.compras },
                { label: 'Vendas', color: CHART_COLORS.vendas },
              ]}
            />
          </>
        )}
      </Card>

      <div className={reportStyles.sectionGrid}>
        <Card title="Composição financeira" className={styles.chartCard}>
          <p className={styles.chartIntro}>
            Totais do período: compras, vendas e custos operacionais.
          </p>
          {resumoFinanceiro.every((item) => item.valor === 0) ? (
            <div className={styles.chartEmpty}>
              Sem movimentação financeira no período.
            </div>
          ) : (
            <div className={styles.chartWrapCompact}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={resumoFinanceiro}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="4 4"
                    stroke="rgba(17, 53, 31, 0.08)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="nome"
                    tick={{ fontSize: 11, fill: '#667085' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tickFormatter={formatAxisCurrency}
                    tick={{ fontSize: 11, fill: '#667085' }}
                    tickLine={false}
                    axisLine={false}
                    width={72}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="valor" name="Valor" radius={[8, 8, 0, 0]}>
                    {resumoFinanceiro.map((entry) => (
                      <Cell key={entry.nome} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card title="Vendas por corte" className={styles.chartCard}>
          <p className={styles.chartIntro}>
            Top cortes vendidos no período (valor total).
          </p>
          {vendasCorte.length === 0 ? (
            <div className={styles.chartEmpty}>
              Nenhuma venda por corte no período.
            </div>
          ) : (
            <div className={styles.chartWrapCompact}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={vendasCorte}
                  layout="vertical"
                  margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
                >
                  <CartesianGrid
                    strokeDasharray="4 4"
                    stroke="rgba(17, 53, 31, 0.08)"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tickFormatter={formatAxisCurrency}
                    tick={{ fontSize: 11, fill: '#667085' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="nome"
                    width={88}
                    tick={{ fontSize: 11, fill: '#667085' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const row = payload[0]?.payload as {
                        nomeCompleto: string
                        total: number
                        peso: number
                      }
                      return (
                        <div className={styles.tooltip}>
                          <p className={styles.tooltipTitle}>
                            {row.nomeCompleto}
                          </p>
                          <div className={styles.tooltipRow}>
                            <span>Valor</span>
                            <strong>{formatCurrency(row.total)}</strong>
                          </div>
                          <div className={styles.tooltipRow}>
                            <span>Peso</span>
                            <strong>{formatKg(row.peso)}</strong>
                          </div>
                        </div>
                      )
                    }}
                  />
                  <Bar
                    dataKey="total"
                    name="Valor"
                    fill={CHART_COLORS.vendas}
                    radius={[0, 8, 8, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card title="Saldo em estoque por corte" className={styles.chartCard}>
          <p className={styles.chartIntro}>
            Distribuição atual do estoque (kg líquidos).
          </p>
          {estoqueCorte.length === 0 ? (
            <div className={styles.chartEmpty}>Nenhum saldo em estoque.</div>
          ) : (
            <div className={styles.chartWrapCompact}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={estoqueCorte}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="4 4"
                    stroke="rgba(17, 53, 31, 0.08)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="nome"
                    tick={{ fontSize: 11, fill: '#667085' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tickFormatter={formatAxisKg}
                    tick={{ fontSize: 11, fill: '#667085' }}
                    tickLine={false}
                    axisLine={false}
                    width={72}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const row = payload[0]?.payload as {
                        nomeCompleto: string
                        saldoKg: number
                      }
                      return (
                        <div className={styles.tooltip}>
                          <p className={styles.tooltipTitle}>
                            {row.nomeCompleto}
                          </p>
                          <div className={styles.tooltipRow}>
                            <span>Saldo</span>
                            <strong>{formatKg(row.saldoKg)}</strong>
                          </div>
                        </div>
                      )
                    }}
                  />
                  <Bar dataKey="saldoKg" name="Saldo" radius={[8, 8, 0, 0]}>
                    {estoqueCorte.map((entry, index) => (
                      <Cell
                        key={entry.nomeCompleto}
                        fill={
                          CHART_COLORS.palette[
                            index % CHART_COLORS.palette.length
                          ]
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card title="Movimentação de estoque" className={styles.chartCard}>
          <p className={styles.chartIntro}>
            Entradas e saídas de peso no período selecionado.
          </p>
          {movimentacaoEstoque.every((item) => item.valor === 0) ? (
            <div className={styles.chartEmpty}>
              Nenhuma movimentação de estoque no período.
            </div>
          ) : (
            <div className={styles.chartWrapCompact}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={movimentacaoEstoque}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="4 4"
                    stroke="rgba(17, 53, 31, 0.08)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="nome"
                    tick={{ fontSize: 11, fill: '#667085' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tickFormatter={formatAxisKg}
                    tick={{ fontSize: 11, fill: '#667085' }}
                    tickLine={false}
                    axisLine={false}
                    width={72}
                  />
                  <Tooltip content={<KgTooltip />} />
                  <Bar dataKey="valor" name="Peso" radius={[8, 8, 0, 0]}>
                    {movimentacaoEstoque.map((entry) => (
                      <Cell key={entry.nome} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
