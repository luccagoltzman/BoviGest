import { getLogoUrl } from '@/services/theme.service'

export type PdfLogo = {
  dataUrl: string
  format: 'PNG' | 'JPEG'
  widthMm: number
  heightMm: number
}

const MAX_LOGO_WIDTH_MM = 45
const MAX_LOGO_HEIGHT_MM = 18

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Falha ao carregar logo'))
    img.src = src
  })
}

function imageToDataUrl(img: HTMLImageElement, format: 'PNG' | 'JPEG') {
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth || img.width
  canvas.height = img.naturalHeight || img.height

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas indisponível')

  ctx.drawImage(img, 0, 0)
  return canvas.toDataURL(format === 'JPEG' ? 'image/jpeg' : 'image/png', 0.92)
}

function fitLogoDimensions(widthPx: number, heightPx: number) {
  const ratio = widthPx / heightPx
  let widthMm = MAX_LOGO_WIDTH_MM
  let heightMm = widthMm / ratio

  if (heightMm > MAX_LOGO_HEIGHT_MM) {
    heightMm = MAX_LOGO_HEIGHT_MM
    widthMm = heightMm * ratio
  }

  return { widthMm, heightMm }
}

/** Carrega a logo da empresa (configurações) para uso em PDFs. */
export async function preparePdfLogo(
  logoUrl?: string | null,
): Promise<PdfLogo | null> {
  const url = logoUrl ?? getLogoUrl()
  if (!url) return null

  try {
    const img = await loadImageElement(url)
    const widthPx = img.naturalWidth || img.width
    const heightPx = img.naturalHeight || img.height

    if (!widthPx || !heightPx) return null

    const { widthMm, heightMm } = fitLogoDimensions(widthPx, heightPx)
    const useJpeg = !url.toLowerCase().includes('.png')
    const format = useJpeg ? 'JPEG' : 'PNG'
    const dataUrl = imageToDataUrl(img, format)

    return { dataUrl, format, widthMm, heightMm }
  } catch {
    return null
  }
}
