import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { AbateBaixa } from '@/services/pagamentosAbates.service'
import {
  contaPagamentoFromParcela,
  contaPagamentoTemDados,
  contaPagamentoToDetailItems,
  formatContaPagamentoResumo,
} from '@/utils/contaPagamento'
import { formatSemanaLabel } from '@/utils/abatePagamento'
import { preparePdfLogo } from '@/utils/pdfLogo'
import {
  PDF_COLORS,
  drawKpiRow,
  drawPageFooters,
  drawPdfTopBar,
  drawSectionTitle,
  pdfTableTheme,
} from '@/utils/pdfTheme'

export type AbateBaixaPdfInput = {
  baixa: AbateBaixa
  logoUrl?: string | null
}

function formatDate(value: string) {
  if (!value) return '—'
  return new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR')
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function abateBaixaPdfFilename(
  baixa: Pick<AbateBaixa, 'id' | 'data_pagamento'>,
) {
  return `comprovante-abate-baixa-${baixa.id}-${baixa.data_pagamento.slice(0, 10)}.pdf`
}

export async function gerarAbateBaixaPdf(input: AbateBaixaPdfInput) {
  const { baixa } = input
  const prestadorNome = baixa.prestador?.nome || 'Prestador não informado'
  const itens = baixa.itens || []

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const margin = 12
  const pageWidth = doc.internal.pageSize.getWidth()
  const contentWidth = pageWidth - margin * 2
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
  doc.setTextColor(...PDF_COLORS.primaryDark)
  doc.text('COMPROVANTE DE PAGAMENTO — ABATE', margin, y + 6)

  y += logo ? Math.max(14, logo.heightMm + 2) : 12

  doc.setFillColor(...PDF_COLORS.primaryLight)
  doc.setDrawColor(...PDF_COLORS.border)
  doc.setLineWidth(0.2)
  doc.roundedRect(margin, y, contentWidth, 24, 2.5, 2.5, 'FD')

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...PDF_COLORS.textMuted)
  doc.text('PRESTADOR DE SERVIÇO (ABATEDOURO)', margin + 4, y + 5.5)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(...PDF_COLORS.text)
  doc.text(prestadorNome, margin + 4, y + 11)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...PDF_COLORS.textMuted)
  const infoLinha = [
    `Pagamento em ${formatDate(baixa.data_pagamento)}`,
    baixa.prestador?.doc ? `Doc.: ${baixa.prestador.doc}` : null,
    `Baixa #${baixa.id}`,
  ]
    .filter(Boolean)
    .join(' · ')
  doc.text(infoLinha, margin + 4, y + 16.5)

  doc.text(
    `Gerado em: ${new Date().toLocaleString('pt-BR')}`,
    pageWidth - margin - 4,
    y + 16.5,
    { align: 'right' },
  )

  doc.text(
    `Período dos abates: ${formatSemanaLabel(baixa.semana_inicio, baixa.semana_fim)}`,
    margin + 4,
    y + 21,
  )

  y += 30

  y = drawKpiRow(doc, margin, pageWidth, y, [
    { label: 'Abates quitados', value: String(itens.length) },
    { label: 'Forma de pagamento', value: baixa.forma_pagamento || '—' },
    {
      label: 'Valor pago',
      value: formatCurrency(Number(baixa.valor_total || 0)),
      highlight: true,
    },
  ])

  y += 6
  drawSectionTitle(doc, margin, y, 'Abates incluídos na baixa')
  y += 9

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    ...pdfTableTheme(),
    head: [['Data', 'Lote', 'Animais', 'Valor']],
    body: itens.map((item) => {
      const abate = item.abate
      return [
        formatDate(abate?.data_abate || ''),
        abate?.lote || '—',
        String(abate?.qtd_animais ?? '—'),
        formatCurrency(Number(item.valor || 0)),
      ]
    }),
    foot: [['', '', 'Total', formatCurrency(Number(baixa.valor_total || 0))]],
    columnStyles: {
      0: { cellWidth: 28 },
      3: { halign: 'right' },
    },
    footStyles: {
      fillColor: PDF_COLORS.primaryLight,
      textColor: PDF_COLORS.primaryDark,
      fontStyle: 'bold',
    },
  })

  y =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? y
  y += 8

  const conta = contaPagamentoFromParcela(baixa)
  if (contaPagamentoTemDados(conta)) {
    drawSectionTitle(doc, margin, y, 'Dados para pagamento')
    y += 9

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      ...pdfTableTheme(),
      head: [['Campo', 'Informação']],
      body: contaPagamentoToDetailItems(conta).map((item) => [
        item.label,
        item.value,
      ]),
      columnStyles: {
        0: { cellWidth: 48 },
      },
    })

    y =
      (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
        ?.finalY ?? y
    y += 4

    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8)
    doc.setTextColor(...PDF_COLORS.textMuted)
    doc.text(formatContaPagamentoResumo(conta), margin, y + 4)
    y += 10
  }

  if (baixa.observacao?.trim()) {
    drawSectionTitle(doc, margin, y, 'Observação')
    y += 9
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...PDF_COLORS.text)
    const lines = doc.splitTextToSize(baixa.observacao.trim(), contentWidth)
    doc.text(lines, margin, y)
  }

  drawPageFooters(doc, margin, pageWidth)

  doc.save(abateBaixaPdfFilename(baixa))
}
