import { useEffect, useState } from 'react'
import { Button, Card, Input, Modal, Select, Table } from '@/components/ui'
import toast from 'react-hot-toast'
import styles from './CustosOperacionais.module.scss'
import { custosOperacionaisService } from '@/services/centroCusto.service'

const categorias = ['Transporte', 'Abate', 'Funcionários', 'Energia', 'Embalagem', 'Manutenção', 'Impostos', 'Outros']
const centrosCusto = ['Produção', 'Logística', 'Administrativo']

interface CustoRow {
  id: string
  data: string
  categoria: string
  descricao: string
  valor: number
  centro_custo?: string
}

export function CustosOperacionais() {
  const [custos, setCustos] = useState<CustoRow[]>([])
  const [detalhe, setDetalhe] = useState<CustoRow | null>(null)
  const [editForm, setEditForm] = useState<CustoRow | null>(null)

  const [createForm, setCreateForm] = useState({
    data: '',
    categoria: '',
    descricao: '',
    valor: 0,
    centro_custo: ''
  })

  const [loading, setLoading] = useState(false)

  const [page, setPage] = useState(1)
  const [limit] = useState(10)

  const [search] = useState('')
  const [startDate] = useState('')
  const [endDate] = useState('')

  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const isCreateValid =
    createForm.data &&
    createForm.categoria &&
    createForm.descricao &&
    createForm.valor > 0 &&
    createForm.centro_custo

  const isEditValid =
    !!editForm &&
    editForm.data &&
    editForm.categoria &&
    editForm.descricao &&
    editForm.valor > 0 &&
    editForm.centro_custo

  const fetchCustos = async (
    currentPage: number,
    currentLimit: number,
    currentSearch: string,
    currentStartDate: string,
    currentEndDate: string
  ) => {
    setLoading(true)
    try {
      const res = await custosOperacionaisService.getAll(
        currentPage,
        currentLimit,
        currentSearch,
        currentStartDate,
        currentEndDate
      )

      setCustos(res.data)
      setTotal(res.total)
      setTotalPages(res.totalPages)
    } catch (e: any) {
      toast.error('Erro ao carregar custos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCustos(page, limit, search, startDate, endDate)
  }, [page, limit, search, startDate, endDate])

  const handleCreate = async () => {
    if (!isCreateValid) {
      toast.error('Preencha os campos obrigatórios')
      return
    }

    try {
      const data = await custosOperacionaisService.create(createForm)

      setCustos(prev => [data, ...prev])
      toast.success('Custo criado com sucesso')

      setCreateForm({
        data: '',
        categoria: '',
        descricao: '',
        valor: 0,
        centro_custo: ''
      })

      fetchCustos(1, limit, search, startDate, endDate)
    } catch (e: any) {
      toast.error('Erro ao criar custo')
    }
  }

  const handleUpdate = async () => {
    if (!editForm || !isEditValid) {
      toast.error('Preencha os campos obrigatórios')
      return
    }

    try {
      const data = await custosOperacionaisService.update(editForm.id, editForm)

      setCustos(prev => prev.map(c => (c.id === data.id ? data : c)))

      toast.success('Custo atualizado com sucesso')

      setDetalhe(null)
      setEditForm(null)
    } catch (e: any) {
      toast.error('Erro ao atualizar custo')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await custosOperacionaisService.delete(id)

      setCustos(prev => prev.filter(c => c.id !== id))

      toast.success('Custo excluído com sucesso')

      setDetalhe(null)
      setEditForm(null)
    } catch (e: any) {
      toast.error('Erro ao excluir custo')
    }
  }

  const columns = [
    { key: 'data', header: 'Data' },
    { key: 'categoria', header: 'Categoria' },
    { key: 'descricao', header: 'Descrição' },
    {
      key: 'valor',
      header: 'Valor',
      render: (r: CustoRow) => `R$ ${r.valor.toLocaleString('pt-BR')}`
    },
    { key: 'centro_custo', header: 'Centro de custo' },
    {
      key: 'acoes',
      header: 'Ações',
      render: (r: CustoRow) => (
        <Button
          variant="ghost"
          onClick={() => {
            setDetalhe(r)
            setEditForm({ ...r })
          }}
        >
          Ver detalhes
        </Button>
      )
    }
  ]

  return (
    <div className={styles.page}>
      <h1 className="page-title">Custos operacionais gerais</h1>

      <Card title="Novo lançamento">
        <div className={styles.form}>
          <Input type="date" label="Data" value={createForm.data} onChange={e => setCreateForm({ ...createForm, data: e.target.value })} />
          <Select label="Categoria" options={categorias} value={createForm.categoria} onChange={e => setCreateForm({ ...createForm, categoria: e.target.value })} />
          <Input label="Descrição" value={createForm.descricao} onChange={e => setCreateForm({ ...createForm, descricao: e.target.value })} />
          <Input type="number" label="Valor (R$)" value={createForm.valor} onChange={e => setCreateForm({ ...createForm, valor: Number(e.target.value) })} />
          <Select label="Centro de custo" options={centrosCusto} value={createForm.centro_custo} onChange={e => setCreateForm({ ...createForm, centro_custo: e.target.value })} />

          <div className={styles.actions}>
            <Button onClick={handleCreate} disabled={!isCreateValid}>
              Lançar
            </Button>
          </div>
        </div>
      </Card>

      <Card title="Lançamentos">
        <Table
          columns={columns}
          data={custos}
          keyExtractor={(r) => r.id}
          loading={loading}
          page={page}
          total={total}
          totalPages={totalPages}
          onPageChange={setPage}
          emptyMessage="Nenhum custo encontrado."
        />
      </Card>

      <Modal open={!!detalhe} onClose={() => setDetalhe(null)} title="Detalhes do lançamento">
        {editForm && (
          <div className={styles.form}>
            <Input type="date" label="Data" value={editForm.data} onChange={e => setEditForm({ ...editForm, data: e.target.value })} />
            <Select label="Categoria" options={categorias} value={editForm.categoria} onChange={e => setEditForm({ ...editForm, categoria: e.target.value })} />
            <Input label="Descrição" value={editForm.descricao} onChange={e => setEditForm({ ...editForm, descricao: e.target.value })} />
            <Input type="number" label="Valor (R$)" value={editForm.valor} onChange={e => setEditForm({ ...editForm, valor: Number(e.target.value) })} />
            <Select label="Centro de custo" options={centrosCusto} value={editForm.centro_custo} onChange={e => setEditForm({ ...editForm, centro_custo: e.target.value })} />

            <div className={styles.actions}>
              <Button onClick={handleUpdate} disabled={!isEditValid}>
                Salvar
              </Button>
              <Button variant="danger" onClick={() => handleDelete(editForm.id)}>
                Excluir
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}