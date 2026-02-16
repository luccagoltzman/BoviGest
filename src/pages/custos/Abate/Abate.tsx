import { useState } from 'react'
import { Button, Card, Input, Table, Modal, ModalDetails } from '@/components/ui'
import type { DetailItem } from '@/components/ui'
import styles from './Abate.module.scss'

interface AbateRow {
  id: string
  data: string
  lote: string
  qtdAnimais: number
  pesoBruto: number
  pesoLiquido: number
  rendimento: number
  valorBrutoAbate: number
  couroDeixado: number
  descontoPorCouro: number
  descontoTotal: number
  custoTotal: number
}

const mock: AbateRow[] = [
  { id: '1', data: '2025-02-14', lote: 'L-001', qtdAnimais: 12, pesoBruto: 3600, pesoLiquido: 1800, rendimento: 50, valorBrutoAbate: 6000, couroDeixado: 12, descontoPorCouro: 50, descontoTotal: 600, custoTotal: 5400 },
  { id: '2', data: '2025-02-12', lote: 'L-002', qtdAnimais: 20, pesoBruto: 6200, pesoLiquido: 3100, rendimento: 50, valorBrutoAbate: 10000, couroDeixado: 20, descontoPorCouro: 50, descontoTotal: 1000, custoTotal: 9000 },
  { id: '3', data: '2025-02-10', lote: 'L-003', qtdAnimais: 15, pesoBruto: 4500, pesoLiquido: 2250, rendimento: 50, valorBrutoAbate: 7500, couroDeixado: 15, descontoPorCouro: 50, descontoTotal: 750, custoTotal: 6750 },
  { id: '4', data: '2025-02-08', lote: 'L-004', qtdAnimais: 18, pesoBruto: 5400, pesoLiquido: 2700, rendimento: 50, valorBrutoAbate: 9000, couroDeixado: 18, descontoPorCouro: 45, descontoTotal: 810, custoTotal: 8190 },
  { id: '5', data: '2025-02-05', lote: 'L-005', qtdAnimais: 10, pesoBruto: 3100, pesoLiquido: 1550, rendimento: 50, valorBrutoAbate: 5000, couroDeixado: 10, descontoPorCouro: 50, descontoTotal: 500, custoTotal: 4500 },
]

export function Abate() {
  const [detalhe, setDetalhe] = useState<AbateRow | null>(null)
  const [valorBruto, setValorBruto] = useState('')
  const [couroDeixado, setCouroDeixado] = useState('')
  const [descontoPorCouro, setDescontoPorCouro] = useState('')
  const [taxas, setTaxas] = useState('')

  const qtdCouro = Number.parseFloat(couroDeixado) || 0
  const descPorCouro = Number.parseFloat(descontoPorCouro) || 0
  const descontoTotalCalc = qtdCouro * descPorCouro
  const valorBrutoNum = Number.parseFloat(valorBruto) || 0
  const taxasNum = Number.parseFloat(taxas) || 0
  const valorFinalCalc = Math.max(0, valorBrutoNum - descontoTotalCalc + taxasNum)

  const columns = [
    { key: 'data', header: 'Data' },
    { key: 'lote', header: 'Lote' },
    { key: 'qtdAnimais', header: 'Qtd. animais' },
    { key: 'pesoBruto', header: 'Peso bruto (kg)' },
    { key: 'pesoLiquido', header: 'Peso líquido (kg)' },
    { key: 'rendimento', header: 'Rendimento (%)' },
    { key: 'descontoTotal', header: 'Desconto (couro)', render: (r: AbateRow) => `R$ ${r.descontoTotal.toLocaleString('pt-BR')}` },
    { key: 'custoTotal', header: 'Custo total', render: (r: AbateRow) => `R$ ${r.custoTotal.toLocaleString('pt-BR')}` },
    {
      key: 'acoes',
      header: 'Ações',
      render: (r: AbateRow) => (
        <Button variant="ghost" onClick={() => setDetalhe(r)}>
          Ver detalhes
        </Button>
      ),
    },
  ]

  const detalheItems = (r: AbateRow): DetailItem[] => [
    { label: 'Data', value: r.data },
    { label: 'Lote', value: r.lote },
    { label: 'Qtd. animais', value: r.qtdAnimais },
    { label: 'Peso bruto (kg)', value: r.pesoBruto },
    { label: 'Peso líquido (kg)', value: r.pesoLiquido },
    { label: 'Rendimento (%)', value: r.rendimento },
    { label: 'Valor bruto do abate', value: `R$ ${r.valorBrutoAbate.toLocaleString('pt-BR')}` },
    { label: 'Couro deixado no matadouro (un.)', value: r.couroDeixado },
    { label: 'Desconto por couro (R$/un.)', value: `R$ ${r.descontoPorCouro.toLocaleString('pt-BR')}` },
    { label: 'Desconto total', value: `R$ ${r.descontoTotal.toLocaleString('pt-BR')}` },
    { label: 'Custo total (final)', value: `R$ ${r.custoTotal.toLocaleString('pt-BR')}` },
  ]

  return (
    <div className={styles.page}>
      <h1 className="page-title">Custos de abate</h1>
      <Card title="Registro de abate">
        <p className={styles.infoDesconto}>
          O matadouro pode conceder desconto ao marchante com base na quantidade de couro deixada no local.
        </p>
        <div className={styles.form}>
          <Input label="Data" type="date" />
          <Input label="Lote" />
          <Input label="Quantidade de animais" type="number" />
          <Input label="Peso bruto (kg)" type="number" />
          <Input label="Peso líquido (kg)" type="number" />
          <Input
            label="Valor do abate (R$)"
            type="number"
            value={valorBruto}
            onChange={(e) => setValorBruto(e.target.value)}
          />
          <Input
            label="Couro deixado no matadouro (un.)"
            type="number"
            min={0}
            placeholder="Qtd. de couros deixados"
            value={couroDeixado}
            onChange={(e) => setCouroDeixado(e.target.value)}
          />
          <Input
            label="Desconto por couro (R$/un.)"
            type="number"
            min={0}
            placeholder="Desconto por unidade de couro"
            value={descontoPorCouro}
            onChange={(e) => setDescontoPorCouro(e.target.value)}
          />
          {descontoTotalCalc > 0 && (
            <div className={styles.calcDesconto}>
              <span>Desconto total (couro)</span>
              <strong>R$ {descontoTotalCalc.toLocaleString('pt-BR')}</strong>
            </div>
          )}
          <Input
            label="Taxas / inspeção (R$)"
            type="number"
            placeholder="Valor positivo soma ao custo"
            value={taxas}
            onChange={(e) => setTaxas(e.target.value)}
          />
          <div className={styles.valorFinal}>
            <span>Valor final a pagar</span>
            <strong>R$ {valorFinalCalc.toLocaleString('pt-BR')}</strong>
          </div>
          <div className={styles.actions}>
            <Button>Registrar abate</Button>
          </div>
        </div>
      </Card>
      <Card title="Histórico de abates">
        <Table columns={columns} data={mock} keyExtractor={(r) => r.id} />
      </Card>
      <Modal open={!!detalhe} onClose={() => setDetalhe(null)} title="Detalhes do abate">
        {detalhe && <ModalDetails items={detalheItems(detalhe)} />}
      </Modal>
    </div>
  )
}
