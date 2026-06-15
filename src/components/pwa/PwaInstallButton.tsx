import { Download } from 'lucide-react'
import { usePwaInstall } from './PwaInstallContext'
import styles from './PwaInstallButton.module.scss'

type Props = {
  className?: string
  onNavigate?: () => void
}

export function PwaInstallButton({ className, onNavigate }: Props) {
  const { installed, canInstall, installing, requestInstall } = usePwaInstall()

  if (!canInstall || installed) return null

  return (
    <button
      type="button"
      className={[styles.button, className].filter(Boolean).join(' ')}
      disabled={installing}
      onClick={async () => {
        await requestInstall()
        onNavigate?.()
      }}
    >
      <Download size={14} aria-hidden className={styles.icon} />
      <span>{installing ? 'Instalando...' : 'Instalar app'}</span>
    </button>
  )
}
