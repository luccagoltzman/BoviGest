import { useEffect, useState } from 'react'
import { Button, Card, Input, Table, Modal } from '@/components/ui'
import toast from 'react-hot-toast'
import styles from './Fornecedores.module.scss'
import { fornecedoresService } from '@/services/fornecedores.service'
import {
  FornecedorFormFields,
  emptyFornecedorForm,
  fornecedorFormFromRow,
  fornecedorFormToPayload,
  type FornecedorFormData,
} from './FornecedorFormFields'

interface FornecedorRow extends FornecedorFormData {
  id: string
  dados_bancarios?: string | null
}

export function Fornecedores() {
  const [fornecedores, setFornecedores] = useState<FornecedorRow[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [search, setSearch] = useState('')

  const [createForm, setCreateForm] = useState<FornecedorFormData>(
    emptyFornecedorForm(),
  )
  const [editForm, setEditForm] = useState<FornecedorFormData | null>(null)
  const [editarId, setEditarId] = useState<string | null>(null)

  const createDisabled =
    !createForm.nome.trim() ||
    !createForm.doc.trim() ||
    !createForm.telefone.trim() ||
    !createForm.cidade.trim()

  const updateDisabled =
    !editForm?.nome.trim() ||
    !editForm?.doc.trim() ||
    !editForm?.telefone.trim() ||
    !editForm?.cidade.trim()

  const fetchFornecedores = async () => {
    setLoading(true)

    try {
      const response = await fornecedoresService.getAll(page, 10, search)

      setFornecedores(response.data || [])
      setTotal(response.total || 0)
      setTotalPages(response.totalPages || 0)
    } catch {
      toast.error('Erro ao carregar fornecedores')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFornecedores()
  }, [page, search])

  const handleCreate = async () => {
    if (createDisabled) return

    try {
      await fornecedoresService.create(fornecedorFormToPayload(createForm))

      toast.success('Fornecedor criado com sucesso')
      setCreateForm(emptyFornecedorForm())
      fetchFornecedores()
    } catch {
      toast.error('Erro ao criar fornecedor')
    }
  }

  const handleUpdate = async () => {
    if (!editForm || !editarId || updateDisabled) return

    try {
      await fornecedoresService.update(editarId, fornecedorFormToPayload(editForm))

      toast.success('Fornecedor atualizado com sucesso')
      setEditForm(null)
      setEditarId(null)
      fetchFornecedores()
    } catch {
      toast.error('Erro ao atualizar fornecedor')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await fornecedoresService.delete(id)

      toast.success('Fornecedor excluído com sucesso')
      setEditForm(null)
      setEditarId(null)
      fetchFornecedores()
    } catch {
      toast.error('Erro ao excluir fornecedor')
    }
  }

  const columns = [
    {
      key: 'nome',
      header: 'Nome / Razão social',
    },
    {
      key: 'doc',
      header: 'CPF/CNPJ',
    },
    {
      key: 'telefone',
      header: 'Telefone',
    },
    {
      key: 'cidade',
      header: 'Cidade',
      render: (r: FornecedorRow) => r.cidade || '—',
    },
    {
      key: 'pix_chave',
      header: 'PIX',
      render: (r: FornecedorRow) =>
        r.pix_chave ? `${r.pix_tipo || 'PIX'}: ${r.pix_chave}` : '—',
    },
    {
      key: 'acoes',
      header: 'Ações',
      render: (r: FornecedorRow) => (
        <Button
          variant="ghost"
          onClick={() => {
            setEditarId(r.id)
            setEditForm(fornecedorFormFromRow(r))
          }}
        >
          Ver detalhes
        </Button>
      ),
    },
  ]

  return (
    <div className={styles.page}>
      <h1 className="page-title">Fornecedores</h1>

      <Card title="Novo fornecedor">
        <div className={styles.form}>
          <FornecedorFormFields
            value={createForm}
            onChange={(patch) =>
              setCreateForm((current) => ({ ...current, ...patch }))
            }
          />
          <div className={styles.actions}>
            <Button onClick={handleCreate} disabled={createDisabled}>
              Cadastrar
            </Button>
          </div>
        </div>
      </Card>

      <Card title="Lista de fornecedores">
        <div className={styles.filters}>
          <Input
            label="Buscar fornecedor"
            placeholder="Nome, CPF/CNPJ ou telefone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Table
          columns={columns}
          data={fornecedores}
          keyExtractor={(r) => r.id}
          loading={loading}
          page={page}
          total={total}
          totalPages={totalPages}
          onPageChange={setPage}
          emptyMessage="Nenhum fornecedor encontrado."
        />
      </Card>

      <Modal
        open={!!editForm}
        onClose={() => {
          setEditForm(null)
          setEditarId(null)
        }}
        title="Detalhes do fornecedor"
        width="920px"
      >
        {editForm && editarId && (
          <div className={styles.form}>
            <FornecedorFormFields
              value={editForm}
              onChange={(patch) =>
                setEditForm((current) =>
                  current ? { ...current, ...patch } : current,
                )
              }
            />
            <div className={styles.actions}>
              <Button onClick={handleUpdate} disabled={updateDisabled}>
                Salvar
              </Button>
              <Button variant="danger" onClick={() => handleDelete(editarId)}>
                Excluir
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
