import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import styles from './ReportUi.module.scss'

export { styles as reportStyles }

export function KpiCard({
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

export function RankingList({
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

export function DataTable({
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

export function StatusBadge({ status }: { status: string }) {
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

export function CardFooter({
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

export function LoadingBox({ message }: { message: string }) {
  return (
    <div className={styles.loadingBox}>
      <div className={styles.spinner} aria-hidden />
      <span>{message}</span>
    </div>
  )
}
