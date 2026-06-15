import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Wallet, FileText } from 'lucide-react'
import { Button, Input, Modal, Select, Autocomplete } from '@/components/ui'
import { FORMAS_PAGAMENTO } from '@/constants/formasPagamentos'
import { opcoesTipoGado } from '@/constants/tiposGado'
import { comprasService } from '@/services/compras.service'
import {
  pagamentosComprasService,
  type CompraParcela,
} from '@/services/pagamentosCompras.service'
import {
  criarParcelasDraft,
  somaValoresParcelas,
  calcularRestanteAposParcelas,
  valorProximaParcelaSugerida,
  redistribuirParcelasAposIndex,
  formatCurrency,
  type ParcelaDraft,
} from '@/utils/compraParcelas'
import {
  parseCurrencyInput,
  parseDecimalInput,
  parseIntegerInput,
  formatCurrencyFromNumber,
  formatIntegerInput,
  formatDecimalInput,
} from '@/utils/masks'
import styles from './CompraDetalheModal.module.scss'

export type CompraDetalheRow = {
  id: number
  fornecedor_id: string
  fornecedor?: { id: string; nome: string }
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
  forma_pagamento?: string | null
  detalhes_custo?: { total: number }
}

type ModalTab = 'pagamento' | 'dados'

type ParcelaDraftEdicao = {
  valor: string
  dataPagamento: string
  vencimento: string
  formaPagamento: string
}

type EditarCampos = {
  quantidade_animais: string
  peso_total: string
  valor_kg: string
  valor_imposto: string
  gta_valor: string
}

function rowToEditarCampos(row: CompraDetalheRow): EditarCampos {
  return {
    quantidade_animais: formatIntegerInput(String(row.quantidade_animais)),
    peso_total: formatDecimalInput(String(row.peso_total).replace('.', ',')),
    valor_kg: formatCurrencyFromNumber(row.valor_kg),
    valor_imposto:
      row.tipo_imposto === 'percentual'
        ? formatDecimalInput(String(row.valor_imposto).replace('.', ','))
        : formatCurrencyFromNumber(row.valor_imposto),
    gta_valor: formatCurrencyFromNumber(row.gta_valor),
  }
}

function dadosParaCalculo(
  editar: CompraDetalheRow,
  campos: EditarCampos,
): CompraDetalheRow {
  return {
    ...editar,
    quantidade_animais: parseIntegerInput(campos.quantidade_animais),
    peso_total: parseDecimalInput(campos.peso_total),
    valor_kg: parseCurrencyInput(campos.valor_kg),
    valor_imposto:
      editar.tipo_imposto === 'percentual'
        ? parseDecimalInput(campos.valor_imposto)
        : parseCurrencyInput(campos.valor_imposto),
    gta_valor: parseCurrencyInput(campos.gta_valor),
  }
}

type Props = {
  compra: CompraDetalheRow | null
  initialTab?: ModalTab
  fornecedores: { id: string; nome: string }[]
  onClose: () => void
  onUpdated: () => void
}

function formatDateBr(value: string) {
  if (!value) return '—'
  const date = new Date(`${value.slice(0, 10)}T12:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('pt-BR')
}

function calcularSubtotal(data: CompraDetalheRow) {
  return Number(data.peso_total || 0) * Number(data.valor_kg || 0)
}

function calcularImposto(data: CompraDetalheRow) {
  const subtotal = calcularSubtotal(data)

  if (data.tipo_imposto === 'percentual') {
    return subtotal * (Number(data.valor_imposto || 0) / 100)
  }

  return Number(data.valor_imposto || 0)
}

function calcularTotal(data: CompraDetalheRow) {
  return (
    calcularSubtotal(data) +
    calcularImposto(data) +
    Number(data.gta_valor || 0)
  )
}

function statusParcelaLabel(parcela: CompraParcela) {
  if (parcela.status === 'pago') return 'Pago'

  const hoje = new Date()
  hoje.setHours(12, 0, 0, 0)
  const vencimento = new Date(`${parcela.data_vencimento.slice(0, 10)}T12:00:00`)

  if (vencimento < hoje) return 'Atrasado'

  return 'Pendente'
}

export function CompraDetalheModal({
  compra,
  initialTab = 'pagamento',
  fornecedores,
  onClose,
  onUpdated,
}: Props) {
  const [tab, setTab] = useState<ModalTab>(initialTab)
  const [editar, setEditar] = useState<CompraDetalheRow | null>(null)
  const [editarCampos, setEditarCampos] = useState<EditarCampos>({
    quantidade_animais: '',
    peso_total: '',
    valor_kg: '',
    valor_imposto: '',
    gta_valor: '',
  })
  const [parcelas, setParcelas] = useState<CompraParcela[]>([])
  const [loadingParcelas, setLoadingParcelas] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [parcelasDraft, setParcelasDraft] = useState<
    Record<number, ParcelaDraftEdicao>
  >({})

  const [setupPagamento, setSetupPagamento] = useState({
    qtdParcelas: '1',
    formaPagamento: 'Pix',
    parcelas: [] as ParcelaDraft[],
  })

  useEffect(() => {
    if (compra) {
      setEditar(compra)
      setEditarCampos(rowToEditarCampos(compra))
      setTab(initialTab)
    }
  }, [compra, initialTab])

  useEffect(() => {
    if (!compra) return

    const compraId = compra.id
    const formaPadrao = compra.forma_pagamento || 'Pix'

    async function carregar() {
      setLoadingParcelas(true)

      try {
        const lista = await pagamentosComprasService.getByCompraId(compraId)
        setParcelas(lista)

        const hoje = new Date().toISOString().slice(0, 10)
        setParcelasDraft(
          Object.fromEntries(
            lista.map((p) => [
              p.id,
              {
                valor: formatCurrencyFromNumber(Number(p.valor)),
                dataPagamento: hoje,
                vencimento: p.data_vencimento?.slice(0, 10) || hoje,
                formaPagamento: p.forma_pagamento || formaPadrao,
              },
            ]),
          ),
        )
      } catch {
        setParcelas([])
        toast.error('Erro ao carregar parcelas')
      } finally {
        setLoadingParcelas(false)
      }
    }

    carregar()
  }, [compra])

  const valorTotalCompra = editar
    ? editar.detalhes_custo?.total ??
      calcularTotal(dadosParaCalculo(editar, editarCampos))
    : 0

  const resumo = useMemo(() => {
    const pagas = parcelas.filter((p) => p.status === 'pago')
    const pendentes = parcelas.filter((p) => p.status !== 'pago')

    return {
      valorPago: pagas.reduce((acc, p) => acc + Number(p.valor || 0), 0),
      valorPendente: pendentes.reduce(
        (acc, p) => acc + Number(p.valor || 0),
        0,
      ),
      qtdPagas: pagas.length,
      qtdPendentes: pendentes.length,
    }
  }, [parcelas])

  const somaSetup = somaValoresParcelas(setupPagamento.parcelas)
  const setupConferem =
    Math.abs(somaSetup - valorTotalCompra) < 0.02 &&
    setupPagamento.parcelas.length > 0

  useEffect(() => {
    if (!editar || parcelas.length > 0) return

    const qtd = parseIntegerInput(setupPagamento.qtdParcelas)
    const dataBase = editar.data || new Date().toISOString().slice(0, 10)

    if (
      setupPagamento.parcelas.length === 0 &&
      qtd >= 1 &&
      valorTotalCompra > 0
    ) {
      setSetupPagamento((prev) => ({
        ...prev,
        parcelas: criarParcelasDraft(qtd, valorTotalCompra, dataBase),
      }))
    }
  }, [editar, parcelas.length, valorTotalCompra, setupPagamento.qtdParcelas, setupPagamento.parcelas.length])

  async function recarregarParcelas() {
    if (!compra) return

    const lista = await pagamentosComprasService.getByCompraId(compra.id)
    setParcelas(lista)
    onUpdated()
  }

  async function registrarPagamento(parcela: CompraParcela) {
    const draft = parcelasDraft[parcela.id]
    if (!draft) return

    try {
      setSalvando(true)

      await pagamentosComprasService.atualizarPendente(parcela.id, {
        valor: parseCurrencyInput(draft.valor),
        data_vencimento: draft.vencimento,
        forma_pagamento: draft.formaPagamento,
      })

      await pagamentosComprasService.marcarComoPago(parcela.id, {
        data_pagamento: draft.dataPagamento,
        valor: parseCurrencyInput(draft.valor),
        forma_pagamento: draft.formaPagamento,
      })

      toast.success(
        `Pagamento registrado: ${formatCurrency(parseCurrencyInput(draft.valor))} em ${formatDateBr(draft.dataPagamento)}`,
      )
      await recarregarParcelas()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao registrar pagamento'
      toast.error(msg)
    } finally {
      setSalvando(false)
    }
  }

  async function salvarParcelaPendente(parcela: CompraParcela) {
    const draft = parcelasDraft[parcela.id]
    if (!draft) return

    try {
      setSalvando(true)

      await pagamentosComprasService.atualizarPendente(parcela.id, {
        valor: parseCurrencyInput(draft.valor),
        data_vencimento: draft.vencimento,
        forma_pagamento: draft.formaPagamento,
      })

      toast.success('Parcela atualizada')
      await recarregarParcelas()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao salvar parcela'
      toast.error(msg)
    } finally {
      setSalvando(false)
    }
  }

  async function configurarParcelasIniciais() {
    if (!compra || !setupConferem) return

    try {
      setSalvando(true)

      await pagamentosComprasService.configurarParcelas(compra.id, {
        parcelas: setupPagamento.parcelas,
        formaPagamento: setupPagamento.formaPagamento,
      })

      await comprasService.update(compra.id, {
        qtd_parcelas: setupPagamento.parcelas.length,
        forma_pagamento: setupPagamento.formaPagamento,
        pagamento_quitado: setupPagamento.parcelas.every((p) => p.pago),
      })

      toast.success('Parcelas configuradas')
      await recarregarParcelas()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao configurar parcelas'
      toast.error(msg)
    } finally {
      setSalvando(false)
    }
  }

  async function salvarDadosCompra() {
    if (!editar) return

    try {
      setSalvando(true)
      const dados = dadosParaCalculo(editar, editarCampos)
      const subtotal = calcularSubtotal(dados)
      const valorTotal = calcularTotal(dados)

      await comprasService.update(editar.id, {
        fornecedor_id: editar.fornecedor_id,
        data: editar.data,
        quantidade_animais: dados.quantidade_animais,
        condicao_gado: editar.condicao_gado,
        peso_total: dados.peso_total,
        valor_kg: dados.valor_kg,
        tipo_imposto: editar.tipo_imposto,
        valor_imposto: dados.valor_imposto,
        gta_valor: dados.gta_valor,
        subtotal,
        valor_total: valorTotal,
        tipo_gado: editar.tipo_gado,
        observacoes: editar.observacoes,
        status: editar.status,
      })

      toast.success('Compra atualizada')
      onUpdated()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao salvar compra'
      toast.error(msg)
    } finally {
      setSalvando(false)
    }
  }

  async function excluirCompra() {
    if (!editar) return

    try {
      await comprasService.delete(editar.id)
      toast.success('Compra excluída')
      onUpdated()
      onClose()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao excluir compra'
      toast.error(msg)
    }
  }

  function atualizarDraft(
    parcelaId: number,
    campo: keyof ParcelaDraftEdicao,
    valor: string,
  ) {
    setParcelasDraft((prev) => ({
      ...prev,
      [parcelaId]: { ...prev[parcelaId], [campo]: valor },
    }))
  }

  function atualizarSetupParcela(
    index: number,
    campo: keyof ParcelaDraft,
    valor: string | boolean,
  ) {
    setSetupPagamento((prev) => {
      let parcelasLista = [...prev.parcelas]
      parcelasLista[index] = { ...parcelasLista[index], [campo]: valor }

      if (campo === 'valor' && typeof valor === 'string') {
        parcelasLista = redistribuirParcelasAposIndex(
          parcelasLista,
          index,
          valorTotalCompra,
        )
      }

      return { ...prev, parcelas: parcelasLista }
    })
  }

  function atualizarQtdSetup(qtdRaw: string) {
    const qtdParcelas = qtdRaw.replace(/\D/g, '')
    const qtd = parseIntegerInput(qtdParcelas)
    const dataBase = editar?.data || new Date().toISOString().slice(0, 10)

    setSetupPagamento((prev) => ({
      ...prev,
      qtdParcelas,
      parcelas:
        qtd > 0
          ? criarParcelasDraft(qtd, valorTotalCompra, dataBase, prev.parcelas)
          : prev.parcelas,
    }))
  }

  if (!compra || !editar) return null

  const fornecedorNome =
    editar.fornecedor?.nome ||
    fornecedores.find((f) => f.id === editar.fornecedor_id)?.nome ||
    'Fornecedor'

  return (
    <Modal
      open={!!compra}
      onClose={onClose}
      title={`Compra — ${fornecedorNome}`}
      width="920px"
    >
      <nav className={styles.tabs} aria-label="Seções da compra">
        <button
          type="button"
          className={[styles.tab, tab === 'pagamento' && styles.tabActive]
            .filter(Boolean)
            .join(' ')}
          onClick={() => setTab('pagamento')}
        >
          <Wallet size={16} aria-hidden />
          Pagamento
          {resumo.qtdPendentes > 0 && (
            <span className={styles.tabBadge}>{resumo.qtdPendentes}</span>
          )}
        </button>
        <button
          type="button"
          className={[styles.tab, tab === 'dados' && styles.tabActive]
            .filter(Boolean)
            .join(' ')}
          onClick={() => setTab('dados')}
        >
          <FileText size={16} aria-hidden />
          Dados da compra
        </button>
      </nav>

      {tab === 'pagamento' && (
        <div className={styles.pagamentoPainel}>
          <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <span className={styles.kpiLabel}>Total da compra</span>
              <strong>{formatCurrency(valorTotalCompra)}</strong>
            </div>
            <div className={[styles.kpiCard, styles.kpiPago].join(' ')}>
              <span className={styles.kpiLabel}>Já pago</span>
              <strong>{formatCurrency(resumo.valorPago)}</strong>
              <small>{resumo.qtdPagas} parcela(s)</small>
            </div>
            <div className={[styles.kpiCard, styles.kpiPendente].join(' ')}>
              <span className={styles.kpiLabel}>A pagar</span>
              <strong>{formatCurrency(resumo.valorPendente)}</strong>
              <small>{resumo.qtdPendentes} parcela(s)</small>
            </div>
          </div>

          {loadingParcelas ? (
            <p className={styles.loadingText}>Carregando parcelas...</p>
          ) : parcelas.length === 0 ? (
            <div className={styles.setupBox}>
              <h3 className={styles.setupTitle}>Configurar pagamento</h3>
              <p className={styles.setupHint}>
                Esta compra ainda não tem parcelas. Defina valores e datas aqui
                mesmo — sem precisar ir ao Financeiro.
              </p>

              <div className={styles.setupFields}>
                <Input
                  label="Quantidade de parcelas"
                  mask="integer"
                  value={setupPagamento.qtdParcelas}
                  onChange={(e) => atualizarQtdSetup(e.target.value)}
                />
                <Select
                  label="Forma de pagamento"
                  options={[...FORMAS_PAGAMENTO]}
                  value={setupPagamento.formaPagamento}
                  onChange={(e) =>
                    setSetupPagamento({
                      ...setupPagamento,
                      formaPagamento: e.target.value,
                    })
                  }
                />
              </div>

              <div className={styles.parcelasLista}>
                {setupPagamento.parcelas.map((parcela, index) => (
                  <article key={index} className={styles.parcelaCard}>
                    <header className={styles.parcelaCardHead}>
                      <strong>
                        Parcela {index + 1}/{setupPagamento.parcelas.length}
                      </strong>
                    </header>
                    <div className={styles.parcelaCardGrid}>
                      <div className={styles.parcelaValorCell}>
                        <Input
                          label="Valor (R$)"
                          mask="currency"
                          value={parcela.valor}
                          onChange={(e) =>
                            atualizarSetupParcela(index, 'valor', e.target.value)
                          }
                        />
                        {index < setupPagamento.parcelas.length - 1 &&
                          parseCurrencyInput(parcela.valor) > 0 && (
                            <small className={styles.parcelaSugestao}>
                              {(() => {
                                const restante = calcularRestanteAposParcelas(
                                  setupPagamento.parcelas,
                                  index,
                                  valorTotalCompra,
                                )
                                const proxima = valorProximaParcelaSugerida(
                                  setupPagamento.parcelas,
                                  index,
                                  valorTotalCompra,
                                )

                                if (proxima === null) return null

                                if (restante < 0) {
                                  return (
                                    <>
                                      Valor acima do total — excedente de{' '}
                                      {formatCurrency(Math.abs(restante))}
                                    </>
                                  )
                                }

                                const qtdRestantes =
                                  setupPagamento.parcelas.length - index - 1

                                return (
                                  <>
                                    Restante: {formatCurrency(restante)}
                                    {' · '}
                                    Próxima parcela
                                    {qtdRestantes > 1 ? ' (sugerida)' : ''}:{' '}
                                    <strong>{formatCurrency(proxima)}</strong>
                                  </>
                                )
                              })()}
                            </small>
                          )}
                      </div>
                      <Select
                        label="Já pago?"
                        options={['Não', 'Sim']}
                        value={parcela.pago ? 'Sim' : 'Não'}
                        onChange={(e) =>
                          atualizarSetupParcela(
                            index,
                            'pago',
                            e.target.value === 'Sim',
                          )
                        }
                      />
                      <Input
                        label={
                          parcela.pago ? 'Data do pagamento' : 'Vencimento'
                        }
                        type="date"
                        value={parcela.data}
                        onChange={(e) =>
                          atualizarSetupParcela(index, 'data', e.target.value)
                        }
                      />
                    </div>
                  </article>
                ))}
              </div>

              <div
                className={[
                  styles.somaBox,
                  !setupConferem && styles.somaBoxErro,
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                Soma: <strong>{formatCurrency(somaSetup)}</strong> · Total:{' '}
                <strong>{formatCurrency(valorTotalCompra)}</strong>
              </div>

              <Button
                onClick={configurarParcelasIniciais}
                disabled={!setupConferem || salvando}
              >
                Salvar parcelas
              </Button>
            </div>
          ) : (
            <div className={styles.parcelasLista}>
              {parcelas.map((parcela) => {
                const draft = parcelasDraft[parcela.id]
                const status = statusParcelaLabel(parcela)
                const pago = parcela.status === 'pago'

                return (
                  <article
                    key={parcela.id}
                    className={[
                      styles.parcelaCard,
                      pago ? styles.parcelaCardPago : styles.parcelaCardPendente,
                    ].join(' ')}
                  >
                    <header className={styles.parcelaCardHead}>
                      <div>
                        <strong>
                          Parcela {parcela.numero_parcela}/
                          {parcela.total_parcelas}
                        </strong>
                        {!pago && draft && (
                          <span className={styles.vencimentoLabel}>
                            Vence em {formatDateBr(draft.vencimento)}
                          </span>
                        )}
                      </div>
                      <span
                        className={[
                          styles.statusBadge,
                          pago
                            ? styles.statusPago
                            : status === 'Atrasado'
                              ? styles.statusAtrasado
                              : styles.statusPendente,
                        ].join(' ')}
                      >
                        {status}
                      </span>
                    </header>

                    {pago ? (
                      <dl className={styles.parcelaDetalhes}>
                        <div>
                          <dt>Valor pago</dt>
                          <dd>{formatCurrency(Number(parcela.valor))}</dd>
                        </div>
                        <div>
                          <dt>Pago em</dt>
                          <dd>{formatDateBr(parcela.data_pagamento || '')}</dd>
                        </div>
                        <div>
                          <dt>Forma</dt>
                          <dd>{parcela.forma_pagamento || '—'}</dd>
                        </div>
                      </dl>
                    ) : (
                      draft && (
                        <>
                          <div className={styles.parcelaCardGrid}>
                            <Input
                              label="Valor (R$)"
                              mask="currency"
                              value={draft.valor}
                              onChange={(e) =>
                                atualizarDraft(
                                  parcela.id,
                                  'valor',
                                  e.target.value,
                                )
                              }
                            />
                            <Input
                              label="Vencimento"
                              type="date"
                              value={draft.vencimento}
                              onChange={(e) =>
                                atualizarDraft(
                                  parcela.id,
                                  'vencimento',
                                  e.target.value,
                                )
                              }
                            />
                            <Select
                              label="Forma de pagamento"
                              options={[...FORMAS_PAGAMENTO]}
                              value={draft.formaPagamento}
                              onChange={(e) =>
                                atualizarDraft(
                                  parcela.id,
                                  'formaPagamento',
                                  e.target.value,
                                )
                              }
                            />
                            <Input
                              label="Data do pagamento"
                              type="date"
                              value={draft.dataPagamento}
                              onChange={(e) =>
                                atualizarDraft(
                                  parcela.id,
                                  'dataPagamento',
                                  e.target.value,
                                )
                              }
                            />
                          </div>
                          <div className={styles.parcelaCardActions}>
                            <Button
                              variant="outline"
                              onClick={() => salvarParcelaPendente(parcela)}
                              disabled={salvando}
                            >
                              Salvar alterações
                            </Button>
                            <Button
                              onClick={() => registrarPagamento(parcela)}
                              disabled={salvando}
                            >
                              Registrar pagamento
                            </Button>
                          </div>
                        </>
                      )
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'dados' && (
        <div className={styles.dadosForm}>
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
            label="Data da compra"
            type="date"
            value={editar.data}
            onChange={(e) => setEditar({ ...editar, data: e.target.value })}
          />

          <Select
            label="Condição"
            options={['Vivo', 'Abatido']}
            value={editar.condicao_gado === 1 ? 'Vivo' : 'Abatido'}
            onChange={(e) =>
              setEditar({
                ...editar,
                condicao_gado: e.target.value === 'Vivo' ? 1 : 0,
              })
            }
          />

          <Input
            label="Quantidade de animais"
            mask="integer"
            value={editarCampos.quantidade_animais}
            onChange={(e) =>
              setEditarCampos({
                ...editarCampos,
                quantidade_animais: e.target.value,
              })
            }
          />

          <Input
            label="Peso total (kg)"
            mask="decimal"
            value={editarCampos.peso_total}
            onChange={(e) =>
              setEditarCampos({ ...editarCampos, peso_total: e.target.value })
            }
          />

          <Input
            label="Valor por kg"
            mask="currency"
            value={editarCampos.valor_kg}
            onChange={(e) =>
              setEditarCampos({ ...editarCampos, valor_kg: e.target.value })
            }
          />

          {editar.condicao_gado === 1 && (
            <>
              <Select
                label="Tipo imposto"
                options={['fixo', 'percentual']}
                value={editar.tipo_imposto}
                onChange={(e) =>
                  setEditar({
                    ...editar,
                    tipo_imposto: e.target.value as 'fixo' | 'percentual',
                  })
                }
              />
              <Input
                label={
                  editar.tipo_imposto === 'percentual'
                    ? 'Imposto (%)'
                    : 'Imposto (R$)'
                }
                mask={
                  editar.tipo_imposto === 'percentual' ? 'decimal' : 'currency'
                }
                value={editarCampos.valor_imposto}
                onChange={(e) =>
                  setEditarCampos({
                    ...editarCampos,
                    valor_imposto: e.target.value,
                  })
                }
              />
              <Input
                label="GTA / Transporte"
                mask="currency"
                value={editarCampos.gta_valor}
                onChange={(e) =>
                  setEditarCampos({
                    ...editarCampos,
                    gta_valor: e.target.value,
                  })
                }
              />
            </>
          )}

          <Input
            label="Valor total"
            value={calcularTotal(editar).toFixed(2)}
            disabled
          />

          <Select
            label="Tipo de gado"
            options={opcoesTipoGado(editar.tipo_gado)}
            value={editar.tipo_gado || ''}
            onChange={(e) =>
              setEditar({ ...editar, tipo_gado: e.target.value })
            }
          />

          <Input
            label="Observações"
            multiline
            rows={3}
            value={editar.observacoes || ''}
            onChange={(e) =>
              setEditar({ ...editar, observacoes: e.target.value })
            }
          />

          <div className={styles.dadosActions}>
            <Button onClick={salvarDadosCompra} disabled={salvando}>
              Salvar dados
            </Button>
            <Button variant="danger" onClick={excluirCompra}>
              Excluir compra
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
