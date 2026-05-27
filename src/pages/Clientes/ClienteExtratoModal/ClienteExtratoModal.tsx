import { useEffect, useMemo, useState } from 'react'
import { Button, Input, Modal } from '@/components/ui'
import toast from 'react-hot-toast'
import styles from './ClienteExtratoModal.module.scss'
import { movimentacoesClientesService } from '@/services/movimentacoesClientes.service'
import { recebimentosClientesService } from '@/services/recebimentosClientes.service'
import { FORMAS_PAGAMENTO } from '../../../constants/formasPagamentos'

interface Composicao {
  id: number
  peso_kg: number
  tipo_corte: string
  movimentacao_item_id: number
}

interface MovimentacaoItem {
  id: number
  tipo_corte: string
  valor_kg: number
  valor_total: number
  peso_total_kg: number
  composicoes: Composicao[]
  movimentacao_cliente_id: number
}

interface Movimentacao {
  id: number
  cliente_id: string
  data_movimentacao: string
  movimentacao_status: string
  valor_total: number
  itens: MovimentacaoItem[]
}

interface Recebimento {
  id: string
  cliente_id: string
  valor: number
  forma_pagamento: string
  observacao?: string
  data_recebimento: string
}

interface Props {
  open: boolean
  onClose: () => void
  cliente: { id: string; nome: string }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(d: string) {
  if (!d) return '-'
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR')
}

function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/**
 * Agrupa as composições de um item banda em { dianteiro, traseiro }.
 * Retorna null se o item não tiver composições.
 */
function getBandaComposicao(item: MovimentacaoItem) {
  if (!item.composicoes?.length) return null
  const dianteiro = item.composicoes
    .filter((c) => c.tipo_corte.toLowerCase().includes('diant'))
    .reduce((acc, c) => acc + Number(c.peso_kg), 0)
  const traseiro = item.composicoes
    .filter((c) => c.tipo_corte.toLowerCase().includes('tras'))
    .reduce((acc, c) => acc + Number(c.peso_kg), 0)
  return { dianteiro, traseiro }
}

// ─── Componente principal ────────────────────────────────────────────────────

export function ClienteExtratoModal({ open, onClose, cliente }: Props) {
  const hoje = new Date()
  const seteDiasAtras = new Date(hoje)
  seteDiasAtras.setDate(hoje.getDate() - 7)

  console.log(cliente)
  const [loading, setLoading] = useState(false)
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([])
  const [recebimentos, setRecebimentos] = useState<Recebimento[]>([])
  const [startDate, setStartDate] = useState(
    seteDiasAtras.toISOString().split('T')[0]
  )
  const [endDate, setEndDate] = useState(hoje.toISOString().split('T')[0])

  // Novo recebimento
  const [showNovoRecebimento, setShowNovoRecebimento] = useState(false)
  const [valorRecebimento, setValorRecebimento] = useState('')
  const [formaPagamento, setFormaPagamento] = useState('Pix')
  const [observacao, setObservacao] = useState('')
  const [dataRecebimento, setDataRecebimento] = useState(
    hoje.toISOString().split('T')[0]
  )

  // Edição inline de recebimento
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editValor, setEditValor] = useState('')
  const [editForma, setEditForma] = useState('')
  const [editObs, setEditObs] = useState('')
  const [editData, setEditData] = useState('')

  useEffect(() => {
    if (open && cliente?.id) carregarDados()
  }, [open, cliente, startDate, endDate])

  // ─── Carregamento ─────────────────────────────────────────────────────────

  async function carregarDados() {
    try {
      setLoading(true)
      const [movs, recs] = await Promise.all([
        movimentacoesClientesService.getAll(1, 100, '', startDate, endDate),
        recebimentosClientesService.getAll(1, 100, '', startDate, endDate),
      ])
      setMovimentacoes(
        (movs.data ?? []).filter(
          (m: Movimentacao) => m.cliente_id === cliente.id
        )
      )
      setRecebimentos(
        (recs.data ?? []).filter(
          (r: Recebimento) => r.cliente_id === cliente.id
        )
      )
    } catch {
      toast.error('Erro ao carregar extrato')
    } finally {
      setLoading(false)
    }
  }

  // ─── Ações ────────────────────────────────────────────────────────────────

  async function handleReceber() {
    if (!valorRecebimento) {
      toast.error('Informe o valor')
      return
    }
    try {
      await recebimentosClientesService.create({
        cliente_id: cliente.id,
        valor: Number(valorRecebimento),
        forma_pagamento: formaPagamento,
        observacao,
        data_recebimento: dataRecebimento,
      })
      toast.success('Recebimento lançado')
      setValorRecebimento('')
      setObservacao('')
      setFormaPagamento('Pix')
      setShowNovoRecebimento(false)
      carregarDados()
    } catch {
      toast.error('Erro ao salvar recebimento')
    }
  }

  function iniciarEdicao(rec: Recebimento) {
    setEditandoId(rec.id)
    setEditValor(String(rec.valor))
    setEditForma(rec.forma_pagamento ?? 'Pix')
    setEditObs(rec.observacao ?? '')
    setEditData(rec.data_recebimento?.split('T')[0] ?? '')
  }

  async function salvarEdicao() {
    if (!editValor) {
      toast.error('Informe o valor')
      return
    }
    try {
      await recebimentosClientesService.update(editandoId, {
        valor: Number(editValor),
        forma_pagamento: editForma,
        observacao: editObs,
        data_recebimento: editData,
      })
      toast.success('Recebimento atualizado')
      setEditandoId(null)
      carregarDados()
    } catch {
      toast.error('Erro ao atualizar recebimento')
    }
  }

  // ─── Derivados ────────────────────────────────────────────────────────────

  const totalVendas = movimentacoes.reduce(
    (acc, m) => acc + Number(m.valor_total ?? 0),
    0
  )
  const totalRecebido = recebimentos.reduce(
    (acc, r) => acc + Number(r.valor ?? 0),
    0
  )
  const saldo = totalVendas - totalRecebido

  /**
   * Resumo de cortes — agora acumula a composição (dianteiro/traseiro)
   * somando os pesos das composicoes de todos os itens banda.
   */
  const resumoCortes = useMemo(() => {
    const acc: Record<
      string,
      {
        quantidade: number
        peso: number
        valor: number
        isBanda: boolean
        composicao: { dianteiro: number; traseiro: number }
      }
    > = {}

    movimentacoes.forEach((mov) => {
      mov.itens?.forEach((item) => {
        const corte = item.tipo_corte || 'Sem corte'
        const isBanda = corte.toLowerCase().includes('banda')

        if (!acc[corte]) {
          acc[corte] = {
            quantidade: 0,
            peso: 0,
            valor: 0,
            isBanda,
            composicao: { dianteiro: 0, traseiro: 0 },
          }
        }

        acc[corte].quantidade += 1
        acc[corte].peso += Number(item.peso_total_kg ?? 0)
        acc[corte].valor += Number(item.valor_total ?? 0)

        // Acumula composição se for banda
        if (isBanda && item.composicoes?.length) {
          item.composicoes.forEach((c) => {
            if (c.tipo_corte.toLowerCase().includes('diant')) {
              acc[corte].composicao.dianteiro += Number(c.peso_kg)
            } else if (c.tipo_corte.toLowerCase().includes('tras')) {
              acc[corte].composicao.traseiro += Number(c.peso_kg)
            }
          })
        }
      })
    })

    return acc
  }, [movimentacoes])

  /** Histórico unificado (vendas + recebimentos) ordenado por data desc */
  const historico = useMemo(() => {
    const vendas = movimentacoes.map((m) => ({
      tipo: 'venda' as const,
      data: m.data_movimentacao,
      valor: Number(m.valor_total),
      id: m.id,
      raw: m,
    }))
    const recs = recebimentos.map((r) => ({
      tipo: 'recebimento' as const,
      data: r.data_recebimento,
      valor: Number(r.valor),
      id: r.id,
      raw: r,
    }))
    return [...vendas, ...recs].sort(
      (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
    )
  }, [movimentacoes, recebimentos])

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Extrato — ${cliente?.nome ?? ''}`}
      width="860px"
    >
      <div className={styles.container}>
        {/* Filtro de período */}
        <div className={styles.filters}>
          <Input
            label="De"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            label="Até"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        {/* Cards de resumo */}
        <div className={styles.resumoGrid}>
          <div className={`${styles.resumoCard} ${styles.cardVendas}`}>
            <span className={styles.cardLabel}>Total em compras</span>
            <strong className={styles.cardValor}>
              {formatCurrency(totalVendas)}
            </strong>
            <span className={styles.cardSub}>
              {movimentacoes.length} venda
              {movimentacoes.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className={`${styles.resumoCard} ${styles.cardRecebido}`}>
            <span className={styles.cardLabel}>Total recebido</span>
            <strong className={styles.cardValor}>
              {formatCurrency(totalRecebido)}
            </strong>
            <span className={styles.cardSub}>
              {recebimentos.length} pagamento
              {recebimentos.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div
            className={`${styles.resumoCard} ${saldo > 0 ? styles.cardDevedor : styles.cardQuitado}`}
          >
            <span className={styles.cardLabel}>Saldo devedor</span>
            <strong className={styles.cardValor}>
              {formatCurrency(saldo)}
            </strong>
            <span className={styles.cardSub}>
              {saldo <= 0 ? '✓ Quitado' : 'Em aberto'}
            </span>
          </div>
        </div>

        {/* Resumo de cortes no período */}
        {Object.keys(resumoCortes).length > 0 && (
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>Cortes no período</h4>
            <div className={styles.cortesGrid}>
              {Object.entries(resumoCortes).map(([corte, dados]) => (
                <div key={corte} className={styles.corteChip}>
                  <div className={styles.corteNome}>
                    <span>{corte}</span>
                    {dados.isBanda && (
                      <>
                        <span className={styles.bandaTag}>
                          ½ diant. + ½ tras.
                        </span>
                        {/* Composição acumulada do período */}
                        {(dados.composicao.dianteiro > 0 ||
                          dados.composicao.traseiro > 0) && (
                          <div className={styles.bandaComposicao}>
                            {dados.composicao.dianteiro > 0 && (
                              <span
                                className={`${styles.composicaoTag} ${styles.dianteiro}`}
                              >
                                Diant. {dados.composicao.dianteiro.toFixed(1)}{' '}
                                kg
                              </span>
                            )}
                            {dados.composicao.traseiro > 0 && (
                              <span
                                className={`${styles.composicaoTag} ${styles.traseiro}`}
                              >
                                Tras. {dados.composicao.traseiro.toFixed(1)} kg
                              </span>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div className={styles.corteNumeros}>
                    <span>
                      <strong>{dados.quantidade}</strong> peça
                      {dados.quantidade !== 1 ? 's' : ''}
                    </span>
                    <span>
                      <strong>{dados.peso.toFixed(2)}</strong> kg
                    </span>
                    <span>
                      <strong>{formatCurrency(dados.valor)}</strong>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Histórico unificado */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h4 className={styles.sectionTitle}>Histórico</h4>
            <button
              className={styles.btnNovo}
              onClick={() => setShowNovoRecebimento((v) => !v)}
            >
              {showNovoRecebimento ? '✕ Cancelar' : '+ Lançar recebimento'}
            </button>
          </div>

          {/* Formulário novo recebimento */}
          {showNovoRecebimento && (
            <div className={styles.novoRecebimento}>
              <div className={styles.recebimentoForm}>
                <Input
                  label="Valor (R$)"
                  type="number"
                  value={valorRecebimento}
                  onChange={(e) => setValorRecebimento(e.target.value)}
                />
                <div className={styles.selectWrap}>
                  <label>Forma de pagamento</label>
                  <select
                    className={styles.select}
                    value={formaPagamento}
                    onChange={(e) => setFormaPagamento(e.target.value)}
                  >
                    {FORMAS_PAGAMENTO.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
                <Input
                  label="Data"
                  type="date"
                  value={dataRecebimento}
                  onChange={(e) => setDataRecebimento(e.target.value)}
                />
                <Input
                  label="Observação"
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                />
              </div>
              <Button onClick={handleReceber}>Salvar recebimento</Button>
            </div>
          )}

          {/* Lista */}
          <div className={styles.historicoLista}>
            {loading && <div className={styles.loadingMsg}>Carregando...</div>}
            {!loading && historico.length === 0 && (
              <div className={styles.empty}>Nenhum registro no período.</div>
            )}

            {historico.map((entry) => (
              <div
                key={`${entry.tipo}-${entry.id}`}
                className={`${styles.historicoItem} ${styles[entry.tipo]}`}
              >
                {entry.tipo === 'venda' ? (
                  // ── Linha de venda ──────────────────────────────────────
                  <div className={styles.vendaRow}>
                    <div className={styles.historicoLeft}>
                      <span className={styles.tipoBadge} data-tipo="venda">
                        Venda
                      </span>
                      <span className={styles.historicoData}>
                        {formatDate(entry.data)}
                      </span>
                    </div>
                    <div className={styles.vendaItensInline}>
                      {(entry.raw as Movimentacao).itens?.map((item, idx) => {
                        const comp = getBandaComposicao(item)
                        return (
                          <span key={idx} className={styles.itemTag}>
                            {item.tipo_corte} · {item.peso_total_kg}kg
                            {/* Composição inline da banda */}
                            {comp && (
                              <span className={styles.itemComposicao}>
                                {comp.dianteiro > 0 && (
                                  <span className={styles.dianteiro}>
                                    D {comp.dianteiro}kg
                                  </span>
                                )}
                                {comp.traseiro > 0 && (
                                  <span className={styles.traseiro}>
                                    T {comp.traseiro}kg
                                  </span>
                                )}
                              </span>
                            )}
                          </span>
                        )
                      })}
                    </div>
                    <strong className={styles.historicoValor}>
                      {formatCurrency(entry.valor)}
                    </strong>
                  </div>
                ) : editandoId === entry.id ? (
                  // ── Edição inline de recebimento ─────────────────────────
                  <div className={styles.editRow}>
                    <div className={styles.editForm}>
                      <Input
                        label="Valor"
                        type="number"
                        value={editValor}
                        onChange={(e) => setEditValor(e.target.value)}
                      />
                      <div className={styles.selectWrap}>
                        <label>Forma</label>
                        <select
                          className={styles.select}
                          value={editForma}
                          onChange={(e) => setEditForma(e.target.value)}
                        >
                          {FORMAS_PAGAMENTO.map((f) => (
                            <option key={f} value={f}>
                              {f}
                            </option>
                          ))}
                        </select>
                      </div>
                      <Input
                        label="Data"
                        type="date"
                        value={editData}
                        onChange={(e) => setEditData(e.target.value)}
                      />
                      <Input
                        label="Obs."
                        value={editObs}
                        onChange={(e) => setEditObs(e.target.value)}
                      />
                    </div>
                    <div className={styles.editActions}>
                      <Button onClick={salvarEdicao}>Salvar</Button>
                      <button
                        className={styles.btnCancelar}
                        onClick={() => setEditandoId(null)}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  // ── Linha de recebimento ─────────────────────────────────
                  <div className={styles.recebimentoRow}>
                    <div className={styles.historicoLeft}>
                      <span
                        className={styles.tipoBadge}
                        data-tipo="recebimento"
                      >
                        Recebido
                      </span>
                      <span className={styles.historicoData}>
                        {formatDate(entry.data)}
                      </span>
                    </div>
                    <span className={styles.formaTag}>
                      {(entry.raw as Recebimento).forma_pagamento}
                    </span>
                    {(entry.raw as Recebimento).observacao && (
                      <span className={styles.obsText}>
                        {(entry.raw as Recebimento).observacao}
                      </span>
                    )}
                    <strong
                      className={styles.historicoValor}
                      data-tipo="recebimento"
                    >
                      − {formatCurrency(entry.valor)}
                    </strong>
                    <button
                      className={styles.btnEditar}
                      onClick={() => iniciarEdicao(entry.raw as Recebimento)}
                    >
                      ✎
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}
