import { useEffect, useState } from 'react'
import { Button, Card, Input, Table, Modal, ModalDetails } from '@/components/ui'
import type { DetailItem } from '@/components/ui'
import toast from 'react-hot-toast'
import styles from './Clientes.module.scss'
import { clientesService } from '@/services/cliente.service'

interface ClienteRow {
  id: string
  nome: string
  doc: string
  telefone: string
  endereco?: string
  limiteCredito?: string
  status: string
}

export function Clientes() {
  const [clientes, setClientes] = useState<ClienteRow[]>([])
  const [detalhe, setDetalhe] = useState<ClienteRow | null>(null)
  const [editar, setEditar] = useState<ClienteRow | null>(null)
  const [loading, setLoading] = useState(false)

  const [createForm, setCreateForm] = useState({
    nome: '',
    doc: '',
    telefone: '',
    endereco: '',
    limiteCredito: ''
  })

  // Fetch clientes
  const fetchClientes = async () => {
    setLoading(true)
    try {
      const data = await clientesService.getAll()
      setClientes(data.map(c => ({
        ...c,
        limiteCredito: c.limite_credito?.toString(),
        status: c.status === 1 ? 'Ativo' : 'Inativo'
      })))
    } catch (e: any) {
      toast.error('Erro ao carregar clientes: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClientes()
  }, [])

  // Criar cliente
  const handleCreate = async () => {
    try {
      const data = await clientesService.create({
        nome: createForm.nome,
        doc: createForm.doc,
        telefone: createForm.telefone,
        endereco: createForm.endereco,
        limite_credito: createForm.limiteCredito ? Number(createForm.limiteCredito) : null,
      })
      toast.success('Cliente criado com sucesso')
      setCreateForm({ nome: '', doc: '', telefone: '', endereco: '', limiteCredito: '' })
      fetchClientes()
    } catch (e: any) {
      toast.error('Erro ao criar cliente: ' + e.message)
    }
  }

  // Salvar edição
  const handleSaveEdit = async () => {
    if (!editar) return
    try {
      await clientesService.update(editar.id, {
        nome: editar.nome,
        doc: editar.doc,
        telefone: editar.telefone,
        endereco: editar.endereco,
        limite_credito: editar.limiteCredito ? Number(editar.limiteCredito) : null,
      })
      toast.success('Cliente atualizado com sucesso')
      setEditar(null)
      fetchClientes()
    } catch (e: any) {
      toast.error('Erro ao atualizar cliente: ' + e.message)
    }
  }

  // Excluir cliente
  const handleDelete = async (id: string) => {
    try {
      await clientesService.delete(id)
      toast.success('Cliente excluído com sucesso')
      setEditar(null)
      setDetalhe(null)
      fetchClientes()
    } catch (e: any) {
      toast.error('Erro ao excluir cliente: ' + e.message)
    }
  }

  const columns = [
    { key: 'nome', header: 'Nome / Empresa' },
    { key: 'doc', header: 'CPF/CNPJ' },
    { key: 'telefone', header: 'Telefone / WhatsApp' },
    { key: 'limiteCredito', header: 'Limite de crédito' },
    { key: 'status', header: 'Status' },
    {
      key: 'acoes',
      header: 'Ações',
      render: (r: ClienteRow) => (
        <div className={styles.actions}>
          <Button variant="ghost" onClick={() => setEditar(r)}>Ver detalhes</Button>
        </div>
      ),
    },
  ]

  const detalheItems = (r: ClienteRow): DetailItem[] => [
    { label: 'Nome / Empresa', value: r.nome },
    { label: 'CPF/CNPJ', value: r.doc },
    { label: 'Telefone / WhatsApp', value: r.telefone },
    { label: 'Endereço', value: r.endereco || '-' },
    { label: 'Limite de crédito', value: r.limiteCredito || '-' },
    { label: 'Status', value: r.status },
  ]

  return (
    <div className={styles.page}>
      <h1 className="page-title">Clientes</h1>

      <Card title="Novo cliente">
        <div className={styles.form}>
          <Input label="Nome / Empresa" value={createForm.nome} onChange={e => setCreateForm({...createForm, nome: e.target.value})} />
          <Input label="CPF / CNPJ" value={createForm.doc} onChange={e => setCreateForm({...createForm, doc: e.target.value})} />
          <Input label="Telefone / WhatsApp" value={createForm.telefone} onChange={e => setCreateForm({...createForm, telefone: e.target.value})} />
          <Input label="Endereço" value={createForm.endereco} onChange={e => setCreateForm({...createForm, endereco: e.target.value})} />
          <Input label="Limite de crédito (opcional)" type="number" value={createForm.limiteCredito} onChange={e => setCreateForm({...createForm, limiteCredito: e.target.value})} />
          <div className={styles.actions}>
            <Button onClick={handleCreate}>Cadastrar</Button>
          </div>
        </div>
      </Card>

      <Card title="Lista de clientes">
        <Table
          columns={columns}
          data={clientes}
          keyExtractor={r => r.id}
          emptyMessage={loading ? 'Carregando...' : 'Nenhum cliente encontrado.'}
        />
      </Card>

      {/* Modal de detalhes */}
      {/* <Modal open={!!detalhe} onClose={() => setDetalhe(null)} title="Detalhes do cliente">
        {detalhe && <ModalDetails items={detalheItems(detalhe)} />}
      </Modal> */}

      {/* Modal de edição */}
      <Modal open={!!editar} onClose={() => setEditar(null)} title="Editar cliente">
        {editar && (
          <div className={styles.form}>
            <Input label="Nome / Empresa" value={editar.nome} onChange={e => setEditar({...editar, nome: e.target.value})} />
            <Input label="CPF / CNPJ" value={editar.doc} onChange={e => setEditar({...editar, doc: e.target.value})} />
            <Input label="Telefone / WhatsApp" value={editar.telefone} onChange={e => setEditar({...editar, telefone: e.target.value})} />
            <Input label="Endereço" value={editar.endereco} onChange={e => setEditar({...editar, endereco: e.target.value})} />
            <Input label="Limite de crédito" type="number" value={editar.limiteCredito} onChange={e => setEditar({...editar, limiteCredito: e.target.value})} />
            <div className={styles.actions}>
              <Button onClick={handleSaveEdit}>Salvar alterações</Button>
              <Button variant="danger" onClick={() => editar && handleDelete(editar.id)}>Excluir</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}