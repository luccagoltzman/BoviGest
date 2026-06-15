import { MonitorSmartphone, Share, Smartphone } from 'lucide-react'
import { Button, Modal } from '@/components/ui'
import type { PwaPlatform } from './pwaInstall.utils'
import styles from './PwaInstallModal.module.scss'

type Props = {
  open: boolean
  onClose: () => void
  platform: PwaPlatform
  reason: 'manual' | 'dismissed'
}

const STEPS: Record<PwaPlatform, string[]> = {
  ios: [
    'Use o Safari no iPhone ou iPad (a instalação não funciona no Chrome ou Firefox no iOS).',
    'Toque no ícone Compartilhar na barra inferior do Safari (quadrado com seta para cima).',
    'Role a lista e toque em "Adicionar à Tela de Início".',
    'Confirme tocando em "Adicionar" no canto superior direito.',
  ],
  android: [
    'Abra o menu do Chrome (três pontos no canto superior).',
    'Selecione "Instalar aplicativo" ou "Adicionar à tela inicial".',
    'Confirme a instalação na janela que abrir.',
  ],
  desktop: [
    'Clique no ícone de instalação na barra de endereço do Chrome ou Edge.',
    'Ou abra o menu do navegador (três pontos) e escolha "Instalar BoviGest".',
    'Confirme para adicionar o atalho ao computador.',
  ],
}

const PLATFORM_LABEL: Record<PwaPlatform, string> = {
  ios: 'iPhone / iPad (Safari)',
  android: 'Android (Chrome)',
  desktop: 'Computador',
}

function PlatformIcon({ platform }: { platform: PwaPlatform }) {
  if (platform === 'ios' || platform === 'android') {
    return <Smartphone size={22} aria-hidden />
  }
  return <MonitorSmartphone size={22} aria-hidden />
}

export function PwaInstallModal({
  open,
  onClose,
  platform,
  reason,
}: Props) {
  const steps = STEPS[platform]

  const intro =
    platform === 'ios'
      ? 'Siga o passo a passo abaixo para colocar o BoviGest na tela inicial e abrir como um aplicativo.'
      : reason === 'dismissed'
        ? 'Você cancelou a instalação. Se quiser tentar de outro jeito, siga o passo a passo abaixo.'
        : 'A instalação automática não está disponível neste navegador. Siga o passo a passo abaixo.'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Instalar o BoviGest"
      width="520px"
    >
      <div className={styles.content}>
        <div className={styles.intro}>
          <span className={styles.platformBadge}>
            <PlatformIcon platform={platform} />
            {PLATFORM_LABEL[platform]}
          </span>
          <p>{intro}</p>
        </div>

        {platform === 'ios' && (
          <div className={styles.iosHint}>
            <Share size={18} aria-hidden />
            <span>
              No iPhone, o ícone <strong>Compartilhar</strong> fica na barra
              inferior do Safari.
            </span>
          </div>
        )}

        <ol className={styles.steps}>
          {steps.map((step, index) => (
            <li key={index}>
              <span className={styles.stepNumber}>{index + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>

        <div className={styles.footer}>
          <Button variant="ghost" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </Modal>
  )
}
