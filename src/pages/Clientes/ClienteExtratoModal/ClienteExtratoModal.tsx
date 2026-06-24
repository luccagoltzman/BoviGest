import { useEffect, useMemo, useState } from 'react'
import { Button, Input, Modal } from '@/components/ui'
import toast from 'react-hot-toast'
import { Download } from 'lucide-react'
import styles from './ClienteExtratoModal.module.scss'
import { movimentacoesClientesService } from '@/services/movimentacoesClientes.service'
import { recebimentosClientesService } from '@/services/recebimentosClientes.service'
import { estoqueService } from '@/services/estoque.service'
import { clientesService } from '@/services/cliente.service'
import { FORMAS_PAGAMENTO } from '../../../constants/formasPagamentos'
import {
  parseCurrencyInput,
  formatCurrencyFromNumber,
} from '@/utils/masks'
import { buildHistoricoDetalhadoRows } from '@/utils/clienteExtratoPdf'
import {
  formatResumoBanda,
  formatResumoCasado,
  formatResumoPecas,
  isCorteBanda,
  isCorteCasado,
  isCortePecaSimples,
  labelCorteExibicao,
  isVisceraCorte,
  pesoTotalComposicao,
} from '@/utils/corteComposicao'

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
  onEditVenda?: (venda: Movimentacao) => void
  onDataChanged?: () => void
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

export function ClienteExtratoModal({
  open,
  onClose,
  cliente,
  onEditVenda,
  onDataChanged,
}: Props) {
  const hoje = new Date()
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)

  const [loading, setLoading] = useState(false)
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([])
  const [recebimentos, setRecebimentos] = useState<Recebimento[]>([])
  const [totalVendasGeral, setTotalVendasGeral] = useState(0)
  const [totalRecebidoGeral, setTotalRecebidoGeral] = useState(0)
  const [startDate, setStartDate] = useState(
    inicioMes.toISOString().split('T')[0],
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
  const [downloadingPdf, setDownloadingPdf] = useState(false)

  const [debitoAnterior, setDebitoAnterior] = useState(0)
  const [debitoValor, setDebitoValor] = useState('')
  const [debitoObs, setDebitoObs] = useState('')
  const [debitoReferencia, setDebitoReferencia] = useState('')
  const [debitoObsPersistido, setDebitoObsPersistido] = useState('')
  const [debitoReferenciaPersistida, setDebitoReferenciaPersistida] = useState('')
  const [salvandoDebito, setSalvandoDebito] = useState(false)
  const [editandoDebito, setEditandoDebito] = useState(false)

  useEffect(() => {
    if (open && cliente?.id) carregarDados()
  }, [open, cliente, startDate, endDate])

  // ─── Carregamento ─────────────────────────────────────────────────────────

  async function carregarDados() {
    try {
      setLoading(true)
      const [
        movsPeriodo,
        recsPeriodo,
        movsGeral,
        recsGeral,
        clienteDetalhe,
      ] = await Promise.all([
        movimentacoesClientesService.getByCliente(
          cliente.id,
          startDate,
          endDate,
        ),
        recebimentosClientesService.getByCliente(
          cliente.id,
          startDate,
          endDate,
        ),
        movimentacoesClientesService.getByCliente(cliente.id),
        recebimentosClientesService.getByCliente(cliente.id),
        clientesService.getById(cliente.id),
      ])

      setMovimentacoes(movsPeriodo as Movimentacao[])
      setRecebimentos(recsPeriodo as Recebimento[])
      setTotalVendasGeral(
        (movsGeral ?? []).reduce(
          (acc: number, m: Movimentacao) => acc + Number(m.valor_total ?? 0),
          0,
        ),
      )
      setTotalRecebidoGeral(
        (recsGeral ?? []).reduce(
          (acc: number, r: Recebimento) => acc + Number(r.valor ?? 0),
          0,
        ),
      )

      const debito = Number(clienteDetalhe?.debito_anterior ?? 0)
      setDebitoAnterior(debito)
      setDebitoValor(debito > 0 ? formatCurrencyFromNumber(debito) : '')
      setDebitoObs(clienteDetalhe?.debito_anterior_observacao ?? '')
      setDebitoObsPersistido(clienteDetalhe?.debito_anterior_observacao ?? '')
      const referencia =
        clienteDetalhe?.debito_anterior_referencia?.slice(0, 10) ?? ''
      setDebitoReferencia(referencia)
      setDebitoReferenciaPersistida(referencia)
    } catch {
      toast.error('Erro ao carregar extrato')
    } finally {
      setLoading(false)
    }
  }

  async function salvarDebitoAnterior() {
    const valor = parseCurrencyInput(debitoValor)
    if (!debitoValor.trim()) {
      toast.error('Informe o valor do débito anterior')
      return
    }

    try {
      setSalvandoDebito(true)
      await clientesService.update(cliente.id, {
        debito_anterior: valor,
        debito_anterior_observacao: debitoObs.trim() || null,
        debito_anterior_referencia: debitoReferencia || null,
      })
      setDebitoAnterior(valor)
      setDebitoObsPersistido(debitoObs.trim())
      setDebitoReferenciaPersistida(debitoReferencia)
      setEditandoDebito(false)
      toast.success('Débito anterior salvo')
    } catch {
      toast.error('Erro ao salvar débito anterior')
    } finally {
      setSalvandoDebito(false)
    }
  }

  async function removerDebitoAnterior() {
    try {
      setSalvandoDebito(true)
      await clientesService.update(cliente.id, {
        debito_anterior: 0,
        debito_anterior_observacao: null,
        debito_anterior_referencia: null,
      })
      setDebitoAnterior(0)
      setDebitoValor('')
      setDebitoObs('')
      setDebitoReferencia('')
      setDebitoObsPersistido('')
      setDebitoReferenciaPersistida('')
      setEditandoDebito(false)
      toast.success('Débito anterior removido')
    } catch {
      toast.error('Erro ao remover débito anterior')
    } finally {
      setSalvandoDebito(false)
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
        valor: parseCurrencyInput(valorRecebimento),
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
    setEditValor(formatCurrencyFromNumber(rec.valor))
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
        valor: parseCurrencyInput(editValor),
        forma_pagamento: editForma,
        observacao: editObs,
        data_recebimento: editData,
      })
      toast.success('Recebimento atualizado')
      setEditandoId(null)
      carregarDados()
      onDataChanged?.()
    } catch {
      toast.error('Erro ao atualizar recebimento')
    }
  }

  async function excluirRecebimento(rec: Recebimento) {
    if (!confirm('Excluir este recebimento?')) return

    try {
      await recebimentosClientesService.delete(rec.id)
      toast.success('Recebimento excluído')
      if (editandoId === rec.id) setEditandoId(null)
      await carregarDados()
      onDataChanged?.()
    } catch {
      toast.error('Erro ao excluir recebimento')
    }
  }

  async function excluirVenda(id: number) {
    if (!confirm('Excluir esta venda?')) return

    try {
      await movimentacoesClientesService.delete(id)
      await estoqueService.deleteByReferencia(id)
      toast.success('Venda excluída')
      await carregarDados()
      onDataChanged?.()
    } catch {
      toast.error('Erro ao excluir venda')
    }
  }

  // ─── Derivados ────────────────────────────────────────────────────────────

  const totalVendasPeriodo = movimentacoes.reduce(
    (acc, m) => acc + Number(m.valor_total ?? 0),
    0,
  )
  const totalComprasPeriodo = totalVendasPeriodo
  const totalRecebidoPeriodo = recebimentos.reduce(
    (acc, r) => acc + Number(r.valor ?? 0),
    0,
  )
  const totalComprasGeral = debitoAnterior + totalVendasGeral
  const saldo = totalComprasGeral - totalRecebidoGeral

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
        isCasado: boolean
        isViscera: boolean
        composicao: { dianteiro: number; traseiro: number }
      }
    > = {}

    movimentacoes.forEach((mov) => {
      mov.itens?.forEach((item) => {
        const corte = labelCorteExibicao(item.tipo_corte || 'Sem corte')
        const isBandaCorte = isCorteBanda(item.tipo_corte || '')
        const isCasado = isCorteCasado(item.tipo_corte || '')
        const isVisceraItem = isVisceraCorte(item.tipo_corte || '')

        if (!acc[corte]) {
          acc[corte] = {
            quantidade: 0,
            peso: 0,
            valor: 0,
            isBanda: isBandaCorte,
            isCasado: isCasado && !isVisceraItem,
            isViscera: isVisceraItem,
            composicao: { dianteiro: 0, traseiro: 0 },
          }
        }

        if (isVisceraItem) {
          acc[corte].quantidade += Number(item.peso_total_kg ?? 0)
        } else if (isCasado || isBandaCorte) {
          const numbered = (item.composicoes || []).some((c) =>
            /\d/.test(c.tipo_corte),
          )
          if (isBandaCorte && !numbered && item.composicoes?.length) {
            acc[corte].quantidade += 1
          } else {
            acc[corte].quantidade += Number(item.peso_total_kg ?? 0)
          }
          acc[corte].peso += pesoTotalComposicao(item.composicoes || [])
        } else if (isCortePecaSimples(item.tipo_corte || '') && item.composicoes?.length) {
          acc[corte].quantidade += Number(item.peso_total_kg ?? 0) || item.composicoes.length
          acc[corte].peso += pesoTotalComposicao(item.composicoes || [])
        } else {
          acc[corte].quantidade += 1
          acc[corte].peso += Number(item.peso_total_kg ?? 0)
        }
        acc[corte].valor += Number(item.valor_total ?? 0)

        if ((isBandaCorte || isCasado) && item.composicoes?.length) {
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

    const debito =
      debitoAnterior > 0
        ? [
            {
              tipo: 'debito_anterior' as const,
              data: debitoReferencia || '1970-01-01',
              valor: debitoAnterior,
              id: 'debito-anterior',
              raw: {
                observacao: debitoObs,
                referencia: debitoReferencia,
              },
            },
          ]
        : []

    return [...vendas, ...recs, ...debito].sort(
      (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
    )
  }, [movimentacoes, recebimentos, debitoAnterior, debitoObs, debitoReferencia])

  const extratoDetalhado = useMemo(
    () =>
      buildHistoricoDetalhadoRows(
        movimentacoes,
        recebimentos,
        debitoAnterior,
        debitoObsPersistido,
        debitoReferenciaPersistida,
      ),
    [
      movimentacoes,
      recebimentos,
      debitoAnterior,
      debitoObsPersistido,
      debitoReferenciaPersistida,
    ],
  )

  async function handleDownloadPdf() {
    try {
      setDownloadingPdf(true)
      const { gerarExtratoClientePdf } = await import('@/utils/clienteExtratoPdf')
      await gerarExtratoClientePdf({
        clienteNome: cliente.nome,
        startDate,
        endDate,
        debitoAnterior,
        debitoAnteriorObservacao: debitoObs,
        debitoAnteriorReferencia: debitoReferencia,
        totalVendasPeriodo,
        totalCompras: totalComprasPeriodo + debitoAnterior,
        totalRecebido: totalRecebidoPeriodo,
        saldo,
        movimentacoes,
        recebimentos,
        resumoCortes,
      })
      toast.success('PDF baixado com sucesso')
    } catch {
      toast.error('Erro ao gerar PDF')
    } finally {
      setDownloadingPdf(false)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Extrato — ${cliente?.nome ?? ''}`}
      width="1020px"
    >
      <div className={styles.container}>
        {/* Filtro de período */}
        <div className={styles.filtersRow}>
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
          <Button
            variant="outline"
            loading={downloadingPdf}
            disabled={loading || downloadingPdf}
            onClick={handleDownloadPdf}
            className={styles.btnPdf}
          >
            <Download size={16} aria-hidden />
            Baixar PDF
          </Button>
        </div>

        {/* Débito anterior (fora do sistema) */}
        <div className={styles.debitoSection}>
          <div className={styles.sectionHeader}>
            <div>
              <h4 className={styles.sectionTitle}>Débito anterior</h4>
              <p className={styles.debitoHint}>
                Saldo de vendas anteriores ao uso do sistema (ex.: mês passado).
              </p>
            </div>
            {!editandoDebito && (
              <button
                type="button"
                className={styles.btnNovo}
                onClick={() => setEditandoDebito(true)}
              >
                {debitoAnterior > 0 ? '✎ Editar' : '+ Informar débito'}
              </button>
            )}
          </div>

          {editandoDebito ? (
            <div className={styles.debitoForm}>
              <Input
                label="Valor do débito (R$)"
                mask="currency"
                value={debitoValor}
                onChange={(e) => setDebitoValor(e.target.value)}
              />
              <Input
                label="Referência (data)"
                type="date"
                value={debitoReferencia}
                onChange={(e) => setDebitoReferencia(e.target.value)}
              />
              <Input
                label="Observação"
                placeholder="Ex.: Vendas até jan/2025 fora do sistema"
                value={debitoObs}
                onChange={(e) => setDebitoObs(e.target.value)}
              />
              <div className={styles.debitoFormActions}>
                <Button loading={salvandoDebito} onClick={salvarDebitoAnterior}>
                  Salvar
                </Button>
                {debitoAnterior > 0 && (
                  <Button
                    variant="outline"
                    loading={salvandoDebito}
                    onClick={removerDebitoAnterior}
                  >
                    Remover
                  </Button>
                )}
                <button
                  type="button"
                  className={styles.btnCancelar}
                  onClick={() => {
                    setEditandoDebito(false)
                    setDebitoValor(
                      debitoAnterior > 0
                        ? formatCurrencyFromNumber(debitoAnterior)
                        : '',
                    )
                    setDebitoObs(debitoObsPersistido)
                    setDebitoReferencia(debitoReferenciaPersistida)
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : debitoAnterior > 0 ? (
            <div className={styles.debitoResumo}>
              <strong>{formatCurrency(debitoAnterior)}</strong>
              {debitoReferencia && (
                <span> · ref. {formatDate(debitoReferencia)}</span>
              )}
              {debitoObs && (
                <p className={styles.debitoObsText}>{debitoObs}</p>
              )}
            </div>
          ) : (
            <p className={styles.debitoEmpty}>
              Nenhum débito anterior informado.
            </p>
          )}
        </div>

        {/* Cards de resumo */}
        <div className={styles.resumoGrid}>
          {debitoAnterior > 0 && (
            <div className={`${styles.resumoCard} ${styles.cardDebitoAnterior}`}>
              <span className={styles.cardLabel}>Débito anterior</span>
              <strong className={styles.cardValor}>
                {formatCurrency(debitoAnterior)}
              </strong>
              <span className={styles.cardSub}>Fora do período filtrado</span>
            </div>
          )}
          <div className={`${styles.resumoCard} ${styles.cardVendas}`}>
            <span className={styles.cardLabel}>Compras no período</span>
            <strong className={styles.cardValor}>
              {formatCurrency(totalVendasPeriodo)}
            </strong>
            <span className={styles.cardSub}>
              {movimentacoes.length} venda
              {movimentacoes.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className={`${styles.resumoCard} ${styles.cardRecebido}`}>
            <span className={styles.cardLabel}>Recebido no período</span>
            <strong className={styles.cardValor}>
              {formatCurrency(totalRecebidoPeriodo)}
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
              {debitoAnterior > 0 && (
                <> · inclui débito anterior de {formatCurrency(debitoAnterior)}</>
              )}
            </span>
          </div>
        </div>

        {/* Extrato detalhado — uma linha por peça / recebimento */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Extrato detalhado</h4>
          <p className={styles.extratoHint}>
            Compras discriminadas por peça no período. O saldo devedor acima
            considera débito anterior + todas as compras − todos os recebimentos.
          </p>
          <div className={styles.extratoTableWrap}>
            <table className={styles.extratoTable}>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Tipo</th>
                  <th>Corte / detalhe</th>
                  <th>Peso / Un.</th>
                  <th>Valor unit.</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={6} className={styles.tableEmpty}>
                      Carregando...
                    </td>
                  </tr>
                )}
                {!loading && extratoDetalhado.length === 0 && (
                  <tr>
                    <td colSpan={6} className={styles.tableEmpty}>
                      Nenhum registro no período.
                    </td>
                  </tr>
                )}
                {!loading &&
                  extratoDetalhado.map((row, index) => (
                    <tr
                      key={`${row.tipo}-${row.sortTs}-${index}`}
                      data-tipo={row.tipo
                        .toLowerCase()
                        .replace(/\s+/g, '_')}
                    >
                      <td>{row.data}</td>
                      <td>{row.tipo}</td>
                      <td className={styles.corteCell}>{row.corte}</td>
                      <td>{row.peso}</td>
                      <td>{row.valorUnitario}</td>
                      <td className={styles.valorCell}>{row.valor}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
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
                    {dados.isCasado && (
                      <>
                        <span className={styles.bandaTag}>2 diant. + 2 tras. / casado</span>
                        {(dados.composicao.dianteiro > 0 ||
                          dados.composicao.traseiro > 0) && (
                          <div className={styles.bandaComposicao}>
                            {dados.composicao.dianteiro > 0 && (
                              <span
                                className={`${styles.composicaoTag} ${styles.dianteiro}`}
                              >
                                Diant. {dados.composicao.dianteiro.toFixed(1)} kg
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
                    {dados.isViscera ? (
                      <>
                        <span>
                          <strong>{dados.quantidade}</strong> un.
                        </span>
                        <span>
                          <strong>{formatCurrency(dados.valor)}</strong>
                        </span>
                      </>
                    ) : dados.isCasado ? (
                      <>
                        <span>
                          <strong>{dados.quantidade}</strong> un.
                        </span>
                        <span>
                          <strong>{formatCurrency(dados.valor)}</strong>
                        </span>
                      </>
                    ) : dados.isBanda ? (
                      <>
                        <span>
                          <strong>{dados.quantidade}</strong> banda
                          {dados.quantidade !== 1 ? 's' : ''}
                        </span>
                        <span>
                          <strong>{dados.peso.toFixed(2)}</strong> kg
                        </span>
                        <span>
                          <strong>{formatCurrency(dados.valor)}</strong>
                        </span>
                      </>
                    ) : (
                      <>
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
                      </>
                    )}
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
                  mask="currency"
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
                        const casado = isCorteCasado(item.tipo_corte)
                        const banda = isCorteBanda(item.tipo_corte)
                        const pecaSimples = isCortePecaSimples(item.tipo_corte)
                        const visceras = isVisceraCorte(item.tipo_corte)
                        const qtyPecas =
                          Number(item.peso_total_kg || 0) ||
                          (item.composicoes?.length ?? 0)
                        return (
                          <span key={idx} className={styles.itemTag}>
                            {casado
                              ? `${labelCorteExibicao(item.tipo_corte)}: ${formatResumoCasado(
                                  Number(item.peso_total_kg || 0),
                                  item.composicoes,
                                )}`
                              : banda
                                ? formatResumoBanda(
                                    Number(item.peso_total_kg || 0) ||
                                      (item.composicoes?.length ? 1 : 0),
                                    item.composicoes,
                                  )
                                : pecaSimples && item.composicoes?.length
                                  ? formatResumoPecas(
                                      qtyPecas,
                                      item.tipo_corte,
                                      item.composicoes,
                                    )
                              : `${labelCorteExibicao(item.tipo_corte)} · ${item.peso_total_kg}${visceras ? ' un' : ' kg'}`}
                            {comp && !casado && !banda && (
                              <span className={styles.itemComposicao}>
                                {comp.dianteiro > 0 && (
                                  <span className={styles.dianteiro}>
                                    D {comp.dianteiro} kg
                                  </span>
                                )}
                                {comp.traseiro > 0 && (
                                  <span className={styles.traseiro}>
                                    T {comp.traseiro} kg
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
                    <div className={styles.historicoAcoes}>
                      {onEditVenda && (
                        <button
                          type="button"
                          className={styles.btnEditar}
                          title="Editar venda"
                          onClick={() =>
                            onEditVenda(entry.raw as Movimentacao)
                          }
                        >
                          ✎
                        </button>
                      )}
                      <button
                        type="button"
                        className={styles.btnExcluir}
                        title="Excluir venda"
                        onClick={() => excluirVenda(entry.id as number)}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ) : entry.tipo === 'debito_anterior' ? (
                  <div className={styles.debitoHistoricoRow}>
                    <div className={styles.historicoLeft}>
                      <span
                        className={styles.tipoBadge}
                        data-tipo="debito_anterior"
                      >
                        Débito anterior
                      </span>
                      <span className={styles.historicoData}>
                        {debitoReferencia
                          ? formatDate(debitoReferencia)
                          : 'Fora do sistema'}
                      </span>
                    </div>
                    {(entry.raw as { observacao?: string }).observacao && (
                      <span className={styles.obsText}>
                        {(entry.raw as { observacao?: string }).observacao}
                      </span>
                    )}
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
                        mask="currency"
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
                    <div className={styles.historicoAcoes}>
                      <button
                        type="button"
                        className={styles.btnEditar}
                        title="Editar recebimento"
                        onClick={() => iniciarEdicao(entry.raw as Recebimento)}
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        className={styles.btnExcluir}
                        title="Excluir recebimento"
                        onClick={() =>
                          excluirRecebimento(entry.raw as Recebimento)
                        }
                      >
                        ✕
                      </button>
                    </div>
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
