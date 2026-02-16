import type { InputHTMLAttributes } from 'react'
import styles from './Input.module.scss'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, id, className = '', ...props }: InputProps) {
  const inputId = id ?? `input-${Math.random().toString(36).slice(2)}`
  return (
    <div className={[styles.wrap, className].filter(Boolean).join(' ')}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}
      <input id={inputId} className={[styles.input, error && styles.hasError].filter(Boolean).join(' ')} {...props} />
      {error && <span className={styles.error}>{error}</span>}
    </div>
  )
}
