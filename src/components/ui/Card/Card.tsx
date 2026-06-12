import type { HTMLAttributes, ReactNode } from 'react'
import styles from './Card.module.scss'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string
  action?: ReactNode
}

export function Card({
  title,
  action,
  children,
  className = '',
  ...props
}: CardProps) {
  return (
    <div
      data-reveal-target
      className={[styles.card, className].filter(Boolean).join(' ')}
      {...props}
    >
      {title && (
        <div className={styles.header}>
          <h3 className={styles.title}>{title}</h3>
          {action ? <div className={styles.action}>{action}</div> : null}
        </div>
      )}
      {children}
    </div>
  )
}
