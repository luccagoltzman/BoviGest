import { useEffect, useRef, useState } from 'react'
import { Button, Card, Input, Table, Modal } from '@/components/ui'
import toast from 'react-hot-toast'
import styles from './Clientes.module.scss'
import { clientesService } from '@/services/cliente.service'
import { ClienteExtratoModal } from './ClienteExtratoModal'
import {
  ClienteFormFields,
  clienteFormFromRow,
  clienteFormToPayload,
  emptyClienteForm,
  type ClienteFormData,
} from './ClienteFormFields'

interface ClienteRow extends ClienteFormData {
  id: string
  status: string
}

export function Clientes() {
  const [clientes, setClientes] = useState<ClienteRow[]>([])
  const [editar, setEditar] = useState<ClienteFormData | null>(null)
  const [editarId, setEditarId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [page, setPage] = useState(1)
  const [limit] = useState(5)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [clienteExtrato, setClienteExtrato] = useState<any>(null)

  const [createForm, setCreateForm] = useState<ClienteFormData>(emptyClienteForm())

  const loadClientes = async (
    currentPage: number,
    currentLimit: number,
    currentSearch: string,
    currentStartDate: string,
    currentEndDate: string,
  ) => {
    setLoading(true)
    try {
      const response = await clientesService.getAll(
        currentPage,
        currentLimit,
        currentSearch,
        currentStartDate,
        currentEndDate,
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
      await clientesService.create(clienteFormToPayload(createForm))

      toast.success('Cliente criado com sucesso')
      setCreateForm(emptyClienteForm())

      loadClientes(1, limit, search, startDate, endDate)
    } catch (e: any) {
      toast.error('Erro ao criar cliente: ' + e.message)
    }
  }

  const handleSaveEdit = async () => {
    if (!editar || !editarId || !isEditFormValid) {
      toast.error('Preencha os campos obrigatórios')
      return
    }

    try {
      await clientesService.update(editarId, clienteFormToPayload(editar))

      toast.success('Cliente atualizado com sucesso')
      setEditar(null)
      setEditarId(null)

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
      setEditarId(null)

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
    {
      key: 'nome',
      header: 'Cliente',
      render: (r: any) => (
        <a
          onClick={() => setClienteExtrato(r)}
          style={{ cursor: 'pointer', textDecoration: 'underline' }}
        >
          {r?.nome}
        </a>
      ),
    },
    { key: 'doc', header: 'CPF/CNPJ' },
    { key: 'telefone', header: 'Telefone / WhatsApp' },
    {
      key: 'cidade',
      header: 'Cidade',
      render: (r: ClienteRow) => r.cidade || '—',
    },
    { key: 'limite_credito', header: 'Limite de crédito' },
    { key: 'status', header: 'Status' },
    {
      key: 'acoes',
      header: 'Ações',
      render: (r: ClienteRow) => (
        <div className={styles.actions}>
          <Button
            variant="ghost"
            onClick={() => {
              setEditarId(r.id)
              setEditar(clienteFormFromRow(r))
            }}
          >
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
          <ClienteFormFields
            value={createForm}
            onChange={(patch) =>
              setCreateForm((current) => ({ ...current, ...patch }))
            }
          />
          <div className={styles.actions}>
            <Button onClick={handleCreate} disabled={!isCreateFormValid}>
              Cadastrar
            </Button>
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
        onClose={() => {
          setEditar(null)
          setEditarId(null)
        }}
        title="Editar cliente"
        width="920px"
      >
        {editar && editarId && (
          <div className={styles.form}>
            <ClienteFormFields
              value={editar}
              onChange={(patch) =>
                setEditar((current) =>
                  current ? { ...current, ...patch } : current,
                )
              }
            />
            <div className={styles.actions}>
              <Button onClick={handleSaveEdit} disabled={!isEditFormValid}>
                Salvar alterações
              </Button>
              <Button variant="danger" onClick={() => handleDelete(editarId)}>
                Excluir
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ClienteExtratoModal
        open={!!clienteExtrato}
        cliente={clienteExtrato}
        onClose={() => setClienteExtrato(null)}
      />
    </div>
  )
}
