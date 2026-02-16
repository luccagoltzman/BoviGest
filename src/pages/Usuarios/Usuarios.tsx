import { Button, Card, Input, Table } from '@/components/ui'
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
  const columns = [
    { key: 'nome', header: 'Nome' },
    { key: 'email', header: 'E-mail' },
    { key: 'perfil', header: 'Perfil' },
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
    </div>
  )
}
