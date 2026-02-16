import { useState } from 'react'
import { Button, Card, Input, Table, Modal, ModalDetails } from '@/components/ui'
import type { DetailItem } from '@/components/ui'
import styles from './Fornecedores.module.scss'

interface FornecedorRow {
  id: string
  nome: string
  doc: string
  telefone: string
  cidade: string
}

const mock: FornecedorRow[] = [
  { id: '1', nome: 'Fazenda São João', doc: '12.345.678/0001-90', telefone: '(11) 99999-9999', cidade: 'Ribeirão Preto' },
]

export function Fornecedores() {
  const [detalhe, setDetalhe] = useState<FornecedorRow | null>(null)

  const columns = [
    { key: 'nome', header: 'Nome / Razão social' },
    { key: 'doc', header: 'CPF/CNPJ' },
    { key: 'telefone', header: 'Telefone' },
    { key: 'cidade', header: 'Cidade' },
    {
      key: 'acoes',
      header: 'Ações',
      render: (r: FornecedorRow) => (
        <Button variant="ghost" onClick={() => setDetalhe(r)}>
          Ver detalhes
        </Button>
      ),
    },
  ]

  const detalheItems = (r: FornecedorRow): DetailItem[] => [
    { label: 'Nome / Razão social', value: r.nome },
    { label: 'CPF/CNPJ', value: r.doc },
    { label: 'Telefone', value: r.telefone },
    { label: 'Cidade', value: r.cidade },
  ]

  return (
    <div className={styles.page}>
      <h1 className="page-title">Fornecedores</h1>
      <Card title="Novo fornecedor">
        <div className={styles.form}>
          <Input label="Nome / Razão social" />
          <Input label="CPF / CNPJ" />
          <Input label="Telefone" />
          <Input label="Cidade" />
          <Input label="Endereço" />
          <Input label="Dados bancários (opcional)" placeholder="Banco, agência, conta" />
          <div className={styles.actions}>
            <Button>Cadastrar</Button>
          </div>
        </div>
      </Card>
      <Card title="Lista de fornecedores">
        <Table columns={columns} data={mock} keyExtractor={(r) => r.id} />
      </Card>
      <Modal open={!!detalhe} onClose={() => setDetalhe(null)} title="Detalhes do fornecedor">
        {detalhe && <ModalDetails items={detalheItems(detalhe)} />}
      </Modal>
    </div>
  )
}
