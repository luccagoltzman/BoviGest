import { useEffect, useState } from 'react'
import {
  Button,
  Card,
  Input,
  Table,
  Modal,
  Select,
  Autocomplete,
} from '@/components/ui'

import { fornecedoresService } from '@/services/fornecedores.service'
import { comprasService } from '@/services/compras.service'

import { ModalViagem } from '../custos/Viagens/ModalViagem'

import styles from './Compras.module.scss'
import toast from 'react-hot-toast'
import { viagensService } from '@/services/viagem.service'

interface CompraRow {
  id: number
  fornecedor_id: string
  fornecedor?: {
    id: string
    nome: string
  }
  data: string
  quantidade_animais: number
  condicao_gado: number
  peso_total: number
  valor_kg: number
  tipo_imposto: 'fixo' | 'percentual'
  valor_imposto: number
  gta_valor: number
  subtotal: number
  valor_total: number
  tipo_gado?: string
  observacoes?: string
  status: string
}

export function Compras() {
  const [compras, setCompras] = useState<CompraRow[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingSave, setLoadingSave] = useState(false)

  const [loadingViagem, setLoadingViagem] = useState(false)

  const [page, setPage] = useState(1)
  const [limit] = useState(10)

  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  const [startDate] = useState('')
  const [endDate] = useState('')
  const [condicaoGadoFiltro] = useState('')

  const [fornecedores, setFornecedores] = useState<any[]>([])
  const [fornecedorBusca, setFornecedorBusca] = useState('')

  const [editar, setEditar] = useState<CompraRow | null>(null)

  const [viagemOpen, setViagemOpen] = useState(false)
  const [viagemInitial, setViagemInitial] = useState<any>(null)

  const [form, setForm] = useState({
    fornecedor_id: '',
    data: '',
    quantidade_animais: '',
    condicao_gado: '1',
    peso_total: '',
    valor_kg: '',
    tipo_imposto: 'fixo',
    valor_imposto: '',
    gta_valor: '',
    valor_total: '',
    tipo_gado: '',
    observacoes: '',
    status: 'Pendente',
  })

  function calcularSubtotal(data: any) {
    return Number(data.peso_total || 0) * Number(data.valor_kg || 0)
  }

  function calcularImposto(data: any) {
    const subtotal = calcularSubtotal(data)

    if (data.tipo_imposto === 'percentual') {
      return subtotal * (Number(data.valor_imposto || 0) / 100)
    }

    return Number(data.valor_imposto || 0)
  }

  function calcularTotal(data: any) {
    return (
      calcularSubtotal(data) +
      calcularImposto(data) +
      Number(data.gta_valor || 0)
    )
  }

  async function carregarCompras() {
    setLoading(true)

    try {
      const response = await comprasService.getAll(
        page,
        limit,
        '',
        startDate,
        endDate,
        condicaoGadoFiltro
      )

      setCompras(response.data || [])
      setTotal(response.total || 0)
      setTotalPages(response.totalPages || 0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarCompras()
  }, [page, startDate, endDate, condicaoGadoFiltro])

  useEffect(() => {
    async function carregarFornecedores() {
      const data = await fornecedoresService.getSelectOptions()
      setFornecedores(data || [])
    }

    carregarFornecedores()
  }, [])

  async function salvarCompra() {
    try {
      setLoadingSave(true)
      const subtotal = calcularSubtotal(form)
      const valorTotal = calcularTotal(form)

      await comprasService.create({
        fornecedor_id: form.fornecedor_id,
        data: form.data,
        quantidade_animais: Number(form.quantidade_animais),
        condicao_gado: Number(form.condicao_gado),
        peso_total: Number(form.peso_total),
        valor_kg: Number(form.valor_kg),
        tipo_imposto: form.tipo_imposto,
        valor_imposto: Number(form.valor_imposto),
        gta_valor: Number(form.gta_valor),
        subtotal,
        valor_total: valorTotal,
        tipo_gado: form.tipo_gado,
        observacoes: form.observacoes,
        status: form.status,
      })

      toast.success('Compra cadastrada com sucesso')

      setForm({
        fornecedor_id: '',
        data: '',
        quantidade_animais: '',
        condicao_gado: '1',
        peso_total: '',
        valor_kg: '',
        tipo_imposto: 'fixo',
        valor_imposto: '',
        gta_valor: '',
        valor_total: '',
        tipo_gado: '',
        observacoes: '',
        status: 'Pendente',
      })

      setFornecedorBusca('')
      setLoadingSave(false)
      carregarCompras()
    } catch (e: any) {
      setLoadingSave(false)
      toast.error(e?.message || 'Erro ao cadastrar compra')
    }
  }

  async function handleDelete(id: number) {
    try {
      await comprasService.delete(id)

      toast.success('Compra excluída com sucesso')
      setEditar(null)
      carregarCompras()
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao excluir compra')
    }
  }

  async function handleSaveEdit() {
    if (!editar) return

    try {
      const subtotal = calcularSubtotal(editar)
      const valorTotal = calcularTotal(editar)

      await comprasService.update(editar.id, {
        fornecedor_id: editar.fornecedor_id,
        data: editar.data,
        quantidade_animais: Number(editar.quantidade_animais),
        condicao_gado: Number(editar.condicao_gado),
        peso_total: Number(editar.peso_total),
        valor_kg: Number(editar.valor_kg),
        tipo_imposto: editar.tipo_imposto,
        valor_imposto: Number(editar.valor_imposto),
        gta_valor: Number(editar.gta_valor),
        subtotal,
        valor_total: valorTotal,
        tipo_gado: editar.tipo_gado,
        observacoes: editar.observacoes,
        status: editar.status,
      })

      toast.success('Compra atualizada com sucesso')
      setEditar(null)
      carregarCompras()
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao atualizar compra')
    }
  }

  async function abrirViagem(compra: CompraRow) {
    try {
      setLoadingViagem(true)

      const viagem = await viagensService.getByReferenciaId(compra.id)

      setViagemInitial(
        viagem
          ? viagem
          : {
              referenciaTipo: 'compra',
              referenciaId: compra.id,
            }
      )

      setViagemOpen(true)
    } catch (e: any) {
      toast.error('Erro ao carregar viagem')
    } finally {
      setLoadingViagem(false)
    }
  }

  const canSaveCompra =
    form.fornecedor_id &&
    form.data &&
    Number(form.quantidade_animais) > 0 &&
    Number(form.peso_total) > 0 &&
    Number(form.valor_kg) > 0

  const columns = [
    {
      key: 'fornecedor',
      header: 'Fornecedor',
      render: (r: CompraRow) => r.fornecedor?.nome || '-',
    },
    {
      key: 'data',
      header: 'Data',
    },
    {
      key: 'condicao_gado',
      header: 'Condição',
      render: (r: CompraRow) => (r.condicao_gado === 1 ? 'Vivo' : 'Morto'),
    },
    {
      key: 'quantidade_animais',
      header: 'Qtd',
    },
    {
      key: 'peso_total',
      header: 'Peso',
      render: (r: CompraRow) => `${Number(r.peso_total).toFixed(2)} KG`,
    },
    {
      key: 'valor_kg',
      header: 'R$/KG',
      render: (r: CompraRow) => `R$ ${Number(r.valor_kg).toFixed(2)}`,
    },
    {
      key: 'subtotal',
      header: 'Subtotal',
      render: (r: CompraRow) => `R$ ${Number(r.subtotal).toFixed(2)}`,
    },
    {
      key: 'valor_total',
      header: 'Total',
      render: (r: CompraRow) => `R$ ${Number(r.valor_total).toFixed(2)}`,
    },
    {
      key: 'acoes',
      header: 'Ações',
      render: (r: CompraRow) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="outline" onClick={() => setEditar(r)}>
            Ver detalhes
          </Button>

          <Button
            disabled={loadingViagem}
            variant="ghost"
            onClick={() => abrirViagem(r)}
          >
            Ver viagem
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className={styles.page}>
      <h1 className="page-title">Compras de Gado</h1>

      <Card title="Nova compra">
        <div className={styles.form}>
          <Autocomplete
            label="Fornecedor"
            options={fornecedores.map((f) => f.nome)}
            value={fornecedorBusca}
            onChange={(value) => {
              setFornecedorBusca(value)

              const fornecedor = fornecedores.find((f) => f.nome === value)

              setForm({
                ...form,
                fornecedor_id: fornecedor?.id || '',
              })
            }}
          />

          <Input
            label="Data"
            type="date"
            value={form.data}
            onChange={(e) =>
              setForm({
                ...form,
                data: e.target.value,
              })
            }
          />

          <Select
            label="Condição"
            options={['Vivo', 'Morto']}
            value={form.condicao_gado === '1' ? 'Vivo' : 'Morto'}
            onChange={(e) =>
              setForm({
                ...form,
                condicao_gado: e.target.value === 'Vivo' ? '1' : '0',
              })
            }
          />

          <Input
            label="Quantidade de animais"
            type="number"
            value={form.quantidade_animais}
            onChange={(e) =>
              setForm({
                ...form,
                quantidade_animais: e.target.value,
              })
            }
          />

          <Input
            label="Peso total"
            type="number"
            value={form.peso_total}
            onChange={(e) =>
              setForm({
                ...form,
                peso_total: e.target.value,
              })
            }
          />

          <Input
            label="Valor por KG"
            type="number"
            value={form.valor_kg}
            onChange={(e) =>
              setForm({
                ...form,
                valor_kg: e.target.value,
              })
            }
          />

          <Select
            label="Tipo imposto"
            options={['fixo', 'percentual']}
            value={form.tipo_imposto}
            onChange={(e) =>
              setForm({
                ...form,
                tipo_imposto: e.target.value,
              })
            }
          />

          <Input
            label={
              form.tipo_imposto === 'percentual'
                ? 'Imposto (%)'
                : 'Imposto (R$)'
            }
            type="number"
            value={form.valor_imposto}
            onChange={(e) =>
              setForm({
                ...form,
                valor_imposto: e.target.value,
              })
            }
          />

          <Input
            label="GTA / Transporte"
            type="number"
            value={form.gta_valor}
            onChange={(e) =>
              setForm({
                ...form,
                gta_valor: e.target.value,
              })
            }
          />

          <Input
            label="Subtotal"
            value={calcularSubtotal(form).toFixed(2)}
            disabled
          />

          <Input
            label="Valor total"
            value={calcularTotal(form).toFixed(2)}
            disabled
          />

          <Input
            label="Tipo gado"
            value={form.tipo_gado}
            onChange={(e) =>
              setForm({
                ...form,
                tipo_gado: e.target.value,
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

          <div className={styles.actions}>
            <Button
              onClick={salvarCompra}
              disabled={!canSaveCompra || loadingSave}
            >
              Salvar compra
            </Button>
          </div>
        </div>
      </Card>

      <Card title="Histórico">
        <Table
          columns={columns}
          data={compras}
          keyExtractor={(r) => String(r.id)}
          loading={loading}
          page={page}
          total={total}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </Card>

      <Modal
        open={!!editar}
        onClose={() => setEditar(null)}
        title="Editar compra"
      >
        {editar && (
          <div className={styles.form}>
            <Autocomplete
              label="Fornecedor"
              options={fornecedores.map((f) => f.nome)}
              value={
                fornecedores.find((f) => f.id === editar.fornecedor_id)?.nome ||
                ''
              }
              onChange={(value) => {
                const fornecedor = fornecedores.find((f) => f.nome === value)

                setEditar({
                  ...editar,
                  fornecedor_id: fornecedor?.id || '',
                })
              }}
            />

            <Input
              label="Data"
              type="date"
              value={editar.data}
              onChange={(e) =>
                setEditar({
                  ...editar,
                  data: e.target.value,
                })
              }
            />

            <Select
              label="Condição"
              options={['Vivo', 'Morto']}
              value={editar.condicao_gado === 1 ? 'Vivo' : 'Morto'}
              onChange={(e) =>
                setEditar({
                  ...editar,
                  condicao_gado: e.target.value === 'Vivo' ? 1 : 0,
                })
              }
            />

            <Input
              label="Quantidade de animais"
              type="number"
              value={editar.quantidade_animais}
              onChange={(e) =>
                setEditar({
                  ...editar,
                  quantidade_animais: Number(e.target.value),
                })
              }
            />

            <Input
              label="Peso total"
              type="number"
              value={editar.peso_total}
              onChange={(e) =>
                setEditar({
                  ...editar,
                  peso_total: Number(e.target.value),
                })
              }
            />

            <Input
              label="Valor por KG"
              type="number"
              value={editar.valor_kg}
              onChange={(e) =>
                setEditar({
                  ...editar,
                  valor_kg: Number(e.target.value),
                })
              }
            />

            <Select
              label="Tipo imposto"
              options={['fixo', 'percentual']}
              value={editar.tipo_imposto}
              onChange={(e) =>
                setEditar({
                  ...editar,
                  tipo_imposto: e.target.value as any,
                })
              }
            />

            <Input
              label={
                editar.tipo_imposto === 'percentual'
                  ? 'Imposto (%)'
                  : 'Imposto (R$)'
              }
              type="number"
              value={editar.valor_imposto}
              onChange={(e) =>
                setEditar({
                  ...editar,
                  valor_imposto: Number(e.target.value),
                })
              }
            />

            <Input
              label="GTA / Transporte"
              type="number"
              value={editar.gta_valor}
              onChange={(e) =>
                setEditar({
                  ...editar,
                  gta_valor: Number(e.target.value),
                })
              }
            />

            <Input
              label="Subtotal"
              value={calcularSubtotal(editar).toFixed(2)}
              disabled
            />

            <Input
              label="Valor total"
              value={calcularTotal(editar).toFixed(2)}
              disabled
            />

            <Input
              label="Tipo gado"
              value={editar.tipo_gado || ''}
              onChange={(e) =>
                setEditar({
                  ...editar,
                  tipo_gado: e.target.value,
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

            <Input
              label="Status"
              value={editar.status}
              onChange={(e) =>
                setEditar({
                  ...editar,
                  status: e.target.value,
                })
              }
            />

            <div className={styles.actions}>
              <Button onClick={handleSaveEdit}>Salvar alterações</Button>

              <Button variant="danger" onClick={() => handleDelete(editar.id)}>
                Excluir
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ModalViagem
        open={viagemOpen}
        onClose={() => {
          setViagemOpen(false)
          setViagemInitial(null)
        }}
        initialData={viagemInitial}
        referenciaTipo="compra"
        referenciaId={viagemInitial?.referenciaId || null}
        viagensService={viagensService}
        onSaved={() => {
          setViagemOpen(false)
          setViagemInitial(null)
          carregarCompras()
        }}
      />
    </div>
  )
}
