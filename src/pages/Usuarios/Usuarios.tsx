import { useState } from 'react'
import { Button, Card, Input, Table, Modal, ModalDetails } from '@/components/ui'
import type { DetailItem } from '@/components/ui'
import styles from './Usuarios.module.scss'

interface UsuarioRow {
  id: string
  nome: string
  email: string
  perfil: string
}

const mock: UsuarioRow[] = [
  { id: '1', nome: 'Admin', email: 'admin@bovigest.com', perfil: 'Administrador' },
]

export function Usuarios() {
  const [detalhe, setDetalhe] = useState<UsuarioRow | null>(null)

  const columns = [
    { key: 'nome', header: 'Nome' },
    { key: 'email', header: 'E-mail' },
    { key: 'perfil', header: 'Perfil' },
    {
      key: 'acoes',
      header: 'Ações',
      render: (r: UsuarioRow) => (
        <Button variant="ghost" onClick={() => setDetalhe(r)}>
          Ver detalhes
        </Button>
      ),
    },
  ]

  const detalheItems = (r: UsuarioRow): DetailItem[] => [
    { label: 'Nome', value: r.nome },
    { label: 'E-mail', value: r.email },
    { label: 'Perfil', value: r.perfil },
  ]

  return (
    <div className={styles.page}>
      <h1 className="page-title">Usuários e permissões</h1>
      <Card title="Novo usuário">
        <div className={styles.form}>
          <Input label="Nome" />
          <Input label="E-mail" type="email" />
          <Input label="Senha" type="password" />
          <Input label="Perfil" placeholder="Administrador, Operador, Financeiro" />
          <div className={styles.actions}>
            <Button>Cadastrar</Button>
          </div>
        </div>
      </Card>
      <Card title="Usuários">
        <Table columns={columns} data={mock} keyExtractor={(r) => r.id} />
      </Card>
      <Modal open={!!detalhe} onClose={() => setDetalhe(null)} title="Detalhes do usuário">
        {detalhe && <ModalDetails items={detalheItems(detalhe)} />}
      </Modal>
    </div>
  )
}
