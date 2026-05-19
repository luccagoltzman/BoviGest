import { useEffect, useState } from 'react'

import {
  Button,
  Card,
  Input,
  Table,
} from '@/components/ui'


import styles from './Viagens.module.scss'
import { ModalViagem } from './ModalViagem'
import { viagensService } from '@/services/Viagem.service'

interface ViagemRow {
  id: number
  data: string
  veiculo: string
  motorista?: string
  origem: string
  destino: string
  finalidade: string
  km: number
  carga_kg: number
  custo_total: number
  referencia_tipo?: string
  status: number
}

export function Viagens() {
  const [viagens, setViagens] = useState<
    ViagemRow[]
  >([])

  const [loading, setLoading] =
    useState(false)

  const [page, setPage] = useState(1)

  const [total, setTotal] = useState(0)

  const [totalPages, setTotalPages] =
    useState(0)

  const [search, setSearch] = useState('')

  const [startDate, setStartDate] =
    useState('')

  const [endDate, setEndDate] =
    useState('')

  const [referenciaTipo] = useState('')

  const [modalOpen, setModalOpen] =
    useState(false)

  const [editar, setEditar] =
    useState<any>(null)

  async function carregarViagens() {
    try {
      setLoading(true)

      const response =
        await viagensService.getAll(
          page,
          10,
          search,
          startDate,
          endDate,
          referenciaTipo
        )

      setViagens(response.data || [])

      setTotal(response.total || 0)

      setTotalPages(response.totalPages || 0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarViagens()
  }, [
    page,
    search,
    startDate,
    endDate,
    referenciaTipo,
  ])

  async function handleDelete(id: number) {
    await viagensService.delete(id)

    carregarViagens()
  }

  const columns = [
    {
      key: 'data',
      header: 'Data',
    },
    {
      key: 'veiculo',
      header: 'Veículo',
    },
    {
      key: 'origem',
      header: 'Origem',
    },
    {
      key: 'destino',
      header: 'Destino',
    },
    {
      key: 'finalidade',
      header: 'Finalidade',
    },
    {
      key: 'km',
      header: 'KM',
    },
    {
      key: 'carga_kg',
      header: 'Carga (kg)',
    },
    {
      key: 'custo_total',
      header: 'Custo',
      render: (r: ViagemRow) =>
        `R$ ${Number(
          r.custo_total
        ).toLocaleString('pt-BR')}`,
    },
    {
      key: 'referencia_tipo',
      header: 'Tipo',
    },
    {
      key: 'acoes',
      header: 'Ações',
      render: (r: ViagemRow) => (
        <div
          style={{
            display: 'flex',
            gap: 8,
          }}
        >
          <Button
            variant="ghost"
            onClick={() => {
              setEditar(r)
              setModalOpen(true)
            }}
          >
            Editar
          </Button>

          <Button
            variant="danger"
            onClick={() =>
              handleDelete(r.id)
            }
          >
            Excluir
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className={styles.page}>
      <h1 className="page-title">
        Registro de viagens / transporte
      </h1>

      <Card title="Nova viagem">
        <div className={styles.actions}>
          <Button
            onClick={() => {
              setEditar(null)
              setModalOpen(true)
            }}
          >
            Nova viagem
          </Button>
        </div>
      </Card>

      <Card title="Filtros">
        <div className={styles.filters}>
          <Input
            label="Buscar"
            placeholder="Veículo, motorista, origem..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />

          <Input
            label="Data inicial"
            type="date"
            value={startDate}
            onChange={(e) =>
              setStartDate(e.target.value)
            }
          />

          <Input
            label="Data final"
            type="date"
            value={endDate}
            onChange={(e) =>
              setEndDate(e.target.value)
            }
          />

          {/* <Select
            label="Tipo"
            options={[
              'Todos',
              'compra',
              'venda',
              'transferencia',
              'manual',
            ]}
            value={
              referenciaTipo || 'Todos'
            }
            onChange={(e) =>
              setReferenciaTipo(
                e.target.value === 'Todos'
                  ? ''
                  : e.target.value
              )
            }
          /> */}
        </div>
      </Card>

      <Card title="Histórico de viagens">
        <Table
          columns={columns}
          data={viagens}
          keyExtractor={(r) =>
            String(r.id)
          }
          loading={loading}
          page={page}
          total={total}
          totalPages={totalPages}
          onPageChange={setPage}
          emptyMessage="Nenhuma viagem encontrada."
        />
      </Card>

      <ModalViagem
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditar(null)
        }}
        initialData={editar}
        viagensService={viagensService}
        onSaved={carregarViagens}
      />
    </div>
  )
}