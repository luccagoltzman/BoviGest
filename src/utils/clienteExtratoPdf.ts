import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { preparePdfLogo } from '@/utils/pdfLogo'
import { isCorteCasado } from '@/utils/corteComposicao'

interface Composicao {
  tipo_corte: string
  peso_kg: number
}

interface MovimentacaoItem {
  tipo_corte: string
  peso_total_kg: number
  valor_kg?: number
  valor_total?: number
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

function formatCorteItem(item: MovimentacaoItem) {
  let corte = item.tipo_corte || '—'

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
    return corte
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

  return corte
}

function formatPesoItem(item: MovimentacaoItem) {
  if (isCorteCasado(item.tipo_corte)) {
    const qty = Number(item.peso_total_kg || 0)
    return `${qty} casado${qty !== 1 ? 's' : ''}`
  }
  if (isViscera(item.tipo_corte)) {
    return `${Number(item.peso_total_kg || 0)} un`
  }
  return `${Number(item.peso_total_kg || 0).toFixed(2)} kg`
}

function formatValorUnitarioItem(item: MovimentacaoItem) {
  const valor = Number(item.valor_kg || 0)
  if (isCorteCasado(item.tipo_corte)) {
    return `${formatCurrency(valor)}/casado`
  }
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
  const rows: HistoricoDetalhadoRow[] = []

  if (debitoAnterior > 0) {
    rows.push({
      data: debitoReferencia ? formatDate(debitoReferencia) : '—',
      tipo: 'Débito anterior',
      corte: debitoObs || 'Vendas fora do sistema',
      peso: '—',
      valorUnitario: '—',
      valor: formatCurrency(debitoAnterior),
      sortTs: debitoReferencia
        ? new Date(debitoReferencia).getTime()
        : 0,
    })
  }

  movimentacoes.forEach((m) => {
    const itens = m.itens?.length ? m.itens : [null]

    itens.forEach((item) => {
      rows.push({
        data: formatDate(m.data_movimentacao),
        tipo: 'Venda',
        corte: item ? formatCorteItem(item) : 'Sem itens',
        peso: item ? formatPesoItem(item) : '—',
        valorUnitario: item ? formatValorUnitarioItem(item) : '—',
        valor: formatCurrency(
          Number(item?.valor_total ?? m.valor_total ?? 0),
        ),
        sortTs: new Date(m.data_movimentacao).getTime(),
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
      corte: detalhe || '—',
      peso: '—',
      valorUnitario: '—',
      valor: `− ${formatCurrency(Number(r.valor))}`,
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
  doc.text('Extrato do cliente', margin, y + 6)

  y += logo ? Math.max(12, logo.heightMm + 4) : 8
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(60, 60, 60)
  doc.text(`Cliente: ${input.clienteNome}`, margin, y)

  y += 5
  doc.text(
    `Período: ${formatDate(input.startDate)} — ${formatDate(input.endDate)}`,
    margin,
    y,
  )

  y += 5
  doc.text(
    `Gerado em: ${new Date().toLocaleString('pt-BR')}`,
    margin,
    y,
  )

  doc.setTextColor(0, 0, 0)
  y += 10

  autoTable(doc, {
    startY: y,
    head: [['Débito anterior', 'Compras no período', 'Total recebido', 'Saldo devedor']],
    body: [[
      formatCurrency(input.debitoAnterior ?? 0),
      formatCurrency(input.totalVendasPeriodo),
      formatCurrency(input.totalRecebido),
      formatCurrency(input.saldo),
    ]],
    theme: 'grid',
    headStyles: { fillColor: [37, 111, 62], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 10, cellPadding: 3 },
    margin: { left: margin, right: margin },
  })

  y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
    ?.finalY ?? y + 20
  y += 8

  const cortesEntries = Object.entries(input.resumoCortes)
  if (cortesEntries.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text('Cortes no período', margin, y)
    y += 4

    autoTable(doc, {
      startY: y,
      head: [['Corte', 'Peças', 'Peso (kg)', 'Valor']],
      body: cortesEntries.map(([corte, dados]) => {
        let corteLabel = corte
        if (dados.isCasado) {
          const partes: string[] = []
          if (dados.composicao.dianteiro > 0) {
            partes.push(`Diant. ${dados.composicao.dianteiro.toFixed(1)} kg`)
          }
          if (dados.composicao.traseiro > 0) {
            partes.push(`Tras. ${dados.composicao.traseiro.toFixed(1)} kg`)
          }
          if (partes.length) corteLabel += `\n${partes.join(' · ')}`
        } else if (dados.isBanda) {
          const partes: string[] = []
          if (dados.composicao.dianteiro > 0) {
            partes.push(`Diant. ${dados.composicao.dianteiro.toFixed(1)} kg`)
          }
          if (dados.composicao.traseiro > 0) {
            partes.push(`Tras. ${dados.composicao.traseiro.toFixed(1)} kg`)
          }
          if (partes.length) corteLabel += `\n${partes.join(' · ')}`
        }
        return [
          corteLabel,
          dados.isCasado
            ? `${dados.quantidade} casado${dados.quantidade !== 1 ? 's' : ''}`
            : String(dados.quantidade),
          dados.isCasado
            ? `${dados.composicao.dianteiro + dados.composicao.traseiro > 0 ? (dados.composicao.dianteiro + dados.composicao.traseiro).toFixed(2) : '—'}`
            : dados.peso.toFixed(2),
          formatCurrency(dados.valor),
        ]
      }),
      theme: 'striped',
      headStyles: { fillColor: [37, 111, 62], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 2.5, overflow: 'linebreak' },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { halign: 'center', cellWidth: 20 },
        2: { halign: 'right', cellWidth: 30 },
        3: { halign: 'right', cellWidth: 35 },
      },
      margin: { left: margin, right: margin },
    })

    y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? y + 20
    y += 8
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('Histórico detalhado', margin, y)
  y += 4

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(80, 80, 80)
  doc.text(
    'Cada peça da venda é listada em uma linha com peso, valor unitário e total.',
    margin,
    y,
  )
  doc.setTextColor(0, 0, 0)
  y += 5

  const historicoRows = buildHistoricoDetalhadoRows(
    input.movimentacoes,
    input.recebimentos,
    input.debitoAnterior,
    input.debitoAnteriorObservacao,
    input.debitoAnteriorReferencia,
  )

  autoTable(doc, {
    startY: y,
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
        : [['—', '—', 'Nenhum registro no período.', '—', '—', '—']],
    theme: 'striped',
    headStyles: { fillColor: [37, 111, 62], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 8.5, cellPadding: 2.5, overflow: 'linebreak' },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 22 },
      2: { cellWidth: 52 },
      3: { halign: 'right', cellWidth: 22 },
      4: { halign: 'right', cellWidth: 28 },
      5: { halign: 'right', cellWidth: 28 },
    },
    margin: { left: margin, right: margin },
  })

  const filename = `extrato-${sanitizeFilename(input.clienteNome) || 'cliente'}-${input.endDate.slice(0, 10)}.pdf`
  doc.save(filename)
}
