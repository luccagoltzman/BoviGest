import { useEffect, useRef, useState } from 'react'
import { Button, Card, Input, Table, Modal } from '@/components/ui'
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
  const [editar, setEditar] = useState<ClienteRow | null>(null)
  const [loading, setLoading] = useState(false)

  const [page, setPage] = useState(1)
  const [limit] = useState(5)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const [createForm, setCreateForm] = useState({
    nome: '',
    doc: '',
    telefone: '',
    endereco: '',
    limiteCredito: '',
  })

  const loadClientes = async (
    currentPage: number,
    currentLimit: number,
    currentSearch: string,
    currentStartDate: string,
    currentEndDate: string
  ) => {
    setLoading(true)
    try {
      const response = await clientesService.getAll(
        currentPage,
        currentLimit,
        currentSearch,
        currentStartDate,
        currentEndDate
      )

      setClientes(response.data)
      setTotal(response.total)
      setTotalPages(response.totalPages)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadClientes(page, limit, search, startDate, endDate)
  }, [page, limit, search, startDate, endDate])

  const handleSearchChange = (value: string) => {
    setPage(1)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(() => {
      setSearch(value)
    }, 500)
  }

  const handleStartDateChange = (value: string) => {
    setPage(1)
    setStartDate(value)
  }

  const handleEndDateChange = (value: string) => {
    setPage(1)
    setEndDate(value)
  }

  const handleCreate = async () => {
    try {
      await clientesService.create({
        nome: createForm.nome,
        doc: createForm.doc,
        telefone: createForm.telefone,
        endereco: createForm.endereco,
        limite_credito: createForm.limiteCredito
          ? Number(createForm.limiteCredito)
          : null,
      })

      toast.success('Cliente criado com sucesso')
      setCreateForm({
        nome: '',
        doc: '',
        telefone: '',
        endereco: '',
        limiteCredito: '',
      })

      loadClientes(1, limit, search, startDate, endDate)
    } catch (e: any) {
      toast.error('Erro ao criar cliente: ' + e.message)
    }
  }

  const handleSaveEdit = async () => {
    if (!editar || !isEditFormValid) {
      toast.error('Preencha os campos obrigatórios')
      return
    }

    try {
      await clientesService.update(editar.id, {
        nome: editar.nome,
        doc: editar.doc,
        telefone: editar.telefone,
        endereco: editar.endereco,
        limite_credito: editar.limiteCredito
          ? Number(editar.limiteCredito)
          : null,
      })

      toast.success('Cliente atualizado com sucesso')
      setEditar(null)

      loadClientes(page, limit, search, startDate, endDate)
    } catch (e: any) {
      toast.error('Erro ao atualizar cliente: ' + e.message)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await clientesService.delete(id)

      toast.success('Cliente excluído com sucesso')
      setEditar(null)

      loadClientes(page, limit, search, startDate, endDate)
    } catch (e: any) {
      toast.error('Erro ao excluir cliente: ' + e.message)
    }
  }

  const isCreateFormValid =
    createForm.nome.trim() !== '' &&
    createForm.doc.trim() !== '' &&
    createForm.telefone.trim() !== ''

  const isEditFormValid =
    editar &&
    editar.nome.trim() !== '' &&
    editar.doc.trim() !== '' &&
    editar.telefone.trim() !== ''

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
          <Button variant="ghost" onClick={() => setEditar(r)}>
            Ver detalhes
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className={styles.page}>
      <h1 className="page-title">Clientes</h1>

      <Card title="Novo cliente">
        <div className={styles.form}>
          <Input
            label="Nome / Empresa"
            value={createForm.nome}
            onChange={(e) =>
              setCreateForm({ ...createForm, nome: e.target.value })
            }
          />
          <Input
            label="CPF / CNPJ"
            value={createForm.doc}
            onChange={(e) =>
              setCreateForm({ ...createForm, doc: e.target.value })
            }
          />
          <Input
            label="Telefone / WhatsApp"
            value={createForm.telefone}
            onChange={(e) =>
              setCreateForm({ ...createForm, telefone: e.target.value })
            }
          />
          <Input
            label="Endereço"
            value={createForm.endereco}
            onChange={(e) =>
              setCreateForm({ ...createForm, endereco: e.target.value })
            }
          />
          <Input
            label="Limite de crédito"
            type="number"
            value={createForm.limiteCredito}
            onChange={(e) =>
              setCreateForm({ ...createForm, limiteCredito: e.target.value })
            }
          />
          <div className={styles.actions}>
            <Button onClick={handleCreate} disabled={!isCreateFormValid}>
              Cadastrar
            </Button>{' '}
          </div>
        </div>
      </Card>

      <Card title="Lista de clientes">
        <div className={styles.filters}>
          <Input
            label="Buscar"
            onChange={(e) => handleSearchChange(e.target.value)}
          />

          <div className={styles.form}>
            <Input
              label="Data inicial"
              type="date"
              value={startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
            />

            <Input
              label="Data final"
              type="date"
              value={endDate}
              onChange={(e) => handleEndDateChange(e.target.value)}
            />
          </div>
        </div>

        <Table
          columns={columns}
          data={clientes}
          keyExtractor={(r) => r.id}
          loading={loading}
          page={page}
          total={total}
          totalPages={totalPages}
          onPageChange={setPage}
          emptyMessage="Nenhum cliente encontrado."
        />
      </Card>

      <Modal
        open={!!editar}
        onClose={() => setEditar(null)}
        title="Editar cliente"
      >
        {editar && (
          <div className={styles.form}>
            <Input
              label="Nome / Empresa"
              value={editar.nome}
              onChange={(e) => setEditar({ ...editar, nome: e.target.value })}
            />
            <Input
              label="CPF / CNPJ"
              value={editar.doc}
              onChange={(e) => setEditar({ ...editar, doc: e.target.value })}
            />
            <Input
              label="Telefone / WhatsApp"
              value={editar.telefone}
              onChange={(e) =>
                setEditar({ ...editar, telefone: e.target.value })
              }
            />
            <Input
              label="Endereço"
              value={editar.endereco}
              onChange={(e) =>
                setEditar({ ...editar, endereco: e.target.value })
              }
            />
            <Input
              label="Limite de crédito"
              type="number"
              value={editar.limiteCredito}
              onChange={(e) =>
                setEditar({ ...editar, limiteCredito: e.target.value })
              }
            />
            <div className={styles.actions}>
              <Button onClick={handleSaveEdit}>Salvar alterações</Button>
              <Button variant="danger" onClick={() => handleDelete(editar.id)}>
                Excluir
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
