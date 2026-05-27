import { useEffect, useState } from 'react'
import { Trash2 } from "lucide-react";
import {
  Autocomplete,
  Button,
  Card,
  Input,
  Modal,
  ModalDetails,
  Table,
} from '@/components/ui'

import toast from 'react-hot-toast'
import styles from './Vendas.module.scss'
import { TIPOS_CORTE } from '@/constants/cortes'
import { ClienteExtratoModal } from '../Clientes/ClienteExtratoModal'
import { clientesService } from '@/services/cliente.service'
import { movimentacoesClientesService } from '@/services/movimentacoesClientes.service'
import { estoqueService } from '@/services/estoque.service'

const emptyItem = {
  tipo_corte: '',
  peso_total_kg: '',
  valor_kg: '',
  composicoes: [],
}

export function Vendas() {
  const [clientes, setClientes] = useState<any[]>([])
  const [historico, setHistorico] = useState<any[]>([])
  const [clienteBusca, setClienteBusca] = useState('')
  const [totalGeral, setTotalGeral] = useState(0)
  const [editando, setEditando] = useState<any>(null)
  const [detalhe, setDetalhe] = useState<any>(null)
  const [clienteExtrato, setClienteExtrato] = useState<any>(null)
  const [form, setForm] = useState<any>({
    cliente_id: '',
    observacao: '',
    data_movimentacao: new Date().toISOString().split('T')[0],
    itens: [{ ...emptyItem }],
    movimentacao_status: 'pendente',
  })

  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [loadingSave, setLoadingSave] = useState(false)
  useEffect(() => {
    carregarClientes()
  }, [])

  useEffect(() => {
    carregarMovimentacoes(page)
  }, [page])

  useEffect(() => {
    setTotalGeral(calcularTotal())
  }, [form.itens])

  useEffect(() => {
    setTotalGeral(calcularTotal())
  }, [form.itens])

  const isBanda = (tipo: string) =>
    (tipo || '').toLowerCase().includes('banda') ||
    (tipo || '').toLowerCase().includes('bd')

  async function carregarClientes() {
    const data = await clientesService.getOptions()
    setClientes(data || [])
  }

  async function carregarMovimentacoes(currentPage = 1) {
    try {
      setLoading(true)

      const data = await movimentacoesClientesService.getAll(currentPage, 10)

      setHistorico(data.data || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 1)
    } finally {
      setLoading(false)
    }
  }

  // ─── form (criar) ───────────────────────────────────────────

  function addItem() {
    setForm((prev: any) => ({
      ...prev,
      itens: [...prev.itens, { ...emptyItem }],
    }))
  }

  function removeItem(index: number) {
    setForm((prev: any) => ({
      ...prev,
      itens: prev.itens.filter((_: any, i: number) => i !== index),
    }))
  }

  function updateItem(index: number, field: string, value: any) {
    const itens = [...form.itens]
    itens[index][field] = value
    const peso = Number(itens[index].peso_total_kg || 0)
    const valorKg = Number(itens[index].valor_kg || 0)
    itens[index].valor_total = isNaN(peso * valorKg) ? 0 : peso * valorKg
    setForm({ ...form, itens })
  }

  function changeTipo(index: number, tipo: string) {
    const itens = [...form.itens]
    itens[index].tipo_corte = tipo
    if (isBanda(tipo)) {
      itens[index].composicoes = [
        { tipo_corte: 'Dianteiro', peso_kg: '' },
        { tipo_corte: 'Traseiro', peso_kg: '' },
      ]
    } else {
      itens[index].composicoes = []
    }
    setForm({ ...form, itens })
  }

  function updateComposicao(itemIndex: number, compIndex: number, value: any) {
    const itens = [...form.itens]
    itens[itemIndex].composicoes[compIndex].peso_kg = value
    const total = itens[itemIndex].composicoes.reduce(
      (acc: number, c: any) => acc + Number(c.peso_kg || 0),
      0
    )
    itens[itemIndex].peso_total_kg = String(total)
    const valorKg = Number(itens[itemIndex].valor_kg || 0)
    itens[itemIndex].valor_total = total * valorKg
    setForm({ ...form, itens })
  }

  function calcularTotal() {
    return form.itens.reduce(
      (acc: number, i: any) => acc + Number(i.valor_total || 0),
      0
    )
  }

  const agrupamentoId = crypto.randomUUID()

  const itensSaida = form.itens.flatMap((item: any) => {
    const banda = isBanda(item.tipo_corte)

    if (banda) {
      return (item.composicoes || []).map((c: any) => ({
        corte: c.tipo_corte,
        peso_bruto_kg: Number(c.peso_kg || 0),
        peso_liquido_kg: Number(c.peso_kg || 0),
        agrupamento_id: agrupamentoId,
      }))
    }

    return [
      {
        corte: item.tipo_corte,
        peso_bruto_kg: Number(item.peso_total_kg || 0),
        peso_liquido_kg: Number(item.peso_total_kg || 0),
        agrupamento_id: null,
      },
    ]
  })

  async function handleCreate() {
    try {
      setLoadingSave(true)
      if (!form.cliente_id) {
        toast.error('Selecione cliente')
        return
      }

      const payload = {
        cliente_id: form.cliente_id,
        observacao: form.observacao,
        data_movimentacao: form.data_movimentacao,
        movimentacao_status: form.movimentacao_status,
        itens: form.itens.map((i: any) => ({
          tipo_corte: i.tipo_corte,
          peso_total_kg: Number(i.peso_total_kg || 0),
          valor_kg: Number(i.valor_kg || 0),
          valor_total: Number(i.valor_total || 0),
          composicoes: i.composicoes || [],
        })),
        valor_total: totalGeral,
      }

      toast.success('Movimentação criada')
      const venda = await movimentacoesClientesService.create(payload)

      const mov = await estoqueService.createMovimentacao({
        lote: `venda-${venda.id}`,
        tipo_movimentacao: 0, // SAÍDA
        data_movimentacao: form.data_movimentacao,
        observacoes: `Saída automática venda cliente ${form.cliente_id}`,
        peso_bruto_kg: totalGeral,
        peso_liquido_kg: totalGeral,
        venda_id: venda.id
      })

      await estoqueService.createMovimentacaoItem(
        itensSaida.map((i: any) => ({
          ...i,
          movimentacao_id: mov.id
        })),
      )

      setForm({
        cliente_id: '',
        observacao: '',
        data_movimentacao: new Date().toISOString().split('T')[0],
        itens: [{ ...emptyItem }],
        movimentacao_status: 'pendente',
      })
      setClienteBusca('')
      setTotalGeral(0)
      carregarMovimentacoes()
      setLoadingSave(false)
    } catch {
      setLoadingSave(false)

      toast.error('Erro ao salvar')
    }
  }

  // ─── editar ─────────────────────────────────────────────────

  function calcularTotalEdit(itens: any[]) {
    return itens.reduce(
      (acc: number, i: any) => acc + Number(i.valor_total || 0),
      0
    )
  }

  function addEditItem() {
    setEditando((prev: any) => ({
      ...prev,
      itens: [...prev.itens, { ...emptyItem }],
    }))
  }

  function removeEditItem(index: number) {
    setEditando((prev: any) => ({
      ...prev,
      itens: prev.itens.filter((_: any, i: number) => i !== index),
    }))
  }

  function updateEditItem(index: number, field: string, value: any) {
    const itens = [...editando.itens]
    itens[index][field] = value
    const peso = Number(itens[index].peso_total_kg || 0)
    const valorKg = Number(itens[index].valor_kg || 0)
    itens[index].valor_total = isNaN(peso * valorKg) ? 0 : peso * valorKg
    setEditando({ ...editando, itens })
  }

  function changeEditTipo(index: number, tipo: string) {
    const itens = [...editando.itens]
    itens[index].tipo_corte = tipo
    if (isBanda(tipo)) {
      itens[index].composicoes = [
        { tipo_corte: 'Dianteiro', peso_kg: '' },
        { tipo_corte: 'Traseiro', peso_kg: '' },
      ]
    } else {
      itens[index].composicoes = []
    }
    setEditando({ ...editando, itens })
  }

  function updateEditComposicao(
    itemIndex: number,
    compIndex: number,
    value: any
  ) {
    const itens = [...editando.itens]
    itens[itemIndex].composicoes[compIndex].peso_kg = value
    const total = itens[itemIndex].composicoes.reduce(
      (acc: number, c: any) => acc + Number(c.peso_kg || 0),
      0
    )
    itens[itemIndex].peso_total_kg = String(total)
    itens[itemIndex].valor_total =
      total * Number(itens[itemIndex].valor_kg || 0)
    setEditando({ ...editando, itens })
  }

  const [movimentacaoOriginal, setMovimentacaoOriginal] = useState<any>(null)

  async function handleEdit() {
    try {
      setLoadingSave(true)

      const payload = {
        cliente_id: editando.cliente_id,
        observacao: editando.observacao,
        data_movimentacao: editando.data_movimentacao,
        movimentacao_status: editando.movimentacao_status,
        itens: editando.itens.map((i: any) => ({
          tipo_corte: i.tipo_corte,
          peso_total_kg: Number(i.peso_total_kg || 0),
          valor_kg: Number(i.valor_kg || 0),
          valor_total: Number(i.valor_total || 0),
          composicoes: i.composicoes || [],
        })),
        valor_total: calcularTotalEdit(editando.itens),
      }

      await movimentacoesClientesService.update(
        editando.id,
        payload
      )

      const houveMudancaItens =
        JSON.stringify(editando.itens) !==
        JSON.stringify(movimentacaoOriginal.itens)

      if (houveMudancaItens) {
        await estoqueService.deleteByReferencia(
          editando.id
        )

        const agrupamentoId = crypto.randomUUID()

        const itensSaida = editando.itens.flatMap(
          (item: any) => {
            const banda = isBanda(item.tipo_corte)

            if (banda) {
              return (item.composicoes || []).map(
                (c: any) => ({
                  corte: c.tipo_corte,
                  peso_bruto_kg: Number(c.peso_kg || 0),
                  peso_liquido_kg: Number(c.peso_kg || 0),
                  agrupamento_id: agrupamentoId,
                })
              )
            }

            return [
              {
                corte: item.tipo_corte,
                peso_bruto_kg: Number(
                  item.peso_total_kg || 0
                ),
                peso_liquido_kg: Number(
                  item.peso_total_kg || 0
                ),
                agrupamento_id: null,
              },
            ]
          }
        )

        const mov =
          await estoqueService.createMovimentacao({
            lote: `venda-${editando.id}`,
            tipo_movimentacao: 0,
            data_movimentacao:
              editando.data_movimentacao,
            observacoes: `Atualização venda ${editando.id}`,
            peso_bruto_kg:
              calcularTotalEdit(editando.itens),
            peso_liquido_kg:
              calcularTotalEdit(editando.itens),
            venda_id: editando.id,
          })

        await estoqueService.createMovimentacaoItem(
          itensSaida.map((i: any) => ({
            ...i,
            movimentacao_id: mov.id,
          }))
        )
      }

      toast.success('Movimentação atualizada')

      setEditando(null)
      setMovimentacaoOriginal(null)

      carregarMovimentacoes()
    } catch {
      toast.error('Erro ao editar')
    } finally {
      setLoadingSave(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Excluir esta movimentação?')) return
    try {
      await movimentacoesClientesService.delete(id)
      await estoqueService.deleteByReferencia(id)
      toast.success('Movimentação excluída')
      setEditando(null)
      carregarMovimentacoes()
    } catch {
      toast.error('Erro ao excluir')
    }
  }

  // ─── tabela ──────────────────────────────────────────────────

  const columns = [
    {
      key: 'cliente',
      header: 'Cliente',
      render: (r: any) => (
        <a
          onClick={() => setClienteExtrato(r)}
          style={{ cursor: 'pointer', textDecoration: 'underline' }}
        >
          {r.cliente?.nome}
        </a>
      ),
    },
    {
      key: 'data',
      header: 'Data',
      render: (r: any) => r.data_movimentacao,
    },
    {
      key: 'detalhes',
      header: 'Itens',
      render: (r: any) => (
        <div className={styles.tooltipWrapper}>
          <button className={styles.detalhesButton}>
            Ver itens ({r.itens?.length || 0})
          </button>

          <div className={styles.tooltipContent}>
            {r.itens?.map((item: any, index: number) => (
              <div key={index} className={styles.tooltipItem}>
                <strong>{item.tipo_corte}</strong>

                <span>
                  {Number(item.peso_total_kg).toFixed(2)}kg × R${' '}
                  {Number(item.valor_kg).toFixed(2)}
                </span>

                <span>Total: R$ {Number(item.valor_total).toFixed(2)}</span>

                {item.composicoes?.length > 0 && (
                  <div className={styles.tooltipComposicoes}>
                    {item.composicoes.map((c: any, i: number) => (
                      <small key={i}>
                        {c.tipo_corte}: {Number(c.peso_kg).toFixed(2)}kg
                      </small>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      render: (r: any) => `R$ ${Number(r.valor_total).toFixed(2)}`,
    },
    {
      key: 'status',
      header: 'Status',
      render: (r: any) => (
        <span
          className={
            r.movimentacao_status === 'finalizado'
              ? styles.badgeFinalizado
              : styles.badgePendente
          }
        >
          {r.movimentacao_status === 'finalizado' ? 'Finalizado' : 'Pendente'}
        </span>
      ),
    },
    {
      key: 'acao',
      header: 'Ação',
      render: (r: any) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            variant="outline"
            onClick={() => {
              setMovimentacaoOriginal(structuredClone(r))
              setEditando(structuredClone(r))
            }}
          >
            Editar
          </Button>
          <Button variant="destructive" onClick={() => handleDelete(r.id)}>
            Excluir
          </Button>
        </div>
      ),
    },
  ]
  // ─── render ──────────────────────────────────────────────────

  return (
    <div>
      <h1>Movimentações</h1>

      {/* ── Formulário de criação ── */}
      <Card className={styles.card} title="Nova movimentação">
        <div className={styles.formSimples}>
          <Autocomplete
            label="Cliente"
            options={clientes.map((c) => c.nome)}
            value={clienteBusca}
            onChange={(v) => {
              setClienteBusca(v)
              const cli = clientes.find((c) => c.nome === v)
              setForm({ ...form, cliente_id: cli?.id || '' })
            }}
          />

          <Input
            label="Data movimentação"
            type="date"
            value={form.data_movimentacao}
            onChange={(e) =>
              setForm({ ...form, data_movimentacao: e.target.value })
            }
          />

          <div className={styles.selectWrap}>
            <label>Status</label>
            <select
              className={styles.select}
              value={form.movimentacao_status ?? 'pendente'}
              onChange={(e) =>
                setForm({ ...form, movimentacao_status: e.target.value })
              }
            >
              <option value="pendente">Pendente</option>
              <option value="finalizado">Finalizado</option>
            </select>
          </div>
        </div>

        {form.itens.map((item: any, index: number) => (
          <Card className={styles.form} key={index}>
            <div className={styles.selectWrap}>
              <label>Corte</label>
              <select
                className={styles.select}
                value={item.tipo_corte}
                onChange={(e) => changeTipo(index, e.target.value)}
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
              label="Valor por KG"
              type="number"
              value={item.valor_kg ?? ''}
              onChange={(e) => updateItem(index, 'valor_kg', e.target.value)}
            />

            {!isBanda(item.tipo_corte) && (
              <Input
                label="Peso total KG"
                type="number"
                value={item.peso_total_kg ?? ''}
                onChange={(e) =>
                  updateItem(index, 'peso_total_kg', e.target.value)
                }
              />
            )}

            {isBanda(item.tipo_corte) &&
              item.composicoes.map((c: any, i: number) => (
                <Input
                  key={i}
                  label={c.tipo_corte}
                  type="number"
                  value={c.peso_kg ?? ''}
                  onChange={(e) => updateComposicao(index, i, e.target.value)}
                />
              ))}

            <Input label="Total" value={item.valor_total ?? ''} disabled />

            <Button
              size={48}
              variant="destructive"
              onClick={() => removeItem(index)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </Card>
        ))}

        <div className={styles.form}>
          <Button variant='outline' onClick={addItem}>+ Peça</Button>
        </div>
        <Input
          label="Observação"
          value={form.observacao}
          onChange={(e) => setForm({ ...form, observacao: e.target.value })}
        />

        <div className={styles.form}>
          <Input
            label="Total geral"
            type="number"
            value={totalGeral}
            disabled
          />
        </div>

        <Button
          disabled={loadingSave || !form.cliente_id || form.itens.length === 0}
          onClick={handleCreate}
        >
          Salvar movimentação
        </Button>
      </Card>

      {/* ── Histórico ── */}
      <Card title="Histórico">
        <Table
          columns={columns}
          data={historico}
          keyExtractor={(r) => String(r.id)}
          loading={loading}
          page={page}
          total={total}
          totalPages={totalPages}
          onPageChange={setPage}
          emptyMessage="Nenhuma movimentação encontrada."
        />
      </Card>

      <Modal
        open={!!detalhe}
        onClose={() => setDetalhe(null)}
        title="Detalhes da movimentação"
      >
        {detalhe && (
          <div className={styles.modalContent}>
            <ModalDetails
              items={[
                {
                  label: 'Cliente',
                  value: detalhe.cliente?.nome || '-',
                },
                {
                  label: 'Data',
                  value: detalhe.data_movimentacao,
                },
                {
                  label: 'Total',
                  value: `R$ ${Number(detalhe.valor_total).toFixed(2)}`,
                },
                {
                  label: 'Observação',
                  value: detalhe.observacao || '-',
                },
              ]}
            />

            <div className={styles.items}>
              {detalhe.itens?.map((item: any, idx: number) => (
                <div key={idx} className={styles.itemCard}>
                  <strong>{item.tipo_corte}</strong>
                  <p>Peso: {item.peso_total_kg} kg</p>
                  <p>Valor/kg: R$ {Number(item.valor_kg).toFixed(2)}</p>
                  <p>Total: R$ {Number(item.valor_total).toFixed(2)}</p>

                  {item.composicoes?.length > 0 && (
                    <div className={styles.composicoes}>
                      {item.composicoes.map((c: any, i: number) => (
                        <span key={i}>
                          {c.tipo_corte}: {c.peso_kg} kg
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className={styles.modalActions}>
              <Button
                onClick={() => {
                  setEditando(detalhe)
                  setDetalhe(null)
                }}
              >
                Editar
              </Button>
            </div>
          </div>
        )}
      </Modal>
      {/* ── Modal de edição ── */}
      <Modal
        open={!!editando}
        onClose={() => setEditando(null)}
        title="Editar movimentação"
      >
        {editando && (
          <div className={styles.modalContent}>
            <Input
              label="Data movimentação"
              type="date"
              value={editando.data_movimentacao ?? ''}
              onChange={(e) =>
                setEditando({ ...editando, data_movimentacao: e.target.value })
              }
            />
            <div className={styles.selectWrap}>
              <label>Status</label>
              <select
                className={styles.select}
                value={editando.movimentacao_status ?? 'pendente'}
                onChange={(e) =>
                  setEditando({
                    ...editando,
                    movimentacao_status: e.target.value,
                  })
                }
              >
                <option value="pendente">Pendente</option>
                <option value="finalizado">Finalizado</option>
              </select>
            </div>

            <Input
              label="Observação"
              value={editando.observacao ?? ''}
              onChange={(e) =>
                setEditando({ ...editando, observacao: e.target.value })
              }
            />

            <div className={styles.items}>
              {editando.itens?.map((item: any, index: number) => (
                <Card key={index} className={styles.form}>
                  <div className={styles.selectWrap}>
                    <label>Corte</label>
                    <select
                      className={styles.select}
                      value={item.tipo_corte}
                      onChange={(e) => changeEditTipo(index, e.target.value)}
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
                    label="Valor por KG"
                    type="number"
                    value={item.valor_kg ?? ''}
                    onChange={(e) =>
                      updateEditItem(index, 'valor_kg', e.target.value)
                    }
                  />

                  {!isBanda(item.tipo_corte) && (
                    <Input
                      label="Peso total KG"
                      type="number"
                      value={item.peso_total_kg ?? ''}
                      onChange={(e) =>
                        updateEditItem(index, 'peso_total_kg', e.target.value)
                      }
                    />
                  )}

                  {isBanda(item.tipo_corte) &&
                    item.composicoes?.map((c: any, i: number) => (
                      <Input
                        key={i}
                        label={c.tipo_corte}
                        type="number"
                        value={c.peso_kg ?? ''}
                        onChange={(e) =>
                          updateEditComposicao(index, i, e.target.value)
                        }
                      />
                    ))}

                  <Input
                    label="Total"
                    value={item.valor_total ?? ''}
                    disabled
                  />


                  <Button
                    size={48}

                    variant="destructive"
                    onClick={() => removeEditItem(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </Card>
              ))}
            </div>

            <Button variant='outline' onClick={addEditItem}>+ Item</Button>

            {/* Total geral do edit */}
            <div className={styles.form}>
              <Input
                label="Total geral"
                value={calcularTotalEdit(editando.itens).toFixed(2)}
                disabled
              />
            </div>

            <div className={styles.modalActions}>
              <Button variant="ghost" onClick={() => setEditando(null)}>
                Cancelar
              </Button>
              <div style={{ flex: 1 }} />

              {/* {editando.movimentacao_status !== 'finalizado' && (
                <Button
                  variant="outline"
                  onClick={() => setEditando({ ...editando, movimentacao_status: 'finalizado' })}
                >
                  ✓ Finalizar
                </Button>
              )} */}
              <Button loading={loadingSave} disabled={loadingSave} onClick={handleEdit}>
                Salvar
              </Button>
            </div>
          </div>
        )}
      </Modal>
      <ClienteExtratoModal
        open={!!clienteExtrato}
        cliente={clienteExtrato?.cliente}
        onClose={() => setClienteExtrato(null)}
      />
    </div>
  )
}
