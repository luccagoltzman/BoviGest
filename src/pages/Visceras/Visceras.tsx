import { useEffect, useState } from 'react'
import {
  Button,
  Card,
  Table,
  Modal,
  ModalDetails,
} from '@/components/ui'
import type { DetailItem } from '@/components/ui'
import { viscerasService } from '@/services/visceras.service'
import { ViscerasModal } from './ViscerasModal'
import styles from './Visceras.module.scss'

interface VisceraMovimentacao {
  id: number
  tipo: number
  quantidade: number
  observacao: string
  created_at: string
  referencia_venda_id: number
}

export function Visceras() {
  const [modalOpen, setModalOpen] = useState(false)
  const [movimentacoes, setMovimentacoes] = useState<
    VisceraMovimentacao[]
  >([])
  const [estoque, setEstoque] = useState(0)
  const [detalhe, setDetalhe] =
    useState<VisceraMovimentacao | null>(null)

  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [defaultValues, setDefaultValues] = useState<any>(null)
  const [editing, setEditing] =
    useState<VisceraMovimentacao | null>(null)

  async function loadData() {
    try {
      setLoading(true)

      const [result, estoqueData] = await Promise.all([
        viscerasService.getAll(page, 10),
        viscerasService.getEstoque(),
      ])

      setMovimentacoes(result.data)
      setTotal(result.total)
      setTotalPages(result.totalPages)

      setEstoque(estoqueData.quantidade_atual)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [page])

  const columns = [
    {
      key: 'tipo',
      header: 'Tipo',
      render: (r: VisceraMovimentacao) =>
        r.tipo === 1 ? 'Entrada' : 'Saída',
    },
    {
      key: 'quantidade',
      header: 'Quantidade',
    },
    {
      key: 'created_at',
      header: 'Data',
      render: (r: VisceraMovimentacao) =>
        new Date(r.created_at).toLocaleDateString(
          'pt-BR'
        ),
    },
    {
      key: 'acoes',
      header: 'Ações',
      render: (r: VisceraMovimentacao) => (
        <div
          style={{
            display: 'flex',
            gap: 8,
          }}
        >
          <Button
            variant="outline"
            onClick={() => setDetalhe(r)}
          >
            Ver detalhes
          </Button>

          <Button
            variant="ghost"
            disabled={r.referencia_venda_id > 0 ? true : false}    
            onClick={() => {
              setDefaultValues(null)
              setEditing(r)
              setModalOpen(true)
            }}
          >
            Editar
          </Button>
        </div>
      ),
    }
  ]

  const detalheItems = (
    r: VisceraMovimentacao
  ): DetailItem[] => [
      {
        label: 'Tipo',
        value: r.tipo === 1 ? 'Entrada' : 'Saída',
      },
      {
        label: 'Quantidade',
        value: r.quantidade,
      },
      {
        label: 'Observação',
        value: r.observacao || '-',
      },
      {
        label: 'Data',
        value: new Date(
          r.created_at
        ).toLocaleString('pt-BR'),
      },
    ]

  return (
    <div className={styles.page}>
      <h1 className="page-title">
        Controle de vísceras
      </h1>

      <div className={styles.topCards}>
        <div>
          <h1>{estoque}</h1>
          <small>Vísceras disponíveis</small>
        </div>


        <Button
          onClick={() => {
            setDefaultValues({
              tipo: 1,
              quantidade: 1,
              observacao: '',
            })

            setModalOpen(true)
          }}
        >
          + Movimentação vísceras
        </Button>

      </div>

      <Card
        title="Movimentações"
      >
        <Table
          columns={columns}
          data={movimentacoes}
          keyExtractor={(r) =>
            String(r.id)
          }
          loading={loading}
          page={page}
          total={total}
          totalPages={totalPages}
          onPageChange={setPage}
          emptyMessage="Nenhuma movimentação encontrada."
        />
      </Card>

      <ViscerasModal
        open={modalOpen}
        initialData={editing}
        defaultValues={defaultValues}
        onClose={() => {
          setModalOpen(false)
          setEditing(null)
          setDefaultValues(null)
        }}
        onSaved={() => {
          setPage(1)
          loadData()
        }}
      />

      <Modal
        open={!!detalhe}
        onClose={() => setDetalhe(null)}
        title="Detalhes"
      >
        {detalhe && (
          <ModalDetails
            items={detalheItems(detalhe)}
          />
        )}
      </Modal>
    </div>
  )
}