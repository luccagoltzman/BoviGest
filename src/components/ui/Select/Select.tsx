import React, { useId } from 'react'
import styles from './Select.module.scss'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  options: string[]
  placeholder?: string
}

export function Select({
  label,
  options,
  value,
  onChange,
  id,
  placeholder = 'Selecione...',
  ...props
}: SelectProps) {
  const generatedId = useId()
  const selectId = id ?? generatedId

  return (
    <div className={styles.selectWrapper}>
      <label htmlFor={selectId} className={styles.label}>
        {label}
      </label>
      <select
        id={selectId}
        className={styles.select}
        value={value}
        onChange={onChange}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  )
}
