import React from 'react'
import styles from './Select.module.scss'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  options: string[]
}

export function Select({ label, options, value, onChange, ...props }: SelectProps) {
  return (
    <div className={styles.selectWrapper}>
      <label className={styles.label}>{label}</label>
      <select className={styles.select} value={value} onChange={onChange} {...props}>
        <option value="">Selecione...</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  )
}