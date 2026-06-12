import { AuthService } from './auth.service'
import { supabase } from './supabase'

const LOGO_BUCKET = 'logos'

export function sanitizeLogoUrl(url?: string | null): string {
  if (!url?.trim()) return ''

  // URLs blob são temporárias e não podem ser salvas
  if (url.startsWith('blob:')) return ''

  return url
}

export function isValidLogoUrl(url: unknown): url is string {
  if (typeof url !== 'string' || !url.trim()) return false
  if (url.startsWith('blob:')) return false

  return true
}

function getExtension(file: File) {
  const fromName = file.name.split('.').pop()?.toLowerCase()

  if (fromName && ['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(fromName)) {
    return fromName === 'jpeg' ? 'jpg' : fromName
  }

  const mimeMap: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
  }

  return mimeMap[file.type] ?? 'png'
}

function formatLogoUploadError(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    if (msg.includes('bucket not found')) {
      return 'Bucket de logos não existe no Supabase. Execute o arquivo supabase/storage-logos.sql no SQL Editor do projeto.'
    }
    if (msg.includes('row-level security') || msg.includes('policy')) {
      return 'Sem permissão para enviar a logo. Verifique se está logado e se as políticas do bucket foram criadas (storage-logos.sql).'
    }
    return error.message
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return formatLogoUploadError(new Error(String((error as { message: unknown }).message)))
  }

  return 'Erro ao enviar logo'
}

export async function uploadLogo(file: File): Promise<string> {
  const user = AuthService.getCachedUser()

  if (!user?.empresa_id) {
    throw new Error('Empresa não encontrada para upload da logo')
  }

  const extension = getExtension(file)
  const path = `${user.empresa_id}/logo.${extension}`

  const { error: uploadError } = await supabase.storage
    .from(LOGO_BUCKET)
    .upload(path, file, {
      upsert: true,
      contentType: file.type || `image/${extension}`,
      cacheControl: '3600',
    })

  if (uploadError) {
    throw new Error(formatLogoUploadError(uploadError))
  }

  const { data } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(path)

  return `${data.publicUrl}?t=${Date.now()}`
}
