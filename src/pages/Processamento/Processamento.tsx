import { useEffect, useState } from 'react'

import {
  Button,
  Card,
  Input,
  Modal,
  Table,
} from '@/components/ui'

import { estoqueService } from '@/services/estoque.service'

import { TIPOS_CORTE, REGRA_BD } from '@/constants/cortes'

import styles from './Processamento.module.scss'
import toast from 'react-hot-toast'

interface EstoqueRow {
  id: number
  lote: string
  corte: string
  tipo_movimentacao: number
  peso_bruto_kg: number
  peso_liquido_kg: number
  data_movimentacao: string
  observacoes?: string
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
      return item.composicoes.reduce(
        (acc, c) => acc + Number(c.peso_kg || 0),
        0,
      )
    }

    return Number(item.peso_liquido_kg || 0)
  }

  const calcularTotalForm = (itens: ItemForm[]) =>
    itens.reduce((acc, item) => acc + calcularPesoItem(item), 0)

  useEffect(() => {
    setTotalPesoForm(calcularTotalForm(form.itens))
  }, [form.itens])

  async function carregarResumo() {
    const resumo = await estoqueService.getEstoqueAtual(
      search,
      lote,
      corteFiltro,
    )
    setEstoqueAtual(resumo || [])
  }

  async function carregarHistorico(currentPage = page) {
    try {
      setLoading(true)

      const movimentacoes = await estoqueService.getMovimentacoes(
        currentPage,
        10,
        search,
        startDate,
        endDate,
        lote,
        corteFiltro,
      )

      setHistorico(movimentacoes.data || [])
      setTotal(movimentacoes.total || 0)
      setTotalPages(movimentacoes.totalPages || 1)
    } catch {
      toast.error('Erro ao carregar histórico')
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
  }, [search, startDate, endDate, lote, corteFiltro])

  useEffect(() => {
    carregarHistorico(page)
  }, [page, search, startDate, endDate, lote, corteFiltro])

  function addItem() {
    setForm((prev) => ({
      ...prev,
      itens: [...prev.itens, emptyItem()],
    }))
  }

  function removeItem(index: number) {
    setForm((prev) => ({
      ...prev,
      itens: prev.itens.filter((_, i) => i !== index),
    }))
  }

  function changeTipo(index: number, corte: string) {
    const itens = [...form.itens]
    itens[index].corte = corte

    if (isBanda(corte)) {
      itens[index].composicoes = [
        { tipo_corte: 'Dianteiro', peso_kg: '' },
        { tipo_corte: 'Traseiro', peso_kg: '' },
      ]
      itens[index].peso_liquido_kg = ''
    } else {
      itens[index].composicoes = []
    }

    setForm({ ...form, itens })
  }

  function updateItem(index: number, field: keyof ItemForm, value: string) {
    const itens = [...form.itens]
    itens[index] = { ...itens[index], [field]: value }
    setForm({ ...form, itens })
  }

  function updateComposicao(
    itemIndex: number,
    compIndex: number,
    value: string,
  ) {
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

      if (!form.lote.trim()) {
        toast.error('Informe o lote')
        return
      }

      const itensValidos = form.itens.filter(
        (item) => item.corte && calcularPesoItem(item) > 0,
      )

      if (itensValidos.length === 0) {
        toast.error('Adicione ao menos uma peça com corte e peso')
        return
      }

      for (const item of itensValidos) {
        const pesoLiquido = calcularPesoItem(item)

        await estoqueService.createMovimentacao({
          lote: form.lote.trim(),
          corte: item.corte,
          tipo_movimentacao: form.tipo_movimentacao,
          peso_bruto_kg: pesoLiquido,
          peso_liquido_kg: pesoLiquido,
          data_movimentacao: form.data_movimentacao,
          observacoes: form.observacoes,
        })
      }

      toast.success(
        itensValidos.length === 1
          ? 'Movimentação registrada'
          : `${itensValidos.length} movimentações registradas`,
      )

      setForm({
        lote: '',
        tipo_movimentacao: 1,
        data_movimentacao: new Date().toISOString().split('T')[0],
        observacoes: '',
        itens: [emptyItem()],
      })

      setPage(1)
      await carregarDados()
    } catch {
      toast.error('Erro ao registrar movimentação')
    } finally {
      setLoadingSave(false)
    }
  }

  async function handleSaveEdit() {
    if (!editar) return

    try {
      setLoadingSave(true)

      if (!editar.lote.trim()) {
        toast.error('Informe o lote')
        return
      }

      if (!editar.corte) {
        toast.error('Selecione o corte')
        return
      }

      const pesoLiquido = Number(editar.peso_liquido_kg)

      if (!pesoLiquido || pesoLiquido <= 0) {
        toast.error('Informe o peso líquido')
        return
      }

      await estoqueService.updateMovimentacao(editar.id, {
        lote: editar.lote,
        corte: editar.corte,
        tipo_movimentacao: editar.tipo_movimentacao,
        peso_bruto_kg: pesoLiquido,
        peso_liquido_kg: pesoLiquido,
        data_movimentacao: editar.data_movimentacao,
        observacoes: editar.observacoes,
      })

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
    if (!confirm('Excluir esta movimentação?')) return

    try {
      await estoqueService.deleteMovimentacao(id)
      toast.success('Movimentação excluída')
      setEditar(null)
      await carregarDados()
    } catch {
      toast.error('Erro ao excluir movimentação')
    }
  }

  const totalLiquido = estoqueAtual.reduce(
    (acc, item) => acc + Number(item.saldo_liquido_kg || 0),
    0,
  )

  const columns = [
    { key: 'data_movimentacao', header: 'Data' },
    { key: 'lote', header: 'Lote' },
    { key: 'corte', header: 'Corte' },
    {
      key: 'tipo_movimentacao',
      header: 'Tipo',
      render: (r: EstoqueRow) => (
        <span
          className={
            r.tipo_movimentacao === 1
              ? styles.badgeEntrada
              : styles.badgeSaida
          }
        >
          {r.tipo_movimentacao === 1 ? 'Entrada' : 'Saída'}
        </span>
      ),
    },
    {
      key: 'peso_liquido_kg',
      header: 'Peso líquido',
      render: (r: EstoqueRow) => formatKg(r.peso_liquido_kg),
    },
    {
      key: 'acoes',
      header: 'Ações',
      render: (r: EstoqueRow) => (
        <div className={styles.tableActions}>
          <Button onClick={() => setEditar(r)}>Editar</Button>
          <Button variant="danger" onClick={() => handleDelete(r.id)}>
            Excluir
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className={styles.page}>
      <h1 className="page-title">Processamento / Estoque</h1>

      <Card title="Filtros">
        <div className={styles.filters}>
          <Input
            label="Buscar"
            placeholder="Lote, corte..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Input
            label="Lote"
            value={lote}
            onChange={(e) => setLote(e.target.value)}
          />
          <Input
            label="Corte"
            value={corteFiltro}
            onChange={(e) => setCorteFiltro(e.target.value)}
          />
          <Input
            label="Data inicial"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            label="Data final"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </Card>

      <Card title="Resumo do estoque">
        {loading && estoqueAtual.length === 0 ? (
          <p className={styles.resumoEmpty}>Carregando saldos...</p>
        ) : estoqueAtual.length === 0 ? (
          <p className={styles.resumoEmpty}>
            Nenhum saldo em estoque para os filtros aplicados.
          </p>
        ) : (
          <>
            <p className={styles.resumoIntro}>
              {estoqueAtual.length}{' '}
              {estoqueAtual.length === 1
                ? 'corte com saldo'
                : 'cortes com saldo'}
            </p>

            <div className={styles.resumoGrid}>
              {estoqueAtual.map((item) => (
                <article key={item.corte} className={styles.resumoCard}>
                  <span className={styles.resumoCorte}>{item.corte}</span>
                  <div className={styles.resumoMetrics}>
                    <div className={styles.resumoMetric}>
                      <span className={styles.resumoLabel}>Peso líquido</span>
                      <strong
                        className={[
                          styles.resumoValor,
                          styles.resumoValorHighlight,
                        ].join(' ')}
                      >
                        {formatKg(item.saldo_liquido_kg)}
                      </strong>
                    </div>
                  </div>
                </article>
              ))}

              <article
                className={[styles.resumoCard, styles.resumoCardTotal].join(
                  ' ',
                )}
              >
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
                  label="Peso líquido (kg)"
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
                      label={`${c.tipo_corte} (kg)`}
                      type="number"
                      value={c.peso_kg}
                      onChange={(e) =>
                        updateComposicao(index, i, e.target.value)
                      }
                    />
                  ))}
                  <Input
                    label="Peso líquido total (kg)"
                    type="number"
                    value={item.peso_liquido_kg}
                    disabled
                  />
                </>
              )}

              {form.itens.length > 1 && (
                <Button
                  variant="danger"
                  onClick={() => removeItem(index)}
                >
                  Remover peça
                </Button>
              )}
            </div>
          </Card>
        ))}

        <Button variant="outline" onClick={addItem}>
          + Peça
        </Button>

        <Input
          label="Observações"
          value={form.observacoes}
          onChange={(e) =>
            setForm({ ...form, observacoes: e.target.value })
          }
        />

        <div className={styles.totalPeso}>
          <span>Total líquido da movimentação</span>
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

              <div className={styles.selectWrap}>
                <label className={styles.label}>Corte</label>
                <select
                  className={styles.select}
                  value={editar.corte}
                  onChange={(e) =>
                    setEditar({ ...editar, corte: e.target.value })
                  }
                >
                  {TIPOS_CORTE.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.selectWrap}>
                <label className={styles.label}>Tipo movimentação</label>
                <select
                  className={styles.select}
                  value={editar.tipo_movimentacao}
                  onChange={(e) =>
                    setEditar({
                      ...editar,
                      tipo_movimentacao: Number(e.target.value),
                    })
                  }
                >
                  <option value={1}>Entrada</option>
                  <option value={0}>Saída</option>
                </select>
              </div>

              <Input
                label="Peso líquido (kg)"
                type="number"
                value={editar.peso_liquido_kg}
                onChange={(e) =>
                  setEditar({
                    ...editar,
                    peso_liquido_kg: Number(e.target.value),
                  })
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

            <div className={styles.modalActions}>
              <Button variant="danger" onClick={() => setEditar(null)}>
                Cancelar
              </Button>
              <Button disabled={loadingSave} onClick={handleSaveEdit}>
                {loadingSave ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
