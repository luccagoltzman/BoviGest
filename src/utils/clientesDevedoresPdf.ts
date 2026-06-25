import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { ClienteDevedorResumo } from '@/services/financeiro.service'
import { preparePdfLogo } from '@/utils/pdfLogo'
import {
  PDF_COLORS,
  drawKpiRow,
  drawPageFooters,
  drawPdfHeader,
  drawPdfTopBar,
  drawSectionTitle,
  pdfTableTheme,
} from '@/utils/pdfTheme'

export type ClientesDevedoresPdfInput = {
  clientes: ClienteDevedorResumo[]
  logoUrl?: string | null
  geradoEm?: string
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function clientesDevedoresPdfFilename(date = new Date()) {
  return `clientes-devedores-${date.toISOString().slice(0, 10)}.pdf`
}

async function renderClientesDevedoresPdf(input: ClientesDevedoresPdfInput) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const margin = 14
  const pageWidth = doc.internal.pageSize.getWidth()
  const geradoEm = input.geradoEm || new Date().toLocaleString('pt-BR')

  const totalDevedor = input.clientes.reduce(
    (acc, item) => acc + item.saldo_devedor,
    0,
  )

  drawPdfTopBar(doc, pageWidth)

  const logo = await preparePdfLogo(input.logoUrl)

  let y = drawPdfHeader(doc, {
    margin,
    pageWidth,
    title: 'Clientes devedores',
    clienteNome: 'Relatório financeiro',
    periodo: 'Saldo em aberto até a data',
    geradoEm,
    logo,
  })

  y = drawKpiRow(doc, margin, pageWidth, y, [
    {
      label: 'CLIENTES EM DÉBITO',
      value: String(input.clientes.length),
    },
    {
      label: 'TOTAL A RECEBER',
      value: formatCurrency(totalDevedor),
      highlight: true,
    },
  ])

  y += 10
  drawSectionTitle(doc, margin, y, 'Detalhamento por cliente')
  y += 9

  const tableWidth = pageWidth - margin * 2

  autoTable(doc, {
    startY: y,
    tableWidth,
    head: [
      [
        'Cliente',
        'Telefone',
        'Débito ant.',
        'Compras',
        'Recebido',
        'Saldo devedor',
      ],
    ],
    body:
      input.clientes.length > 0
        ? input.clientes.map((item) => [
            item.nome,
            item.telefone || '—',
            formatCurrency(item.debito_anterior),
            formatCurrency(item.total_compras),
            formatCurrency(item.total_recebido),
            formatCurrency(item.saldo_devedor),
          ])
        : [['—', '—', '—', 'Nenhum cliente em débito.', '—', '—']],
    foot:
      input.clientes.length > 0
        ? [
            [
              '',
              '',
              '',
              '',
              'Total',
              formatCurrency(totalDevedor),
            ],
          ]
        : undefined,
    ...pdfTableTheme(),
    columnStyles: {
      0: { cellWidth: tableWidth * 0.26 },
      1: { cellWidth: tableWidth * 0.14 },
      2: { halign: 'right', cellWidth: tableWidth * 0.14 },
      3: { halign: 'right', cellWidth: tableWidth * 0.14 },
      4: { halign: 'right', cellWidth: tableWidth * 0.14 },
      5: { halign: 'right', cellWidth: tableWidth * 0.18 },
    },
    margin: { left: margin, right: margin },
    footStyles: {
      fillColor: PDF_COLORS.primaryLight,
      textColor: PDF_COLORS.primaryDark,
      fontStyle: 'bold',
    },
    didParseCell(data) {
      if (data.section === 'body' && data.column.index === 5) {
        data.cell.styles.textColor = PDF_COLORS.primaryDark
        data.cell.styles.fontStyle = 'bold'
      }
    },
  })

  y =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? y
  y += 8

  if (input.clientes.length > 0) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8)
    doc.setTextColor(...PDF_COLORS.textMuted)
    doc.text(
      'Saldo = débito anterior + compras − recebimentos. Última compra disponível na tela do financeiro.',
      margin,
      y,
    )
  }

  drawPageFooters(doc, margin, pageWidth)

  return doc
}

export async function gerarClientesDevedoresPdf(input: ClientesDevedoresPdfInput) {
  const doc = await renderClientesDevedoresPdf(input)
  const filename = clientesDevedoresPdfFilename()
  doc.save(filename)
}
