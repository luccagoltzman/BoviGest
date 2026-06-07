import { useEffect, useRef, useState, type ReactNode } from 'react'
import styles from './TouchTooltip.module.scss'

interface Props {
  label: ReactNode
  children: ReactNode
}

export function TouchTooltip({ label, children }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
    }
  }, [open])

  return (
    <div
      ref={ref}
      className={[styles.wrapper, open && styles.open].filter(Boolean).join(' ')}
    >
      <button
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {label}
      </button>
      <div className={styles.content} role="tooltip">
        {children}
      </div>
    </div>
  )
}

export { styles as touchTooltipStyles }
