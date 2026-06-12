import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import {
  Button,
  Card,
  Input,
  Select,
  Table,
  Modal,
  ModalDetails,
} from '@/components/ui'
import type { DetailItem } from '@/components/ui'
import { currentUserRole } from '@/config/access'
import { AuthService } from '@/services/auth.service'
import {
  formatPerfil,
  formatUsuarioStatus,
  isUsuarioAtivo,
  usuariosService,
  type UserRole,
  type UsuarioEmpresa,
} from '@/services/usuarios.service'
import styles from './Usuarios.module.scss'

const PERFIS_DISPONIVEIS: { value: UserRole; label: string }[] = [
  { value: 'administrador', label: 'Administrador' },
  { value: 'operador', label: 'Operador' },
  { value: 'financeiro', label: 'Financeiro' },
]

const emptyForm = () => ({
  nome: '',
  email: '',
  perfil: 'operador' as UserRole,
})

export function Usuarios() {
  const [usuarios, setUsuarios] = useState<UsuarioEmpresa[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [detalhe, setDetalhe] = useState<UsuarioEmpresa | null>(null)
  const [form, setForm] = useState(emptyForm)

  const currentUserId = AuthService.getCachedUser()?.id

  const perfilOptions = useMemo(() => {
    const options = PERFIS_DISPONIVEIS.map((p) => p.label)
    if (currentUserRole === 'master') {
      return ['Master', ...options]
    }
    return options
  }, [])

  function perfilLabelToValue(label: string): UserRole {
    if (label === 'Master') return 'master'
    const found = PERFIS_DISPONIVEIS.find((p) => p.label === label)
    return found?.value ?? 'operador'
  }

  function perfilValueToLabel(value: UserRole) {
    return formatPerfil(value)
  }

  function isSelf(usuario: UsuarioEmpresa) {
    return usuario.user_id === currentUserId
  }

  async function carregarUsuarios() {
    try {
      setLoading(true)
      const data = await usuariosService.getAll()
      setUsuarios(data)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao carregar usuários'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCadastrar() {
    try {
      setSaving(true)

      const result = await usuariosService.create({
        nome: form.nome,
        email: form.email,
        perfil: form.perfil,
      })

      if (result.inviteSent) {
        toast.success(
          'Convite enviado. O usuário receberá um e-mail para definir a própria senha.',
          { duration: 6000 },
        )
      } else {
        toast.success('Usuário convidado com sucesso')
      }
      setForm(emptyForm())
      await carregarUsuarios()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao cadastrar usuário'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleStatus(usuario: UsuarioEmpresa) {
    const ativo = isUsuarioAtivo(usuario)
    const acao = ativo ? 'inativar' : 'reativar'
    const confirmMsg = ativo
      ? `Inativar "${usuario.nome || usuario.email}"? O usuário não poderá mais acessar o sistema.`
      : `Reativar "${usuario.nome || usuario.email}"?`

    if (!window.confirm(confirmMsg)) return

    try {
      setActionLoading(true)
      const updated = await usuariosService.setStatus(usuario.id, ativo ? 0 : 1)
      toast.success(
        ativo ? 'Usuário inativado com sucesso' : 'Usuário reativado com sucesso',
      )
      setDetalhe(updated)
      await carregarUsuarios()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : `Erro ao ${acao} usuário`
      toast.error(message)
    } finally {
      setActionLoading(false)
    }
  }

  async function handleExcluir(usuario: UsuarioEmpresa) {
    const confirmMsg = `Excluir permanentemente "${usuario.nome || usuario.email}"?\n\nO vínculo com a empresa será removido. Esta ação não pode ser desfeita.`

    if (!window.confirm(confirmMsg)) return

    try {
      setActionLoading(true)
      await usuariosService.delete(usuario.id)
      toast.success('Usuário excluído com sucesso')
      setDetalhe(null)
      await carregarUsuarios()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao excluir usuário'
      toast.error(message)
    } finally {
      setActionLoading(false)
    }
  }

  async function handleReenviarConvite(usuario: UsuarioEmpresa) {
    if (
      !window.confirm(
        `Reenviar e-mail de convite para "${usuario.nome || usuario.email}"?`,
      )
    ) {
      return
    }

    try {
      setActionLoading(true)
      await usuariosService.resendInvite(usuario.id)
      toast.success('Convite reenviado com sucesso')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao reenviar convite'
      toast.error(message)
    } finally {
      setActionLoading(false)
    }
  }

  useEffect(() => {
    carregarUsuarios()
  }, [])

  const columns = [
    { key: 'nome', header: 'Nome', render: (r: UsuarioEmpresa) => r.nome || '—' },
    { key: 'email', header: 'E-mail', render: (r: UsuarioEmpresa) => r.email || '—' },
    {
      key: 'perfil',
      header: 'Perfil',
      render: (r: UsuarioEmpresa) => formatPerfil(r.perfil),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r: UsuarioEmpresa) => (
        <span
          className={styles.statusBadge}
          data-status={isUsuarioAtivo(r) ? 'ativo' : 'inativo'}
        >
          {formatUsuarioStatus(r.status)}
        </span>
      ),
    },
    {
      key: 'acoes',
      header: 'Ações',
      render: (r: UsuarioEmpresa) => (
        <Button variant="ghost" onClick={() => setDetalhe(r)}>
          Ver detalhes
        </Button>
      ),
    },
  ]

  const detalheItems = (r: UsuarioEmpresa): DetailItem[] => [
    { label: 'Nome', value: r.nome || '—' },
    { label: 'E-mail', value: r.email || '—' },
    { label: 'Perfil', value: formatPerfil(r.perfil) },
    {
      label: 'Status',
      value: (
        <span
          className={styles.statusBadge}
          data-status={isUsuarioAtivo(r) ? 'ativo' : 'inativo'}
        >
          {formatUsuarioStatus(r.status)}
        </span>
      ),
    },
    {
      label: 'Cadastro',
      value: r.created_at
        ? new Date(r.created_at).toLocaleDateString('pt-BR')
        : '—',
    },
  ]

  return (
    <div className={styles.page}>
      <h1 className="page-title">Usuários e permissões</h1>

      <Card title="Convidar usuário">
        <p className={styles.inviteHint}>
          Informe nome, e-mail e perfil. O usuário receberá um e-mail para
          definir a própria senha — você não precisa criar senha para ele.
        </p>
        <div className={styles.form}>
          <Input
            label="Nome"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
          />
          <Input
            label="E-mail"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Select
            label="Perfil"
            options={perfilOptions}
            value={perfilValueToLabel(form.perfil)}
            onChange={(e) =>
              setForm({
                ...form,
                perfil: perfilLabelToValue(e.target.value),
              })
            }
            placeholder="Selecione o perfil"
          />
          <div className={styles.actions}>
            <Button loading={saving} disabled={saving} onClick={handleCadastrar}>
              Enviar convite
            </Button>
          </div>
        </div>
      </Card>

      <Card title="Usuários">
        {loading ? (
          <p className={styles.loadingMsg}>Carregando usuários...</p>
        ) : (
          <Table
            columns={columns}
            data={usuarios}
            keyExtractor={(r) => r.id}
          />
        )}
      </Card>

      <Modal
        open={!!detalhe}
        onClose={() => setDetalhe(null)}
        title="Detalhes do usuário"
      >
        {detalhe && (
          <>
            <ModalDetails items={detalheItems(detalhe)} />
            {isSelf(detalhe) ? (
              <p className={styles.selfHint}>
                Você não pode inativar ou excluir o próprio usuário.
              </p>
            ) : (
              <div className={styles.modalActions}>
                <Button
                  variant="outline"
                  loading={actionLoading}
                  disabled={actionLoading}
                  onClick={() => handleReenviarConvite(detalhe)}
                >
                  Reenviar convite
                </Button>
                <Button
                  variant="outline"
                  loading={actionLoading}
                  disabled={actionLoading}
                  onClick={() => handleToggleStatus(detalhe)}
                >
                  {isUsuarioAtivo(detalhe) ? 'Inativar usuário' : 'Reativar usuário'}
                </Button>
                <Button
                  variant="danger"
                  loading={actionLoading}
                  disabled={actionLoading}
                  onClick={() => handleExcluir(detalhe)}
                >
                  Excluir permanentemente
                </Button>
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  )
}
