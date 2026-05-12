import { useId, useMemo, useState } from 'react'
import styles from './Autocomplete.module.scss'

interface AutocompleteProps {
  label: string
  options: string[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  loading?: boolean
  disabled?: boolean
}

export function Autocomplete({
  label,
  options,
  value,
  onChange,
  placeholder = 'Digite para buscar...',
  loading = false,
  disabled = false,
}: AutocompleteProps) {
  const inputId = useId()
  const [open, setOpen] = useState(false)

  const filteredOptions = useMemo(() => {
    const search = value.trim().toLowerCase()
    if (!search) return options.slice(0, 6)

    return options
      .filter((option) => option.toLowerCase().includes(search))
      .slice(0, 6)
  }, [options, value])

  const hasSuggestions = open && !loading && filteredOptions.length > 0

  return (
    <div className={styles.wrapper}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>

      <div className={styles.field}>
        <input
          id={inputId}
          className={styles.input}
          value={value}
          placeholder={loading ? 'Carregando opções...' : placeholder}
          disabled={disabled}
          autoComplete="off"
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onChange={(event) => {
            onChange(event.target.value)
            setOpen(true)
          }}
        />

        {loading && <span className={styles.status}>Carregando</span>}

        {hasSuggestions && (
          <div className={styles.suggestions}>
            {filteredOptions.map((option) => (
              <button
                key={option}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(option)
                  setOpen(false)
                }}
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
