import { useEffect, useState } from 'react'

import { Button, Card, Input, Table, TouchTooltip, touchTooltipStyles, tableListStyles } from '@/components/ui'
import { estoqueService } from '@/services/estoque.service'
import styles from './Processamento.module.scss'
import toast from 'react-hot-toast'
import { useDebounce } from '@/hook/useDebounce'
import { ProcessamentoModal } from './ProcessamentoModal'

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
  quantidade_pecas: number
}

export function Processamento() {
  const [historico, setHistorico] = useState<EstoqueRow[]>([])
  const [estoqueAtual, setEstoqueAtual] = useState<EstoqueResumoRow[]>([])
  const [loading, setLoading] = useState(false)

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

  const [openModal, setOpenModal] = useState(false)
  const [editar, setEditar] = useState<any>(null)

  const formatKg = (value: number) =>
    `${Number(value || 0).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} kg`

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


  const columns = [
    { key: 'data_movimentacao', header: 'Data' },
    {
      key: 'lote',
      header: 'Lote',
      render: (r: EstoqueRow) => (
        <span className={tableListStyles.textCell}>{r.lote || '—'}</span>
      ),
    },
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
        <TouchTooltip label={`Ver itens (${r.itens?.length || 0})`}>
          {r.itens?.map((item) => (
            <div key={item.id} className={touchTooltipStyles.item}>
              <strong>
                {item.agrupamento_id ? 'BANDA - ' : ''}
                {item.corte} - {item.peso_bruto_kg} Kg
              </strong>
            </div>
          ))}
        </TouchTooltip>
      ),
    },
    {
      key: 'acoes',
      header: 'Ações',
      render: (r: EstoqueRow) => (
        <div className={tableListStyles.acoesRow}>
          <Button
            variant="outline"
            className={tableListStyles.acaoBtn}
            onClick={() => {
              setEditar(r)
              setOpenModal(true)
            }}
          >
            Editar
          </Button>
          <Button
            variant="danger"
            className={tableListStyles.acaoBtn}
            disabled={!!r.referencia_venda_id}
            onClick={() => handleDelete(r.id)}
          >
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
                      <span className={styles.resumoLabel}>Quantidade</span>
                      <strong className={styles.resumoValorHighlight}>
                        {(item.quantidade_pecas)}
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

        <Button
          onClick={() => {
            setEditar(null)
            setOpenModal(true)
          }}
        >
          Nova movimentação
        </Button>
      </Card>

      <Card title="Histórico de transações">
        <Card title="Filtros">
          <div className={styles.filters}>
            <Input
              label="Buscar"
              placeholder="Lote, observações..."
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


      <ProcessamentoModal
        open={openModal}
        data={editar}
        onClose={() => {
          setOpenModal(false)
          setEditar(null)
        }}
        onSuccess={carregarDados}
      />
    </div>
  )
}