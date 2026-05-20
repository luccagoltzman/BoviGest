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
    <div className={styles.tableShell}>
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
                  <td key={String(col.key)}>
                    {col.render
                      ? col.render(row)
                      : String((row as any)[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
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
