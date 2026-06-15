import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { PwaInstallModal } from './PwaInstallModal'
import {
  type BeforeInstallPromptEvent,
  detectPwaPlatform,
  isStandaloneMode,
} from './pwaInstall.utils'

type PwaInstallContextValue = {
  installed: boolean
  canInstall: boolean
  installing: boolean
  platform: ReturnType<typeof detectPwaPlatform>
  hasNativePrompt: boolean
  requestInstall: () => Promise<void>
}

const PwaInstallContext = createContext<PwaInstallContextValue | null>(null)

export function PwaInstallProvider({ children }: { children: ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalReason, setModalReason] = useState<'manual' | 'dismissed'>(
    'manual',
  )
  const [installing, setInstalling] = useState(false)

  const installed = isStandaloneMode()
  const platform = detectPwaPlatform()
  const hasNativePrompt = deferredPrompt !== null
  const canInstall = !installed

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
    }
  }, [])

  const closeInstallModal = useCallback(() => {
    setModalOpen(false)
  }, [])

  const installNative = useCallback(async () => {
    if (!deferredPrompt) {
      return false
    }

    setInstalling(true)

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      setDeferredPrompt(null)

      if (outcome === 'accepted') {
        setModalOpen(false)
        return true
      }

      return false
    } finally {
      setInstalling(false)
    }
  }, [deferredPrompt])

  const requestInstall = useCallback(async () => {
    const canInstallNatively = platform !== 'ios' && deferredPrompt !== null

    if (!canInstallNatively) {
      setModalReason('manual')
      setModalOpen(true)
      return
    }

    const accepted = await installNative()

    if (!accepted) {
      setModalReason('dismissed')
      setModalOpen(true)
    }
  }, [platform, deferredPrompt, installNative])

  const value = useMemo(
    () => ({
      installed,
      canInstall,
      installing,
      platform,
      hasNativePrompt,
      requestInstall,
    }),
    [
      installed,
      canInstall,
      installing,
      platform,
      hasNativePrompt,
      requestInstall,
    ],
  )

  return (
    <PwaInstallContext.Provider value={value}>
      {children}
      <PwaInstallModal
        open={modalOpen}
        onClose={closeInstallModal}
        platform={platform}
        reason={modalReason}
      />
    </PwaInstallContext.Provider>
  )
}

export function usePwaInstall() {
  const context = useContext(PwaInstallContext)

  if (!context) {
    throw new Error('usePwaInstall deve ser usado dentro de PwaInstallProvider')
  }

  return context
}
