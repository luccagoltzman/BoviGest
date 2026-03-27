import { useEffect, useState } from 'react'
import { Button, Card, Input, Table, Modal, ModalDetails } from '@/components/ui'
import type { DetailItem } from '@/components/ui'
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
          <Button variant="ghost" onClick={() => setDetalhe(r)}>Ver</Button>
          <Button variant="primary" onClick={() => setEditar(r)}>Editar</Button>
          <Button variant="danger" onClick={() => handleDelete(r.id)}>Excluir</Button>
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

  const fetchClientes = async () => {
    try {
      setLoading(true)
      const data = await clientesService.getAll()
      setClientes(data.map(c => ({
        ...c,
        limiteCredito: c.limite_credito?.toString(),
        status: c.status === 1 ? 'Ativo' : 'Inativo'
      })))
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    await clientesService.delete(id)
    fetchClientes()
  }

  const handleCreate = async () => {
    const nome = (document.getElementById('nome') as HTMLInputElement).value
    const doc = (document.getElementById('doc') as HTMLInputElement).value
    const telefone = (document.getElementById('telefone') as HTMLInputElement).value
    const endereco = (document.getElementById('endereco') as HTMLInputElement).value
    const limiteCredito = (document.getElementById('limiteCredito') as HTMLInputElement).value

    await clientesService.create({
      nome,
      doc,
      telefone,
      endereco,
      limite_credito: limiteCredito ? Number(limiteCredito) : null,
    })

    fetchClientes()
  }

  const handleSaveEdit = async () => {
    if (!editar) return

    await clientesService.update(editar.id, {
      nome: editar.nome,
      doc: editar.doc,
      telefone: editar.telefone,
      endereco: editar.endereco,
      limite_credito: editar.limiteCredito ? Number(editar.limiteCredito) : null,
    })

    setEditar(null)
    fetchClientes()
  }

  useEffect(() => {
    fetchClientes()
  }, [])

  return (
    <div className={styles.page}>
      <h1 className="page-title">Clientes</h1>

      <Card title="Novo cliente">
        <div className={styles.form}>
          <Input id="nome" label="Nome / Empresa" />
          <Input id="doc" label="CPF / CNPJ" />
          <Input id="telefone" label="Telefone / WhatsApp" />
          <Input id="endereco" label="Endereço" />
          <Input id="limiteCredito" label="Limite de crédito (opcional)" type="number" />
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
      <Modal open={!!detalhe} onClose={() => setDetalhe(null)} title="Detalhes do cliente">
        {detalhe && <ModalDetails items={detalheItems(detalhe)} />}
      </Modal>

      {/* Modal de edição */}
      <Modal open={!!editar} onClose={() => setEditar(null)} title="Editar cliente">
        {editar && (
          <div className={styles.form}>
            <Input
              label="Nome / Empresa"
              value={editar.nome}
              onChange={e => setEditar({ ...editar, nome: e.target.value })}
            />
            <Input
              label="CPF / CNPJ"
              value={editar.doc}
              onChange={e => setEditar({ ...editar, doc: e.target.value })}
            />
            <Input
              label="Telefone / WhatsApp"
              value={editar.telefone}
              onChange={e => setEditar({ ...editar, telefone: e.target.value })}
            />
            <Input
              label="Endereço"
              value={editar.endereco}
              onChange={e => setEditar({ ...editar, endereco: e.target.value })}
            />
            <Input
              label="Limite de crédito"
              type="number"
              value={editar.limiteCredito}
              onChange={e => setEditar({ ...editar, limiteCredito: e.target.value })}
            />
            <div className={styles.actions}>
              <Button onClick={handleSaveEdit}>Salvar alterações</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}