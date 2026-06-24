export function telefoneParaWhatsApp(telefone: string): string | null {
  let digits = telefone.replace(/\D/g, '')
  if (!digits) return null

  while (digits.startsWith('0')) {
    digits = digits.slice(1)
  }

  if (digits.startsWith('55') && digits.length >= 12) return digits
  if (digits.length === 10 || digits.length === 11) return `55${digits}`
  if (digits.length >= 12) return digits

  return null
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function buildWhatsAppWebUrl(telefoneWhatsApp: string, text: string) {
  return `https://web.whatsapp.com/send?phone=${telefoneWhatsApp}&text=${encodeURIComponent(text)}`
}

export function abrirWhatsAppChat(
  telefoneWhatsApp: string,
  text: string,
  targetWindow?: Window | null,
) {
  const url = buildWhatsAppWebUrl(telefoneWhatsApp, text)

  if (targetWindow && !targetWindow.closed) {
    targetWindow.location.href = url
    return
  }

  window.open(url, '_blank', 'noopener,noreferrer')
}

export type EnviarPdfWhatsAppResult = 'web'

export async function enviarPdfViaWhatsApp(params: {
  blob: Blob
  filename: string
  telefone: string
  mensagem: string
  targetWindow?: Window | null
}): Promise<EnviarPdfWhatsAppResult> {
  const telefoneWhatsApp = telefoneParaWhatsApp(params.telefone)
  if (!telefoneWhatsApp) {
    throw new Error('Telefone inválido para WhatsApp')
  }

  downloadBlob(params.blob, params.filename)
  abrirWhatsAppChat(
    telefoneWhatsApp,
    `${params.mensagem}\n\nO PDF foi baixado — anexe o arquivo nesta conversa.`,
    params.targetWindow,
  )

  return 'web'
}
