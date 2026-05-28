import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface Composicao {
  tipo_corte: string
  peso_kg: number
}

interface MovimentacaoItem {
  tipo_corte: string
  peso_total_kg: number
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
  composicao: { dianteiro: number; traseiro: number }
}

export interface ExtratoPdfInput {
  clienteNome: string
  startDate: string
  endDate: string
  totalVendas: number
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

function formatItemDetalhe(item: MovimentacaoItem) {
  const comp = getBandaComposicao(item)
  let texto = `${item.tipo_corte} · ${Number(item.peso_total_kg).toFixed(2)} kg`
  if (comp) {
    const partes: string[] = []
    if (comp.dianteiro > 0) partes.push(`D ${comp.dianteiro.toFixed(1)} kg`)
    if (comp.traseiro > 0) partes.push(`T ${comp.traseiro.toFixed(1)} kg`)
    if (partes.length) texto += ` (${partes.join(', ')})`
  }
  return texto
}

function buildHistoricoRows(
  movimentacoes: Movimentacao[],
  recebimentos: Recebimento[],
) {
  const vendas = movimentacoes.map((m) => ({
    data: m.data_movimentacao,
    tipo: 'Venda',
    detalhes:
      m.itens?.map(formatItemDetalhe).join(' | ') || 'Sem itens',
    valor: formatCurrency(Number(m.valor_total)),
  }))

  const recs = recebimentos.map((r) => ({
    data: r.data_recebimento,
    tipo: 'Recebimento',
    detalhes: [r.forma_pagamento, r.observacao].filter(Boolean).join(' · ') || '—',
    valor: `− ${formatCurrency(Number(r.valor))}`,
  }))

  return [...vendas, ...recs].sort(
    (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime(),
  )
}

export function gerarExtratoClientePdf(input: ExtratoPdfInput) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const margin = 14
  let y = margin

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('Extrato do cliente', margin, y)

  y += 8
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
    head: [['Total em compras', 'Total recebido', 'Saldo devedor']],
    body: [[
      formatCurrency(input.totalVendas),
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
        if (dados.isBanda) {
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
          String(dados.quantidade),
          dados.peso.toFixed(2),
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
  doc.text('Histórico', margin, y)
  y += 4

  const historicoRows = buildHistoricoRows(
    input.movimentacoes,
    input.recebimentos,
  )

  autoTable(doc, {
    startY: y,
    head: [['Data', 'Tipo', 'Detalhes', 'Valor']],
    body:
      historicoRows.length > 0
        ? historicoRows.map((row) => [
            formatDate(row.data),
            row.tipo,
            row.detalhes,
            row.valor,
          ])
        : [['—', '—', 'Nenhum registro no período.', '—']],
    theme: 'striped',
    headStyles: { fillColor: [37, 111, 62], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 8.5, cellPadding: 2.5, overflow: 'linebreak' },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 24 },
      2: { cellWidth: 'auto' },
      3: { halign: 'right', cellWidth: 30 },
    },
    margin: { left: margin, right: margin },
  })

  const filename = `extrato-${sanitizeFilename(input.clienteNome) || 'cliente'}-${input.endDate.slice(0, 10)}.pdf`
  doc.save(filename)
}
