import { useEffect, useState } from 'react'
import {
  Button,
  Card,
  Input,
  Table,
  Modal,
  AddNewButton,
  TouchTooltip,
  touchTooltipStyles,
  tableListStyles,
} from '@/components/ui'
import toast from 'react-hot-toast'
import styles from '../Fornecedores/Fornecedores.module.scss'
import { prestadoresServicoService } from '@/services/prestadoresServico.service'
import {
  FornecedorFormFields,
  emptyFornecedorForm,
  fornecedorFormFromRow,
  fornecedorFormToPayload,
  type FornecedorFormData,
} from '../Fornecedores/FornecedorFormFields'

interface PrestadorRow extends FornecedorFormData {
  id: string
  dados_bancarios?: string | null
}

export function PrestadoresServico() {
  const [prestadores, setPrestadores] = useState<PrestadorRow[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [search, setSearch] = useState('')

  const [createForm, setCreateForm] = useState<FornecedorFormData>(
    emptyFornecedorForm(),
  )
  const [showCreate, setShowCreate] = useState(false)
  const [editForm, setEditForm] = useState<FornecedorFormData | null>(null)
  const [editarId, setEditarId] = useState<string | null>(null)

  function closeCreate() {
    setShowCreate(false)
    setCreateForm(emptyFornecedorForm())
  }

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

  async function fetchPrestadores() {
    setLoading(true)

    try {
      const response = await prestadoresServicoService.getAll(page, 10, search)
      setPrestadores(response.data || [])
      setTotal(response.total || 0)
      setTotalPages(response.totalPages || 0)
    } catch {
      toast.error('Erro ao carregar prestadores')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPrestadores()
  }, [page, search])

  async function handleCreate() {
    if (createDisabled) return

    try {
      await prestadoresServicoService.create(fornecedorFormToPayload(createForm))
      toast.success('Prestador cadastrado com sucesso')
      closeCreate()
      fetchPrestadores()
    } catch {
      toast.error('Erro ao cadastrar prestador')
    }
  }

  async function handleUpdate() {
    if (!editForm || !editarId || updateDisabled) return

    try {
      await prestadoresServicoService.update(
        editarId,
        fornecedorFormToPayload(editForm),
      )
      toast.success('Prestador atualizado com sucesso')
      setEditForm(null)
      setEditarId(null)
      fetchPrestadores()
    } catch {
      toast.error('Erro ao atualizar prestador')
    }
  }

  async function handleDelete(id: string) {
    try {
      await prestadoresServicoService.delete(id)
      toast.success('Prestador excluído com sucesso')
      setEditForm(null)
      setEditarId(null)
      fetchPrestadores()
    } catch {
      toast.error('Erro ao excluir prestador')
    }
  }

  const columns = [
    {
      key: 'nome',
      header: 'Nome',
      render: (r: PrestadorRow) => (
        <span className={tableListStyles.nomeCell}>{r.nome || '—'}</span>
      ),
    },
    {
      key: 'doc',
      header: 'CPF/CNPJ',
      render: (r: PrestadorRow) => (
        <span className={tableListStyles.docCell}>{r.doc || '—'}</span>
      ),
    },
    {
      key: 'telefone',
      header: 'Telefone',
      render: (r: PrestadorRow) => r.telefone || '—',
    },
    {
      key: 'cidade',
      header: 'Cidade',
      render: (r: PrestadorRow) => (
        <span className={tableListStyles.cidadeCell}>
          {r.cidade ? `${r.cidade}${r.uf ? `/${r.uf}` : ''}` : '—'}
        </span>
      ),
    },
    {
      key: 'pix_chave',
      header: 'PIX',
      render: (r: PrestadorRow) => {
        if (!r.pix_chave) return '—'

        return (
          <TouchTooltip label={r.pix_tipo || 'PIX'}>
            <div className={touchTooltipStyles.item}>
              <strong>{r.pix_tipo || 'PIX'}</strong>
              <span>{r.pix_chave}</span>
            </div>
          </TouchTooltip>
        )
      },
    },
    {
      key: 'acoes',
      header: 'Ações',
      render: (r: PrestadorRow) => (
        <div className={tableListStyles.acoesCell}>
          <Button
            variant="ghost"
            className={tableListStyles.acaoBtn}
            onClick={() => {
              setEditarId(r.id)
              setEditForm(fornecedorFormFromRow(r))
            }}
          >
            Detalhes
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className={styles.page}>
      <h1 className="page-title">Prestadores de serviço</h1>
      <p className={styles.pageHint}>
        Cadastre o dono do abatedouro e demais prestadores. Os dados bancários
        serão usados na baixa de pagamentos de abate.
      </p>

      {showCreate && (
        <Card title="Novo prestador">
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
              <Button variant="ghost" onClick={closeCreate}>
                Cancelar
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Card
        title="Prestadores cadastrados"
        action={
          <AddNewButton
            open={showCreate}
            onClick={() => (showCreate ? closeCreate() : setShowCreate(true))}
          />
        }
      >
        <div className={styles.filters}>
          <Input
            label="Buscar prestador"
            placeholder="Nome, CPF/CNPJ ou telefone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Table
          columns={columns}
          data={prestadores}
          keyExtractor={(r) => r.id}
          loading={loading}
          page={page}
          total={total}
          totalPages={totalPages}
          onPageChange={setPage}
          emptyMessage="Nenhum prestador encontrado."
        />
      </Card>

      <Modal
        open={!!editForm}
        onClose={() => {
          setEditForm(null)
          setEditarId(null)
        }}
        title="Detalhes do prestador"
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
