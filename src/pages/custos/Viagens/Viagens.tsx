import { useState } from 'react'
import { Button, Card, Input, Table, Modal, ModalDetails } from '@/components/ui'
import type { DetailItem } from '@/components/ui'
import styles from './Viagens.module.scss'

interface ViagemRow {
  id: string
  data: string
  veiculo: string
  origem: string
  destino: string
  finalidade: string
  km: number
  cargaKg: number
  custoTotal: number
}

const mock: ViagemRow[] = [
  { id: '1', data: '2025-02-10', veiculo: 'ABC-1D23', origem: 'Fazenda', destino: 'Frigorífico', finalidade: 'Compra gado', km: 120, cargaKg: 4500, custoTotal: 850 },
]

export function Viagens() {
  const [detalhe, setDetalhe] = useState<ViagemRow | null>(null)

  const columns = [
    { key: 'data', header: 'Data' },
    { key: 'veiculo', header: 'Veículo' },
    { key: 'origem', header: 'Origem' },
    { key: 'destino', header: 'Destino' },
    { key: 'finalidade', header: 'Finalidade' },
    { key: 'km', header: 'KM' },
    { key: 'cargaKg', header: 'Carga (kg)' },
    { key: 'custoTotal', header: 'Custo', render: (r: ViagemRow) => `R$ ${r.custoTotal.toLocaleString('pt-BR')}` },
    {
      key: 'acoes',
      header: 'Ações',
      render: (r: ViagemRow) => (
        <Button variant="ghost" onClick={() => setDetalhe(r)}>
          Ver detalhes
        </Button>
      ),
    },
  ]

  const detalheItems = (r: ViagemRow): DetailItem[] => [
    { label: 'Data', value: r.data },
    { label: 'Veículo', value: r.veiculo },
    { label: 'Origem', value: r.origem },
    { label: 'Destino', value: r.destino },
    { label: 'Finalidade', value: r.finalidade },
    { label: 'KM', value: r.km },
    { label: 'Carga (kg)', value: r.cargaKg },
    { label: 'Custo total', value: `R$ ${r.custoTotal.toLocaleString('pt-BR')}` },
  ]

  return (
    <div className={styles.page}>
      <h1 className="page-title">Registro de viagens / transporte</h1>
      <Card title="Nova viagem">
        <div className={styles.form}>
          <Input label="Data" type="date" />
          <Input label="Veículo" />
          <Input label="Motorista" />
          <Input label="Origem" />
          <Input label="Destino" />
          <Input label="Finalidade" placeholder="Compra gado, entrega, transferência" />
          <Input label="KM inicial" type="number" />
          <Input label="KM final" type="number" />
          <Input label="Carga transportada (kg)" type="number" />
          <Input label="Combustível (R$)" type="number" />
          <Input label="Pedágio (R$)" type="number" />
          <div className={styles.actions}>
            <Button>Registrar viagem</Button>
          </div>
        </div>
      </Card>
      <Card title="Histórico de viagens">
        <Table columns={columns} data={mock} keyExtractor={(r) => r.id} />
      </Card>
      <Modal open={!!detalhe} onClose={() => setDetalhe(null)} title="Detalhes da viagem">
        {detalhe && <ModalDetails items={detalheItems(detalhe)} />}
      </Modal>
    </div>
  )
}
