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

export function buildWhatsAppWebUrl(telefoneWhatsApp: string, text?: string) {
  const base = `https://web.whatsapp.com/send?phone=${telefoneWhatsApp}`
  if (!text?.trim()) return base
  return `${base}&text=${encodeURIComponent(text)}`
}

export function abrirWhatsAppChat(
  telefoneWhatsApp: string,
  text?: string,
  targetWindow?: Window | null,
) {
  const url = buildWhatsAppWebUrl(telefoneWhatsApp, text)

  if (targetWindow && !targetWindow.closed) {
    targetWindow.location.href = url
    return
  }

  window.open(url, '_blank', 'noopener,noreferrer')
}

function criarArquivoPdf(blob: Blob, filename: string) {
  return new File([blob], filename, { type: 'application/pdf' })
}

export function pdfCompartilhavel(blob: Blob, filename: string) {
  if (typeof navigator.share !== 'function') return false
  if (typeof navigator.canShare !== 'function') return false

  const file = criarArquivoPdf(blob, filename)
  return navigator.canShare({ files: [file] })
}

async function compartilharPdfNativo(blob: Blob, filename: string) {
  const file = criarArquivoPdf(blob, filename)
  await navigator.share({ files: [file], title: filename })
}

export type EnviarPdfWhatsAppResult = 'share' | 'web'

export async function enviarPdfViaWhatsApp(params: {
  blob: Blob
  filename: string
  telefone: string
  targetWindow?: Window | null
}): Promise<EnviarPdfWhatsAppResult> {
  const telefoneWhatsApp = telefoneParaWhatsApp(params.telefone)
  if (!telefoneWhatsApp) {
    throw new Error('Telefone inválido para WhatsApp')
  }

  if (pdfCompartilhavel(params.blob, params.filename)) {
    try {
      await compartilharPdfNativo(params.blob, params.filename)
      return 'share'
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw error
      }
    }
  }

  downloadBlob(params.blob, params.filename)
  abrirWhatsAppChat(telefoneWhatsApp, undefined, params.targetWindow)

  return 'web'
}
