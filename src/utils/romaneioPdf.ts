import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { preparePdfLogo } from '@/utils/pdfLogo'
import {
  type RomaneioItem,
  totaisRomaneio,
  totalItemRomaneio,
} from '@/services/romaneios.service'

export type RomaneioPdfInput = {
  logoUrl?: string | null
  dataRomaneio: string
  lote?: string
  fornecedorNome?: string | null
  observacao?: string | null
  itens: RomaneioItem[]
}

function formatDate(d: string) {
  if (!d) return '-'
  return new Date(`${d.slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR')
}

function formatPeso(v: number) {
  if (!v) return '0'
  return v.toLocaleString('pt-BR', {
    minimumFractionDigits: Number.isInteger(v) ? 0 : 2,
    maximumFractionDigits: 2,
  })
}

function sanitizeFilename(name: string) {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

export async function gerarRomaneioPdf(input: RomaneioPdfInput) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const margin = 12
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = margin

  const logo = await preparePdfLogo(input.logoUrl)
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
  doc.setFontSize(16)
  doc.text('ROMANEIO DE PESAGEM', margin, y + 6)

  y += logo ? Math.max(12, logo.heightMm + 4) : 10
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(60, 60, 60)

  doc.text(`Data: ${formatDate(input.dataRomaneio)}`, margin, y)
  if (input.lote) {
    doc.text(`Lote: ${input.lote}`, margin + 55, y)
  }
  y += 5

  if (input.fornecedorNome) {
    doc.text(`Fornecedor: ${input.fornecedorNome}`, margin, y)
    y += 5
  }

  if (input.observacao) {
    doc.text(`Obs.: ${input.observacao}`, margin, y)
    y += 5
  }

  doc.setTextColor(0, 0, 0)
  y += 4

  const body = input.itens.map((item) => [
    String(item.ordem),
    formatPeso(Number(item.dianteiro_1 || 0)),
    formatPeso(Number(item.dianteiro_2 || 0)),
    formatPeso(Number(item.traseiro_1 || 0)),
    formatPeso(Number(item.traseiro_2 || 0)),
    formatPeso(totalItemRomaneio(item)),
    (item.tipo || 'VACA').toUpperCase(),
  ])

  const totais = totaisRomaneio(input.itens)

  autoTable(doc, {
    startY: y,
    head: [['QTD', 'DT', 'DT', 'TZ', 'TZ', 'TOTAL', 'TIPO']],
    body: [
      ...body,
      [
        '',
        formatPeso(totais.dianteiro_1),
        formatPeso(totais.dianteiro_2),
        formatPeso(totais.traseiro_1),
        formatPeso(totais.traseiro_2),
        formatPeso(totais.total),
        '',
      ],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [37, 111, 62],
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center',
    },
    styles: {
      fontSize: 9,
      cellPadding: 2,
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 12 },
      6: { cellWidth: 22 },
    },
    margin: { left: margin, right: margin },
    didParseCell(data) {
      if (data.row.index === body.length && data.section === 'body') {
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.fillColor = [240, 245, 241]
      }
    },
  })

  const filename = `romaneio-${sanitizeFilename(
    input.lote || formatDate(input.dataRomaneio),
  )}.pdf`
  doc.save(filename)
}
