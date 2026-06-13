const DEFAULT_APP_URL = 'https://bovi-gest.vercel.app'

function normalizeBaseUrl(url: string) {
  return url.replace(/\/$/, '')
}

/** URL pública do app (login, redirects de e-mail do Supabase Auth) */
export function resolveAppBaseUrl() {
  const fromEnv = import.meta.env.VITE_APP_URL?.trim()
  if (fromEnv && !fromEnv.includes('localhost') && !fromEnv.includes('127.0.0.1')) {
    return normalizeBaseUrl(fromEnv)
  }

  if (typeof window !== 'undefined') {
    const { origin, hostname } = window.location
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return normalizeBaseUrl(origin)
    }
  }

  return DEFAULT_APP_URL
}

export const APP_BASE_URL = resolveAppBaseUrl()

export const APP_LOGIN_URL = `${APP_BASE_URL}/login`

export const APP_REDEFINIR_SENHA_URL = `${APP_BASE_URL}/redefinir-senha`
