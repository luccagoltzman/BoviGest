import { configuracoesService } from './configuracoes.service'

function hexToRgb(hex: string) {
  const sanitized = hex.replace('#', '')

  const bigint = parseInt(sanitized, 16)

  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  }
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((x) => {
      const hex = x.toString(16)
      return hex.length === 1 ? `0${hex}` : hex
    })
    .join('')}`
}

function adjustColor(hex: string, amount: number) {
  const { r, g, b } = hexToRgb(hex)

  return rgbToHex(
    Math.max(0, Math.min(255, r + amount)),
    Math.max(0, Math.min(255, g + amount)),
    Math.max(0, Math.min(255, b + amount)),
  )
}

function applyTheme(config: any) {
  const root = document.documentElement

  if (config?.primary_color) {
    const primary = config.primary_color

    const primaryLight = adjustColor(primary, 35)
    const primaryDark = adjustColor(primary, -35)

    root.style.setProperty(
      '--theme-primary',
      primary,
    )

    root.style.setProperty(
      '--theme-primary-light',
      primaryLight,
    )

    root.style.setProperty(
      '--theme-primary-dark',
      primaryDark,
    )
  }

  if (config?.secondary_color) {
    root.style.setProperty(
      '--theme-secondary',
      config.secondary_color,
    )
  }

  if (config?.sidebar_color) {
    root.style.setProperty(
      '--theme-sidebar-start',
      config.sidebar_color,
    )
  }

  if (config?.sidebar_end_color) {
    root.style.setProperty(
      '--theme-sidebar-end',
      config.sidebar_end_color,
    )
  }

  if (config?.button_gradient_end_color) {
    root.style.setProperty(
      '--theme-button-gradient-end',
      config.button_gradient_end_color,
    )
  }

  if (config?.background_glow_color) {
    root.style.setProperty(
      '--theme-background-glow',
      config.background_glow_color,
    )
  }
}

export async function loadTheme() {
  const cache = localStorage.getItem('theme_config')

  if (cache) {
    applyTheme(JSON.parse(cache))
  }

  try {
    const config = await configuracoesService.get()

    if (!config) return

    applyTheme(config)

    localStorage.setItem(
      'theme_config',
      JSON.stringify(config),
    )
  } catch (error) {
    console.error(error)
  }
}