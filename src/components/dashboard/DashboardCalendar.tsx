import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Beef,
  ChevronLeft,
  ChevronRight,
  Package,
  ShoppingCart,
  TrendingUp,
  Wallet,
  Droplets,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Button, Card } from '@/components/ui'
import { formatCurrency, formatDateBr, formatKg } from '@/components/relatorios'
import {
  calendarioService,
  formatMesAno,
  getHojeIso,
  type AtividadeCalendario,
  type CalendarioMesDados,
  type ResumoDiaCalendario,
  type TipoAtividadeCalendario,
} from '@/services/calendario.service'
import styles from './DashboardCalendar.module.scss'

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const LEGEND: { tipo: TipoAtividadeCalendario; label: string; className: string }[] = [
  { tipo: 'compra', label: 'Compras', className: styles.dotCompra },
  { tipo: 'venda', label: 'Vendas', className: styles.dotVenda },
  { tipo: 'custo', label: 'Custos', className: styles.dotCusto },
  { tipo: 'abate', label: 'Abates', className: styles.dotAbate },
  { tipo: 'estoque', label: 'Estoque', className: styles.dotEstoque },
  { tipo: 'viscera', label: 'Vísceras', className: styles.dotViscera },
]

function getMonthCells(ano: number, mes: number) {
  const firstDay = new Date(ano, mes - 1, 1)
  const lastDay = new Date(ano, mes, 0)
  const startOffset = firstDay.getDay()
  const daysInMonth = lastDay.getDate()

  const cells: {
    iso: string
    day: number
    inMonth: boolean
  }[] = []

  const prevMonthLast = new Date(ano, mes - 1, 0).getDate()
  for (let i = startOffset - 1; i >= 0; i -= 1) {
    const day = prevMonthLast - i
    const date = new Date(ano, mes - 2, day)
    cells.push({
      iso: date.toISOString().slice(0, 10),
      day,
      inMonth: false,
    })
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(ano, mes - 1, day)
    cells.push({
      iso: date.toISOString().slice(0, 10),
      day,
      inMonth: true,
    })
  }

  while (cells.length % 7 !== 0) {
    const nextDay = cells.length - (startOffset + daysInMonth) + 1
    const date = new Date(ano, mes, nextDay)
    cells.push({
      iso: date.toISOString().slice(0, 10),
      day: nextDay,
      inMonth: false,
    })
  }

  return cells
}

function activityIcon(tipo: TipoAtividadeCalendario) {
  switch (tipo) {
    case 'compra':
      return ShoppingCart
    case 'venda':
      return TrendingUp
    case 'custo':
      return Wallet
    case 'abate':
      return Beef
    case 'estoque':
      return Package
    case 'viscera':
      return Droplets
    default:
      return Package
  }
}

function activityIconClass(tipo: TipoAtividadeCalendario) {
  switch (tipo) {
    case 'compra':
      return styles.iconCompra
    case 'venda':
      return styles.iconVenda
    case 'custo':
      return styles.iconCusto
    case 'abate':
      return styles.iconAbate
    case 'estoque':
      return styles.iconEstoque
    case 'viscera':
      return styles.iconViscera
    default:
      return styles.iconEstoque
  }
}

function dotClass(tipo: TipoAtividadeCalendario) {
  return LEGEND.find((item) => item.tipo === tipo)?.className || styles.dotEstoque
}

function formatActivityValue(atividade: AtividadeCalendario) {
  if (atividade.tipo === 'estoque') {
    return formatKg(atividade.valor || 0)
  }
  if (atividade.tipo === 'viscera') {
    return `${atividade.valor || 0} un.`
  }
  if (atividade.valor != null && atividade.valor > 0) {
    return formatCurrency(atividade.valor)
  }
  return '—'
}

interface Props {
  selectedDate: string | null
  filterDate: string | null
  onSelectDate: (isoDate: string) => void
  onClearFilter: () => void
}

export function DashboardCalendar({
  selectedDate,
  filterDate,
  onSelectDate,
  onClearFilter,
}: Props) {
  const hoje = getHojeIso()
  const initial = new Date()

  const [ano, setAno] = useState(initial.getFullYear())
  const [mes, setMes] = useState(initial.getMonth() + 1)
  const [loading, setLoading] = useState(true)
  const [dados, setDados] = useState<CalendarioMesDados | null>(null)

  const diaSelecionado = selectedDate || hoje

  async function carregarCalendario(year: number, month: number) {
    try {
      setLoading(true)
      const result = await calendarioService.buscarMes(year, month)
      setDados(result)
    } catch {
      toast.error('Erro ao carregar calendário')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarCalendario(ano, mes)
  }, [ano, mes])

  const cells = useMemo(() => getMonthCells(ano, mes), [ano, mes])

  const atividadesDia = useMemo(() => {
    if (!dados) return []
    return dados.atividades.filter((item) => item.data === diaSelecionado)
  }, [dados, diaSelecionado])

  const resumoDia: ResumoDiaCalendario | undefined =
    dados?.resumoPorDia[diaSelecionado]

  function irMesAnterior() {
    if (mes === 1) {
      setAno((value) => value - 1)
      setMes(12)
      return
    }
    setMes((value) => value - 1)
  }

  function irProximoMes() {
    if (mes === 12) {
      setAno((value) => value + 1)
      setMes(1)
      return
    }
    setMes((value) => value + 1)
  }

  function irHoje() {
    const now = new Date()
    setAno(now.getFullYear())
    setMes(now.getMonth() + 1)
    onSelectDate(hoje)
  }

  function handleDayClick(iso: string, inMonth: boolean) {
    if (!inMonth) return
    onSelectDate(iso)
  }

  return (
    <Card title="Calendário de atividades">
      <div className={styles.calendarLayout}>
        <div className={styles.calendarPanel}>
          <div className={styles.calendarHeader}>
            <h3 className={styles.calendarTitle}>{formatMesAno(ano, mes)}</h3>
            <div className={styles.calendarNav}>
              <button
                type="button"
                className={styles.navBtn}
                onClick={irMesAnterior}
                aria-label="Mês anterior"
              >
                <ChevronLeft size={16} />
              </button>
              <Button variant="outline" onClick={irHoje}>
                Hoje
              </Button>
              <button
                type="button"
                className={styles.navBtn}
                onClick={irProximoMes}
                aria-label="Próximo mês"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {filterDate && (
            <div className={styles.filterBanner}>
              <span>
                Dashboard filtrado para{' '}
                <strong>{formatDateBr(filterDate)}</strong>
              </span>
              <Button variant="outline" onClick={onClearFilter}>
                Limpar filtro
              </Button>
            </div>
          )}

          {loading ? (
            <div className={styles.loadingCalendar}>Carregando calendário...</div>
          ) : (
            <>
              <div className={styles.weekdays}>
                {WEEKDAYS.map((day) => (
                  <span key={day} className={styles.weekday}>
                    {day}
                  </span>
                ))}
              </div>

              <div className={styles.daysGrid}>
                {cells.map((cell) => {
                  const resumo = dados?.resumoPorDia[cell.iso]
                  const isSelected = cell.inMonth && cell.iso === diaSelecionado
                  const isToday = cell.inMonth && cell.iso === hoje
                  const isFiltered = cell.inMonth && cell.iso === filterDate

                  return (
                    <button
                      key={`${cell.iso}-${cell.inMonth}`}
                      type="button"
                      className={[
                        styles.dayCell,
                        !cell.inMonth && styles.dayCellOutside,
                        isToday && styles.dayCellToday,
                        isSelected && styles.dayCellSelected,
                        isFiltered && !isSelected && styles.dayCellFiltered,
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => handleDayClick(cell.iso, cell.inMonth)}
                      disabled={!cell.inMonth}
                      aria-label={`${cell.day}${resumo?.total ? `, ${resumo.total} atividade(s)` : ''}`}
                    >
                      <span className={styles.dayNumber}>{cell.day}</span>
                      {resumo && resumo.total > 0 ? (
                        <>
                          <div className={styles.activityDots}>
                            {LEGEND.map(({ tipo }) =>
                              resumo.tipos[tipo] ? (
                                <span
                                  key={tipo}
                                  className={[styles.activityDot, dotClass(tipo)].join(' ')}
                                  title={`${resumo.tipos[tipo]} ${tipo}`}
                                />
                              ) : null,
                            )}
                          </div>
                          <span className={styles.dayCount}>{resumo.total}</span>
                        </>
                      ) : null}
                    </button>
                  )
                })}
              </div>

              <div className={styles.legend}>
                {LEGEND.map((item) => (
                  <span key={item.tipo} className={styles.legendItem}>
                    <span className={[styles.activityDot, item.className].join(' ')} />
                    {item.label}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>

        <aside className={styles.detailPanel}>
          <div className={styles.detailHeader}>
            <h3 className={styles.detailTitle}>
              {formatDateBr(diaSelecionado)}
              {diaSelecionado === hoje ? ' · Hoje' : ''}
            </h3>
            <p className={styles.detailSubtitle}>
              {resumoDia?.total
                ? `${resumoDia.total} atividade(s) registrada(s)`
                : 'Nenhuma atividade neste dia'}
            </p>
          </div>

          {atividadesDia.length === 0 ? (
            <div className={styles.emptyDay}>
              Nenhum registro encontrado para esta data.
              <br />
              Clique em outro dia com indicadores coloridos para explorar.
            </div>
          ) : (
            <div className={styles.activityList}>
              {atividadesDia.map((atividade) => {
                const Icon = activityIcon(atividade.tipo)
                return (
                  <Link
                    key={atividade.id}
                    to={atividade.rota}
                    className={styles.activityItem}
                  >
                    <span
                      className={[
                        styles.activityIcon,
                        activityIconClass(atividade.tipo),
                      ].join(' ')}
                    >
                      <Icon aria-hidden />
                    </span>
                    <span className={styles.activityBody}>
                      <span className={styles.activityTitle}>
                        {atividade.titulo}
                      </span>
                      <span className={styles.activityDesc}>
                        {atividade.descricao}
                      </span>
                    </span>
                    <span className={styles.activityValue}>
                      {formatActivityValue(atividade)}
                    </span>
                  </Link>
                )
              })}
            </div>
          )}
        </aside>
      </div>
    </Card>
  )
}
