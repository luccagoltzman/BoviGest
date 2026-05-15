import { useEffect, useState } from 'react'

import {
  Button,
  Card,
  Input,
  Table,
  Modal,
} from '@/components/ui'

import toast from 'react-hot-toast'

import styles from './Fornecedores.module.scss'

import { fornecedoresService } from '@/services/fornecedores.service'

interface FornecedorRow {
  id: string
  nome: string
  doc: string
  telefone: string
  cidade: string
  endereco?: string
  dados_bancarios?: string
}

export function Fornecedores() {
  const [fornecedores, setFornecedores] =
    useState<FornecedorRow[]>([])

  const [loading, setLoading] =
    useState(false)

  const [page, setPage] = useState(1)

  const [total, setTotal] = useState(0)

  const [totalPages, setTotalPages] =
    useState(0)

  const [search, setSearch] = useState('')

  const [createForm, setCreateForm] =
    useState({
      nome: '',
      doc: '',
      telefone: '',
      cidade: '',
      endereco: '',
      dados_bancarios: '',
    })

  const [detalhe, setDetalhe] =
    useState<FornecedorRow | null>(null)

  const [editForm, setEditForm] =
    useState<FornecedorRow | null>(null)

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
      const response =
        await fornecedoresService.getAll(
          page,
          10,
          search
        )

      setFornecedores(response.data || [])

      setTotal(response.total || 0)

      setTotalPages(
        response.totalPages || 0
      )
    } catch (e: any) {
      toast.error(
        'Erro ao carregar fornecedores'
      )
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
      const data =
        await fornecedoresService.create(
          createForm
        )

      setFornecedores((prev) => [
        data,
        ...prev,
      ])

      toast.success(
        'Fornecedor criado com sucesso'
      )

      setCreateForm({
        nome: '',
        doc: '',
        telefone: '',
        cidade: '',
        endereco: '',
        dados_bancarios: '',
      })

      fetchFornecedores()
    } catch (e: any) {
      toast.error(
        'Erro ao criar fornecedor'
      )
    }
  }

  const handleUpdate = async () => {
    if (!editForm || updateDisabled)
      return

    try {
      const data =
        await fornecedoresService.update(
          editForm.id,
          editForm
        )

      setFornecedores((prev) =>
        prev.map((f) =>
          f.id === data.id ? data : f
        )
      )

      toast.success(
        'Fornecedor atualizado com sucesso'
      )

      setDetalhe(null)
    } catch (e: any) {
      toast.error(
        'Erro ao atualizar fornecedor'
      )
    }
  }

  const handleDelete = async (
    id: string
  ) => {
    try {
      await fornecedoresService.delete(id)

      setFornecedores((prev) =>
        prev.filter((f) => f.id !== id)
      )

      toast.success(
        'Fornecedor excluído com sucesso'
      )

      setDetalhe(null)
    } catch (e: any) {
      toast.error(
        'Erro ao excluir fornecedor'
      )
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
    },
    {
      key: 'acoes',
      header: 'Ações',
      render: (r: FornecedorRow) => (
        <Button
          variant="ghost"
          onClick={() => {
            setDetalhe(r)

            setEditForm({ ...r })
          }}
        >
          Ver detalhes
        </Button>
      ),
    },
  ]

  return (
    <div className={styles.page}>
      <h1 className="page-title">
        Fornecedores
      </h1>

      <Card title="Novo fornecedor">
        <div className={styles.form}>
          <Input
            label="Nome / Razão social"
            value={createForm.nome}
            onChange={(e) =>
              setCreateForm({
                ...createForm,
                nome: e.target.value,
              })
            }
          />

          <Input
            label="CPF / CNPJ"
            value={createForm.doc}
            onChange={(e) =>
              setCreateForm({
                ...createForm,
                doc: e.target.value,
              })
            }
          />

          <Input
            label="Telefone"
            value={createForm.telefone}
            onChange={(e) =>
              setCreateForm({
                ...createForm,
                telefone: e.target.value,
              })
            }
          />

          <Input
            label="Cidade"
            value={createForm.cidade}
            onChange={(e) =>
              setCreateForm({
                ...createForm,
                cidade: e.target.value,
              })
            }
          />

          <Input
            label="Endereço"
            value={createForm.endereco}
            onChange={(e) =>
              setCreateForm({
                ...createForm,
                endereco: e.target.value,
              })
            }
          />

          <Input
            label="Dados bancários"
            placeholder="Banco, agência, conta"
            value={
              createForm.dados_bancarios
            }
            onChange={(e) =>
              setCreateForm({
                ...createForm,
                dados_bancarios:
                  e.target.value,
              })
            }
          />

          <div className={styles.actions}>
            <Button
              onClick={handleCreate}
              disabled={createDisabled}
            >
              Cadastrar
            </Button>
          </div>
        </div>
      </Card>

      <Card title="Lista de fornecedores">
        <div
          style={{
            marginBottom: 16,
          }}
        >
          <Input
            label="Buscar fornecedor"
            placeholder="Nome, CPF/CNPJ ou telefone"
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
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
        open={!!detalhe}
        onClose={() => setDetalhe(null)}
        title="Detalhes do fornecedor"
      >
        {editForm && (
          <div className={styles.form}>
            <Input
              label="Nome / Razão social"
              value={editForm.nome}
              onChange={(e) =>
                setEditForm({
                  ...editForm,
                  nome: e.target.value,
                })
              }
            />

            <Input
              label="CPF / CNPJ"
              value={editForm.doc}
              onChange={(e) =>
                setEditForm({
                  ...editForm,
                  doc: e.target.value,
                })
              }
            />

            <Input
              label="Telefone"
              value={editForm.telefone}
              onChange={(e) =>
                setEditForm({
                  ...editForm,
                  telefone: e.target.value,
                })
              }
            />

            <Input
              label="Cidade"
              value={editForm.cidade}
              onChange={(e) =>
                setEditForm({
                  ...editForm,
                  cidade: e.target.value,
                })
              }
            />

            <Input
              label="Endereço"
              value={
                editForm.endereco || ''
              }
              onChange={(e) =>
                setEditForm({
                  ...editForm,
                  endereco: e.target.value,
                })
              }
            />

            <Input
              label="Dados bancários"
              value={
                editForm.dados_bancarios ||
                ''
              }
              onChange={(e) =>
                setEditForm({
                  ...editForm,
                  dados_bancarios:
                    e.target.value,
                })
              }
            />

            <div className={styles.actions}>
              <Button
                onClick={handleUpdate}
                disabled={updateDisabled}
              >
                Salvar
              </Button>

              <Button
                variant="danger"
                onClick={() =>
                  handleDelete(editForm.id)
                }
              >
                Excluir
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}