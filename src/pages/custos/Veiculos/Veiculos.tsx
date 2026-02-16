import { useState } from 'react'
import { Button, Card, Input, Table, Modal, ModalDetails } from '@/components/ui'
import type { DetailItem } from '@/components/ui'
import styles from './Veiculos.module.scss'

interface VeiculoRow {
  id: string
  placa: string
  modelo: string
  capacidade: number
  consumo: number
  status: string
}

const mock: VeiculoRow[] = [
  { id: '1', placa: 'ABC-1D23', modelo: 'Caminhão refrigerado', capacidade: 5000, consumo: 3, status: 'Ativo' },
]

export function Veiculos() {
  const [detalhe, setDetalhe] = useState<VeiculoRow | null>(null)

  const columns = [
    { key: 'placa', header: 'Placa' },
    { key: 'modelo', header: 'Modelo' },
    { key: 'capacidade', header: 'Capacidade (kg)' },
    { key: 'consumo', header: 'Consumo (km/L)' },
    { key: 'status', header: 'Status' },
    {
      key: 'acoes',
      header: 'Ações',
      render: (r: VeiculoRow) => (
        <Button variant="ghost" onClick={() => setDetalhe(r)}>
          Ver detalhes
        </Button>
      ),
    },
  ]

  const detalheItems = (r: VeiculoRow): DetailItem[] => [
    { label: 'Placa', value: r.placa },
    { label: 'Modelo', value: r.modelo },
    { label: 'Capacidade (kg)', value: r.capacidade },
    { label: 'Consumo (km/L)', value: r.consumo },
    { label: 'Status', value: r.status },
  ]

  return (
    <div className={styles.page}>
      <h1 className="page-title">Cadastro de veículos</h1>
      <Card title="Novo veículo">
        <div className={styles.form}>
          <Input label="Placa" />
          <Input label="Modelo" />
          <Input label="Capacidade (kg)" type="number" />
          <Input label="Consumo médio (km/L)" type="number" />
          <Input label="Status" placeholder="Ativo / manutenção" />
          <div className={styles.actions}>
            <Button>Cadastrar</Button>
          </div>
        </div>
      </Card>
      <Card title="Veículos">
        <Table columns={columns} data={mock} keyExtractor={(r) => r.id} />
      </Card>
      <Modal open={!!detalhe} onClose={() => setDetalhe(null)} title="Detalhes do veículo">
        {detalhe && <ModalDetails items={detalheItems(detalhe)} />}
      </Modal>
    </div>
  )
}
