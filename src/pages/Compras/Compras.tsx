import { useEffect, useMemo, useState } from 'react'
import { Download } from 'lucide-react'
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
import { pagamentosComprasService } from '@/services/pagamentosCompras.service'
import { FORMAS_PAGAMENTO } from '@/constants/formasPagamentos'
import { opcoesTipoGado } from '@/constants/tiposGado'
import {
  criarParcelasDraft,
  somaValoresParcelas,
  calcularRestanteAposParcelas,
  valorProximaParcelaSugerida,
  redistribuirParcelasAposIndex,
  formatCurrency,
  parcelasDraftValidas,
  somaParcelasExcedeTotal,
  type ParcelaDraft,
} from '@/utils/compraParcelas'
import {
  parseCurrencyInput,
  parseDecimalInput,
  parseIntegerInput,
  formatCurrencyFromNumber,
  calcularPesoMedioAnimal,
  formatWeightKg,
} from '@/utils/masks'
import {
  contaPagamentoFromFornecedor,
  emptyContaPagamento,
  PAGADOR_TIPO_OPCOES,
  validarPagadorParcela,
  type ContaPagamentoData,
  type PagadorTipo,
} from '@/utils/contaPagamento'
import { PesoMedioResumo } from './PesoMedioResumo'
import { CompraDetalheModal } from './CompraDetalheModal'
import { ContaPagamentoFields } from './ContaPagamentoFields'
import { ModalViagem } from '../custos/Viagens/ModalViagem'
import {
  RomaneioModal,
  compraToRomaneioRef,
  type CompraRomaneioRef,
} from '../custos/Abate/RomaneioModal'

import styles from './Compras.module.scss'
import toast from 'react-hot-toast'
import { viagensService } from '@/services/viagem.service'
import { getLogoUrl } from '@/services/theme.service'

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
  adiantamento?: boolean
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
  romaneio?:
    | { id: number; data_romaneio: string }
    | { id: number; data_romaneio: string }[]
    | null
}

function resolverRomaneioCompra(
  romaneio: CompraRow['romaneio'],
): { id: number; data_romaneio: string } | null {
  if (!romaneio) return null
  if (Array.isArray(romaneio)) return romaneio[0] ?? null
  return romaneio
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

type CreateMode = 'compra' | 'adiantamento'

export function Compras() {
  const [compras, setCompras] = useState<CompraRow[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingSave, setLoadingSave] = useState(false)

  const [loadingViagem, setLoadingViagem] = useState(false)

  const [page, setPage] = useState(1)
  const [limit] = useState(10)

  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [condicaoGadoFiltro, setCondicaoGadoFiltro] = useState('')
  const [filtroFornecedorLabel, setFiltroFornecedorLabel] = useState('')
  const [filtroFornecedorId, setFiltroFornecedorId] = useState('')
  const [filtroPagamento, setFiltroPagamento] = useState('')
  const [exportandoPdfId, setExportandoPdfId] = useState<number | null>(null)

  const [fornecedores, setFornecedores] = useState<any[]>([])
  const [fornecedorBusca, setFornecedorBusca] = useState('')

  const [compraDetalhe, setCompraDetalhe] = useState<CompraRow | null>(null)
  const [detalheTab, setDetalheTab] = useState<'pagamento' | 'dados'>('pagamento')
  const [romaneioCompra, setRomaneioCompra] = useState<CompraRomaneioRef | null>(
    null,
  )

  const [pagamento, setPagamento] = useState({
    qtdParcelas: '1',
    parcelas: [] as ParcelaDraft[],
    contaPagamento: emptyContaPagamento(),
  })
  const [fornecedorConta, setFornecedorConta] = useState<ContaPagamentoData>(
    emptyContaPagamento(),
  )

  const [viagemOpen, setViagemOpen] = useState(false)
  const [viagemInitial, setViagemInitial] = useState<any>(null)
  const [createMode, setCreateMode] = useState<CreateMode | null>(null)

  const [form, setForm] = useState(emptyCompraForm)
  const isAdiantamento = createMode === 'adiantamento'

  async function carregarContaFornecedor(fornecedorId: string) {
    if (!fornecedorId) {
      const vazio = emptyContaPagamento()
      setFornecedorConta(vazio)
      setPagamento((prev) => ({ ...prev, contaPagamento: vazio }))
      return
    }

    try {
      const fornecedor = await fornecedoresService.getById(fornecedorId)
      const conta = contaPagamentoFromFornecedor(fornecedor)
      setFornecedorConta(conta)
      setPagamento((prev) => ({ ...prev, contaPagamento: { ...conta } }))
    } catch {
      const vazio = emptyContaPagamento()
      setFornecedorConta(vazio)
      setPagamento((prev) => ({ ...prev, contaPagamento: vazio }))
    }
  }

  function closeCreate() {
    setCreateMode(null)
    setForm(emptyCompraForm())
    setFornecedorBusca('')
    setFornecedorConta(emptyContaPagamento())
    setPagamento({
      qtdParcelas: '1',
      parcelas: [],
      contaPagamento: emptyContaPagamento(),
    })
  }

  function openCreate(mode: CreateMode) {
    if (createMode === mode) {
      closeCreate()
      return
    }

    setCreateMode(mode)
    setForm(
      mode === 'adiantamento'
        ? { ...emptyCompraForm(), status: 'Adiantamento' }
        : emptyCompraForm(),
    )
    setFornecedorBusca('')
    setFornecedorConta(emptyContaPagamento())
    setPagamento({
      qtdParcelas: '1',
      parcelas: [],
      contaPagamento: emptyContaPagamento(),
    })
  }

  function atualizarQtdParcelas(qtdRaw: string) {
    const qtdParcelas = qtdRaw.replace(/\D/g, '')
    const qtd = parseIntegerInput(qtdParcelas)
    const dataBase = form.data || new Date().toISOString().slice(0, 10)
    const valorTotal = calcularTotal(form, isAdiantamento)

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
    const valorTotal = calcularTotal(form, isAdiantamento)

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

      if (campo === 'pago' && valor === false) {
        parcelas[index] = {
          ...parcelas[index],
          pagadorTipo: 'proprio',
          contaOrigem: emptyContaPagamento(),
        }
      }

      if (campo === 'valor' && typeof valor === 'string') {
        parcelas = redistribuirParcelasAposIndex(
          parcelas,
          index,
          calcularTotal(form, isAdiantamento),
        )
      }

      return { ...prev, parcelas }
    })
  }

  function atualizarPagadorParcelaDraft(
    index: number,
    pagadorTipo: PagadorTipo,
  ) {
    setPagamento((prev) => {
      const parcelas = [...prev.parcelas]
      parcelas[index] = {
        ...parcelas[index],
        pagadorTipo,
        contaOrigem:
          pagadorTipo === 'terceiro'
            ? parcelas[index].contaOrigem || emptyContaPagamento()
            : emptyContaPagamento(),
      }
      return { ...prev, parcelas }
    })
  }

  function atualizarContaOrigemParcelaDraft(
    index: number,
    contaOrigem: ContaPagamentoData,
  ) {
    setPagamento((prev) => {
      const parcelas = [...prev.parcelas]
      parcelas[index] = { ...parcelas[index], contaOrigem }
      return { ...prev, parcelas }
    })
  }

  function validarPagadoresParcelasPagas() {
    for (let index = 0; index < pagamento.parcelas.length; index += 1) {
      const parcela = pagamento.parcelas[index]
      if (!parcela.pago) continue

      const erro = validarPagadorParcela(
        parcela.pagadorTipo || 'proprio',
        parcela.contaOrigem || emptyContaPagamento(),
        true,
      )
      if (erro) {
        return `Parcela ${index + 1}: ${erro}`
      }
    }
    return null
  }

  const somaParcelas = useMemo(
    () => somaValoresParcelas(pagamento.parcelas),
    [pagamento.parcelas],
  )

  const valorTotalCompra = useMemo(
    () => calcularTotal(form, isAdiantamento),
    [form, isAdiantamento],
  )

  const parcelasExcedemTotal = somaParcelasExcedeTotal(
    pagamento.parcelas,
    valorTotalCompra,
  )

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

  function selecionarFiltroFornecedor(nome: string) {
    setFiltroFornecedorLabel(nome)
    const fornecedor = fornecedores.find((f) => f.nome === nome)
    setFiltroFornecedorId(fornecedor?.id || '')
    setPage(1)
  }

  function limparFiltros() {
    setStartDate('')
    setEndDate('')
    setCondicaoGadoFiltro('')
    setFiltroFornecedorLabel('')
    setFiltroFornecedorId('')
    setFiltroPagamento('')
    setPage(1)
  }

  const temFiltros = Boolean(
    startDate ||
      endDate ||
      condicaoGadoFiltro ||
      filtroFornecedorId ||
      filtroPagamento,
  )

  async function exportarPdfPagamento(compra: CompraRow) {
    try {
      setExportandoPdfId(compra.id)

      const [parcelas, fornecedor] = await Promise.all([
        pagamentosComprasService.getByCompraId(compra.id),
        fornecedoresService.getById(compra.fornecedor_id).catch(() => null),
      ])

      const subtotal = compra.adiantamento
        ? Number(compra.valor_total || 0)
        : Number(compra.subtotal || 0)
      const imposto = compra.adiantamento ? 0 : Number(compra.valor_imposto || 0)
      const gta = compra.adiantamento ? 0 : Number(compra.gta_valor || 0)
      const viagem = compra.adiantamento
        ? 0
        : Number(compra.detalhes_custo?.viagem || 0)
      const total = compra.adiantamento
        ? Number(compra.valor_total || 0)
        : (compra.detalhes_custo?.total ??
          subtotal + imposto + gta + viagem)

      const { gerarCompraPagamentoPdf } = await import('@/utils/compraPagamentoPdf')

      await gerarCompraPagamentoPdf({
        compra: {
          id: compra.id,
          data: compra.data,
          adiantamento: compra.adiantamento,
          quantidade_animais: compra.quantidade_animais,
          peso_total: compra.peso_total,
          valor_kg: compra.valor_kg,
          tipo_gado: compra.tipo_gado,
          condicao_gado: compra.condicao_gado,
          observacoes: compra.observacoes,
          detalhes_custo: {
            subtotal,
            imposto,
            gta,
            viagem,
            total,
          },
        },
        fornecedorNome: compra.fornecedor?.nome || fornecedor?.nome || 'Fornecedor',
        fornecedorDoc: fornecedor?.doc || null,
        fornecedorConta: fornecedor
          ? contaPagamentoFromFornecedor(fornecedor)
          : undefined,
        parcelas,
        logoUrl: getLogoUrl(),
      })

      toast.success('PDF baixado')
    } catch {
      toast.error('Erro ao gerar PDF')
    } finally {
      setExportandoPdfId(null)
    }
  }

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

  function calcularSubtotal(data: any, adiantamento = false) {
    if (adiantamento) {
      return parseCurrencyInput(data.valor_total || '')
    }

    return (
      parseDecimalInput(data.peso_total || '') *
      parseCurrencyInput(data.valor_kg || '')
    )
  }

  function calcularImposto(data: any, adiantamento = false) {
    if (adiantamento) return 0

    const subtotal = calcularSubtotal(data)

    if (data.tipo_imposto === 'percentual') {
      return subtotal * (parseDecimalInput(data.valor_imposto || '') / 100)
    }

    return parseCurrencyInput(data.valor_imposto || '')
  }

  function calcularTotal(data: any, adiantamento = false) {
    if (adiantamento) {
      return parseCurrencyInput(data.valor_total || '')
    }

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
        condicaoGadoFiltro,
        filtroFornecedorId,
        filtroPagamento,
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
  }, [
    page,
    startDate,
    endDate,
    condicaoGadoFiltro,
    filtroFornecedorId,
    filtroPagamento,
  ])

  useEffect(() => {
    async function carregarFornecedores() {
      const data = await fornecedoresService.getSelectOptions()
      setFornecedores(data || [])
    }

    carregarFornecedores()
  }, [])

  async function salvarCompra() {
    const erroPagador = validarPagadoresParcelasPagas()
    if (erroPagador) {
      toast.error(erroPagador)
      return
    }

    try {
      setLoadingSave(true)
      const adiantamento = isAdiantamento
      const subtotal = calcularSubtotal(form, adiantamento)
      const valorTotal = calcularTotal(form, adiantamento)

      await comprasService.create(
        {
          fornecedor_id: form.fornecedor_id,
          data: form.data,
          adiantamento,
          quantidade_animais: adiantamento
            ? 0
            : parseIntegerInput(form.quantidade_animais),
          condicao_gado: adiantamento ? 1 : Number(form.condicao_gado),
          peso_total: adiantamento ? 0 : parseDecimalInput(form.peso_total),
          valor_kg: adiantamento ? 0 : parseCurrencyInput(form.valor_kg),
          tipo_imposto: adiantamento ? 'fixo' : form.tipo_imposto,
          valor_imposto: adiantamento
            ? 0
            : form.tipo_imposto === 'percentual'
              ? parseDecimalInput(form.valor_imposto)
              : parseCurrencyInput(form.valor_imposto),
          gta_valor: adiantamento ? 0 : parseCurrencyInput(form.gta_valor),
          subtotal,
          valor_total: valorTotal,
          tipo_gado: adiantamento ? null : form.tipo_gado || null,
          observacoes: form.observacoes,
          status: adiantamento ? 'Adiantamento' : form.status,
        },
        {
          parcelas: pagamento.parcelas,
          contaPagamento: pagamento.contaPagamento,
        },
      )

      toast.success(
        adiantamento
          ? 'Adiantamento cadastrado com sucesso'
          : 'Compra cadastrada com sucesso',
      )

      const avisoConta = pagamentosComprasService.consumeAvisoContaPagamento()
      if (avisoConta) {
        toast(avisoConta, { duration: 8000, icon: '⚠️' })
      }

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

  const canSaveCompra = isAdiantamento
    ? Boolean(
        form.fornecedor_id &&
          form.data &&
          parseCurrencyInput(form.valor_total) > 0 &&
          pagamento.parcelas.length ===
            parseIntegerInput(pagamento.qtdParcelas || '1') &&
          parcelasDraftValidas(pagamento.parcelas) &&
          !parcelasExcedemTotal,
      )
    : Boolean(
        form.fornecedor_id &&
          form.data &&
          parseDecimalInput(form.quantidade_animais) > 0 &&
          parseDecimalInput(form.peso_total) > 0 &&
          parseCurrencyInput(form.valor_kg) > 0 &&
          pagamento.parcelas.length ===
            parseIntegerInput(pagamento.qtdParcelas || '1') &&
          parcelasDraftValidas(pagamento.parcelas) &&
          !parcelasExcedemTotal,
      )

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
      render: (r: CompraRow) =>
        r.adiantamento ? (
          <span className={styles.tipoAdiantamento}>Adiantamento</span>
        ) : (
          r.condicao_gado === 1 ? 'Vivo' : 'Abatido'
        ),
    },
    {
      key: 'quantidade_animais',
      header: 'Qtd',
      render: (r: CompraRow) => (r.adiantamento ? '—' : r.quantidade_animais),
    },
    {
      key: 'peso_total',
      header: 'Peso',
      render: (r: CompraRow) =>
        r.adiantamento ? '—' : `${Number(r.peso_total).toFixed(2)} KG`,
    },
    {
      key: 'peso_medio',
      header: 'Média kg',
      render: (r: CompraRow) => {
        if (r.adiantamento) return '—'
        const medio = calcularPesoMedioAnimal(r.peso_total, r.quantidade_animais)
        return medio > 0 ? `${formatWeightKg(medio)} kg` : '—'
      },
    },
    {
      key: 'valor_kg',
      header: 'R$/KG',
      render: (r: CompraRow) =>
        r.adiantamento ? '—' : `R$ ${Number(r.valor_kg).toFixed(2)}`,
    },
    {
      key: 'valor_total',
      header: 'Total',
      render: (r: CompraRow) => {
        const d = r.detalhes_custo

        if (r.adiantamento) {
          return formatCurrency(d.total)
        }

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
            variant="ghost"
            className={tableListStyles.acaoBtn}
            loading={exportandoPdfId === r.id}
            disabled={exportandoPdfId === r.id}
            onClick={() => exportarPdfPagamento(r)}
          >
            <Download size={14} aria-hidden />
            PDF
          </Button>
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
          {!r.adiantamento && (
            <>
              <Button
                variant="outline"
                className={tableListStyles.acaoBtn}
                onClick={() =>
                  setRomaneioCompra(
                    compraToRomaneioRef({
                      id: r.id,
                      data: r.data,
                      quantidade_animais: r.quantidade_animais,
                      tipo_gado: r.tipo_gado,
                      fornecedor_id: r.fornecedor_id,
                      fornecedor: r.fornecedor,
                      observacoes: r.observacoes,
                    }),
                  )
                }
              >
                {resolverRomaneioCompra(r.romaneio) ? 'Ver romaneio' : 'Romaneio'}
              </Button>
              <Button
                disabled={loadingViagem}
                variant="ghost"
                className={tableListStyles.acaoBtn}
                onClick={() => abrirViagem(r)}
              >
                Viagem
              </Button>
            </>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className={styles.page}>
      <h1 className="page-title">Compras de Gado</h1>

      {createMode && (
      <Card title={isAdiantamento ? 'Novo adiantamento' : 'Nova compra'}>
        <div className={styles.form}>
          {isAdiantamento && (
            <p className={styles.adiantamentoIntro}>
              Registre um pagamento antecipado ao fornecedor, sem peso ou
              quantidade de animais. O valor informado será usado nas parcelas.
            </p>
          )}

          <Autocomplete
            label="Fornecedor"
            options={fornecedores.map((f) => f.nome)}
            value={fornecedorBusca}
            onChange={async (value) => {
              setFornecedorBusca(value)

              const fornecedor = fornecedores.find((f) => f.nome === value)

              setForm({
                ...form,
                fornecedor_id: fornecedor?.id || '',
              })

              await carregarContaFornecedor(fornecedor?.id || '')
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
                const total = calcularTotal({ ...form, data }, isAdiantamento)

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

          {isAdiantamento ? (
            <>
              <Input
                label="Valor do adiantamento"
                mask="currency"
                value={form.valor_total}
                onChange={(e) =>
                  setForm({
                    ...form,
                    valor_total: e.target.value,
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
            </>
          ) : (
            <>
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

          <PesoMedioResumo
            className={styles.pesoMedioResumo}
            pesoTotal={form.peso_total}
            quantidadeAnimais={form.quantidade_animais}
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
            </>
          )}

          <div className={styles.pagamentoSection}>
            <h3 className={styles.sectionTitle}>Pagamento parcelado</h3>

            <Input
              label="Quantidade de parcelas"
              mask="integer"
              value={pagamento.qtdParcelas}
              onChange={(e) => atualizarQtdParcelas(e.target.value)}
            />

            <ContaPagamentoFields
              className={styles.contaPagamentoSection}
              titulo="Conta para pagamento (fornecedor)"
              hint="Conta de destino — preenchida com os dados do fornecedor. Edite se o pagamento for para outra conta."
              value={pagamento.contaPagamento}
              onChange={(contaPagamento) =>
                setPagamento((prev) => ({ ...prev, contaPagamento }))
              }
              onRestaurarFornecedor={() =>
                setPagamento((prev) => ({
                  ...prev,
                  contaPagamento: { ...fornecedorConta },
                }))
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
                    <span>Forma</span>
                    <span>Já pago?</span>
                    <span>Data</span>
                  </div>
                  {pagamento.parcelas.map((parcela, index) => (
                    <div key={index} className={styles.parcelaTabelaGrupo}>
                    <div
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
                        label="Forma de pagamento"
                        options={[...FORMAS_PAGAMENTO]}
                        value={parcela.formaPagamento || 'Pix'}
                        onChange={(e) =>
                          atualizarParcelaDraft(
                            index,
                            'formaPagamento',
                            e.target.value,
                          )
                        }
                      />
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
                    {parcela.pago && (
                      <div className={styles.parcelaPagadorBox}>
                        <Select
                          label="Quem está pagando?"
                          options={PAGADOR_TIPO_OPCOES.map((o) => o.label)}
                          value={
                            PAGADOR_TIPO_OPCOES.find(
                              (o) =>
                                o.value === (parcela.pagadorTipo || 'proprio'),
                            )?.label || PAGADOR_TIPO_OPCOES[0].label
                          }
                          onChange={(e) => {
                            const opcao = PAGADOR_TIPO_OPCOES.find(
                              (o) => o.label === e.target.value,
                            )
                            atualizarPagadorParcelaDraft(
                              index,
                              opcao?.value || 'proprio',
                            )
                          }}
                        />
                        {parcela.pagadorTipo === 'terceiro' && (
                          <ContaPagamentoFields
                            titulo="Conta de origem do pagamento"
                            hint="Informe o banco/conta de onde saiu o valor (quem pagou)."
                            value={
                              parcela.contaOrigem || emptyContaPagamento()
                            }
                            onChange={(conta) =>
                              atualizarContaOrigemParcelaDraft(index, conta)
                            }
                          />
                        )}
                      </div>
                    )}
                    </div>
                  ))}
                </div>

                <div
                  className={[
                    styles.parcelasTotal,
                    parcelasExcedemTotal && styles.parcelasTotalErro,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  Soma das parcelas: <strong>{formatCurrency(somaParcelas)}</strong>
                  {' · '}
                  Total {isAdiantamento ? 'do adiantamento' : 'da compra'}:{' '}
                  <strong>{formatCurrency(valorTotalCompra)}</strong>
                  {parcelasExcedemTotal && (
                    <span> — a soma não pode ultrapassar o total</span>
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
              {isAdiantamento ? 'Salvar adiantamento' : 'Salvar compra'}
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
          <div className={styles.cardActions}>
            <AddNewButton
              open={createMode === 'compra'}
              onClick={() => openCreate('compra')}
              label="Adicionar nova compra"
            />
            <Button
              variant={createMode === 'adiantamento' ? 'outline' : 'secondary'}
              onClick={() => openCreate('adiantamento')}
            >
              {createMode === 'adiantamento' ? 'Cancelar adiantamento' : 'Adiantamento'}
            </Button>
          </div>
        }
      >
        <div className={styles.filters}>
          <Autocomplete
            label="Fornecedor"
            placeholder="Filtrar por fornecedor..."
            options={fornecedores.map((f) => f.nome)}
            value={filtroFornecedorLabel}
            onChange={selecionarFiltroFornecedor}
          />
          <Input
            label="Data inicial"
            type="date"
            value={startDate}
            max={endDate || undefined}
            onChange={(e) => {
              setStartDate(e.target.value)
              setPage(1)
            }}
          />
          <Input
            label="Data final"
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(e) => {
              setEndDate(e.target.value)
              setPage(1)
            }}
          />
          <Select
            label="Condição"
            options={['Todos', 'Vivo', 'Abatido']}
            value={
              condicaoGadoFiltro === '1'
                ? 'Vivo'
                : condicaoGadoFiltro === '0'
                  ? 'Abatido'
                  : 'Todos'
            }
            onChange={(e) => {
              const value = e.target.value
              setCondicaoGadoFiltro(
                value === 'Vivo' ? '1' : value === 'Abatido' ? '0' : '',
              )
              setPage(1)
            }}
          />
          <Select
            label="Pagamento"
            options={[
              'Todos',
              'Quitado',
              'Com pendência',
              'Sem parcelas',
            ]}
            value={
              filtroPagamento === 'quitado'
                ? 'Quitado'
                : filtroPagamento === 'pendente'
                  ? 'Com pendência'
                  : filtroPagamento === 'sem_parcelas'
                    ? 'Sem parcelas'
                    : 'Todos'
            }
            onChange={(e) => {
              const map: Record<string, string> = {
                Quitado: 'quitado',
                'Com pendência': 'pendente',
                'Sem parcelas': 'sem_parcelas',
              }
              setFiltroPagamento(map[e.target.value] || '')
              setPage(1)
            }}
          />
          {temFiltros && (
            <Button variant="ghost" onClick={limparFiltros}>
              Limpar filtros
            </Button>
          )}
        </div>

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

      <RomaneioModal
        key={romaneioCompra ? `compra-${romaneioCompra.id}` : 'compra-fechada'}
        open={!!romaneioCompra}
        compra={romaneioCompra}
        onClose={() => setRomaneioCompra(null)}
        onSaved={carregarCompras}
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
