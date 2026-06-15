import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Card,
  Input,
  Table,
  Select,
  Autocomplete,
  AddNewButton,
  TouchTooltip,
  touchTooltipStyles,
  tableListStyles,
} from '@/components/ui'

import { fornecedoresService } from '@/services/fornecedores.service'
import { comprasService } from '@/services/compras.service'
import { FORMAS_PAGAMENTO } from '@/constants/formasPagamentos'
import { opcoesTipoGado } from '@/constants/tiposGado'
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
} from '@/utils/masks'

import { ModalViagem } from '../custos/Viagens/ModalViagem'
import { CompraDetalheModal } from './CompraDetalheModal'

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
  detalhes_custo?: any
  pagamento_resumo?: {
    quitado: boolean
    pagas: number
    total: number
    valorPago?: number
    valorPendente?: number
    forma_pagamento?: string | null
    detalhes?: {
      numero: number
      total: number
      valor: number
      status: string
      data_pagamento?: string | null
      data_vencimento?: string
    }[]
  }
  forma_pagamento?: string | null
  qtd_parcelas?: number
  pagamento_quitado?: boolean
}

const emptyCompraForm = () => ({
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

  const [compraDetalhe, setCompraDetalhe] = useState<CompraRow | null>(null)
  const [detalheTab, setDetalheTab] = useState<'pagamento' | 'dados'>('pagamento')

  const [pagamento, setPagamento] = useState({
    qtdParcelas: '1',
    formaPagamento: 'Pix',
    parcelas: [] as ParcelaDraft[],
  })

  const [viagemOpen, setViagemOpen] = useState(false)
  const [viagemInitial, setViagemInitial] = useState<any>(null)
  const [showCreate, setShowCreate] = useState(false)

  const [form, setForm] = useState(emptyCompraForm)

  function resetPagamento(dataCompra = '', valorTotal = 0) {
    const qtd = 1
    setPagamento({
      qtdParcelas: String(qtd),
      formaPagamento: 'Pix',
      parcelas: criarParcelasDraft(qtd, valorTotal, dataCompra),
    })
  }

  function closeCreate() {
    setShowCreate(false)
    setForm(emptyCompraForm())
    setFornecedorBusca('')
    resetPagamento()
  }

  function atualizarQtdParcelas(qtdRaw: string) {
    const qtdParcelas = qtdRaw.replace(/\D/g, '')
    const qtd = parseIntegerInput(qtdParcelas)
    const dataBase = form.data || new Date().toISOString().slice(0, 10)
    const valorTotal = calcularTotal(form)

    setPagamento((prev) => ({
      ...prev,
      qtdParcelas,
      parcelas:
        qtd > 0
          ? criarParcelasDraft(qtd, valorTotal, dataBase, prev.parcelas)
          : prev.parcelas,
    }))
  }

  function dividirValoresIgualmente() {
    const qtd = parseIntegerInput(pagamento.qtdParcelas || '1')
    const dataBase = form.data || new Date().toISOString().slice(0, 10)
    const valorTotal = calcularTotal(form)

    setPagamento((prev) => ({
      ...prev,
      parcelas: criarParcelasDraft(qtd, valorTotal, dataBase, prev.parcelas),
    }))
  }

  function atualizarParcelaDraft(
    index: number,
    campo: keyof ParcelaDraft,
    valor: string | boolean,
  ) {
    setPagamento((prev) => {
      let parcelas = [...prev.parcelas]
      parcelas[index] = { ...parcelas[index], [campo]: valor }

      if (campo === 'valor' && typeof valor === 'string') {
        parcelas = redistribuirParcelasAposIndex(
          parcelas,
          index,
          calcularTotal(form),
        )
      }

      return { ...prev, parcelas }
    })
  }

  const somaParcelas = useMemo(
    () => somaValoresParcelas(pagamento.parcelas),
    [pagamento.parcelas],
  )

  const valorTotalCompra = useMemo(() => calcularTotal(form), [form])

  const parcelasConferem =
    Math.abs(somaParcelas - valorTotalCompra) < 0.02

  useEffect(() => {
    const qtd = parseIntegerInput(pagamento.qtdParcelas || '1')
    const dataBase = form.data || new Date().toISOString().slice(0, 10)

    if (
      pagamento.parcelas.length === 0 &&
      qtd >= 1 &&
      valorTotalCompra > 0
    ) {
      setPagamento((prev) => ({
        ...prev,
        parcelas: criarParcelasDraft(qtd, valorTotalCompra, dataBase),
      }))
    }
  }, [
    form.data,
    valorTotalCompra,
    pagamento.qtdParcelas,
    pagamento.parcelas.length,
  ])

  function abrirDetalhe(
    compra: CompraRow,
    tab: 'pagamento' | 'dados' = 'pagamento',
  ) {
    setDetalheTab(tab)
    setCompraDetalhe(compra)
  }

  function formatDateBr(value: string) {
    if (!value) return '—'
    const date = new Date(`${value.slice(0, 10)}T12:00:00`)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleDateString('pt-BR')
  }

  function calcularSubtotal(data: any) {
    return (
      parseDecimalInput(data.peso_total || '') *
      parseCurrencyInput(data.valor_kg || '')
    )
  }

  function calcularImposto(data: any) {
    const subtotal = calcularSubtotal(data)

    if (data.tipo_imposto === 'percentual') {
      return subtotal * (parseDecimalInput(data.valor_imposto || '') / 100)
    }

    return parseCurrencyInput(data.valor_imposto || '')
  }

  function calcularTotal(data: any) {
    return (
      calcularSubtotal(data) +
      calcularImposto(data) +
      parseCurrencyInput(data.gta_valor || '')
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

      console.log(response)

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

      await comprasService.create(
        {
          fornecedor_id: form.fornecedor_id,
          data: form.data,
          quantidade_animais: parseIntegerInput(form.quantidade_animais),
          condicao_gado: Number(form.condicao_gado),
          peso_total: parseDecimalInput(form.peso_total),
          valor_kg: parseCurrencyInput(form.valor_kg),
          tipo_imposto: form.tipo_imposto,
          valor_imposto:
            form.tipo_imposto === 'percentual'
              ? parseDecimalInput(form.valor_imposto)
              : parseCurrencyInput(form.valor_imposto),
          gta_valor: parseCurrencyInput(form.gta_valor),
          subtotal,
          valor_total: valorTotal,
          tipo_gado: form.tipo_gado,
          observacoes: form.observacoes,
          status: form.status,
        },
        {
          formaPagamento: pagamento.formaPagamento,
          parcelas: pagamento.parcelas,
        },
      )

      toast.success('Compra cadastrada com sucesso')

      closeCreate()
      setLoadingSave(false)
      carregarCompras()
    } catch (e: any) {
      setLoadingSave(false)
      toast.error(e?.message || 'Erro ao cadastrar compra')
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
    parseDecimalInput(form.quantidade_animais) > 0 &&
    parseDecimalInput(form.peso_total) > 0 &&
    parseCurrencyInput(form.valor_kg) > 0 &&
    pagamento.parcelas.length === parseIntegerInput(pagamento.qtdParcelas || '1') &&
    pagamento.parcelas.every((p) => p.valor && p.data) &&
    parcelasConferem

  const columns = [
    {
      key: 'fornecedor',
      header: 'Fornecedor',
      render: (r: CompraRow) => (
        <span className={tableListStyles.nomeCell}>{r.fornecedor?.nome || '-'}</span>
      ),
    },
    {
      key: 'data',
      header: 'Data',
    },
    {
      key: 'condicao_gado',
      header: 'Condição',
      render: (r: CompraRow) => (r.condicao_gado === 1 ? 'Vivo' : 'Abatido'),
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
      key: 'valor_total',
      header: 'Total',
      render: (r: CompraRow) => {
        const d = r.detalhes_custo

        return (
          <TouchTooltip label={formatCurrency(d.total)}>
            <div className={touchTooltipStyles.item}>
              <span>Gado: {formatCurrency(d.subtotal)}</span>
              <span>Imposto: {formatCurrency(d.imposto)}</span>
              <span>GTA: {formatCurrency(d.gta)}</span>
              <span>Viagem: {formatCurrency(d.viagem)}</span>
            </div>
          </TouchTooltip>
        )
      },
    },
    {
      key: 'pagamento',
      header: 'Pagamento',
      render: (r: CompraRow) => {
        const resumo = r.pagamento_resumo

        if (!resumo?.total) {
          return <span>—</span>
        }

        const detalhes = resumo.detalhes || []
        const quitado = resumo.quitado
        const resumoLabel = quitado
          ? `${resumo.pagas}/${resumo.total} · Quitado`
          : resumo.valorPendente != null && resumo.valorPendente > 0
            ? `${resumo.pagas}/${resumo.total} · Falta ${formatCurrency(resumo.valorPendente)}`
            : `${resumo.pagas}/${resumo.total} parcelas`

        if (detalhes.length === 0) {
          return (
            <span className={quitado ? styles.statusPago : styles.statusPendente}>
              {resumoLabel}
            </span>
          )
        }

        return (
          <TouchTooltip label={resumoLabel}>
            {detalhes.map((p) => (
              <div key={p.numero} className={touchTooltipStyles.item}>
                <strong>
                  Parcela {p.numero}/{p.total}
                </strong>
                <span>{formatCurrency(p.valor)}</span>
                <span>
                  {p.status === 'pago' && p.data_pagamento
                    ? `Pago em ${formatDateBr(p.data_pagamento)}`
                    : p.data_vencimento
                      ? `Vence em ${formatDateBr(p.data_vencimento)}`
                      : 'Pendente'}
                </span>
              </div>
            ))}
          </TouchTooltip>
        )
      },
    },
    {
      key: 'acoes',
      header: 'Ações',
      render: (r: CompraRow) => (
        <div className={tableListStyles.acoesCell}>
          <Button
            variant="outline"
            className={tableListStyles.acaoBtn}
            onClick={() => abrirDetalhe(r, 'pagamento')}
          >
            Pagamentos
          </Button>
          <Button
            variant="ghost"
            className={tableListStyles.acaoBtn}
            onClick={() => abrirDetalhe(r, 'dados')}
          >
            Dados
          </Button>
          <Button
            disabled={loadingViagem}
            variant="ghost"
            className={tableListStyles.acaoBtn}
            onClick={() => abrirViagem(r)}
          >
            Viagem
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className={styles.page}>
      <h1 className="page-title">Compras de Gado</h1>

      {showCreate && (
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
            onChange={(e) => {
              const data = e.target.value

              setForm({
                ...form,
                data,
              })

              setPagamento((prev) => {
                const qtd = parseIntegerInput(prev.qtdParcelas) || 1
                const total = calcularTotal({ ...form, data })

                return {
                  ...prev,
                  parcelas:
                    prev.parcelas.length > 0
                      ? prev.parcelas
                      : criarParcelasDraft(qtd, total, data),
                }
              })
            }}
          />

          <Select
            label="Condição"
            options={['Vivo', 'Abatido']}
            value={form.condicao_gado === '1' ? 'Vivo' : 'Abatido'}
            onChange={(e) =>
              setForm({
                ...form,
                condicao_gado: e.target.value === 'Vivo' ? '1' : '0',
              })
            }
          />

          <Input
            label="Quantidade de animais"
            mask="integer"
            value={form.quantidade_animais}
            onChange={(e) =>
              setForm({
                ...form,
                quantidade_animais: e.target.value,
              })
            }
          />

          <Input
            label="Peso total (kg)"
            mask="decimal"
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
            mask="currency"
            value={form.valor_kg}
            onChange={(e) =>
              setForm({
                ...form,
                valor_kg: e.target.value,
              })
            }
          />

          {form.condicao_gado == '1' && (
            <>
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
                mask={form.tipo_imposto === 'percentual' ? 'decimal' : 'currency'}
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
                mask="currency"
                value={form.gta_valor}
                onChange={(e) =>
                  setForm({
                    ...form,
                    gta_valor: e.target.value,
                  })
                }
              />
            </>
          )}

          <Input
            label="Subtotal"
            value={formatCurrencyFromNumber(calcularSubtotal(form))}
            disabled
          />

          <Input
            label="Valor total"
            value={formatCurrencyFromNumber(calcularTotal(form))}
            disabled
          />

          <Select
            label="Tipo de gado"
            options={opcoesTipoGado(form.tipo_gado)}
            value={form.tipo_gado}
            onChange={(e) =>
              setForm({
                ...form,
                tipo_gado: e.target.value,
              })
            }
          />

          <Input
            label="Complemento"
            multiline
            rows={4}
            value={form.observacoes}
            onChange={(e) =>
              setForm({
                ...form,
                observacoes: e.target.value,
              })
            }
          />

          <div className={styles.pagamentoSection}>
            <h3 className={styles.sectionTitle}>Pagamento parcelado</h3>

            <Input
              label="Quantidade de parcelas"
              mask="integer"
              value={pagamento.qtdParcelas}
              onChange={(e) => atualizarQtdParcelas(e.target.value)}
            />

            <Select
              label="Forma de pagamento"
              options={[...FORMAS_PAGAMENTO]}
              value={pagamento.formaPagamento}
              onChange={(e) =>
                setPagamento({
                  ...pagamento,
                  formaPagamento: e.target.value,
                })
              }
            />

            {pagamento.parcelas.length > 0 && (
              <div className={styles.parcelasPreview}>
                <div className={styles.parcelasPreviewHeader}>
                  <strong>Detalhamento de cada parcela</strong>
                  <Button variant="outline" onClick={dividirValoresIgualmente}>
                    Dividir igualmente
                  </Button>
                </div>
                <p className={styles.parcelasHint}>
                  Informe quanto será pago em cada parcela e a data (pagamento
                  ou vencimento). Marque &quot;Já pago&quot; nas que já foram
                  quitadas.
                </p>

                <div className={styles.parcelasTabela}>
                  <div className={styles.parcelasTabelaHead}>
                    <span>Parcela</span>
                    <span>Valor (R$)</span>
                    <span>Já pago?</span>
                    <span>Data</span>
                  </div>
                  {pagamento.parcelas.map((parcela, index) => (
                    <div
                      key={index}
                      className={styles.parcelasTabelaRow}
                    >
                      <span className={styles.parcelaNumero}>
                        {index + 1}/{pagamento.parcelas.length}
                      </span>
                      <div className={styles.parcelaValorCell}>
                        <Input
                          label="Valor"
                          mask="currency"
                          value={parcela.valor}
                          onChange={(e) =>
                            atualizarParcelaDraft(index, 'valor', e.target.value)
                          }
                        />
                        {index < pagamento.parcelas.length - 1 &&
                          Number(parcela.valor) > 0 && (
                            <small className={styles.parcelaSugestao}>
                              {(() => {
                                const restante = calcularRestanteAposParcelas(
                                  pagamento.parcelas,
                                  index,
                                  valorTotalCompra,
                                )
                                const proxima = valorProximaParcelaSugerida(
                                  pagamento.parcelas,
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
                                  pagamento.parcelas.length - index - 1

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
                        label="Status"
                        options={['Não', 'Sim']}
                        value={parcela.pago ? 'Sim' : 'Não'}
                        onChange={(e) =>
                          atualizarParcelaDraft(
                            index,
                            'pago',
                            e.target.value === 'Sim',
                          )
                        }
                      />
                      <Input
                        label={
                          parcela.pago
                            ? 'Data do pagamento'
                            : 'Data de vencimento'
                        }
                        type="date"
                        value={parcela.data}
                        onChange={(e) =>
                          atualizarParcelaDraft(index, 'data', e.target.value)
                        }
                      />
                    </div>
                  ))}
                </div>

                <div
                  className={[
                    styles.parcelasTotal,
                    !parcelasConferem && styles.parcelasTotalErro,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  Soma das parcelas: <strong>{formatCurrency(somaParcelas)}</strong>
                  {' · '}
                  Total da compra:{' '}
                  <strong>{formatCurrency(valorTotalCompra)}</strong>
                  {!parcelasConferem && (
                    <span> — ajuste os valores para fechar o total</span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className={styles.actions}>
            <Button
              onClick={salvarCompra}
              disabled={!canSaveCompra || loadingSave}
            >
              Salvar compra
            </Button>
            <Button variant="ghost" onClick={closeCreate}>
              Cancelar
            </Button>
          </div>
        </div>
      </Card>
      )}

      <Card
        title="Compras cadastradas"
        action={
          <AddNewButton
            open={showCreate}
            onClick={() => (showCreate ? closeCreate() : setShowCreate(true))}
            label="Adicionar nova compra"
          />
        }
      >
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

      <CompraDetalheModal
        compra={compraDetalhe}
        initialTab={detalheTab}
        fornecedores={fornecedores}
        onClose={() => setCompraDetalhe(null)}
        onUpdated={carregarCompras}
      />

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
