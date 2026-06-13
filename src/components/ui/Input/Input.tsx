import type {
  ChangeEvent,
  InputHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'
import {
  applyInputMask,
  maskInputMode,
  maskPlaceholder,
  type InputMask,
} from '@/utils/masks'
import styles from './Input.module.scss'

type DefaultInputProps = {
  label?: string
  error?: string
  mask?: InputMask
}

type TextInputProps = DefaultInputProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'mask'> & {
    multiline?: false
  }

type TextAreaProps = DefaultInputProps &
  TextareaHTMLAttributes<HTMLTextAreaElement> & {
    multiline: true
    mask?: never
  }

type InputProps = TextInputProps | TextAreaProps

export function Input(props: TextInputProps): JSX.Element
export function Input(props: TextAreaProps): JSX.Element

export function Input(props: InputProps) {
  const {
    label,
    error,
    id,
    className = '',
    multiline,
    mask,
    onChange,
    inputMode,
    placeholder,
    ...rest
  } = props

  const inputId = id ?? `input-${Math.random().toString(36).slice(2)}`

  function handleMaskedChange(event: ChangeEvent<HTMLInputElement>) {
    if (!mask) {
      ;(onChange as TextInputProps['onChange'])?.(event)
      return
    }

    const masked = applyInputMask(mask, event.target.value)
    event.target.value = masked
    ;(onChange as TextInputProps['onChange'])?.(event)
  }

  const resolvedInputMode = inputMode ?? (mask ? maskInputMode(mask) : undefined)
  const resolvedPlaceholder =
    placeholder ?? (mask ? maskPlaceholder(mask) : undefined)

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
          onChange={onChange as TextAreaProps['onChange']}
          placeholder={placeholder}
          {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        (() => {
          const inputRest = rest as InputHTMLAttributes<HTMLInputElement>
          const resolvedType = mask ? 'text' : inputRest.type
          const { type: _ignoredType, ...inputProps } = inputRest

          return (
            <input
              id={inputId}
              className={[styles.input, error && styles.hasError]
                .filter(Boolean)
                .join(' ')}
              type={resolvedType}
              inputMode={resolvedInputMode}
              placeholder={resolvedPlaceholder}
              onChange={mask ? handleMaskedChange : onChange}
              {...inputProps}
            />
          )
        })()
      )}

      {error && <span className={styles.error}>{error}</span>}
    </div>
  )
}

export type { InputMask }
