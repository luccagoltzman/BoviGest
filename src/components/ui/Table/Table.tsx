import type { ReactNode } from 'react'
import styles from './Table.module.scss'

interface Column<T> {
  key: keyof T | string
  header: string
  render?: (row: T) => ReactNode
}

interface TableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyExtractor: (row: T) => string
  emptyMessage?: string
  loading?: boolean
  page?: number
  totalPages?: number
  total?: number
  onPageChange?: (page: number) => void
  /** Permite quebra de linha nas células (evita rolagem horizontal). */
  wrapCells?: boolean
}

function renderCell<T>(row: T, col: Column<T>) {
  if (col.render) return col.render(row)
  return String((row as Record<string, unknown>)[col.key as string] ?? '')
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = 'Nenhum registro encontrado.',
  loading = false,
  page,
  totalPages,
  total,
  onPageChange,
  wrapCells = true,
}: TableProps<T>) {
  if (loading) {
    return <p className={styles.empty}>Carregando...</p>
  }

  if (!data || data.length === 0) {
    return <p className={styles.empty}>{emptyMessage}</p>
  }

  const hasPagination =
    page !== undefined &&
    totalPages !== undefined &&
    total !== undefined &&
    onPageChange !== undefined

  const firstItem = hasPagination
    ? total === 0
      ? 0
      : (page - 1) * data.length + 1
    : 1
  const lastItem = hasPagination
    ? Math.min(page * data.length, total)
    : data.length

  return (
    <div
      className={[styles.tableShell, wrapCells && styles.wrapCells]
        .filter(Boolean)
        .join(' ')}
    >
      <div className={styles.wrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={String(col.key)}>{col.header}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {data.map((row) => (
              <tr key={keyExtractor(row)}>
                {columns.map((col) => (
                  <td key={String(col.key)}>{renderCell(row, col)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.mobileList}>
        {data.map((row) => (
          <article key={keyExtractor(row)} className={styles.mobileCard}>
            {columns.map((col) => (
              <div key={String(col.key)} className={styles.mobileRow}>
                <span className={styles.mobileLabel}>{col.header}</span>
                <div className={styles.mobileValue}>{renderCell(row, col)}</div>
              </div>
            ))}
          </article>
        ))}
      </div>

      {hasPagination && (
        <div className={styles.pagination}>
          <span className={styles.pageInfo}>
            Mostrando {firstItem}-{lastItem} de {total} registros
          </span>

          <div className={styles.pageActions}>
            <button
              type="button"
              onClick={() => onPageChange!(page! - 1)}
              disabled={page === 1}
            >
              Anterior
            </button>

            <span>
              Página {page} de {totalPages}
            </span>

            <button
              type="button"
              onClick={() => onPageChange!(page! + 1)}
              disabled={page === totalPages}
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
