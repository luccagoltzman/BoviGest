import { useState } from 'react'
import { Button, Card, Input, Table, Modal, ModalDetails } from '@/components/ui'
import type { DetailItem } from '@/components/ui'
import styles from './Visceras.module.scss'

interface VisceraRow {
  id: string
  nome: string
  unidade: string
  precoRef: number
  ativo: string
}

const mock: VisceraRow[] = [
  { id: '1', nome: 'Fígado', unidade: 'kg', precoRef: 12.5, ativo: 'Sim' },
  { id: '2', nome: 'Coração', unidade: 'un.', precoRef: 18, ativo: 'Sim' },
  { id: '3', nome: 'Língua', unidade: 'kg', precoRef: 22, ativo: 'Sim' },
  { id: '4', nome: 'Miolo', unidade: 'kg', precoRef: 35, ativo: 'Sim' },
  { id: '5', nome: 'Tripa (limpa)', unidade: 'kg', precoRef: 28, ativo: 'Sim' },
  { id: '6', nome: 'Rins', unidade: 'kg', precoRef: 15, ativo: 'Sim' },
  { id: '7', nome: 'Bucho', unidade: 'un.', precoRef: 25, ativo: 'Sim' },
  { id: '8', nome: 'Pâncreas (sweetbread)', unidade: 'kg', precoRef: 45, ativo: 'Sim' },
  { id: '9', nome: 'Orelha', unidade: 'kg', precoRef: 14, ativo: 'Sim' },
]

export function Visceras() {
  const [detalhe, setDetalhe] = useState<VisceraRow | null>(null)

  const columns = [
    { key: 'nome', header: 'Víscera' },
    { key: 'unidade', header: 'Unidade' },
    { key: 'precoRef', header: 'Preço ref. (R$)', render: (r: VisceraRow) => `R$ ${r.precoRef.toLocaleString('pt-BR')}` },
    { key: 'ativo', header: 'Ativo' },
    {
      key: 'acoes',
      header: 'Ações',
      render: (r: VisceraRow) => (
        <Button variant="ghost" onClick={() => setDetalhe(r)}>
          Ver detalhes
        </Button>
      ),
    },
  ]

  const detalheItems = (r: VisceraRow): DetailItem[] => [
    { label: 'Víscera', value: r.nome },
    { label: 'Unidade de venda', value: r.unidade },
    { label: 'Preço de referência', value: `R$ ${r.precoRef.toLocaleString('pt-BR')}` },
    { label: 'Ativo', value: r.ativo },
  ]

  return (
    <div className={styles.page}>
      <h1 className="page-title">Cadastro de vísceras</h1>
      <p className={styles.intro}>
        O marchante também comercializa vísceras. Cadastre os tipos e preços de referência para venda.
      </p>
      <Card title="Nova víscera">
        <div className={styles.form}>
          <Input label="Nome da víscera" placeholder="Ex: Fígado, Coração, Língua" />
          <Input label="Unidade" placeholder="kg ou un." />
          <Input label="Preço de referência (R$)" type="number" step="0.01" />
          <div className={styles.actions}>
            <Button>Cadastrar</Button>
          </div>
        </div>
      </Card>
      <Card title="Vísceras cadastradas">
        <Table columns={columns} data={mock} keyExtractor={(r) => r.id} />
      </Card>
      <Modal open={!!detalhe} onClose={() => setDetalhe(null)} title="Detalhes da víscera">
        {detalhe && <ModalDetails items={detalheItems(detalhe)} />}
      </Modal>
    </div>
  )
}
