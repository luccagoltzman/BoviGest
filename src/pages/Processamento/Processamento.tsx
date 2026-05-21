import { useEffect, useState } from 'react'

import {
  Button,
  Card,
  Input,
  Modal,
  ModalDetails,
  Table,
} from '@/components/ui'

import type { DetailItem } from '@/components/ui'

import { estoqueService } from '@/services/estoque.service'

import { TIPOS_CORTE, CORTE_BD, REGRA_BD } from '@/constants/cortes'

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

export function Processamento() {
  const [historico, setHistorico] = useState<EstoqueRow[]>([])

  const [estoqueAtual, setEstoqueAtual] = useState<EstoqueResumoRow[]>([])

  const [loading, setLoading] = useState(false)

  const [detalhe, setDetalhe] = useState<EstoqueRow | null>(null)

  const [editar, setEditar] = useState<EstoqueRow | null>(null)

  const [search, setSearch] = useState('')

  const [startDate, setStartDate] = useState('')

  const [endDate, setEndDate] = useState('')

  const [lote, setLote] = useState('')

  const [corte, setCorte] = useState('')

  const [tipoCorte, setTipoCorte] = useState<string>('')

  const [novo, setNovo] = useState({
    lote: '',
    corte: '',
    tipo_movimentacao: 1,
    peso_bruto_kg: '',
    peso_liquido_kg: '',
    data_movimentacao: new Date().toISOString().split('T')[0],
    observacoes: '',
  })

  const isBD = tipoCorte === CORTE_BD

  async function carregarDados() {
    try {
      setLoading(true)

      const [movimentacoes, resumo] = await Promise.all([
        estoqueService.getMovimentacoes(
          1,
          100,
          search,
          startDate,
          endDate,
          lote,
          corte
        ),

        estoqueService.getEstoqueAtual(search, lote, corte),
      ])

      setHistorico(movimentacoes.data || [])

      setEstoqueAtual(resumo || [])
    } catch {
      toast.error('Erro ao carregar estoque')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [search, startDate, endDate, lote, corte])

  async function handleCreate() {
    try {
      if (!novo.lote) {
        toast.error('Informe o lote')

        return
      }

      if (!novo.corte) {
        toast.error('Selecione o corte')

        return
      }

      if (!novo.peso_bruto_kg || Number(novo.peso_bruto_kg) <= 0) {
        toast.error('Informe o peso bruto')

        return
      }

      if (!novo.peso_liquido_kg || Number(novo.peso_liquido_kg) <= 0) {
        toast.error('Informe o peso líquido')

        return
      }

      await estoqueService.createMovimentacao({
        lote: novo.lote,
        corte: novo.corte,
        tipo_movimentacao: novo.tipo_movimentacao,
        peso_bruto_kg: Number(novo.peso_bruto_kg),
        peso_liquido_kg: Number(novo.peso_liquido_kg),
        data_movimentacao: novo.data_movimentacao,
        observacoes: novo.observacoes,
      })

      toast.success('Movimentação criada')

      setNovo({
        lote: '',
        corte: '',
        tipo_movimentacao: 1,
        peso_bruto_kg: '',
        peso_liquido_kg: '',
        data_movimentacao: new Date().toISOString().split('T')[0],
        observacoes: '',
      })

      setTipoCorte('')

      carregarDados()
    } catch {
      toast.error('Erro ao criar movimentação')
    }
  }

  async function handleSaveEdit() {
    try {
      if (!editar) {
        return
      }

      if (!editar.lote) {
        toast.error('Informe o lote')

        return
      }

      if (!editar.corte) {
        toast.error('Informe o corte')

        return
      }

      if (!editar.peso_bruto_kg || Number(editar.peso_bruto_kg) <= 0) {
        toast.error('Informe o peso bruto')

        return
      }

      if (!editar.peso_liquido_kg || Number(editar.peso_liquido_kg) <= 0) {
        toast.error('Informe o peso líquido')

        return
      }

      await estoqueService.updateMovimentacao(editar.id, {
        lote: editar.lote,
        corte: editar.corte,
        tipo_movimentacao: editar.tipo_movimentacao,
        peso_bruto_kg: editar.peso_bruto_kg,
        peso_liquido_kg: editar.peso_liquido_kg,
        data_movimentacao: editar.data_movimentacao,
        observacoes: editar.observacoes,
      })

      toast.success('Movimentação atualizada')

      setEditar(null)

      carregarDados()
    } catch {
      toast.error('Erro ao atualizar movimentação')
    }
  }

  async function handleDelete(id: number) {
    try {
      await estoqueService.deleteMovimentacao(id)

      toast.success('Movimentação excluída')

      setDetalhe(null)
      setEditar(null)

      carregarDados()
    } catch {
      toast.error('Erro ao excluir movimentação')
    }
  }

  // const totalBruto = estoqueAtual.reduce(
  //   (acc, item) => acc + Number(item.saldo_bruto_kg || 0),
  //   0
  // )

  const totalLiquido = estoqueAtual.reduce(
    (acc, item) => acc + Number(item.saldo_liquido_kg || 0),
    0
  )

  const formatKg = (value: number) =>
    `${Number(value || 0).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} kg`

  const columns = [
    {
      key: 'data_movimentacao',
      header: 'Data',
    },

    {
      key: 'lote',
      header: 'Lote',
    },

    {
      key: 'corte',
      header: 'Corte',
    },

    {
      key: 'tipo_movimentacao',
      header: 'Tipo',

      render: (r: EstoqueRow) =>
        r.tipo_movimentacao === 1 ? 'Entrada' : 'Saída',
    },

    {
      key: 'peso_bruto_kg',
      header: 'Peso bruto',

      render: (r: EstoqueRow) => `${Number(r.peso_bruto_kg).toFixed(2)} kg`,
    },

    {
      key: 'peso_liquido_kg',
      header: 'Peso líquido',

      render: (r: EstoqueRow) => `${Number(r.peso_liquido_kg).toFixed(2)} kg`,
    },

    {
      key: 'acoes',
      header: 'Ações',

      render: (r: EstoqueRow) => (
        <Button variant="ghost" onClick={() => setDetalhe(r)}>
          Ver detalhes
        </Button>
      ),
    },
  ]

  const detalheItems = (r: EstoqueRow): DetailItem[] => [
    {
      label: 'Lote',
      value: r.lote,
    },

    {
      label: 'Corte',
      value: r.corte,
    },

    {
      label: 'Tipo',
      value: r.tipo_movimentacao === 1 ? 'Entrada' : 'Saída',
    },

    {
      label: 'Peso bruto',
      value: `${Number(r.peso_bruto_kg).toFixed(2)} kg`,
    },

    {
      label: 'Peso líquido',
      value: `${Number(r.peso_liquido_kg).toFixed(2)} kg`,
    },

    {
      label: 'Data',
      value: r.data_movimentacao,
    },

    {
      label: 'Observações',
      value: r.observacoes || '-',
    },
  ]

  return (
    <div className={styles.page}>
      <h1 className="page-title">Processamento / Estoque</h1>

      <Card title="Nova movimentação">
        <div className={styles.form}>
          <Input
            label="Lote"
            value={novo.lote}
            onChange={(e) =>
              setNovo({
                ...novo,
                lote: e.target.value,
              })
            }
          />

          <div className={styles.selectWrap}>
            <label className={styles.label}>Tipo de corte</label>

            <select
              className={styles.select}
              value={novo.corte}
              onChange={(e) => {
                setTipoCorte(e.target.value)

                setNovo({
                  ...novo,
                  corte: e.target.value,
                })
              }}
            >
              <option value="">Selecione...</option>

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
              value={novo.tipo_movimentacao}
              onChange={(e) =>
                setNovo({
                  ...novo,
                  tipo_movimentacao: Number(e.target.value),
                })
              }
            >
              <option value={1}>Entrada</option>

              <option value={0}>Saída</option>
            </select>
          </div>

          <Input
            label="Peso bruto (kg)"
            type="number"
            value={novo.peso_bruto_kg}
            onChange={(e) =>
              setNovo({
                ...novo,
                peso_bruto_kg: e.target.value,
              })
            }
          />

          {isBD && (
            <div className={styles.totalBD}>
              <span>{REGRA_BD}</span>

              <strong>BD é a soma do dianteiro + traseiro</strong>
            </div>
          )}

          <Input
            label="Peso líquido (kg)"
            type="number"
            value={novo.peso_liquido_kg}
            onChange={(e) =>
              setNovo({
                ...novo,
                peso_liquido_kg: e.target.value,
              })
            }
          />

          <Input
            label="Data movimentação"
            type="date"
            value={novo.data_movimentacao}
            onChange={(e) =>
              setNovo({
                ...novo,
                data_movimentacao: e.target.value,
              })
            }
          />

          <Input
            label="Observações"
            value={novo.observacoes}
            onChange={(e) =>
              setNovo({
                ...novo,
                observacoes: e.target.value,
              })
            }
          />

          <div className={styles.actions}>
            <Button
              disabled={
                loading ||
                !novo.lote ||
                !novo.corte ||
                !novo.peso_bruto_kg ||
                !novo.peso_liquido_kg
              }
              onClick={handleCreate}
            >
              Registrar movimentação
            </Button>
          </div>
        </div>
      </Card>

      <Card title="Resumo do estoque">
        {loading ? (
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
                    {/* <div className={styles.resumoMetric}>
                      <span className={styles.resumoLabel}>Peso bruto</span>
                      <strong className={styles.resumoValor}>
                        {formatKg(item.saldo_bruto_kg)}
                      </strong>
                    </div> */}

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
                  ' '
                )}
              >
                <span className={styles.resumoCorte}>Total geral</span>

                <div className={styles.resumoMetrics}>
                  {/* <div className={styles.resumoMetric}>
                    <span className={styles.resumoLabel}>Peso bruto</span>
                    <strong className={styles.resumoValorTotal}>
                      {formatKg(totalBruto)}
                    </strong>
                  </div> */}

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
            value={corte}
            onChange={(e) => setCorte(e.target.value)}
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

      <Card title="Histórico de transações">
        <Table
          columns={columns}
          data={historico}
          keyExtractor={(r) => String(r.id)}
          loading={loading}
          emptyMessage="Nenhuma movimentação encontrada."
        />
      </Card>

      <Modal
        open={!!detalhe}
        onClose={() => setDetalhe(null)}
        title="Detalhes da movimentação"
      >
        {detalhe && (
          <>
            <ModalDetails items={detalheItems(detalhe)} />

            <div className={styles.modalActions}>
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
        title="Editar movimentação"
      >
        {editar && (
          <div className={styles.form}>
            <Input
              label="Lote"
              value={editar.lote}
              onChange={(e) =>
                setEditar({
                  ...editar,
                  lote: e.target.value,
                })
              }
            />

            <div className={styles.selectWrap}>
              <label className={styles.label}>Tipo de corte</label>

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
              label="Peso bruto (kg)"
              type="number"
              value={editar.peso_bruto_kg}
              onChange={(e) =>
                setEditar({
                  ...editar,
                  peso_bruto_kg: Number(e.target.value),
                })
              }
            />

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

            <div className={styles.actions}>
              <Button onClick={handleSaveEdit}>Salvar alterações</Button>

              <Button variant="danger" onClick={() => handleDelete(editar.id)}>
                Excluir
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
