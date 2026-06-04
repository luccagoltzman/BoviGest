import type {
  InputHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'
import styles from './Input.module.scss'

type DefaultInputProps = {
  label?: string
  error?: string
}

type TextInputProps = DefaultInputProps &
  InputHTMLAttributes<HTMLInputElement> & {
    multiline?: false
  }

type TextAreaProps = DefaultInputProps &
  TextareaHTMLAttributes<HTMLTextAreaElement> & {
    multiline: true
  }

type InputProps = TextInputProps | TextAreaProps

export function Input(props: TextInputProps): JSX.Element
export function Input(props: TextAreaProps): JSX.Element

export function Input({
  label,
  error,
  id,
  className = '',
  multiline,
  ...props
}: InputProps) {
  const inputId = id ?? `input-${Math.random().toString(36).slice(2)}`

  return (
    <div className={[styles.wrap, className].filter(Boolean).join(' ')}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}

      {multiline ? (
        <textarea
          id={inputId}
          className={[styles.input, error && styles.hasError]
            .filter(Boolean)
            .join(' ')}
          {...(props as TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input
          id={inputId}
          className={[styles.input, error && styles.hasError]
            .filter(Boolean)
            .join(' ')}
          {...(props as InputHTMLAttributes<HTMLInputElement>)}
        />
      )}

      {error && <span className={styles.error}>{error}</span>}
    </div>
  )
}