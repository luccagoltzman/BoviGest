import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { preparePdfLogo } from '@/utils/pdfLogo'
import {
  drawPageFooters,
  drawPdfTopBar,
  pdfTableTheme,
} from '@/utils/pdfTheme'
import {
  formatCurrencyBr,
  formatDateBr,
  formatKgBr,
  type AbateRelatorioLinha,
  type AbateRelatorioResumo,
} from '@/utils/abateRelatorio'

export type AbateRelatorioPdfInput = {
  startDate: string
  endDate: string
  linhas: AbateRelatorioLinha[]
  resumo: AbateRelatorioResumo
  logoUrl?: string | null
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

function formatCouro(kg: number) {
  return kg > 0 ? formatKgBr(kg) : '—'
}

export async function gerarAbateRelatorioPdf(input: AbateRelatorioPdfInput) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const margin = 12
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = margin

  drawPdfTopBar(doc, pageWidth)

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
  doc.setFontSize(15)
  doc.setTextColor(17, 53, 31)
  doc.text('Relatório de abates', margin, y + 5)

  y += logo ? Math.max(14, logo.heightMm + 2) : 12

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(60, 60, 60)
  doc.text(
    `Período: ${formatDateBr(input.startDate)} a ${formatDateBr(input.endDate)}`,
    margin,
    y,
  )
  y += 8

  const body = input.linhas.map((linha) => [
    formatDateBr(linha.dataAbate),
    String(linha.qtdAnimais),
    formatCurrencyBr(linha.valorBase),
    formatCouro(linha.couroDeixadoKg),
    linha.couroDeixadoKg > 0 ? formatCurrencyBr(linha.descontoPorCouro) : '—',
    linha.descontoTotal > 0 ? formatCurrencyBr(linha.descontoTotal) : '—',
    formatCurrencyBr(linha.valorTotalPago),
  ])

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [
      [
        'Data abate',
        'Animais',
        'Valor base (abate)',
        'Couro',
        'R$/kg couro',
        'Desconto',
        'Total pago',
      ],
    ],
    body,
    foot: [
      [
        'Totais',
        String(input.resumo.qtdAnimais),
        formatCurrencyBr(input.resumo.valorBase),
        formatCouro(input.resumo.couroDeixadoKg),
        '',
        formatCurrencyBr(input.resumo.descontoTotal),
        formatCurrencyBr(input.resumo.valorTotalPago),
      ],
    ],
    ...pdfTableTheme(),
    styles: {
      ...pdfTableTheme().styles,
      fontSize: 9,
    },
    headStyles: {
      ...pdfTableTheme().headStyles,
      fontSize: 8.5,
    },
    footStyles: {
      fillColor: [237, 246, 239],
      textColor: [17, 53, 31],
      fontStyle: 'bold' as const,
      fontSize: 9,
    },
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: 18, halign: 'center' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right', fontStyle: 'bold' },
    },
  })

  drawPageFooters(doc, margin, pageWidth)

  const filename = `relatorio-abates-${sanitizeFilename(
    `${input.startDate}_${input.endDate}`,
  )}.pdf`
  doc.save(filename)
}
