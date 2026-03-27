import { useEffect, useState } from 'react'
import { Button, Card, Input, Table, Modal, ModalDetails, Select } from '@/components/ui'
import type { DetailItem } from '@/components/ui'
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
  const [createForm, setCreateForm] = useState<Omit<CustoRow, 'id'>>({
    data: '',
    categoria: '',
    descricao: '',
    valor: 0,
    centro_custo: ''
  })
  const [loading, setLoading] = useState(false)

  const fetchCustos = async () => {
    setLoading(true)
    try {
      const data = await custosOperacionaisService.getAll()
      setCustos(data)
    } catch (e: any) {
      toast.error('Erro ao carregar custos: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCustos()
  }, [])

  const handleCreate = async () => {
    try {
      const data = await custosOperacionaisService.create(createForm)
      setCustos((prev) => [data, ...prev])
      toast.success('Custo criado com sucesso')
      setCreateForm({ data: '', categoria: '', descricao: '', valor: 0, centro_custo: '' })
    } catch (e: any) {
      toast.error('Erro ao criar custo: ' + e.message)
    }
  }

  const handleUpdate = async () => {
    if (!editForm) return
    try {
      const data = await custosOperacionaisService.update(editForm.id, editForm)
      setCustos((prev) => prev.map(c => (c.id === data.id ? data : c)))
      toast.success('Custo atualizado com sucesso')
      setDetalhe(null)
      setEditForm(null)
    } catch (e: any) {
      toast.error('Erro ao atualizar custo: ' + e.message)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await custosOperacionaisService.delete(id)
      setCustos((prev) => prev.filter(c => c.id !== id))
      toast.success('Custo excluído com sucesso')
      setDetalhe(null)
      setEditForm(null)
    } catch (e: any) {
      toast.error('Erro ao excluir custo: ' + e.message)
    }
  }

  const columns = [
    { key: 'data', header: 'Data' },
    { key: 'categoria', header: 'Categoria' },
    { key: 'descricao', header: 'Descrição' },
    { key: 'valor', header: 'Valor', render: (r: CustoRow) => `R$ ${r.valor.toLocaleString('pt-BR')}` },
    { key: 'centro_custo', header: 'Centro de custo' },
    {
      key: 'acoes',
      header: 'Ações',
      render: (r: CustoRow) => (
        <Button variant="ghost" onClick={() => { setDetalhe(r); setEditForm({ ...r }) }}>
          Ver detalhes
        </Button>
      ),
    },
  ]

  const detalheItems = (r: CustoRow): DetailItem[] => [
    { label: 'Data', value: r.data },
    { label: 'Categoria', value: r.categoria },
    { label: 'Descrição', value: r.descricao },
    { label: 'Valor', value: `R$ ${r.valor.toLocaleString('pt-BR')}` },
    { label: 'Centro de custo', value: r.centro_custo || '-' },
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
          <Select label="Centro de custo (opcional)" options={centrosCusto} value={createForm.centro_custo} onChange={e => setCreateForm({ ...createForm, centro_custo: e.target.value })} />

          <div className={styles.actions}>
            <Button onClick={handleCreate}>Lançar</Button>
          </div>
        </div>
      </Card>

      <Card title="Lançamentos">
        <Table columns={columns} data={custos} keyExtractor={r => r.id} emptyMessage={loading ? 'Carregando...' : 'Nenhum lançamento encontrado'} />
      </Card>

      <Modal open={!!detalhe} onClose={() => setDetalhe(null)} title="Detalhes do lançamento">
        {editForm && (
          <div className={styles.form}>
            <Input type="date" label="Data" value={editForm.data} onChange={e => setEditForm({ ...editForm, data: e.target.value })} />
            <Select label="Categoria" options={categorias} value={editForm.categoria} onChange={e => setEditForm({ ...editForm, categoria: e.target.value })} />
            <Input label="Descrição" value={editForm.descricao} onChange={e => setEditForm({ ...editForm, descricao: e.target.value })} />
            <Input type="number" label="Valor (R$)" value={editForm.valor} onChange={e => setEditForm({ ...editForm, valor: Number(e.target.value) })} />
            <Select label="Centro de custo (opcional)" options={centrosCusto} value={editForm.centro_custo} onChange={e => setEditForm({ ...editForm, centro_custo: e.target.value })} />

            <div className={styles.actions}>
              <Button onClick={handleUpdate}>Salvar</Button>
              <Button variant="danger" onClick={() => handleDelete(editForm.id)}>Excluir</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}