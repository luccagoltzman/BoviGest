/** URL pública do app (login, redirects de e-mail do Supabase Auth) */
export const APP_BASE_URL = (
  import.meta.env.VITE_APP_URL || 'https://bovi-gest.vercel.app'
).replace(/\/$/, '')

export const APP_LOGIN_URL = `${APP_BASE_URL}/login`

export const APP_REDEFINIR_SENHA_URL = `${APP_BASE_URL}/redefinir-senha`
