import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { CompraParcela } from '@/services/pagamentosCompras.service'
import {
  contaPagamentoFromFornecedor,
  contaPagamentoFromParcela,
  contaPagamentoTemDados,
  contaPagamentoToDetailItems,
  formatContaPagamentoResumo,
} from '@/utils/contaPagamento'
import { preparePdfLogo } from '@/utils/pdfLogo'
import {
  PDF_COLORS,
  drawKpiRow,
  drawPageFooters,
  drawPdfTopBar,
  drawSectionTitle,
  pdfTableTheme,
} from '@/utils/pdfTheme'

export type CompraPagamentoPdfInput = {
  compra: {
    id: number
    data: string
    quantidade_animais: number
    peso_total: number
    valor_kg: number
    tipo_gado?: string | null
    condicao_gado: number
    observacoes?: string | null
    detalhes_custo?: {
      subtotal: number
      imposto: number
      gta: number
      viagem: number
      total: number
    }
  }
  fornecedorNome: string
  fornecedorDoc?: string | null
  fornecedorConta?: ReturnType<typeof contaPagamentoFromFornecedor>
  parcelas: CompraParcela[]
  logoUrl?: string | null
}

function formatDate(value: string) {
  if (!value) return '—'
  return new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR')
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
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

function statusParcelaLabel(parcela: CompraParcela) {
  if (parcela.status === 'pago') return 'Pago'

  const hoje = new Date()
  hoje.setHours(12, 0, 0, 0)
  const vencimento = new Date(`${parcela.data_vencimento.slice(0, 10)}T12:00:00`)

  if (vencimento < hoje) return 'Atrasado'

  return 'Pendente'
}

export async function gerarCompraPagamentoPdf(input: CompraPagamentoPdfInput) {
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
  doc.text('PAGAMENTO — COMPRA DE GADO', margin, y + 6)

  y += logo ? Math.max(14, logo.heightMm + 2) : 12

  doc.setFillColor(...PDF_COLORS.primaryLight)
  doc.setDrawColor(...PDF_COLORS.border)
  doc.setLineWidth(0.2)
  doc.roundedRect(margin, y, contentWidth, 22, 2.5, 2.5, 'FD')

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...PDF_COLORS.textMuted)
  doc.text('FORNECEDOR', margin + 4, y + 5.5)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(...PDF_COLORS.text)
  doc.text(input.fornecedorNome, margin + 4, y + 11)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...PDF_COLORS.textMuted)
  const linhaInfo = [
    `Compra em ${formatDate(input.compra.data)}`,
    input.fornecedorDoc ? `Doc.: ${input.fornecedorDoc}` : null,
    `Ref. #${input.compra.id}`,
  ]
    .filter(Boolean)
    .join(' · ')
  doc.text(linhaInfo, margin + 4, y + 17)

  doc.text(
    `Gerado em: ${new Date().toLocaleString('pt-BR')}`,
    pageWidth - margin - 4,
    y + 17,
    { align: 'right' },
  )

  y += 28

  const detalhes = input.compra.detalhes_custo
  const totalCompra = detalhes?.total ?? 0
  const valorPago = input.parcelas
    .filter((p) => p.status === 'pago')
    .reduce((acc, p) => acc + Number(p.valor || 0), 0)
  const valorPendente = Math.max(0, totalCompra - valorPago)

  drawSectionTitle(doc, margin, y, 'Resumo da compra')
  y += 9

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    ...pdfTableTheme(),
    head: [['Item', 'Valor']],
    body: [
      ['Animais', String(input.compra.quantidade_animais)],
      ['Peso total', `${Number(input.compra.peso_total).toFixed(2)} kg`],
      ['Valor/kg', formatCurrency(Number(input.compra.valor_kg))],
      ['Tipo de gado', input.compra.tipo_gado || '—'],
      ['Condição', input.compra.condicao_gado === 1 ? 'Vivo' : 'Abatido'],
      ...(detalhes
        ? [
            ['Valor do gado', formatCurrency(detalhes.subtotal)],
            ['Total', formatCurrency(detalhes.total)],
          ]
        : []),
    ],
    columnStyles: {
      0: { cellWidth: 55 },
      1: { halign: 'right' },
    },
  })

  y =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? y
  y += 8

  y = drawKpiRow(doc, margin, pageWidth, y, [
    { label: 'Total da compra', value: formatCurrency(totalCompra) },
    { label: 'Já pago', value: formatCurrency(valorPago) },
    {
      label: 'A pagar',
      value: formatCurrency(valorPendente),
      highlight: valorPendente > 0.02,
    },
  ])

  y += 6
  drawSectionTitle(doc, margin, y, 'Parcelas / pagamentos')
  y += 9

  if (input.parcelas.length === 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...PDF_COLORS.textMuted)
    doc.text('Nenhuma parcela cadastrada para esta compra.', margin, y)
    y += 8
  } else {
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      ...pdfTableTheme(),
      head: [['Parcela', 'Valor', 'Vencimento', 'Status', 'Pago em', 'Forma']],
      body: input.parcelas.map((parcela) => [
        `${parcela.numero_parcela}/${parcela.total_parcelas}`,
        formatCurrency(Number(parcela.valor)),
        formatDate(parcela.data_vencimento),
        statusParcelaLabel(parcela),
        parcela.status === 'pago' && parcela.data_pagamento
          ? formatDate(parcela.data_pagamento)
          : '—',
        parcela.forma_pagamento || '—',
      ]),
      columnStyles: {
        0: { cellWidth: 18 },
        1: { cellWidth: 28, halign: 'right' },
        2: { cellWidth: 24 },
        3: { cellWidth: 22 },
        4: { cellWidth: 24 },
        5: { cellWidth: 24 },
      },
      didParseCell(data) {
        if (data.section !== 'body' || data.column.index !== 3) return

        const status = String(data.cell.raw)
        if (status === 'Pago') {
          data.cell.styles.textColor = PDF_COLORS.recebimento
        } else if (status === 'Atrasado') {
          data.cell.styles.textColor = [185, 28, 28]
        }
      },
    })

    y =
      (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
        ?.finalY ?? y
    y += 8
  }

  const contaFornecedor =
    input.fornecedorConta && contaPagamentoTemDados(input.fornecedorConta)
      ? input.fornecedorConta
      : null

  const contaParcela = input.parcelas
    .map((p) => contaPagamentoFromParcela(p))
    .find((c) => contaPagamentoTemDados(c))

  const contaExibir = contaParcela || contaFornecedor

  if (contaExibir && contaPagamentoTemDados(contaExibir)) {
    if (y > doc.internal.pageSize.getHeight() - 45) {
      doc.addPage()
      y = margin
      drawPdfTopBar(doc, pageWidth)
    }

    drawSectionTitle(doc, margin, y, 'Dados bancários para pagamento')
    y += 9

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      ...pdfTableTheme(),
      head: [['Campo', 'Informação']],
      body: contaPagamentoToDetailItems(contaExibir).map((item) => [
        item.label,
        item.value,
      ]),
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: contentWidth - 40 },
      },
    })

    y =
      (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
        ?.finalY ?? y
    y += 4

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...PDF_COLORS.textMuted)
    doc.text(formatContaPagamentoResumo(contaExibir), margin, y + 4)
    y += 10
  }

  if (input.compra.observacoes?.trim()) {
    if (y > doc.internal.pageSize.getHeight() - 30) {
      doc.addPage()
      y = margin
      drawPdfTopBar(doc, pageWidth)
    }

    drawSectionTitle(doc, margin, y, 'Observações')
    y += 9
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...PDF_COLORS.text)
    const obsLines = doc.splitTextToSize(
      input.compra.observacoes.trim(),
      contentWidth,
    )
    doc.text(obsLines, margin, y)
  }

  drawPageFooters(doc, margin, pageWidth)

  const filename = `pagamento-${sanitizeFilename(input.fornecedorNome) || 'compra'}-${input.compra.data.slice(0, 10)}.pdf`
  doc.save(filename)
}
