import { useEffect, useState } from 'react'
import { clearInvalidLogoFromCache, getLogoUrl } from '@/services/theme.service'
import styles from './AppLogo.module.scss'

const BRAND_NAME = 'BoviGest'

type AppLogoProps = {
  variant?: 'sidebar' | 'login'
  className?: string
}

type LogoImageProps = {
  src: string
  variant?: 'sidebar' | 'login'
  className?: string
  onInvalid?: (src: string) => void
}

function BrandFallback({ className }: { className?: string }) {
  return (
    <span className={[styles.brand, className].filter(Boolean).join(' ')}>
      {BRAND_NAME}
    </span>
  )
}

export function LogoImage({
  src,
  variant = 'sidebar',
  className,
  onInvalid,
}: LogoImageProps) {
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    setHasError(false)
  }, [src])

  if (hasError) {
    return <BrandFallback className={className} />
  }

  return (
    <img
      src={src}
      alt="Logo"
      className={[styles.image, styles[variant], className]
        .filter(Boolean)
        .join(' ')}
      onError={() => {
        setHasError(true)
        onInvalid?.(src)
      }}
    />
  )
}

export function AppLogo({ variant = 'sidebar', className }: AppLogoProps) {
  const [logoUrl, setLogoUrl] = useState(() => getLogoUrl())

  useEffect(() => {
    const refresh = () => setLogoUrl(getLogoUrl())

    window.addEventListener('theme-updated', refresh)

    return () => window.removeEventListener('theme-updated', refresh)
  }, [])

  if (!logoUrl) {
    return <BrandFallback className={className} />
  }

  return (
    <LogoImage
      src={logoUrl}
      variant={variant}
      className={className}
      onInvalid={(src) => clearInvalidLogoFromCache(src)}
    />
  )
}
