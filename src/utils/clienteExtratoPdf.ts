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
  pdfTableTheme,
} from '@/utils/pdfTheme'
import {
  isCorteBanda,
  isCorteCasado,
  isCortePecaSimples,
  isVisceraCorte,
  labelCorteExibicao,
  formatLinhasComposicaoExtrato,
  pesoTotalComposicao,
} from '@/utils/corteComposicao'
import {
  dataReferenciaRecebimento,
  detalheRecebimentoExtrato,
  formatDateBr,
} from '@/utils/recebimentoDatas'

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
  data_referencia?: string | null
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
  isViscera?: boolean
  isPecaSimples?: boolean
  composicao: { dianteiro: number; traseiro: number }
  detalhePecas: string[]
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
  return isVisceraCorte(tipo)
}

function pdfText(value: string) {
  return value
    .replace(/\u2212/g, '-')
    .replace(/\u2013/g, '-')
    .replace(/\u2014/g, '-')
    .replace(/\u00D7/g, 'x')
}

function formatCorteItem(item: MovimentacaoItem) {
  let corte = labelCorteExibicao(item.tipo_corte || '-') || '-'

  if (isViscera(item.tipo_corte)) {
    return pdfText(corte)
  }

  const composicoes = item.composicoes || []
  const numbered = composicoes.some((c) => /\d/.test(c.tipo_corte))

  if (
    (isCorteCasado(item.tipo_corte) ||
      (isCorteBanda(item.tipo_corte) && numbered) ||
      isCortePecaSimples(item.tipo_corte)) &&
    composicoes.length
  ) {
    const linhas = formatLinhasComposicaoExtrato(composicoes)
    if (linhas.length) corte += `\n${linhas.join('\n')}`
    return pdfText(corte)
  }

  if (isCorteBanda(item.tipo_corte) && composicoes.length) {
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
    const tipo = labelCorteExibicao(item.tipo_corte || 'Casado')
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
    const tipo = labelCorteExibicao(item.tipo_corte)
    if (peso > 0) {
      return `${peso.toFixed(2)} kg${qty > 0 ? ` (${qty} × ${tipo})` : ''}`
    }
    return qty > 0 ? `${qty} × ${tipo}` : '0 kg'
  }
  if (isViscera(item.tipo_corte)) {
    return `${Number(item.peso_total_kg || 0)} un`
  }
  if (isCortePecaSimples(item.tipo_corte) && (item.composicoes || []).length) {
    const composicoes = item.composicoes || []
    const peso = pesoTotalComposicao(composicoes)
    const qty = Number(item.peso_total_kg || 0) || composicoes.length
    if (peso > 0) {
      return `${peso.toFixed(2)} kg${qty > 0 ? ` (${qty} peça${qty !== 1 ? 's' : ''})` : ''}`
    }
    return qty > 0 ? `${qty} peça${qty !== 1 ? 's' : ''}` : '0 kg'
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
    const ref = dataReferenciaRecebimento(r)

    rows.push({
      data: formatDate(ref),
      tipo: 'Recebimento',
      corte: pdfText(detalheRecebimentoExtrato(r)),
      peso: empty,
      valorUnitario: empty,
      valor: formatCurrency(-Number(r.valor)),
      sortTs: new Date(ref).getTime(),
    })
  })

  return rows.sort((a, b) => a.sortTs - b.sortTs)
}

export { buildHistoricoDetalhadoRows }

export function extratoPdfFilename(input: Pick<ExtratoPdfInput, 'clienteNome' | 'endDate'>) {
  return `extrato-${sanitizeFilename(input.clienteNome) || 'cliente'}-${input.endDate.slice(0, 10)}.pdf`
}

async function renderExtratoClientePdf(input: ExtratoPdfInput) {
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
      head: [['Corte', 'Quantidade', 'Peso / Un.', 'Valor']],
      body: cortesEntries.map(([corte, dados]) => {
        let corteLabel = labelCorteExibicao(corte)
        if ((dados.isCasado || dados.isBanda) && !dados.isViscera) {
          const partes: string[] = []
          if (dados.composicao.dianteiro > 0) {
            partes.push(`Diant. ${dados.composicao.dianteiro.toFixed(1)} kg`)
          }
          if (dados.composicao.traseiro > 0) {
            partes.push(`Tras. ${dados.composicao.traseiro.toFixed(1)} kg`)
          }
          if (partes.length) corteLabel += `\n${partes.join(' · ')}`
        } else if (dados.detalhePecas?.length) {
          corteLabel += `\n${dados.detalhePecas.join('\n')}`
        }
        const pesoTotal =
          dados.composicao.dianteiro + dados.composicao.traseiro

        if (dados.isViscera) {
          return [
            pdfText(corteLabel),
            `${dados.quantidade} un`,
            '—',
            formatCurrency(dados.valor),
          ]
        }

        return [
          pdfText(corteLabel),
          dados.isCasado
            ? `${dados.quantidade} un`
            : dados.isBanda
              ? `${dados.quantidade} × ${labelCorteExibicao(corte)}`
              : `${dados.quantidade} peça${dados.quantidade !== 1 ? 's' : ''}`,
          dados.isCasado && pesoTotal > 0
            ? `${pesoTotal.toFixed(2)} kg`
            : `${dados.peso.toFixed(2)} kg`,
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
    'Cada peça da venda é listada em uma linha com quantidade ou peso, valor unitário e total.',
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
    head: [['Data', 'Tipo', 'Corte', 'Peso / Un.', 'Valor unit.', 'Total']],
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

  return doc
}

export async function gerarExtratoClientePdfBlob(input: ExtratoPdfInput) {
  const doc = await renderExtratoClientePdf(input)
  const filename = extratoPdfFilename(input)
  const blob = doc.output('blob')

  return { blob, filename }
}

export async function gerarExtratoClientePdf(input: ExtratoPdfInput) {
  const { blob, filename } = await gerarExtratoClientePdfBlob(input)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export interface RecebimentosPdfInput {
  clienteNome: string
  startDate: string
  endDate: string
  logoUrl?: string | null
  recebimentos: Recebimento[]
  totalRecebido: number
}

export function recebimentosPdfFilename(
  input: Pick<RecebimentosPdfInput, 'clienteNome' | 'endDate'>,
) {
  return `recebimentos-${sanitizeFilename(input.clienteNome) || 'cliente'}-${input.endDate.slice(0, 10)}.pdf`
}

async function renderRecebimentosClientePdf(input: RecebimentosPdfInput) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const margin = 14
  const pageWidth = doc.internal.pageSize.getWidth()

  drawPdfTopBar(doc, pageWidth)

  const logo = await preparePdfLogo(input.logoUrl)

  let y = drawPdfHeader(doc, {
    margin,
    pageWidth,
    title: 'Relatório de recebimentos',
    clienteNome: input.clienteNome,
    periodo: `${formatDate(input.startDate)} - ${formatDate(input.endDate)}`,
    geradoEm: new Date().toLocaleString('pt-BR'),
    logo,
  })

  const recebimentosOrdenados = [...input.recebimentos].sort(
    (a, b) =>
      new Date(dataReferenciaRecebimento(a)).getTime() -
      new Date(dataReferenciaRecebimento(b)).getTime(),
  )

  y = drawKpiRow(doc, margin, pageWidth, y, [
    {
      label: 'PAGAMENTOS NO PERÍODO',
      value: String(recebimentosOrdenados.length),
    },
    {
      label: 'TOTAL RECEBIDO',
      value: formatCurrency(input.totalRecebido),
      highlight: true,
    },
  ])

  y += 10
  drawSectionTitle(doc, margin, y, 'Recebimentos')
  y += 9

  const tableWidth = pageWidth - margin * 2

  autoTable(doc, {
    startY: y,
    tableWidth,
    head: [['Referência', 'Recebido em', 'Forma', 'Observação', 'Valor']],
    body:
      recebimentosOrdenados.length > 0
        ? recebimentosOrdenados.map((r) => [
            formatDateBr(dataReferenciaRecebimento(r)),
            formatDateBr(r.data_recebimento),
            r.forma_pagamento || '—',
            pdfText(r.observacao?.trim() || '—'),
            formatCurrency(Number(r.valor || 0)),
          ])
        : [['—', '—', '—', 'Nenhum recebimento no período.', '—']],
    foot:
      recebimentosOrdenados.length > 0
        ? [['', '', '', 'Total', formatCurrency(input.totalRecebido)]]
        : undefined,
    ...pdfTableTheme(),
    columnStyles: {
      0: { cellWidth: tableWidth * 0.16 },
      1: { cellWidth: tableWidth * 0.16 },
      2: { cellWidth: tableWidth * 0.18 },
      3: { cellWidth: tableWidth * 0.34 },
      4: { halign: 'right', cellWidth: tableWidth * 0.16 },
    },
    margin: { left: margin, right: margin },
    footStyles: {
      fillColor: PDF_COLORS.primaryLight,
      textColor: PDF_COLORS.primaryDark,
      fontStyle: 'bold',
    },
    didParseCell(data) {
      if (data.section === 'body' && data.column.index === 3) {
        data.cell.styles.textColor = PDF_COLORS.recebimento
        data.cell.styles.fontStyle = 'bold'
      }
    },
  })

  drawPageFooters(doc, margin, pageWidth)

  return doc
}

export async function gerarRecebimentosClientePdfBlob(input: RecebimentosPdfInput) {
  const doc = await renderRecebimentosClientePdf(input)
  const filename = recebimentosPdfFilename(input)
  const blob = doc.output('blob')
  return { blob, filename }
}

export async function gerarRecebimentosClientePdf(input: RecebimentosPdfInput) {
  const { blob, filename } = await gerarRecebimentosClientePdfBlob(input)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
