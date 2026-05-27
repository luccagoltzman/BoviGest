import type { ButtonHTMLAttributes, CSSProperties } from 'react'
import styles from './Button.module.scss'

type Variant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'destructive'

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  fullWidth?: boolean
  loading?: boolean
  size?: number
}

export function Button({
  variant = 'primary',
  fullWidth,
  loading = false,
  className = '',
  children,
  disabled,
  size,
  ...props
}: ButtonProps) {
  const customSize: CSSProperties = size
    ? {
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        minHeight: `${size}px`,
        borderRadius:8,
        padding: 0,
      }
    : {}

  return (
    <button
      type="button"
      disabled={disabled || loading}
      style={customSize}
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