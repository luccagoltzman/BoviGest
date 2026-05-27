import { useEffect, useState } from 'react'

import { Button, Card, Input, Modal, Table } from '@/components/ui'
import { estoqueService } from '@/services/estoque.service'
import { TIPOS_CORTE, REGRA_BD } from '@/constants/cortes'
import styles from './Processamento.module.scss'
import toast from 'react-hot-toast'
import { useDebounce } from '@/hook/useDebounce'
import { Trash2 } from 'lucide-react'

interface Composicao {
  id?: number
  tipo_corte: string
  peso_kg: number | string
}

interface EstoqueItem {
  id?: number
  corte: string
  peso_liquido_kg: number
  peso_bruto_kg: number
  agrupamento_id: any
}

interface EstoqueRow {
  id: number
  lote: string
  tipo_movimentacao: number
  data_movimentacao: string
  observacoes?: string
  referencia_venda_id?: number
  itens: EstoqueItem[]
}

interface EstoqueResumoRow {
  corte: string
  saldo_bruto_kg: number
  saldo_liquido_kg: number
}

interface ItemForm {
  corte: string
  peso_liquido_kg: string
  composicoes: { tipo_corte: string; peso_kg: string }[]
  agrupamento_id?: string
}

const emptyItem = (): ItemForm => ({
  corte: '',
  peso_liquido_kg: '',
  composicoes: [],
})

const isBanda = (tipo: string) => {
  const t = (tipo || '').toLowerCase()
  return t.includes('banda') || t.includes('bd')
}

export function Processamento() {
  const [historico, setHistorico] = useState<EstoqueRow[]>([])
  const [estoqueAtual, setEstoqueAtual] = useState<EstoqueResumoRow[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingSave, setLoadingSave] = useState(false)
  const [editar, setEditar] = useState<EstoqueRow | null>(null)

  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [lote, setLote] = useState('')
  const [corteFiltro, setCorteFiltro] = useState('')

  const searchDebounced = useDebounce(search, 500)
  const loteDebounced = useDebounce(lote, 500)
  const corteDebounced = useDebounce(corteFiltro, 500)
  const startDateDebounced = useDebounce(startDate, 500)
  const endDateDebounced = useDebounce(endDate, 500)

  const [form, setForm] = useState({
    lote: '',
    tipo_movimentacao: 1,
    data_movimentacao: new Date().toISOString().split('T')[0],
    observacoes: '',
    itens: [emptyItem()],
  })

  const [totalPesoForm, setTotalPesoForm] = useState(0)

  const formatKg = (value: number) =>
    `${Number(value || 0).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} kg`

  const calcularPesoItem = (item: ItemForm) => {
    if (isBanda(item.corte)) {
      return item.composicoes.reduce((acc, c) => acc + Number(c.peso_kg || 0), 0)
    }
    return Number(item.peso_liquido_kg || 0)
  }

  useEffect(() => {
    setTotalPesoForm(
      form.itens.reduce((acc, i) => acc + calcularPesoItem(i), 0),
    )
  }, [form.itens])

  async function carregarResumo() {
    const resumo = await estoqueService.getEstoqueAtual(
      searchDebounced,
      loteDebounced,
      corteDebounced,
    )
    setEstoqueAtual(resumo || [])
  }

  async function carregarHistorico(currentPage = page) {
    try {
      setLoading(true)

      const res = await estoqueService.getMovimentacoes(
        currentPage,
        10,
        searchDebounced,
        startDateDebounced,
        endDateDebounced,
        loteDebounced,
      )

      setHistorico(res.data || [])
      setTotal(res.total || 0)
      setTotalPages(res.totalPages || 1)
    } finally {
      setLoading(false)
    }
  }

  async function carregarDados() {
    await Promise.all([carregarResumo(), carregarHistorico(page)])
  }

  useEffect(() => {
    carregarResumo()
    setPage(1)
  }, [searchDebounced, loteDebounced, corteDebounced])

  useEffect(() => {
    carregarHistorico(page)
  }, [page, searchDebounced, startDateDebounced, endDateDebounced, loteDebounced, corteDebounced])

  function addItem() {
    setForm((p) => ({ ...p, itens: [...p.itens, emptyItem()] }))
  }

  function removeItem(index: number) {
    setForm((p) => ({
      ...p,
      itens: p.itens.filter((_, i) => i !== index),
    }))
  }

  function changeTipo(index: number, corte: string) {
    const itens = [...form.itens]
    itens[index].corte = corte

    if (isBanda(corte)) {
      itens[index].agrupamento_id = crypto.randomUUID()
      itens[index].composicoes = [
        { tipo_corte: 'Dianteiro', peso_kg: '' },
        { tipo_corte: 'Traseiro', peso_kg: '' },
      ]
      itens[index].peso_liquido_kg = ''
    } else {
      itens[index].composicoes = []
      itens[index].agrupamento_id = undefined
    }

    setForm({ ...form, itens })
  }

  function updateComposicao(itemIndex: number, compIndex: number, value: string) {
    const itens = [...form.itens]

    itens[itemIndex].composicoes[compIndex].peso_kg = value

    const total = itens[itemIndex].composicoes.reduce(
      (acc, c) => acc + Number(c.peso_kg || 0),
      0,
    )

    itens[itemIndex].peso_liquido_kg = String(total)

    setForm({ ...form, itens })
  }

  async function handleCreate() {
    try {
      setLoadingSave(true)

      const itensPayload: any[] = []
      let total = 0

      const movimentacaoId = crypto.randomUUID()

      for (const item of form.itens) {
        if (isBanda(item.corte)) {
          const agrupamentoId = item.agrupamento_id || crypto.randomUUID()

          for (const c of item.composicoes) {
            const peso = Number(c.peso_kg)
            total += peso

            itensPayload.push({
              corte: c.tipo_corte,
              peso_bruto_kg: peso,
              peso_liquido_kg: peso,
              agrupamento_id: agrupamentoId,
              movimentacao_id: movimentacaoId,
            })
          }
        } else {
          const peso = Number(item.peso_liquido_kg)
          total += peso

          itensPayload.push({
            corte: item.corte,
            peso_bruto_kg: peso,
            peso_liquido_kg: peso,
            agrupamento_id: null,
            movimentacao_id: movimentacaoId,
          })
        }
      }

      const mov = await estoqueService.createMovimentacao({
        lote: form.lote,
        tipo_movimentacao: form.tipo_movimentacao,
        data_movimentacao: form.data_movimentacao,
        observacoes: form.observacoes,
        peso_bruto_kg: total,
        peso_liquido_kg: total,
      })

      await estoqueService.createMovimentacaoItem(
        itensPayload.map((i) => ({ ...i, movimentacao_id: mov.id })),
      )

      toast.success('Criado')

      setForm({
        lote: '',
        tipo_movimentacao: 1,
        data_movimentacao: new Date().toISOString().split('T')[0],
        observacoes: '',
        itens: [emptyItem()],
      })

      await carregarDados()
    } finally {
      setLoadingSave(false)
    }
  }

  function updateItem(index: number, field: keyof ItemForm, value: string) {
    setForm((prev) => {
      const itens = [...prev.itens]
      itens[index] = {
        ...itens[index],
        [field]: value,
      }
      return { ...prev, itens }
    })
  }
  async function handleSaveEdit() {
    if (!editar) return

    try {
      setLoadingSave(true)

      await estoqueService.updateMovimentacao(editar.id, {
        lote: editar.lote,
        tipo_movimentacao: editar.tipo_movimentacao,
        data_movimentacao: editar.data_movimentacao,
        observacoes: editar.observacoes,
      })

      const itensPayload = editar.itens.map((i) => ({
        movimentacao_id: editar.id,
        corte: i.corte,
        peso_bruto_kg: Number(i.peso_liquido_kg),
        peso_liquido_kg: Number(i.peso_liquido_kg),
        agrupamento_id: i.agrupamento_id || null,
      }))

      await estoqueService.replaceMovimentacaoItens(
        editar.id,
        itensPayload,
      )

      toast.success('Movimentação atualizada')

      setEditar(null)
      await carregarDados()
    } catch {
      toast.error('Erro ao atualizar movimentação')
    } finally {
      setLoadingSave(false)
    }
  }
  async function handleDelete(id: number) {
    if (!confirm('Excluir?')) return
    await estoqueService.deleteMovimentacao(id)
    toast.success('Excluído')
    await carregarDados()
  }

  const totalLiquido = estoqueAtual.reduce(
    (acc, item) => acc + Number(item.saldo_liquido_kg || 0),
    0,
  )

  function updateEditarItem(itemId: number, value: string) {
    if (!editar) return

    const itens = editar.itens.map((i) =>
      i.id === itemId
        ? {
          ...i,
          peso_liquido_kg: Number(value),
        }
        : i,
    )

    setEditar({
      ...editar,
      itens,
    })
  }

  function agruparItens(itens: any[]) {
    const grupos: any[] = []
    const usados = new Set()

    for (const item of itens) {
      if (item.agrupamento_id) {
        if (usados.has(item.agrupamento_id)) continue

        const grupo = itens.filter(
          (i) => i.agrupamento_id === item.agrupamento_id,
        )

        grupos.push({
          tipo: 'banda',
          agrupamento_id: item.agrupamento_id,
          itens: grupo,
          corte: grupo[0]?.corte,
        })

        usados.add(item.agrupamento_id)
      } else {
        grupos.push({
          tipo: 'normal',
          itens: [item],
        })
      }
    }

    return grupos
  }

  function removeEditarItem(item: any, indexGrupo: number) {
    if (!editar) return

    let itens = [...editar.itens]

    // CASO BANDA → remove TODOS do grupo
    if (item.tipo === 'banda') {
      const ids = item.itens.map((i: any) => i.id)

      itens = itens.filter((i) => !ids.includes(i.id))

      setEditar({ ...editar, itens })
      return
    }

    // CASO NORMAL
    const id = item.itens[0].id
    itens = itens.filter((i) => i.id !== id)

    setEditar({ ...editar, itens })
  }
  const columns = [
    { key: 'data_movimentacao', header: 'Data' },
    { key: 'lote', header: 'Lote' },
    {
      key: 'tipo_movimentacao',
      header: 'Tipo',
      render: (r: EstoqueRow) =>
        r.tipo_movimentacao === 1 ? 'Entrada' : 'Saída',
    },
    {
      key: 'peso',
      header: 'Peso',
      render: (r: EstoqueRow) =>
        formatKg(r.itens?.reduce((a, i) => a + i.peso_liquido_kg, 0) || 0),
    },
    {
      key: 'itens',
      header: 'Itens',
      render: (r: EstoqueRow) => (
        <div className={styles.tooltipWrapper}>
          <button className={styles.detalhesButton}>
            Ver itens ({r.itens?.length || 0})
          </button>

          <div className={styles.tooltipContent}>
            {r.itens?.map((item) => (
              <div key={item.id} className={styles.tooltipItem}>
                <strong>
                  {item.agrupamento_id ? 'BANDA -' : ''}  {item.corte} - {item.peso_bruto_kg} Kg
                </strong>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      key: 'acoes',
      header: 'Ações',
      render: (r: EstoqueRow) => (
        <div className={styles.actions}>
          <Button variant="outline" onClick={() => setEditar(r)}>Editar</Button>
          <Button variant="danger" disabled={!!r.referencia_venda_id} onClick={() => handleDelete(r.id)}>
            Excluir
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className={styles.page}>
      <h1 className="page-title">Processamento / Estoque</h1>

      <Card title="Resumo do estoque">
        {loading && estoqueAtual.length === 0 ? (
          <p className={styles.resumoEmpty}>Carregando saldos...</p>
        ) : estoqueAtual.length === 0 ? (
          <p className={styles.resumoEmpty}>
            Nenhum saldo em estoque para os filtros aplicados.
          </p>
        ) : (
          <>
            <div className={styles.resumoGrid}>
              {estoqueAtual.map((item) => (
                <article key={item.corte} className={styles.resumoCard}>
                  <span className={styles.resumoCorte}>{item.corte}</span>

                  <div className={styles.resumoMetrics}>
                    <div className={styles.resumoMetric}>
                      <span className={styles.resumoLabel}>Peso líquido</span>
                      <strong className={styles.resumoValorHighlight}>
                        {formatKg(item.saldo_liquido_kg)}
                      </strong>
                    </div>
                  </div>
                </article>
              ))}

              <article className={`${styles.resumoCard} ${styles.resumoCardTotal}`}>
                <span className={styles.resumoCorte}>Total geral</span>
                <div className={styles.resumoMetrics}>
                  <div className={styles.resumoMetric}>
                    <span className={styles.resumoLabel}>Peso líquido</span>
                    <strong className={styles.resumoValorTotal}>
                      {formatKg(totalLiquido)}
                    </strong>
                  </div>
                </div>
              </article>
            </div>
          </>
        )}
      </Card>

      <Card className={styles.cardMain} title="Nova movimentação">
        <div className={styles.formSimples}>
          <Input
            label="Lote"
            value={form.lote}
            onChange={(e) => setForm({ ...form, lote: e.target.value })}
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
            <label className={styles.label}>Tipo movimentação</label>
            <select
              className={styles.select}
              value={form.tipo_movimentacao}
              onChange={(e) =>
                setForm({
                  ...form,
                  tipo_movimentacao: Number(e.target.value),
                })
              }
            >
              <option value={1}>Entrada</option>
              <option value={0}>Saída</option>
            </select>
          </div>
        </div>

        {form.itens.map((item, index) => (
          <Card key={index} title={`Peça ${index + 1}`}>
            <div className={styles.itemForm}>

              <div className={styles.selectWrap}>
                <label className={styles.label}>Corte</label>
                <select
                  className={styles.select}
                  value={item.corte}
                  onChange={(e) => changeTipo(index, e.target.value)}
                >
                  <option value="">Selecione</option>
                  {TIPOS_CORTE.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {!isBanda(item.corte) && (
                <Input
                  label="Peso líquido"
                  type="number"
                  value={item.peso_liquido_kg}
                  onChange={(e) =>
                    updateItem(index, 'peso_liquido_kg', e.target.value)
                  }
                />
              )}

              {isBanda(item.corte) && (
                <>
                  <p className={styles.regraBD}>{REGRA_BD}</p>

                  {item.composicoes.map((c, i) => (
                    <Input
                      key={i}
                      label={c.tipo_corte}
                      type="number"
                      value={c.peso_kg}
                      onChange={(e) =>
                        updateComposicao(index, i, e.target.value)
                      }
                    />
                  ))}

                  <Input
                    label="Total banda"
                    value={item.peso_liquido_kg}
                    disabled
                  />
                </>
              )}

              {form.itens.length > 1 && (
                <Button
                  variant="danger"
                  size={48}
                  onClick={() => removeItem(index)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </Card>
        ))}
        <div className={styles.form}>
          <Button variant='outline' onClick={addItem}>+ Peça</Button>
        </div>

        <Input
          label="Observações"
          value={form.observacoes}
          onChange={(e) =>
            setForm({ ...form, observacoes: e.target.value })
          }
        />

        <div className={styles.totalPeso}>
          <span>Total do peso da movimentação</span>
          <strong>{formatKg(totalPesoForm)}</strong>
        </div>

        <Button
          disabled={
            loadingSave ||
            !form.lote.trim() ||
            form.itens.every((i) => !i.corte || calcularPesoItem(i) <= 0)
          }
          onClick={handleCreate}
        >
          {loadingSave ? 'Salvando...' : 'Registrar movimentação'}
        </Button>
      </Card>

      <Card title="Histórico de transações">
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
        open={!!editar}
        onClose={() => setEditar(null)}
        title="Editar movimentação"
      >
        {editar && (
          <div className={styles.modalContent}>

            <div className={styles.form}>
              <Input
                label="Lote"
                value={editar.lote}
                onChange={(e) =>
                  setEditar({ ...editar, lote: e.target.value })
                }
              />

              <Input
                label="Data movimentação"
                type="date"
                value={editar.data_movimentacao}
                onChange={(e) =>
                  setEditar({
                    ...editar,
                    data_movimentacao: e.target.value,
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
            </div>

            <div className={styles.modalItems}>
              {agruparItens(editar.itens || []).map((grupo, index) => (
                <div key={index} className={styles.groupCard}>

                  <div className={styles.groupCard}>
                    <div className={styles.groupTitle}>
                      {grupo.tipo === 'banda'
                        ? `BANDA`
                        : ``}
                    </div>

                    {grupo.itens.map((i: any) => (
                      <div key={i.id} className={styles.itemRow}>
                        <span>{i.corte}</span>

                        <Input
                          type="number"
                          value={i.peso_liquido_kg}
                          onChange={(e) =>
                            updateEditarItem(i.id, e.target.value)
                          }
                        />

                        <span>{formatKg(i.peso_liquido_kg)}</span>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="danger"
                    size={48}
                    onClick={() => removeEditarItem(grupo, index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>

                </div>
              ))}
            </div>
            <div className={styles.modalActions}>
              <Button variant="danger" onClick={() => setEditar(null)}>
                Cancelar
              </Button>

              <Button
                disabled={loadingSave || !!editar.referencia_venda_id}
                onClick={handleSaveEdit}
              >
                {loadingSave ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>

          </div>
        )}
      </Modal>
    </div>
  )
}