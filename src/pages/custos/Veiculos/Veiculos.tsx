import { Button, Card, Input, Table } from '@/components/ui'
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
  const columns = [
    { key: 'placa', header: 'Placa' },
    { key: 'modelo', header: 'Modelo' },
    { key: 'capacidade', header: 'Capacidade (kg)' },
    { key: 'consumo', header: 'Consumo (km/L)' },
    { key: 'status', header: 'Status' },
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
    </div>
  )
}
