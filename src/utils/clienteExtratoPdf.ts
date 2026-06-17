import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { preparePdfLogo } from '@/utils/pdfLogo'
import {
  PDF_COLORS,
  drawKpiRow,
  drawPageFooters,
  drawPdfHeader,
  drawPdfTopBar,
  drawSectionSubtitle,
  drawSectionTitle,
} from '@/utils/pdfTheme'
import { isCorteBanda, isCorteCasado, pesoTotalComposicao } from '@/utils/corteComposicao'

interface Composicao {
  tipo_corte: string
  peso_kg: number
}

interface MovimentacaoItem {
  tipo_corte: string
  peso_total_kg: number
  valor_kg?: number
  valor_total?: number
  data_movimentacao?: string
  composicoes?: Composicao[]
}

interface Movimentacao {
  id: number
  data_movimentacao: string
  valor_total: number
  itens?: MovimentacaoItem[]
}

interface Recebimento {
  id: string
  data_recebimento: string
  valor: number
  forma_pagamento: string
  observacao?: string
}

interface ResumoCorte {
  quantidade: number
  peso: number
  valor: number
  isBanda: boolean
  isCasado?: boolean
  composicao: { dianteiro: number; traseiro: number }
}

export interface ExtratoPdfInput {
  clienteNome: string
  startDate: string
  endDate: string
  logoUrl?: string | null
  debitoAnterior?: number
  debitoAnteriorObservacao?: string
  debitoAnteriorReferencia?: string
  totalVendasPeriodo: number
  totalCompras: number
  totalRecebido: number
  saldo: number
  movimentacoes: Movimentacao[]
  recebimentos: Recebimento[]
  resumoCortes: Record<string, ResumoCorte>
}

function formatDate(d: string) {
  if (!d) return '-'
  return new Date(`${d.slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR')
}

function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
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

function getBandaComposicao(item: MovimentacaoItem) {
  if (!item.composicoes?.length) return null
  const dianteiro = item.composicoes
    .filter((c) => c.tipo_corte.toLowerCase().includes('diant'))
    .reduce((acc, c) => acc + Number(c.peso_kg), 0)
  const traseiro = item.composicoes
    .filter((c) => c.tipo_corte.toLowerCase().includes('tras'))
    .reduce((acc, c) => acc + Number(c.peso_kg), 0)
  return { dianteiro, traseiro }
}

function isViscera(tipo: string) {
  return (tipo || '').toLowerCase() === 'visceras'
}

function pdfText(value: string) {
  return value
    .replace(/\u2212/g, '-')
    .replace(/\u2013/g, '-')
    .replace(/\u2014/g, '-')
    .replace(/\u00D7/g, 'x')
}

function formatCorteItem(item: MovimentacaoItem) {
  let corte = item.tipo_corte || '-'

  if (isCorteCasado(item.tipo_corte) && item.composicoes?.length) {
    const linhas = item.composicoes
      .filter((c) => Number(c.peso_kg || 0) > 0)
      .map(
        (c) =>
          `${c.tipo_corte}: ${Number(c.peso_kg || 0).toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })} kg`,
      )
    if (linhas.length) corte += `\n${linhas.join('\n')}`
    return pdfText(corte)
  }

  if (isCorteBanda(item.tipo_corte) && item.composicoes?.length) {
    const numbered = item.composicoes.some((c) => /\d/.test(c.tipo_corte))
    if (numbered) {
      const linhas = item.composicoes
        .filter((c) => Number(c.peso_kg || 0) > 0)
        .map(
          (c) =>
            `${c.tipo_corte}: ${Number(c.peso_kg || 0).toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })} kg`,
        )
      if (linhas.length) corte += `\n${linhas.join('\n')}`
      return pdfText(corte)
    }
  }

  const comp = getBandaComposicao(item)

  if (comp) {
    const partes: string[] = []
    if (comp.dianteiro > 0) {
      partes.push(`Diant.: ${comp.dianteiro.toFixed(2)} kg`)
    }
    if (comp.traseiro > 0) {
      partes.push(`Tras.: ${comp.traseiro.toFixed(2)} kg`)
    }
    if (partes.length) corte += `\n${partes.join(' · ')}`
  }

  return pdfText(corte)
}

function formatPesoItem(item: MovimentacaoItem) {
  if (isCorteCasado(item.tipo_corte)) {
    const peso = pesoTotalComposicao(item.composicoes)
    const qty = Number(item.peso_total_kg || 0)
    const tipo = item.tipo_corte || 'Casado'
    if (peso > 0) {
      return `${peso.toFixed(2)} kg${qty > 0 ? ` (${qty} × ${tipo})` : ''}`
    }
    return qty > 0 ? `${qty} × ${tipo}` : '0 kg'
  }
  if (isCorteBanda(item.tipo_corte)) {
    const peso = pesoTotalComposicao(item.composicoes)
    const comps = item.composicoes || []
    const numbered = comps.some((c) => /\d/.test(c.tipo_corte))
    const qty = numbered
      ? Number(item.peso_total_kg || 0)
      : comps.length
        ? 1
        : 0
    if (peso > 0) {
      return `${peso.toFixed(2)} kg${qty > 0 ? ` (${qty} banda${qty !== 1 ? 's' : ''})` : ''}`
    }
    return qty > 0 ? `${qty} banda${qty !== 1 ? 's' : ''}` : '0 kg'
  }
  if (isViscera(item.tipo_corte)) {
    return `${Number(item.peso_total_kg || 0)} un`
  }
  return `${Number(item.peso_total_kg || 0).toFixed(2)} kg`
}

function formatValorUnitarioItem(item: MovimentacaoItem) {
  const valor = Number(item.valor_kg || 0)
  if (isViscera(item.tipo_corte)) {
    return `${formatCurrency(valor)}/un`
  }
  return `${formatCurrency(valor)}/kg`
}

export type HistoricoDetalhadoRow = {
  data: string
  tipo: string
  corte: string
  peso: string
  valorUnitario: string
  valor: string
  sortTs: number
}

function buildHistoricoDetalhadoRows(
  movimentacoes: Movimentacao[],
  recebimentos: Recebimento[],
  debitoAnterior = 0,
  debitoObs = '',
  debitoReferencia = '',
): HistoricoDetalhadoRow[] {
  const empty = '-'
  const rows: HistoricoDetalhadoRow[] = []

  if (debitoAnterior > 0) {
    rows.push({
      data: debitoReferencia ? formatDate(debitoReferencia) : empty,
      tipo: 'Débito anterior',
      corte: debitoObs || 'Vendas fora do sistema',
      peso: empty,
      valorUnitario: empty,
      valor: formatCurrency(debitoAnterior),
      sortTs: debitoReferencia
        ? new Date(debitoReferencia).getTime()
        : 0,
    })
  }

  movimentacoes.forEach((m) => {
    const itens = m.itens?.length ? m.itens : [null]

    itens.forEach((item) => {
      const dataItem = item?.data_movimentacao || m.data_movimentacao
      rows.push({
        data: formatDate(dataItem),
        tipo: 'Venda',
        corte: item ? formatCorteItem(item) : 'Sem itens',
        peso: item ? pdfText(formatPesoItem(item)) : empty,
        valorUnitario: item ? pdfText(formatValorUnitarioItem(item)) : empty,
        valor: formatCurrency(
          Number(item?.valor_total ?? m.valor_total ?? 0),
        ),
        sortTs: new Date(dataItem).getTime(),
      })
    })
  })

  recebimentos.forEach((r) => {
    const detalhe = [r.forma_pagamento, r.observacao]
      .filter(Boolean)
      .join(' · ')

    rows.push({
      data: formatDate(r.data_recebimento),
      tipo: 'Recebimento',
      corte: detalhe || empty,
      peso: empty,
      valorUnitario: empty,
      valor: formatCurrency(-Number(r.valor)),
      sortTs: new Date(r.data_recebimento).getTime(),
    })
  })

  return rows.sort((a, b) => a.sortTs - b.sortTs)
}

export { buildHistoricoDetalhadoRows }

export async function gerarExtratoClientePdf(input: ExtratoPdfInput) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const margin = 14
  const pageWidth = doc.internal.pageSize.getWidth()

  drawPdfTopBar(doc, pageWidth)

  const logo = await preparePdfLogo(input.logoUrl)

  let y = drawPdfHeader(doc, {
    margin,
    pageWidth,
    title: 'Extrato do cliente',
    clienteNome: input.clienteNome,
    periodo: `${formatDate(input.startDate)} - ${formatDate(input.endDate)}`,
    geradoEm: new Date().toLocaleString('pt-BR'),
    logo,
  })

  y = drawKpiRow(doc, margin, pageWidth, y, [
    {
      label: 'DÉBITO ANTERIOR',
      value: formatCurrency(input.debitoAnterior ?? 0),
    },
    {
      label: 'COMPRAS NO PERÍODO',
      value: formatCurrency(input.totalVendasPeriodo),
    },
    {
      label: 'TOTAL RECEBIDO',
      value: formatCurrency(input.totalRecebido),
    },
    {
      label: 'SALDO DEVEDOR',
      value: formatCurrency(input.saldo),
      highlight: true,
    },
  ])

  y += 10

  const cortesEntries = Object.entries(input.resumoCortes)
  if (cortesEntries.length > 0) {
    drawSectionTitle(doc, margin, y, 'Cortes no período')
    y += 9

    autoTable(doc, {
      startY: y,
      tableWidth: pageWidth - margin * 2,
      head: [['Corte', 'Peças', 'Peso (kg)', 'Valor']],
      body: cortesEntries.map(([corte, dados]) => {
        let corteLabel = corte
        if (dados.isCasado || dados.isBanda) {
          const partes: string[] = []
          if (dados.composicao.dianteiro > 0) {
            partes.push(`Diant. ${dados.composicao.dianteiro.toFixed(1)} kg`)
          }
          if (dados.composicao.traseiro > 0) {
            partes.push(`Tras. ${dados.composicao.traseiro.toFixed(1)} kg`)
          }
          if (partes.length) corteLabel += `\n${partes.join(' · ')}`
        }
        const pesoTotal =
          dados.composicao.dianteiro + dados.composicao.traseiro
        return [
          pdfText(corteLabel),
          String(dados.quantidade),
          dados.isCasado && pesoTotal > 0
            ? pesoTotal.toFixed(2)
            : dados.peso.toFixed(2),
          formatCurrency(dados.valor),
        ]
      }),
      theme: 'striped',
      styles: {
        fontSize: 9,
        cellPadding: 2.8,
        textColor: PDF_COLORS.text,
        lineColor: PDF_COLORS.border,
        lineWidth: 0.1,
        overflow: 'linebreak',
        valign: 'top',
      },
      headStyles: {
        fillColor: PDF_COLORS.primary,
        textColor: PDF_COLORS.white,
        fontStyle: 'bold',
        fontSize: 8.5,
      },
      alternateRowStyles: {
        fillColor: PDF_COLORS.stripe,
      },
      columnStyles: {
        0: { cellWidth: (pageWidth - margin * 2) * 0.42 },
        1: { halign: 'center', cellWidth: (pageWidth - margin * 2) * 0.12 },
        2: { halign: 'right', cellWidth: (pageWidth - margin * 2) * 0.18 },
        3: { halign: 'right', cellWidth: (pageWidth - margin * 2) * 0.28 },
      },
      margin: { left: margin, right: margin },
      didParseCell(data) {
        if (data.section === 'body' && data.column.index === 3) {
          data.cell.styles.fontStyle = 'bold'
        }
      },
    })

    y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? y + 20
    y += 10
  }

  drawSectionTitle(doc, margin, y, 'Histórico detalhado')
  y += 10
  y = drawSectionSubtitle(
    doc,
    margin,
    y,
    pageWidth - margin * 2,
    'Cada peça da venda é listada em uma linha com peso, valor unitário e total.',
  )
  y += 5

  const historicoRows = buildHistoricoDetalhadoRows(
    input.movimentacoes,
    input.recebimentos,
    input.debitoAnterior,
    input.debitoAnteriorObservacao,
    input.debitoAnteriorReferencia,
  )

  const tableWidth = pageWidth - margin * 2

  autoTable(doc, {
    startY: y,
    tableWidth,
    head: [['Data', 'Tipo', 'Corte', 'Peso', 'Valor unit.', 'Total']],
    body:
      historicoRows.length > 0
        ? historicoRows.map((row) => [
            row.data,
            row.tipo,
            row.corte,
            row.peso,
            row.valorUnitario,
            row.valor,
          ])
        : [['-', '-', 'Nenhum registro no período.', '-', '-', '-']],
    theme: 'striped',
    styles: {
      fontSize: 8.5,
      cellPadding: 2.5,
      textColor: PDF_COLORS.text,
      lineColor: PDF_COLORS.border,
      lineWidth: 0.1,
      overflow: 'linebreak',
      valign: 'top',
    },
    headStyles: {
      fillColor: PDF_COLORS.primary,
      textColor: PDF_COLORS.white,
      fontStyle: 'bold',
      fontSize: 8.5,
      cellPadding: 3,
    },
    alternateRowStyles: {
      fillColor: PDF_COLORS.stripe,
    },
    columnStyles: {
      0: { cellWidth: tableWidth * 0.11, halign: 'left', overflow: 'ellipsize' },
      1: { cellWidth: tableWidth * 0.14, halign: 'left' },
      2: { cellWidth: tableWidth * 0.3 },
      3: { cellWidth: tableWidth * 0.17, halign: 'right' },
      4: { cellWidth: tableWidth * 0.14, halign: 'right' },
      5: { cellWidth: tableWidth * 0.14, halign: 'right' },
    },
    margin: { left: margin, right: margin },
    didParseCell(data) {
      if (data.section !== 'body') return

      const raw = String(data.cell.raw ?? '')

      if (data.column.index === 0) {
        data.cell.styles.overflow = 'ellipsize'
        data.cell.styles.minCellHeight = 6
      }

      if (data.column.index === 2 && String(raw).includes('\n')) {
        data.cell.styles.fontSize = 8
        data.cell.styles.cellPadding = 2
      }

      if (data.column.index === 1) {
        if (raw === 'Recebimento') {
          data.cell.styles.textColor = PDF_COLORS.recebimento
          data.cell.styles.fontStyle = 'bold'
        } else if (raw === 'Venda') {
          data.cell.styles.textColor = PDF_COLORS.primaryDark
          data.cell.styles.fontStyle = 'bold'
        } else if (raw === 'Débito anterior') {
          data.cell.styles.fontStyle = 'italic'
          data.cell.styles.textColor = PDF_COLORS.textMuted
        }
      }

      if (data.column.index === 5) {
        const row = historicoRows[data.row.index]
        if (row?.tipo === 'Recebimento') {
          data.cell.styles.textColor = PDF_COLORS.recebimento
          data.cell.styles.fontStyle = 'normal'
        } else {
          data.cell.styles.fontStyle = 'bold'
        }
      }
    },
  })

  drawPageFooters(doc, margin, pageWidth)

  const filename = `extrato-${sanitizeFilename(input.clienteNome) || 'cliente'}-${input.endDate.slice(0, 10)}.pdf`
  doc.save(filename)
}
