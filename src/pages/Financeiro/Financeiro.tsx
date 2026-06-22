import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import {
  Button,
  Card,
  Input,
  Table,
  Modal,
  ModalDetails,
  tableListStyles,
} from '@/components/ui'
import type { DetailItem } from '@/components/ui'
import {
  financeiroService,
  type FinanceiroLancamento,
} from '@/services/financeiro.service'
import { custosOperacionaisService } from '@/services/centroCusto.service'
import {
  contaPagamentoToDetailItems,
  type ContaPagamentoData,
} from '@/utils/contaPagamento'
import { parseCurrencyInput } from '@/utils/masks'
import {
  ArrowRight,
  BadgePercent,
  BarChart3,
  Calendar,
  FilePlus2,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import styles from './Financeiro.module.scss'

interface ContaRow {
  id: string
  descricao: string
  tipo: 'pagar' | 'receber'
  valor: number
  vencimento: string
  status: string
  formaPagamento?: string
  dataPagamento?: string
  parcelaId?: number
  contaPagamento?: ContaPagamentoData
  origem?: FinanceiroLancamento['origem']
}

type TabId = 'resumo' | 'pagar' | 'receber' | 'lancar'

const tabs: { id: TabId; label: string; icon: React.ComponentType<any> }[] = [
  { id: 'resumo', label: 'Resumo', icon: BarChart3 },
  { id: 'pagar', label: 'A pagar', icon: TrendingDown },
  { id: 'receber', label: 'A receber', icon: TrendingUp },
  { id: 'lancar', label: 'Lançar despesa', icon: FilePlus2 },
]

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const formatDateBr = (value: string) => {
  if (!value) return '—'
  const date = new Date(`${value.slice(0, 10)}T12:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('pt-BR')
}

function normalizeText(value: string) {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

function getDefaultPeriod() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  }
}

export function Financeiro() {
  const [detalhe, setDetalhe] = useState<ContaRow | null>(null)
  const [tab, setTab] = useState<TabId>('resumo')
  const [rows, setRows] = useState<ContaRow[]>([])
  const [loading, setLoading] = useState(false)
  const defaultPeriod = useMemo(() => getDefaultPeriod(), [])
  const [startDate, setStartDate] = useState(defaultPeriod.startDate)
  const [endDate, setEndDate] = useState(defaultPeriod.endDate)
  const [search, setSearch] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState<'todos' | ContaRow['tipo']>(
    'todos',
  )
  const [statusFiltro, setStatusFiltro] = useState<
    'todos' | 'pendente' | 'pago' | 'atrasado'
  >('todos')
  const [despesaForm, setDespesaForm] = useState({
    descricao: '',
    valor: '',
    vencimento: new Date().toISOString().slice(0, 10),
    categoria: '',
  })
  const [salvandoDespesa, setSalvandoDespesa] = useState(false)

  async function carregarLancamentos() {
    try {
      setLoading(true)

      const lancamentos = await financeiroService.listarLancamentos(
        startDate,
        endDate,
      )

      setRows(lancamentos)
    } catch {
      toast.error('Erro ao carregar lançamentos financeiros')
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarLancamentos()
  }, [startDate, endDate])

  async function salvarDespesa() {
    const valor = parseCurrencyInput(despesaForm.valor)

    if (!despesaForm.descricao.trim()) {
      toast.error('Informe a descrição')
      return
    }

    if (valor <= 0) {
      toast.error('Informe um valor válido')
      return
    }

    if (!despesaForm.vencimento) {
      toast.error('Informe a data')
      return
    }

    try {
      setSalvandoDespesa(true)

      await custosOperacionaisService.create({
        data: despesaForm.vencimento,
        categoria: despesaForm.categoria.trim() || 'Despesa',
        descricao: despesaForm.descricao.trim(),
        valor,
      })

      toast.success('Despesa lançada')
      setDespesaForm({
        descricao: '',
        valor: '',
        vencimento: new Date().toISOString().slice(0, 10),
        categoria: '',
      })
      await carregarLancamentos()
      setTab('pagar')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao lançar despesa'
      toast.error(msg)
    } finally {
      setSalvandoDespesa(false)
    }
  }

  const filtered = useMemo(() => {
    const startTs = startDate
      ? new Date(`${startDate}T00:00:00`).getTime()
      : null
    const endTs = endDate ? new Date(`${endDate}T23:59:59`).getTime() : null

    const q = normalizeText(search)

    return rows.filter((row) => {
      const ts = row.vencimento
        ? new Date(`${row.vencimento.slice(0, 10)}T12:00:00`).getTime()
        : NaN

      if (startTs && Number.isFinite(ts) && ts < startTs) return false
      if (endTs && Number.isFinite(ts) && ts > endTs) return false

      if (tipoFiltro !== 'todos' && row.tipo !== tipoFiltro) return false

      const statusNorm = normalizeText(row.status)
      if (
        statusFiltro !== 'todos' &&
        !statusNorm.includes(statusFiltro === 'pendente' ? 'pend' : statusFiltro)
      ) {
        return false
      }

      if (q) {
        const hay = normalizeText(`${row.descricao} ${row.status}`)
        if (!hay.includes(q)) return false
      }

      return true
    })
  }, [endDate, rows, search, startDate, statusFiltro, tipoFiltro])

  const kpis = useMemo(() => {
    const pagar = filtered.filter((r) => r.tipo === 'pagar')
    const receber = filtered.filter((r) => r.tipo === 'receber')

    const isPendente = (s: string) => normalizeText(s).includes('pend')
    const isAtrasado = (s: string) => normalizeText(s).includes('atras')

    const totalPagar = pagar.reduce((acc, r) => acc + (r.valor || 0), 0)
    const totalReceber = receber.reduce((acc, r) => acc + (r.valor || 0), 0)

    const pagarPendente = pagar
      .filter((r) => isPendente(r.status) || isAtrasado(r.status))
      .reduce((acc, r) => acc + (r.valor || 0), 0)

    const receberPendente = receber
      .filter((r) => isPendente(r.status) || isAtrasado(r.status))
      .reduce((acc, r) => acc + (r.valor || 0), 0)

    const atrasado = filtered
      .filter((r) => isAtrasado(r.status))
      .reduce((acc, r) => acc + (r.valor || 0), 0)

    const saldoPrevisto = receberPendente - pagarPendente

    return {
      totalPagar,
      totalReceber,
      pagarPendente,
      receberPendente,
      atrasado,
      saldoPrevisto,
      qtd: filtered.length,
    }
  }, [filtered])

  const columns = [
    {
      key: 'descricao',
      header: 'Descrição',
      render: (r: ContaRow) => (
        <span className={tableListStyles.descricaoCell}>{r.descricao}</span>
      ),
    },
    {
      key: 'tipo',
      header: 'Tipo',
      render: (r: ContaRow) => (r.tipo === 'pagar' ? 'A pagar' : 'A receber'),
    },
    {
      key: 'valor',
      header: 'Valor',
      render: (r: ContaRow) => formatCurrency(r.valor),
    },
    {
      key: 'vencimento',
      header: 'Vencimento',
      render: (r: ContaRow) => formatDateBr(r.vencimento),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r: ContaRow) => <StatusBadge status={r.status} />,
    },
    {
      key: 'acoes',
      header: 'Ações',
      render: (r: ContaRow) => (
        <div className={tableListStyles.acoesCell}>
          <Button
            variant="ghost"
            className={tableListStyles.acaoBtn}
            onClick={() => setDetalhe(r)}
          >
            Detalhes
          </Button>
        </div>
      ),
    },
  ]

  const detalheItems = (r: ContaRow): DetailItem[] => [
    { label: 'Descrição', value: r.descricao },
    { label: 'Tipo', value: r.tipo === 'pagar' ? 'A pagar' : 'A receber' },
    { label: 'Valor', value: formatCurrency(r.valor) },
    { label: 'Vencimento', value: formatDateBr(r.vencimento) },
    ...(r.dataPagamento
      ? [{ label: 'Pago em', value: formatDateBr(r.dataPagamento) }]
      : []),
    { label: 'Status', value: r.status },
    ...(r.formaPagamento
      ? [{ label: 'Forma de pagamento', value: r.formaPagamento }]
      : []),
    ...(r.contaPagamento
      ? contaPagamentoToDetailItems(r.contaPagamento).map((item) => ({
          label: item.label,
          value: item.value,
        }))
      : []),
  ]

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className="page-title">Financeiro</h1>
          <p className={styles.subtitle}>
            Visão de contas a pagar e a receber. {kpis.qtd} lançamentos no período
            filtrado.
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

          <div className={styles.field}>
            <label className={styles.fieldLabel}>
              <Calendar size={14} aria-hidden />
              Tipo
            </label>
            <select
              className={styles.select}
              value={tipoFiltro}
              onChange={(e) =>
                setTipoFiltro(e.target.value as typeof tipoFiltro)
              }
            >
              <option value="todos">Todos</option>
              <option value="pagar">A pagar</option>
              <option value="receber">A receber</option>
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>
              <BadgePercent size={14} aria-hidden />
              Status
            </label>
            <select
              className={styles.select}
              value={statusFiltro}
              onChange={(e) =>
                setStatusFiltro(e.target.value as typeof statusFiltro)
              }
            >
              <option value="todos">Todos</option>
              <option value="pendente">Pendente</option>
              <option value="pago">Pago</option>
              <option value="atrasado">Atrasado</option>
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>
              <Search size={14} aria-hidden />
              Buscar
            </label>
            <input
              className={styles.search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Descrição ou status..."
            />
          </div>
        </div>

        <div className={styles.toolbarActions}>
          <Button
            variant="outline"
            onClick={() => {
              setStartDate(defaultPeriod.startDate)
              setEndDate(defaultPeriod.endDate)
              setSearch('')
              setTipoFiltro('todos')
              setStatusFiltro('todos')
            }}
          >
            Limpar
          </Button>
          <Button
            onClick={() => {
              carregarLancamentos()
              toast.success('Dados atualizados')
            }}
            disabled={loading}
          >
            <RefreshCw size={16} style={{ marginRight: 6 }} />
            {loading ? 'Atualizando...' : 'Atualizar'}
          </Button>
        </div>
      </div>

      <nav className={styles.tabs} aria-label="Seções do financeiro">
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
        {tab === 'resumo' && (
          <>
            <div className={styles.kpiGrid}>
              <KpiCard
                label="A receber (pendente)"
                value={formatCurrency(kpis.receberPendente)}
                sub="Entradas previstas"
                icon={<TrendingUp />}
                iconClass={styles.kpiIconReceber}
              />
              <KpiCard
                label="A pagar (pendente)"
                value={formatCurrency(kpis.pagarPendente)}
                sub="Saídas previstas"
                icon={<TrendingDown />}
                iconClass={styles.kpiIconPagar}
              />
              <KpiCard
                label="Atrasados"
                value={formatCurrency(kpis.atrasado)}
                sub="Pendências vencidas"
                icon={<BadgePercent />}
                iconClass={styles.kpiIconAtrasado}
              />
              <KpiCard
                label="Saldo previsto"
                value={formatCurrency(kpis.saldoPrevisto)}
                sub="A receber − a pagar"
                icon={<Wallet />}
                highlight
                valueClass={
                  kpis.saldoPrevisto >= 0 ? styles.positive : styles.negative
                }
              />
            </div>

            <div className={styles.sectionGrid}>
              <Card title="Fluxo de caixa (filtrado)" className={styles.sectionFull}>
                <p className={styles.sectionIntro}>
                  Lista unificada de contas com vencimento dentro do período
                  filtrado.
                </p>
                <div className={styles.tableWrap}>
                  <Table
                    columns={columns}
                    data={filtered}
                    keyExtractor={(r) => r.id}
                    loading={loading}
                  />
                </div>
                <div className={styles.cardFooter}>
                  <span className={styles.cardTotal}>
                    Total a receber: <strong>{formatCurrency(kpis.totalReceber)}</strong>
                    {' · '}
                    Total a pagar: <strong>{formatCurrency(kpis.totalPagar)}</strong>
                  </span>
                  <button
                    type="button"
                    className={styles.moduleLinkButton}
                    onClick={() => setTab('lancar')}
                  >
                    Lançar despesa
                    <ArrowRight aria-hidden />
                  </button>
                </div>
              </Card>
            </div>
          </>
        )}

        {tab === 'pagar' && (
          <div className={styles.sectionGrid}>
            <Card title="Contas a pagar" className={styles.sectionFull}>
              <p className={styles.sectionIntro}>
                Parcelas de compras, despesas operacionais e abates no período
                filtrado.
              </p>
              <div className={styles.tableWrap}>
                <Table
                  columns={columns}
                  data={filtered.filter((r) => r.tipo === 'pagar')}
                  keyExtractor={(r) => r.id}
                  loading={loading}
                />
              </div>
            </Card>
          </div>
        )}

        {tab === 'receber' && (
          <div className={styles.sectionGrid}>
            <Card title="Contas a receber" className={styles.sectionFull}>
              <p className={styles.sectionIntro}>
                Vendas registradas e recebimentos de clientes no período.
              </p>
              <div className={styles.tableWrap}>
                <Table
                  columns={columns}
                  data={filtered.filter((r) => r.tipo === 'receber')}
                  keyExtractor={(r) => r.id}
                  loading={loading}
                />
              </div>
            </Card>
          </div>
        )}

        {tab === 'lancar' && (
          <div className={styles.sectionGrid}>
            <Card title="Lançar despesa" className={styles.sectionFull}>
              <p className={styles.sectionIntro}>
                Registra uma despesa operacional. Ela aparecerá em contas a pagar
                no período da data informada.
              </p>
              <div className={styles.formGrid}>
                <Input
                  label="Descrição"
                  placeholder="Ex.: Transporte - Viagem #12"
                  value={despesaForm.descricao}
                  onChange={(e) =>
                    setDespesaForm({ ...despesaForm, descricao: e.target.value })
                  }
                />
                <Input
                  label="Valor (R$)"
                  mask="currency"
                  value={despesaForm.valor}
                  onChange={(e) =>
                    setDespesaForm({ ...despesaForm, valor: e.target.value })
                  }
                />
                <Input
                  label="Data"
                  type="date"
                  value={despesaForm.vencimento}
                  onChange={(e) =>
                    setDespesaForm({
                      ...despesaForm,
                      vencimento: e.target.value,
                    })
                  }
                />
                <Input
                  label="Categoria"
                  placeholder="Transporte, abate, energia..."
                  value={despesaForm.categoria}
                  onChange={(e) =>
                    setDespesaForm({ ...despesaForm, categoria: e.target.value })
                  }
                />
              </div>
              <div className={styles.formActions}>
                <Button
                  onClick={salvarDespesa}
                  disabled={salvandoDespesa}
                  className={styles.btn}
                >
                  {salvandoDespesa ? 'Salvando...' : 'Lançar'}
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>

      <Modal
        open={!!detalhe}
        onClose={() => setDetalhe(null)}
        title="Detalhes do lançamento"
      >
        {detalhe && <ModalDetails items={detalheItems(detalhe)} />}
      </Modal>
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

function StatusBadge({ status }: { status: string }) {
  const normalized = normalizeText(status)
  let variant = styles.badgeNeutral

  if (normalized.includes('pago') || normalized.includes('finaliz')) {
    variant = styles.badgeSuccess
  } else if (normalized.includes('atras')) {
    variant = styles.badgeDanger
  } else if (normalized.includes('pend') || normalized.includes('abert')) {
    variant = styles.badgeWarning
  }

  return <span className={[styles.badge, variant].join(' ')}>{status}</span>
}
