import { useState } from 'react'
import { Button, Card, Input, Table, Modal, ModalDetails } from '@/components/ui'
import type { DetailItem } from '@/components/ui'
import { TIPOS_CORTE, CORTE_BD, REGRA_BD } from '@/constants/cortes'
import styles from './Processamento.module.scss'

interface EstoqueRow {
  id: string
  lote: string
  corte: string
  pesoKg: number
  dataEntrada: string
}

const mock: EstoqueRow[] = [
  { id: '1', lote: 'L-001', corte: 'Dianteiro', pesoKg: 180, dataEntrada: '2025-02-14' },
  { id: '2', lote: 'L-001', corte: 'Traseiro', pesoKg: 220, dataEntrada: '2025-02-14' },
  { id: '3', lote: 'L-001', corte: 'BD (banda)', pesoKg: 400, dataEntrada: '2025-02-14' },
  { id: '4', lote: 'L-001', corte: 'Costela', pesoKg: 95, dataEntrada: '2025-02-14' },
  { id: '5', lote: 'L-002', corte: 'Dianteiro', pesoKg: 165, dataEntrada: '2025-02-12' },
  { id: '6', lote: 'L-002', corte: 'Traseiro', pesoKg: 205, dataEntrada: '2025-02-12' },
  { id: '7', lote: 'L-002', corte: 'Costela', pesoKg: 88, dataEntrada: '2025-02-12' },
  { id: '8', lote: 'L-003', corte: 'BD (banda)', pesoKg: 380, dataEntrada: '2025-02-10' },
  { id: '9', lote: 'L-003', corte: 'Costela', pesoKg: 72, dataEntrada: '2025-02-10' },
  { id: '10', lote: 'L-004', corte: 'Dianteiro', pesoKg: 140, dataEntrada: '2025-02-08' },
]

export function Processamento() {
  const [detalhe, setDetalhe] = useState<EstoqueRow | null>(null)
  const [tipoCorte, setTipoCorte] = useState<string>('')
  const [pesoDianteiro, setPesoDianteiro] = useState<string>('')
  const [pesoTraseiro, setPesoTraseiro] = useState<string>('')

  const isBD = tipoCorte === CORTE_BD
  const dianteiro = Number.parseFloat(pesoDianteiro) || 0
  const traseiro = Number.parseFloat(pesoTraseiro) || 0
  const totalBD = isBD ? dianteiro + traseiro : 0

  const columns = [
    { key: 'lote', header: 'Lote' },
    { key: 'corte', header: 'Tipo de corte' },
    { key: 'pesoKg', header: 'Peso (kg)' },
    { key: 'dataEntrada', header: 'Data entrada' },
    {
      key: 'acoes',
      header: 'Ações',
      render: (r: EstoqueRow) => (
        <Button variant="ghost" onClick={() => setDetalhe(r)}>
          Ver detalhes
        </Button>
      ),
    },
  ]

  const detalheItems = (r: EstoqueRow): DetailItem[] => [
    { label: 'Lote', value: r.lote },
    { label: 'Tipo de corte', value: r.corte },
    { label: 'Peso (kg)', value: r.pesoKg },
    { label: 'Data entrada', value: r.dataEntrada },
  ]

  return (
    <div className={styles.page}>
      <h1 className="page-title">Processamento / Estoque</h1>
      <Card title="Entrada – conversão em carne">
        <div className={styles.form}>
          <Input label="Lote" />
          <Input label="Peso bruto (kg)" type="number" />
          <div className={styles.selectWrap}>
            <label className={styles.label}>Tipo de corte</label>
            <select
              className={styles.select}
              value={tipoCorte}
              onChange={(e) => setTipoCorte(e.target.value)}
              aria-label="Tipo de corte"
            >
              <option value="">Selecione...</option>
              {TIPOS_CORTE.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          {isBD && (
            <>
              <p className={styles.regraBD}>{REGRA_BD}</p>
              <Input
                label="Peso dianteiro (kg)"
                type="number"
                min={0}
                value={pesoDianteiro}
                onChange={(e) => setPesoDianteiro(e.target.value)}
              />
              <Input
                label="Peso traseiro (kg)"
                type="number"
                min={0}
                value={pesoTraseiro}
                onChange={(e) => setPesoTraseiro(e.target.value)}
              />
              <div className={styles.totalBD}>
                <span className={styles.totalBDLabel}>Peso BD (banda) = Dianteiro + Traseiro</span>
                <strong>{totalBD.toFixed(2)} kg</strong>
              </div>
            </>
          )}
          {!isBD && <Input label="Peso líquido (kg)" type="number" />}
          <Input label="Quebra / perdas (%)" type="number" />
          <div className={styles.actions}>
            <Button>Registrar entrada</Button>
          </div>
        </div>
      </Card>
      <Card title="Estoque atual">
        <Table columns={columns} data={mock} keyExtractor={(r) => r.id} />
      </Card>
      <Modal open={!!detalhe} onClose={() => setDetalhe(null)} title="Detalhes do estoque">
        {detalhe && <ModalDetails items={detalheItems(detalhe)} />}
      </Modal>
    </div>
  )
}
