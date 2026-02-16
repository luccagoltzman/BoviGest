import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { Button } from '../Button'
import styles from './Modal.module.scss'

export interface DetailItem {
  label: string
  value: ReactNode
}

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

export function ModalDetails({ items }: { items: DetailItem[] }) {
  return (
    <div className={styles.detailList}>
      {items.map((item, i) => (
        <div key={i} className={styles.detailRow}>
          <span className={styles.detailLabel}>{item.label}</span>
          <span className={styles.detailValue}>{item.value}</span>
        </div>
      ))}
    </div>
  )
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 id="modal-title" className={styles.title}>{title}</h2>
          <Button variant="ghost" onClick={onClose} className={styles.close} aria-label="Fechar">
            ✕
          </Button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  )
}
