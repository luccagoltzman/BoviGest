import type jsPDF from 'jspdf'

export const PDF_COLORS = {
  primary: [37, 111, 62] as [number, number, number],
  primaryDark: [17, 53, 31] as [number, number, number],
  primaryLight: [237, 246, 239] as [number, number, number],
  stripe: [248, 252, 249] as [number, number, number],
  textMuted: [92, 102, 96] as [number, number, number],
  text: [28, 32, 30] as [number, number, number],
  border: [210, 220, 214] as [number, number, number],
  recebimento: [22, 120, 68] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
}

export function pdfTableTheme() {
  return {
    theme: 'grid' as const,
    styles: {
      fontSize: 9,
      cellPadding: { top: 3.2, right: 3, bottom: 3.2, left: 3 },
      textColor: PDF_COLORS.text,
      lineColor: PDF_COLORS.border,
      lineWidth: 0.15,
      overflow: 'linebreak' as const,
      valign: 'middle' as const,
    },
    headStyles: {
      fillColor: PDF_COLORS.primary,
      textColor: PDF_COLORS.white,
      fontStyle: 'bold' as const,
      fontSize: 8.5,
      cellPadding: { top: 3.8, right: 3, bottom: 3.8, left: 3 },
    },
    alternateRowStyles: {
      fillColor: PDF_COLORS.stripe,
    },
  }
}

export function drawPdfTopBar(doc: jsPDF, pageWidth: number) {
  doc.setFillColor(...PDF_COLORS.primary)
  doc.rect(0, 0, pageWidth, 3.5, 'F')
}

export function drawSectionTitle(
  doc: jsPDF,
  margin: number,
  y: number,
  title: string,
) {
  doc.setFillColor(...PDF_COLORS.primary)
  doc.rect(margin, y, 2.2, 6.5, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11.5)
  doc.setTextColor(...PDF_COLORS.primaryDark)
  doc.text(title, margin + 5, y + 4.8)
}

export function drawSectionSubtitle(
  doc: jsPDF,
  margin: number,
  y: number,
  maxWidth: number,
  text: string,
): number {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...PDF_COLORS.textMuted)
  const lines = doc.splitTextToSize(text, maxWidth)
  doc.text(lines, margin, y)
  return y + lines.length * 3.6
}

type KpiItem = {
  label: string
  value: string
  highlight?: boolean
}

export function drawKpiRow(
  doc: jsPDF,
  margin: number,
  pageWidth: number,
  y: number,
  items: KpiItem[],
): number {
  const gap = 2.8
  const count = items.length
  const width = (pageWidth - margin * 2 - gap * (count - 1)) / count
  const height = 17

  items.forEach((item, index) => {
    const x = margin + index * (width + gap)
    const highlighted = !!item.highlight

    doc.setDrawColor(...PDF_COLORS.border)
    doc.setLineWidth(0.2)

    if (highlighted) {
      doc.setFillColor(...PDF_COLORS.primary)
      doc.roundedRect(x, y, width, height, 2, 2, 'FD')
      doc.setTextColor(...PDF_COLORS.white)
    } else {
      doc.setFillColor(...PDF_COLORS.primaryLight)
      doc.roundedRect(x, y, width, height, 2, 2, 'FD')
      doc.setTextColor(...PDF_COLORS.textMuted)
    }

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.2)
    doc.text(item.label, x + width / 2, y + 5.2, { align: 'center' })

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(highlighted ? 10 : 8.8)
    if (!highlighted) doc.setTextColor(...PDF_COLORS.primaryDark)
    const valueLines = doc.splitTextToSize(item.value, width - 4)
    doc.text(valueLines.slice(0, 2), x + width / 2, y + 12, { align: 'center' })
  })

  doc.setTextColor(...PDF_COLORS.text)
  return y + height
}

export function drawPdfHeader(
  doc: jsPDF,
  opts: {
    margin: number
    pageWidth: number
    title: string
    clienteNome: string
    periodo: string
    geradoEm: string
    logo?: { dataUrl: string; format: 'PNG' | 'JPEG'; widthMm: number; heightMm: number } | null
  },
): number {
  const { margin, pageWidth, title, clienteNome, periodo, geradoEm, logo } = opts
  let y = margin + 2

  if (logo) {
    doc.addImage(
      logo.dataUrl,
      logo.format,
      pageWidth - margin - logo.widthMm,
      y,
      logo.widthMm,
      logo.heightMm,
    )
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.setTextColor(...PDF_COLORS.primaryDark)
  doc.text(title, margin, y + 6)

  y += logo ? Math.max(14, logo.heightMm + 2) : 12

  const boxHeight = 20
  doc.setFillColor(...PDF_COLORS.primaryLight)
  doc.setDrawColor(...PDF_COLORS.border)
  doc.setLineWidth(0.2)
  doc.roundedRect(margin, y, pageWidth - margin * 2, boxHeight, 2.5, 2.5, 'FD')

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...PDF_COLORS.textMuted)
  doc.text('CLIENTE', margin + 4, y + 5.5)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...PDF_COLORS.text)
  const nomeLines = doc.splitTextToSize(clienteNome, pageWidth - margin * 2 - 8)
  doc.text(nomeLines.slice(0, 2), margin + 4, y + 10.5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...PDF_COLORS.textMuted)
  doc.text(`Período: ${periodo}`, margin + 4, y + 17)
  doc.text(`Gerado em: ${geradoEm}`, pageWidth - margin - 4, y + 17, {
    align: 'right',
  })

  doc.setTextColor(...PDF_COLORS.text)
  return y + boxHeight + 8
}

export function drawPageFooters(doc: jsPDF, margin: number, pageWidth: number) {
  const pageHeight = doc.internal.pageSize.getHeight()
  const total = doc.getNumberOfPages()

  for (let page = 1; page <= total; page += 1) {
    doc.setPage(page)
    doc.setDrawColor(...PDF_COLORS.border)
    doc.setLineWidth(0.15)
    doc.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...PDF_COLORS.textMuted)
    doc.text('Documento gerado pelo BoviGest', margin, pageHeight - 6.5)
    doc.text(`Página ${page} de ${total}`, pageWidth - margin, pageHeight - 6.5, {
      align: 'right',
    })
  }
}
