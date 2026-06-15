import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import styles from './PwaManager.module.scss'

const UPDATE_CHECK_MS = 60 * 60 * 1000

export function PwaManager() {
  const [updating, setUpdating] = useState(false)
  const [swRegistration, setSwRegistration] =
    useState<ServiceWorkerRegistration | null>(null)

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (registration) setSwRegistration(registration)
    },
    onRegisterError(error) {
      console.error('[PWA] Falha ao registrar service worker:', error)
    },
  })

  useEffect(() => {
    if (!swRegistration) return

    swRegistration.update().catch(() => undefined)

    const intervalId = window.setInterval(() => {
      swRegistration.update().catch(() => undefined)
    }, UPDATE_CHECK_MS)

    const onFocus = () => {
      swRegistration.update().catch(() => undefined)
    }

    window.addEventListener('focus', onFocus)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', onFocus)
    }
  }, [swRegistration])

  async function handleUpdate() {
    setUpdating(true)

    try {
      await updateServiceWorker(true)
    } finally {
      setNeedRefresh(false)
      setUpdating(false)
    }
  }

  if (!needRefresh) return null

  return (
    <div className={styles.stack} role="region" aria-label="Atualização do aplicativo">
      <div className={`${styles.banner} ${styles.bannerUpdate}`}>
        <div className={styles.content}>
          <RefreshCw size={20} aria-hidden className={styles.icon} />
          <div>
            <strong>Nova versão disponível</strong>
            <p>
              Há uma atualização do BoviGest pronta para instalar. Atualize para
              usar a versão mais recente e evitar problemas de cache.
            </p>
          </div>
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={handleUpdate}
            disabled={updating}
          >
            {updating ? 'Atualizando...' : 'Atualizar agora'}
          </button>
          <button
            type="button"
            className={styles.ghostBtn}
            onClick={() => setNeedRefresh(false)}
            disabled={updating}
          >
            Depois
          </button>
        </div>
      </div>
    </div>
  )
}
