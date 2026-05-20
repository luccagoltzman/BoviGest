import { useEffect, useState } from 'react'

import {
  Autocomplete,
  Button,
  Card,
  Input,
  Modal,
  ModalDetails,
  Table,
} from '@/components/ui'

import type { DetailItem } from '@/components/ui'
import styles from './Vendas.module.scss'

import { estoqueService } from '@/services/estoque.service'

import { TIPOS_CORTE } from '@/constants/cortes'

import { FORMAS_PAGAMENTO } from '@/constants/formasPagamentos'

import {
  STATUS_VENDA,
  STATUS_VENDA_LABEL,
  StatusVenda,
} from '@/constants/statusVenda'

import toast from 'react-hot-toast'
import { clientesService } from '@/services/cliente.service'
import { vendasService } from '@/services/venda.service'

interface Cliente {
  id: string
  nome: string
}

interface EstoqueRow {
  corte: string
  saldo_liquido_kg: number
}

interface VendaRow {
  id: number
  cliente_id: string
  cliente?: {
    nome: string
  }
  corte: string
  peso_kg: number
  valor_kg: number
  valor_total: number
  valor_pago: number
  forma_pagamento: string
  status: StatusVenda
  data_venda: string
  data_entrega?: string
  observacoes?: string
}

interface FormVenda {
  cliente_id: string
  corte: string
  peso_kg: string
  valor_kg: string
  valor_total: string
  valor_pago: string
  forma_pagamento: string
  status: StatusVenda
  data_venda: string
  data_entrega: string
  observacoes: string
}

export function Vendas() {
  const [clientes, setClientes] = useState<Cliente[]>([])

  const [estoqueAtual, setEstoqueAtual] = useState<EstoqueRow[]>([])

  const [clienteBusca, setClienteBusca] = useState('')

  const [loading, setLoading] = useState(false)

  const [search, setSearch] = useState('')

  const [historico, setHistorico] = useState<VendaRow[]>([])

  const [detalhe, setDetalhe] = useState<VendaRow | null>(null)

  const [editar, setEditar] = useState<VendaRow | null>(null)

  const [form, setForm] = useState<FormVenda>({
    cliente_id: '',
    corte: '',
    peso_kg: '',
    valor_kg: '',
    valor_total: '',
    valor_pago: '',
    forma_pagamento: '',
    status: STATUS_VENDA.PENDENTE,
    data_venda: new Date().toISOString().split('T')[0],
    data_entrega: '',
    observacoes: '',
  })

  const estoqueSelecionado = estoqueAtual.find((e) => e.corte === form.corte)

  const saldoDisponivel = Number(estoqueSelecionado?.saldo_liquido_kg || 0)

  async function carregarClientes() {
    const data = await clientesService.getOptions()

    setClientes(data || [])
  }

  async function carregarEstoque() {
    const data = await estoqueService.getEstoqueAtual()

    setEstoqueAtual(data || [])
  }

  async function carregarDados() {
    try {
      setLoading(true)

      const response = await vendasService.getAll(1, 100, search)

      setHistorico(response.data || [])
    } catch {
      toast.error('Erro ao carregar vendas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarClientes()
    carregarEstoque()
  }, [])

  useEffect(() => {
    carregarDados()
  }, [search])

  async function handleCreate() {
    try {
      if (!form.cliente_id) {
        toast.error('Selecione o cliente')

        return
      }

      if (!form.forma_pagamento) {
        toast.error('Selecione a forma de pagamento')
      }
      if (!form.corte) {
        toast.error('Selecione o corte')

        return
      }

      const pesoVenda = Number(form.peso_kg)

      if (
        form.status !== STATUS_VENDA.AGENDADO &&
        pesoVenda > saldoDisponivel
      ) {
        toast.error(`Estoque insuficiente. Disponível: ${saldoDisponivel} kg`)

        return
      }

      const venda = await vendasService.create({
        ...form,
        data_entrega: form.data_entrega || null,
        peso_kg: pesoVenda,
        valor_kg: Number(form.valor_kg),
        valor_total: Number(form.valor_total),
        valor_pago: Number(form.valor_pago),
        reservado_estoque: form.status !== STATUS_VENDA.AGENDADO,
      })

      if (form.status !== STATUS_VENDA.AGENDADO) {
        await estoqueService.createMovimentacao({
          corte: form.corte,
          lote: `v-${venda.id}`,
          tipo_movimentacao: 0,
          peso_bruto_kg: 0,
          peso_liquido_kg: pesoVenda,
          data_movimentacao: form.data_venda,
          referencia_tipo: 'VENDA',
          observacoes: 'Venda realizada',
        })
      }
      toast.success('Venda cadastrada')

      setForm({
        cliente_id: '',
        corte: '',
        peso_kg: '',
        valor_kg: '',
        valor_total: '',
        valor_pago: '',
        forma_pagamento: '',
        status: STATUS_VENDA.PENDENTE,
        data_venda: new Date().toISOString().split('T')[0],
        data_entrega: '',
        observacoes: '',
      })

      setClienteBusca('')

      carregarDados()

      carregarEstoque()
    } catch {
      toast.error('Erro ao cadastrar venda')
    }
  }

  async function handleUpdate() {
    try {
      if (!editar) {
        return
      }

      const { cliente, ...payload } = editar

      await vendasService.update(editar.id, payload)

      const stockMovement = await estoqueService.getByLote(`v-${editar.id}`)

      if (stockMovement) {
        const shouldUpdate =
          stockMovement.corte !== editar.corte ||
          Number(stockMovement.peso_liquido_kg) !== Number(editar.peso_kg) ||
          stockMovement.data_movimentacao !== editar.data_venda

        if (shouldUpdate) {
          await estoqueService.updateMovimentacao(stockMovement.id, {
            corte: editar.corte,
            peso_bruto_kg: editar.peso_kg,
            peso_liquido_kg: editar.peso_kg,
            data_movimentacao: editar.data_venda,
            observacoes: 'Venda atualizada',
          })
        }
      }

      toast.success('Venda atualizada')

      setEditar(null)

      carregarDados()

      carregarEstoque()
    } catch {
      toast.error('Erro ao atualizar venda')
    }
  }

  async function handleDelete(id: number) {
    try {
      await vendasService.delete(id)

      toast.success('Venda excluída')

      setDetalhe(null)

      setEditar(null)

      carregarDados()
    } catch {
      toast.error('Erro ao excluir venda')
    }
  }

  const columns = [
    {
      key: 'cliente',
      header: 'Cliente',

      render: (r: VendaRow) => r.cliente?.nome,
    },

    {
      key: 'corte',
      header: 'Corte',
    },

    {
      key: 'peso_kg',
      header: 'Peso',

      render: (r: VendaRow) => `${r.peso_kg} kg`,
    },

    {
      key: 'valor_total',
      header: 'Valor',

      render: (r: VendaRow) => `R$ ${Number(r.valor_total).toFixed(2)}`,
    },

    {
      key: 'status',
      header: 'Status',

      render: (r: VendaRow) =>
        STATUS_VENDA_LABEL[r.status as keyof typeof STATUS_VENDA_LABEL],
    },

    {
      key: 'acoes',
      header: 'Ações',

      render: (r: VendaRow) => (
        <Button variant="ghost" onClick={() => setDetalhe(r)}>
          Ver detalhes
        </Button>
      ),
    },
  ]

  const detalheItems = (r: VendaRow): DetailItem[] => [
    {
      label: 'Cliente',
      value: r.cliente?.nome || '-',
    },

    {
      label: 'Corte',
      value: r.corte,
    },

    {
      label: 'Peso',
      value: `${r.peso_kg} kg`,
    },

    {
      label: 'Valor KG',
      value: `R$ ${r.valor_kg}`,
    },

    {
      label: 'Valor total',
      value: `R$ ${r.valor_total}`,
    },

    {
      label: 'Forma pagamento',
      value: r.forma_pagamento || '-',
    },

    {
      label: 'Status',
      value: STATUS_VENDA_LABEL[r.status as keyof typeof STATUS_VENDA_LABEL],
    },

    {
      label: 'Data venda',
      value: r.data_venda,
    },

    {
      label: 'Entrega',
      value: r.data_entrega || '-',
    },

    {
      label: 'Observações',
      value: r.observacoes || '-',
    },
  ]

  return (
    <div>
      <h1 className="page-title">Vendas</h1>

      <Card title="Nova venda">
        <div className={styles.form}>
          <Autocomplete
            label="Cliente"
            options={clientes.map((c) => c.nome)}
            value={clienteBusca}
            onChange={(value) => {
              setClienteBusca(value)

              const cliente = clientes.find((c) => c.nome === value)

              setForm({
                ...form,
                cliente_id: cliente?.id || '',
              })
            }}
          />

          <div className={styles.selectWrap}>
            <label className={styles.estoqueInfo}>
              Corte
              {form.corte && (
                <div className={styles.fontenfo}>
                  em estoque:{' '}
                  <strong>{saldoDisponivel.toFixed(2)} kg (Liq.)</strong>
                </div>
              )}
            </label>

            <select
              className={styles.select}
              value={form.corte}
              onChange={(e) =>
                setForm({
                  ...form,
                  corte: e.target.value,
                })
              }
            >
              <option value="">Selecione</option>

              {TIPOS_CORTE.map((corte) => (
                <option key={corte} value={corte}>
                  {corte}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Peso KG"
            type="number"
            value={form.peso_kg}
            onChange={(e) =>
              setForm({
                ...form,
                peso_kg: e.target.value,
              })
            }
          />

          <Input
            label="Valor KG"
            type="number"
            value={form.valor_kg}
            onChange={(e) => {
              const valorKg = Number(e.target.value)

              const peso = Number(form.peso_kg)

              setForm({
                ...form,
                valor_kg: e.target.value,
                valor_total: String(valorKg * peso),
              })
            }}
          />

          <Input
            label="Valor total"
            type="number"
            value={form.valor_total}
            onChange={(e) =>
              setForm({
                ...form,
                valor_total: e.target.value,
              })
            }
          />

          <Input
            label="Valor pago"
            type="number"
            value={form.valor_pago}
            onChange={(e) =>
              setForm({
                ...form,
                valor_pago: e.target.value,
              })
            }
          />

          <div className={styles.selectWrap}>
            <label>Forma pagamento</label>

            <select
              className={styles.select}
              value={form.forma_pagamento}
              onChange={(e) =>
                setForm({
                  ...form,
                  forma_pagamento: e.target.value,
                })
              }
            >
              <option value="">Selecione</option>

              {FORMAS_PAGAMENTO.map((forma) => (
                <option key={forma} value={forma}>
                  {forma}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.selectWrap}>
            <label>Status</label>

            <select
              className={styles.select}
              value={form.status}
              onChange={(e) =>
                setForm({
                  ...form,
                  status: Number(e.target.value) as StatusVenda,
                })
              }
            >
              {Object.entries(STATUS_VENDA_LABEL).map(([key, value]) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Data venda"
            type="date"
            value={form.data_venda}
            onChange={(e) =>
              setForm({
                ...form,
                data_venda: e.target.value,
              })
            }
          />

          <Input
            label="Data entrega"
            type="date"
            value={form.data_entrega}
            onChange={(e) =>
              setForm({
                ...form,
                data_entrega: e.target.value,
              })
            }
          />

          <Input
            label="Observações"
            value={form.observacoes}
            onChange={(e) =>
              setForm({
                ...form,
                observacoes: e.target.value,
              })
            }
          />
        </div>
        <Button
          disabled={
            loading ||
            form.cliente_id === '' ||
            form.corte === '' ||
            form.forma_pagamento === ''
          }
          onClick={handleCreate}
        >
          Cadastrar venda
        </Button>
      </Card>

      <Card title="Vendas">
        <div className={styles.form}>
          <Input
            label="Buscar"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Table
          columns={columns}
          data={historico}
          keyExtractor={(r) => String(r.id)}
          loading={loading}
          emptyMessage="Nenhuma venda encontrada."
        />
      </Card>

      <Modal open={!!detalhe} onClose={() => setDetalhe(null)} title="Detalhes">
        {detalhe && (
          <>
            <ModalDetails items={detalheItems(detalhe)} />

            <div
              style={{
                display: 'flex',
                gap: 12,
                marginTop: 20,
              }}
            >
              <Button
                onClick={() => {
                  setEditar(detalhe)

                  setDetalhe(null)
                }}
              >
                Editar
              </Button>

              <Button variant="danger" onClick={() => handleDelete(detalhe.id)}>
                Excluir
              </Button>
            </div>
          </>
        )}
      </Modal>
      <Modal
        open={!!editar}
        onClose={() => setEditar(null)}
        title="Editar venda"
      >
        {editar && (
          <div className={styles.form}>
            <div className={styles.selectWrap}>
              <label>Corte</label>

              <select
                className={styles.select}
                value={editar.corte}
                onChange={(e) =>
                  setEditar({
                    ...editar,
                    corte: e.target.value,
                  })
                }
              >
                {TIPOS_CORTE.map((corte) => (
                  <option key={corte} value={corte}>
                    {corte}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Peso KG"
              type="number"
              value={editar.peso_kg}
              onChange={(e) =>
                setEditar({
                  ...editar,
                  peso_kg: Number(e.target.value),
                })
              }
            />

            <Input
              label="Valor KG"
              type="number"
              value={editar.valor_kg}
              onChange={(e) => {
                const valorKg = Number(e.target.value)

                setEditar({
                  ...editar,
                  valor_kg: valorKg,
                  valor_total: valorKg * editar.peso_kg,
                })
              }}
            />

            <Input
              label="Valor total"
              type="number"
              value={editar.valor_total}
              onChange={(e) =>
                setEditar({
                  ...editar,
                  valor_total: Number(e.target.value),
                })
              }
            />

            <Input
              label="Valor pago"
              type="number"
              value={editar.valor_pago}
              onChange={(e) =>
                setEditar({
                  ...editar,
                  valor_pago: Number(e.target.value),
                })
              }
            />

            <div className={styles.selectWrap}>
              <label>Forma pagamento</label>

              <select
                className={styles.select}
                value={editar.forma_pagamento}
                onChange={(e) =>
                  setEditar({
                    ...editar,
                    forma_pagamento: e.target.value,
                  })
                }
              >
                {FORMAS_PAGAMENTO.map((forma) => (
                  <option key={forma} value={forma}>
                    {forma}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.selectWrap}>
              <label>Status</label>

              <select
                className={styles.select}
                value={editar.status}
                onChange={(e) =>
                  setEditar({
                    ...editar,
                    status: Number(e.target.value) as StatusVenda,
                  })
                }
              >
                {Object.entries(STATUS_VENDA_LABEL).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Data venda"
              type="date"
              value={editar.data_venda}
              onChange={(e) =>
                setEditar({
                  ...editar,
                  data_venda: e.target.value,
                })
              }
            />

            <Input
              label="Data entrega"
              type="date"
              value={editar.data_entrega || ''}
              onChange={(e) =>
                setEditar({
                  ...editar,
                  data_entrega: e.target.value,
                })
              }
            />

            <Input
              label="Observações"
              value={editar.observacoes || ''}
              onChange={(e) =>
                setEditar({
                  ...editar,
                  observacoes: e.target.value,
                })
              }
            />

            <Button onClick={handleUpdate}>Salvar</Button>
          </div>
        )}
      </Modal>
    </div>
  )
}
