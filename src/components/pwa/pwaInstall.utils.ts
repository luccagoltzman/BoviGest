export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type PwaPlatform = 'ios' | 'android' | 'desktop'

export function isStandaloneMode() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true
  )
}

export function isIosDevice() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

export function isAndroidDevice() {
  return /android/i.test(window.navigator.userAgent)
}

export function detectPwaPlatform(): PwaPlatform {
  if (isIosDevice()) return 'ios'
  if (isAndroidDevice()) return 'android'
  return 'desktop'
}
