import type { ButtonHTMLAttributes } from 'react'
import styles from './Button.module.scss'

type Variant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'destructive'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  fullWidth?: boolean
  loading?: boolean
}

export function Button({
  variant = 'primary',
  fullWidth,
  loading = false,
  className = '',
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={[
        styles.btn,
        styles[variant],
        fullWidth && styles.fullWidth,
        loading && styles.loading,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >

      <span className={loading ? styles.loadingText : ''}>
        {children}
      </span>

      {loading && <span className={styles.spinner} />}

    </button>
  )
}