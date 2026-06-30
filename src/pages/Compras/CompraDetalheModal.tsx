import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import {
  Wallet,
  FileText,
  Download,
  ClipboardList,
  Beef,
} from 'lucide-react'
import { Button, Input, Modal, Select, Autocomplete } from '@/components/ui'
import { FORMAS_PAGAMENTO } from '@/constants/formasPagamentos'
import { opcoesTipoGado } from '@/constants/tiposGado'
import { comprasService } from '@/services/compras.service'
import { romaneiosService } from '@/services/romaneios.service'
import { fornecedoresService } from '@/services/fornecedores.service'
import {
  pagamentosComprasService,
  type CompraParcela,
} from '@/services/pagamentosCompras.service'
import {
  somaValoresParcelas,
  calcularRestanteAposParcelas,
  valorProximaParcelaSugerida,
  redistribuirParcelasAposIndex,
  conferemValoresParcelas,
  parcelasDraftValidas,
  somaParcelasExcedeTotal,
  formatCurrency,
  formaPagamentoResumoCompra,
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
import {
  RomaneioModal,
  compraToRomaneioRef,
  type CompraRomaneioRef,
} from '../custos/Abate/RomaneioModal'
import { CompraEntradaEstoqueModal } from './CompraEntradaEstoqueModal'
import { PesoMedioResumo } from './PesoMedioResumo'
import { PecasPrevistasPesosFields } from './PecasPrevistasPesosFields'
import { pecasPrevistasPorAnimais } from '@/constants/cortes'
import { ContaPagamentoFields } from './ContaPagamentoFields'
import { ContaPagamentoResumo } from './ContaPagamentoResumo'
import {
  contaPagamentoFromFornecedor,
  contaPagamentoFromParcela,
  contaOrigemFromParcela,
  contaPagamentoTemDados,
  emptyContaPagamento,
  formatContaPagamentoResumo,
  pagadorTipoLabel,
  PAGADOR_TIPO_OPCOES,
  validarPagadorParcela,
  type ContaPagamentoData,
  type PagadorTipo,
} from '@/utils/contaPagamento'
import styles from './CompraDetalheModal.module.scss'
import { buildCompraPagamentoPdfInput } from '@/utils/buildCompraPagamentoPdfInput'

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
  adiantamento?: boolean
  qtd_dianteiro?: number
  qtd_traseiro?: number
  peso_bruto_dianteiro_kg?: number
  peso_bruto_traseiro_kg?: number
  forma_pagamento?: string | null
  qtd_parcelas?: number
  detalhes_custo?: { total: number }
  romaneio?:
    | { id: number; data_romaneio: string }
    | { id: number; data_romaneio: string }[]
    | null
}

type ModalTab = 'pagamento' | 'dados'

type ParcelaDraftEdicao = {
  valor: string
  dataPagamento: string
  vencimento: string
  formaPagamento: string
  contaPagamento: ContaPagamentoData
  pagadorTipo: PagadorTipo
  contaOrigem: ContaPagamentoData
}

function pagadorPayloadFromDraft(draft: ParcelaDraftEdicao) {
  return {
    pagadorTipo: draft.pagadorTipo,
    contaOrigem:
      draft.pagadorTipo === 'terceiro'
        ? draft.contaOrigem
        : emptyContaPagamento(),
  }
}

type EditarCampos = {
  quantidade_animais: string
  peso_bruto_dianteiro_kg: string
  peso_bruto_traseiro_kg: string
  peso_total: string
  valor_kg: string
  valor_imposto: string
  gta_valor: string
  valor_adiantamento: string
}

function rowToEditarCampos(row: CompraDetalheRow): EditarCampos {
  return {
    quantidade_animais: formatIntegerInput(String(row.quantidade_animais)),
    peso_bruto_dianteiro_kg: formatDecimalInput(
      String(row.peso_bruto_dianteiro_kg ?? 0).replace('.', ','),
    ),
    peso_bruto_traseiro_kg: formatDecimalInput(
      String(row.peso_bruto_traseiro_kg ?? 0).replace('.', ','),
    ),
    peso_total: formatDecimalInput(String(row.peso_total).replace('.', ',')),
    valor_kg: formatCurrencyFromNumber(row.valor_kg),
    valor_imposto:
      row.tipo_imposto === 'percentual'
        ? formatDecimalInput(String(row.valor_imposto).replace('.', ','))
        : formatCurrencyFromNumber(row.valor_imposto),
    gta_valor: formatCurrencyFromNumber(row.gta_valor),
    valor_adiantamento: formatCurrencyFromNumber(Number(row.valor_total || 0)),
  }
}

function dadosParaCalculo(
  editar: CompraDetalheRow,
  campos: EditarCampos,
): CompraDetalheRow {
  const quantidade_animais = parseIntegerInput(campos.quantidade_animais)
  const pecas = pecasPrevistasPorAnimais(quantidade_animais)

  return {
    ...editar,
    quantidade_animais,
    qtd_dianteiro: pecas.qtd_dianteiro,
    qtd_traseiro: pecas.qtd_traseiro,
    peso_bruto_dianteiro_kg: parseDecimalInput(campos.peso_bruto_dianteiro_kg),
    peso_bruto_traseiro_kg: parseDecimalInput(campos.peso_bruto_traseiro_kg),
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

function resolverValorTotalCompra(
  row: CompraDetalheRow,
  campos?: EditarCampos,
  ignorarAdiantamento = false,
): number {
  if (row.adiantamento && !ignorarAdiantamento) {
    if (campos) {
      return parseCurrencyInput(campos.valor_adiantamento || '')
    }
    return Number(row.valor_total || 0)
  }

  const fromDetalhes = row.detalhes_custo?.total
  if (fromDetalhes != null && Number(fromDetalhes) > 0) {
    return Number(fromDetalhes)
  }

  if (row.valor_total != null && Number(row.valor_total) > 0) {
    return Number(row.valor_total)
  }

  if (campos) {
    return calcularTotal(dadosParaCalculo(row, campos))
  }

  return calcularTotal(row)
}

function validarCamposCompra(
  editar: CompraDetalheRow,
  campos: EditarCampos,
): CompraDetalheRow | null {
  const dados = dadosParaCalculo(editar, campos)

  if (dados.quantidade_animais <= 0) {
    toast.error('Informe a quantidade de animais')
    return null
  }

  if (dados.peso_total <= 0) {
    toast.error('Informe o peso total')
    return null
  }

  if (dados.valor_kg <= 0) {
    toast.error('Informe o valor por kg')
    return null
  }

  return dados
}

function statusPosConversaoCompra(valorTotal: number, valorPago: number) {
  return valorPago >= valorTotal - 0.02 ? 'Pago' : 'Pendente'
}

function criarSetupPagamentoInicial(row: CompraDetalheRow) {
  const dataBase =
    row.data?.slice(0, 10) || new Date().toISOString().slice(0, 10)

  return {
    qtdParcelas: '1',
    parcelas: [
      {
        valor: '',
        data: dataBase,
        pago: false,
        formaPagamento: row.forma_pagamento || 'Pix',
      },
    ] as ParcelaDraft[],
  }
}

function statusParcelaLabel(parcela: CompraParcela) {
  if (parcela.status === 'pago') return 'Pago'

  const hoje = new Date()
  hoje.setHours(12, 0, 0, 0)
  const vencimento = new Date(`${parcela.data_vencimento.slice(0, 10)}T12:00:00`)

  if (vencimento < hoje) return 'Atrasado'

  return 'Pendente'
}

function mostrarAvisoContaPagamentoSeNecessario() {
  const aviso = pagamentosComprasService.consumeAvisoContaPagamento()
  if (aviso) {
    toast(aviso, { duration: 8000, icon: '⚠️' })
  }
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
    peso_bruto_dianteiro_kg: '',
    peso_bruto_traseiro_kg: '',
    peso_total: '',
    valor_kg: '',
    valor_imposto: '',
    gta_valor: '',
    valor_adiantamento: '',
  })
  const [parcelas, setParcelas] = useState<CompraParcela[]>([])
  const [loadingParcelas, setLoadingParcelas] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [parcelasDraft, setParcelasDraft] = useState<
    Record<number, ParcelaDraftEdicao>
  >({})

  const [setupPagamento, setSetupPagamento] = useState({
    qtdParcelas: '1',
    parcelas: [] as ParcelaDraft[],
  })
  const [fornecedorConta, setFornecedorConta] = useState<ContaPagamentoData>(
    emptyContaPagamento(),
  )
  const [setupContaPagamento, setSetupContaPagamento] =
    useState<ContaPagamentoData>(emptyContaPagamento())
  const [reconfigurando, setReconfigurando] = useState(false)
  const [adicionandoParcela, setAdicionandoParcela] = useState(false)
  const [novaParcelaDraft, setNovaParcelaDraft] = useState<{
    valor: string
    data: string
    formaPagamento: string
    contaPagamento: ContaPagamentoData
  } | null>(null)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [romaneioOpen, setRomaneioOpen] = useState(false)
  const [entradaEstoqueCompra, setEntradaEstoqueCompra] =
    useState<CompraRomaneioRef | null>(null)
  const [fornecedorDetalhe, setFornecedorDetalhe] = useState<any>(null)
  const [completandoCompra, setCompletandoCompra] = useState(false)

  useEffect(() => {
    if (compra) {
      setEditar(compra)
      setEditarCampos(rowToEditarCampos(compra))
      setTab(initialTab)
      setCompletandoCompra(false)
    }
  }, [compra, initialTab])

  useEffect(() => {
    if (!compra) return

    const compraAtual = compra
    const compraId = compraAtual.id
    const fornecedorId = compraAtual.fornecedor_id
    const formaPadrao = compraAtual.forma_pagamento || 'Pix'

    setReconfigurando(false)
    setAdicionandoParcela(false)
    setNovaParcelaDraft(null)
    setSetupPagamento(criarSetupPagamentoInicial(compraAtual))

    async function carregar() {
      setLoadingParcelas(true)

      try {
        const [lista, fornecedor] = await Promise.all([
          pagamentosComprasService.getByCompraId(compraId),
          fornecedoresService.getById(fornecedorId).catch(() => null),
        ])

        const contaFornecedor = contaPagamentoFromFornecedor(fornecedor)
        setFornecedorConta(contaFornecedor)
        setFornecedorDetalhe(fornecedor)
        setSetupContaPagamento(contaFornecedor)
        setParcelas(lista)

        if (lista.length === 0) {
          setSetupPagamento(criarSetupPagamentoInicial(compraAtual))
        }

        const hoje = new Date().toISOString().slice(0, 10)
        setParcelasDraft(
          Object.fromEntries(
            lista.map((p) => {
              const contaSalva = contaPagamentoFromParcela(p)

              return [
                p.id,
                {
                  valor: formatCurrencyFromNumber(Number(p.valor)),
                  dataPagamento:
                    p.data_pagamento?.slice(0, 10) ||
                    p.data_vencimento?.slice(0, 10) ||
                    hoje,
                  vencimento: p.data_vencimento?.slice(0, 10) || hoje,
                  formaPagamento: p.forma_pagamento || formaPadrao,
                  contaPagamento: contaPagamentoTemDados(contaSalva)
                    ? contaSalva
                    : contaFornecedor,
                  pagadorTipo:
                    p.pagador_tipo === 'terceiro' ? 'terceiro' : 'proprio',
                  contaOrigem: contaOrigemFromParcela(p),
                },
              ]
            }),
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
  }, [compra?.id])

  const valorTotalCompra = useMemo(() => {
    if (!editar) return 0
    return resolverValorTotalCompra(
      editar,
      editarCampos,
      completandoCompra,
    )
  }, [editar, editarCampos, completandoCompra])

  const resumo = useMemo(() => {
    const pagas = parcelas.filter((p) => p.status === 'pago')
    const pendentes = parcelas.filter((p) => p.status !== 'pago')

    const valorPago = pagas.reduce((acc, p) => acc + Number(p.valor || 0), 0)
    const valorPendente = pendentes.reduce(
      (acc, p) => acc + Number(p.valor || 0),
      0,
    )

    return {
      valorPago,
      valorPendente,
      qtdPagas: pagas.length,
      qtdPendentes: pendentes.length,
      saldoAberto: Math.max(0, valorTotalCompra - valorPago),
      saldoNaoPlanejado: Math.max(
        0,
        valorTotalCompra - valorPago - valorPendente,
      ),
    }
  }, [parcelas, valorTotalCompra])

  const somaSetup = somaValoresParcelas(setupPagamento.parcelas)
  const setupExcedeTotal = somaParcelasExcedeTotal(
    setupPagamento.parcelas,
    valorTotalCompra,
  )
  const setupCompleto = conferemValoresParcelas(
    setupPagamento.parcelas,
    valorTotalCompra,
  )
  const setupPodeSalvar =
    parcelasDraftValidas(setupPagamento.parcelas) && !setupExcedeTotal
  const saldoSetupNaoPlanejado = Math.max(0, valorTotalCompra - somaSetup)

  const podeReconfigurarParcelas =
    parcelas.length > 0 && parcelas.every((p) => p.status !== 'pago')
  const mostrarSetupParcelas = parcelas.length === 0 || reconfigurando

  async function exportarPdfPagamento() {
    if (!compra || !editar) return

    try {
      setDownloadingPdf(true)

      const dados = dadosParaCalculo(editar, editarCampos)
      const total = resolverValorTotalCompra(editar, editarCampos)
      const subtotal = editar.adiantamento
        ? total
        : calcularSubtotal(dados)
      const imposto = editar.adiantamento
        ? 0
        : calcularImposto(dados)
      const gta = editar.adiantamento ? 0 : Number(dados.gta_valor || 0)
      const viagem = editar.adiantamento
        ? 0
        : Math.max(0, total - subtotal - imposto - gta)

      const { pdfInput } = await buildCompraPagamentoPdfInput({
        ...editar,
        quantidade_animais: dados.quantidade_animais,
        peso_total: dados.peso_total,
        valor_kg: dados.valor_kg,
        valor_imposto: dados.valor_imposto,
        gta_valor: dados.gta_valor,
        valor_total: total,
        subtotal,
        detalhes_custo: { viagem, total },
        fornecedor: fornecedorDetalhe
          ? {
              id: fornecedorDetalhe.id,
              nome: fornecedorDetalhe.nome,
              doc: fornecedorDetalhe.doc,
              telefone: fornecedorDetalhe.telefone,
            }
          : editar.fornecedor
            ? {
                id: editar.fornecedor.id,
                nome: editar.fornecedor.nome,
              }
            : undefined,
      })
      const { gerarCompraPagamentoPdf } = await import('@/utils/compraPagamentoPdf')

      await gerarCompraPagamentoPdf(pdfInput)

      toast.success('PDF baixado')
    } catch {
      toast.error('Erro ao gerar PDF')
    } finally {
      setDownloadingPdf(false)
    }
  }

  async function recarregarParcelas() {
    if (!compra) return

    const lista = await pagamentosComprasService.getByCompraId(compra.id)
    setParcelas(lista)
    onUpdated()
  }

  async function registrarPagamento(parcela: CompraParcela) {
    const draft = parcelasDraft[parcela.id]
    if (!draft) return

    const erroPagador = validarPagadorParcela(
      draft.pagadorTipo,
      draft.contaOrigem,
      true,
    )
    if (erroPagador) {
      toast.error(erroPagador)
      return
    }

    try {
      setSalvando(true)

      await pagamentosComprasService.atualizarPendente(parcela.id, {
        valor: parseCurrencyInput(draft.valor),
        data_vencimento: draft.vencimento,
        forma_pagamento: draft.formaPagamento,
        contaPagamento: draft.contaPagamento,
        ...pagadorPayloadFromDraft(draft),
      })

      await pagamentosComprasService.marcarComoPago(parcela.id, {
        data_pagamento: draft.dataPagamento,
        valor: parseCurrencyInput(draft.valor),
        forma_pagamento: draft.formaPagamento,
        contaPagamento: draft.contaPagamento,
        ...pagadorPayloadFromDraft(draft),
      })

      toast.success(
        `Pagamento registrado: ${formatCurrency(parseCurrencyInput(draft.valor))} em ${formatDateBr(draft.dataPagamento)}`,
      )
      mostrarAvisoContaPagamentoSeNecessario()
      await recarregarParcelas()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao registrar pagamento'
      toast.error(msg)
    } finally {
      setSalvando(false)
    }
  }

  async function salvarParcela(parcela: CompraParcela) {
    const draft = parcelasDraft[parcela.id]
    if (!draft) return

    const valor = parseCurrencyInput(draft.valor)
    if (valor <= 0) {
      toast.error('Informe um valor válido')
      return
    }

    if (parcela.status === 'pago') {
      const erroPagador = validarPagadorParcela(
        draft.pagadorTipo,
        draft.contaOrigem,
        true,
      )
      if (erroPagador) {
        toast.error(erroPagador)
        return
      }
    }

    try {
      setSalvando(true)

      if (parcela.status === 'pago') {
        await pagamentosComprasService.atualizarParcela(parcela.id, {
          valor,
          data_pagamento: draft.dataPagamento,
          forma_pagamento: draft.formaPagamento,
          contaPagamento: draft.contaPagamento,
          ...pagadorPayloadFromDraft(draft),
        })
        toast.success('Pagamento atualizado')
      } else {
        await pagamentosComprasService.atualizarParcela(parcela.id, {
          valor,
          data_vencimento: draft.vencimento,
          forma_pagamento: draft.formaPagamento,
          contaPagamento: draft.contaPagamento,
        })
        toast.success('Parcela atualizada')
      }

      mostrarAvisoContaPagamentoSeNecessario()
      await recarregarParcelas()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao salvar parcela'
      toast.error(msg)
    } finally {
      setSalvando(false)
    }
  }

  async function reverterParcelaParaPendente(parcela: CompraParcela) {
    const draft = parcelasDraft[parcela.id]
    if (!draft) return

    if (
      !confirm(
        'Marcar esta parcela como pendente novamente? O pagamento registrado será desfeito.',
      )
    ) {
      return
    }

    try {
      setSalvando(true)

      await pagamentosComprasService.atualizarParcela(parcela.id, {
        valor: parseCurrencyInput(draft.valor),
        data_vencimento: draft.vencimento || draft.dataPagamento,
        forma_pagamento: draft.formaPagamento,
        contaPagamento: draft.contaPagamento,
        status: 'pendente',
      })

      toast.success('Parcela marcada como pendente')
      mostrarAvisoContaPagamentoSeNecessario()
      await recarregarParcelas()
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : 'Erro ao reverter parcela'
      toast.error(msg)
    } finally {
      setSalvando(false)
    }
  }

  async function excluirParcela(parcela: CompraParcela) {
    if (
      !confirm(
        parcela.status === 'pago'
          ? 'Excluir este pagamento registrado? Esta ação não pode ser desfeita.'
          : 'Excluir esta parcela?',
      )
    ) {
      return
    }

    try {
      setSalvando(true)
      await pagamentosComprasService.excluirParcela(parcela.id)
      toast.success(
        parcela.status === 'pago' ? 'Pagamento excluído' : 'Parcela excluída',
      )
      await recarregarParcelas()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao excluir parcela'
      toast.error(msg)
    } finally {
      setSalvando(false)
    }
  }

  async function salvarConfiguracaoParcelas() {
    if (!compra || !setupPodeSalvar) return

    for (let index = 0; index < setupPagamento.parcelas.length; index += 1) {
      const parcela = setupPagamento.parcelas[index]
      if (!parcela.pago) continue
      const erro = validarPagadorParcela(
        parcela.pagadorTipo || 'proprio',
        parcela.contaOrigem || emptyContaPagamento(),
        true,
      )
      if (erro) {
        toast.error(`Parcela ${index + 1}: ${erro}`)
        return
      }
    }

    try {
      setSalvando(true)

      const config = {
        parcelas: setupPagamento.parcelas,
        contaPagamento: setupContaPagamento,
      }

      if (reconfigurando) {
        await pagamentosComprasService.regenerarForCompra(compra.id, config)
      } else {
        await pagamentosComprasService.configurarParcelas(compra.id, config)
      }

      await comprasService.update(compra.id, {
        forma_pagamento: formaPagamentoResumoCompra(setupPagamento.parcelas),
      })
      await pagamentosComprasService.syncCompraQuitacao(compra.id)

      toast.success(
        reconfigurando ? 'Parcelas reconfiguradas' : 'Parcelas salvas',
      )
      mostrarAvisoContaPagamentoSeNecessario()
      setReconfigurando(false)
      await recarregarParcelas()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao salvar parcelas'
      toast.error(msg)
    } finally {
      setSalvando(false)
    }
  }

  function iniciarAdicaoParcela() {
    const hoje = new Date().toISOString().slice(0, 10)
    const forma =
      compra?.forma_pagamento || parcelas[0]?.forma_pagamento || 'Pix'
    const sugestao =
      resumo.saldoNaoPlanejado > 0
        ? formatCurrencyFromNumber(resumo.saldoNaoPlanejado)
        : ''

    setNovaParcelaDraft({
      valor: sugestao,
      data: hoje,
      formaPagamento: forma,
      contaPagamento: { ...fornecedorConta },
    })
    setAdicionandoParcela(true)
  }

  async function salvarNovaParcela() {
    if (!compra || !novaParcelaDraft) return

    const valor = parseCurrencyInput(novaParcelaDraft.valor)
    if (valor <= 0 || !novaParcelaDraft.data) {
      toast.error('Informe valor e data da parcela')
      return
    }

    const somaFutura =
      resumo.valorPago + resumo.valorPendente + valor

    if (somaFutura > valorTotalCompra + 0.02) {
      toast.error('A soma das parcelas não pode ultrapassar o total da compra')
      return
    }

    try {
      setSalvando(true)

      await pagamentosComprasService.adicionarParcelas(compra.id, {
        parcelas: [
          {
            valor: novaParcelaDraft.valor,
            data: novaParcelaDraft.data,
            pago: false,
            formaPagamento: novaParcelaDraft.formaPagamento,
          },
        ],
        contaPagamento: novaParcelaDraft.contaPagamento,
      })

      await comprasService.update(compra.id, {
        forma_pagamento: formaPagamentoResumoCompra([
          ...parcelas.map((p) => ({
            valor: '',
            data: '',
            pago: false,
            formaPagamento: p.forma_pagamento || 'Pix',
          })),
          {
            valor: '',
            data: '',
            pago: false,
            formaPagamento: novaParcelaDraft.formaPagamento,
          },
        ]),
      })

      toast.success('Parcela adicionada')
      mostrarAvisoContaPagamentoSeNecessario()
      setAdicionandoParcela(false)
      setNovaParcelaDraft(null)
      await recarregarParcelas()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao adicionar parcela'
      toast.error(msg)
    } finally {
      setSalvando(false)
    }
  }

  function iniciarReconfiguracaoParcelas() {
    setSetupPagamento({
      qtdParcelas: String(parcelas.length),
      parcelas: parcelas.map((p) => ({
        valor: formatCurrencyFromNumber(Number(p.valor)),
        data: p.data_vencimento?.slice(0, 10) || '',
        pago: false,
        formaPagamento: p.forma_pagamento || 'Pix',
      })),
    })
    setReconfigurando(true)
  }

  function iniciarCompletarCompra() {
    if (!editar) return

    setCompletandoCompra(true)
    setEditar({
      ...editar,
      condicao_gado: editar.condicao_gado ?? 1,
      tipo_imposto: editar.tipo_imposto || 'fixo',
    })
  }

  async function salvarDadosCompra() {
    if (!editar) return

    try {
      setSalvando(true)

      if (editar.adiantamento && !completandoCompra) {
        const valorTotal = parseCurrencyInput(editarCampos.valor_adiantamento)

        if (valorTotal <= 0) {
          toast.error('Informe um valor válido para o adiantamento')
          return
        }

        await comprasService.update(editar.id, {
          fornecedor_id: editar.fornecedor_id,
          data: editar.data,
          adiantamento: true,
          quantidade_animais: 0,
          qtd_dianteiro: 0,
          qtd_traseiro: 0,
          peso_bruto_dianteiro_kg: 0,
          peso_bruto_traseiro_kg: 0,
          condicao_gado: editar.condicao_gado,
          peso_total: 0,
          valor_kg: 0,
          tipo_imposto: 'fixo',
          valor_imposto: 0,
          gta_valor: 0,
          subtotal: valorTotal,
          valor_total: valorTotal,
          tipo_gado: null,
          observacoes: editar.observacoes,
          status: 'Adiantamento',
        })

        toast.success('Adiantamento atualizado')
        onUpdated()
        return
      }

      const dados = validarCamposCompra(editar, editarCampos)
      if (!dados) return

      const subtotal = calcularSubtotal(dados)
      const valorTotal = calcularTotal(dados)
      const convertendo = editar.adiantamento && completandoCompra

      if (convertendo && valorTotal + 0.02 < resumo.valorPago) {
        toast.error(
          `O total da compra não pode ser menor que o valor já pago (${formatCurrency(resumo.valorPago)})`,
        )
        return
      }

      const novoStatus = convertendo
        ? statusPosConversaoCompra(valorTotal, resumo.valorPago)
        : editar.status

      await comprasService.update(editar.id, {
        fornecedor_id: editar.fornecedor_id,
        data: editar.data,
        adiantamento: false,
        quantidade_animais: dados.quantidade_animais,
        qtd_dianteiro: dados.qtd_dianteiro,
        qtd_traseiro: dados.qtd_traseiro,
        peso_bruto_dianteiro_kg: dados.peso_bruto_dianteiro_kg,
        peso_bruto_traseiro_kg: dados.peso_bruto_traseiro_kg,
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
        status: novoStatus,
        pagamento_quitado: resumo.valorPago >= valorTotal - 0.02,
      })

      setEditar({
        ...editar,
        adiantamento: false,
        quantidade_animais: dados.quantidade_animais,
        qtd_dianteiro: dados.qtd_dianteiro,
        qtd_traseiro: dados.qtd_traseiro,
        peso_bruto_dianteiro_kg: dados.peso_bruto_dianteiro_kg,
        peso_bruto_traseiro_kg: dados.peso_bruto_traseiro_kg,
        peso_total: dados.peso_total,
        valor_kg: dados.valor_kg,
        valor_imposto: dados.valor_imposto,
        gta_valor: dados.gta_valor,
        subtotal,
        valor_total: valorTotal,
        tipo_gado: editar.tipo_gado,
        status: novoStatus,
      })
      setCompletandoCompra(false)

      toast.success(
        convertendo
          ? 'Adiantamento convertido em compra'
          : 'Compra atualizada',
      )
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

  function atualizarPagadorDraft(
    parcelaId: number,
    pagadorTipo: PagadorTipo,
  ) {
    setParcelasDraft((prev) => ({
      ...prev,
      [parcelaId]: {
        ...prev[parcelaId],
        pagadorTipo,
        contaOrigem:
          pagadorTipo === 'terceiro'
            ? prev[parcelaId].contaOrigem
            : emptyContaPagamento(),
      },
    }))
  }

  function atualizarContaOrigemDraft(
    parcelaId: number,
    contaOrigem: ContaPagamentoData,
  ) {
    setParcelasDraft((prev) => ({
      ...prev,
      [parcelaId]: { ...prev[parcelaId], contaOrigem },
    }))
  }

  function atualizarContaDraft(
    parcelaId: number,
    contaPagamento: ContaPagamentoData,
  ) {
    setParcelasDraft((prev) => ({
      ...prev,
      [parcelaId]: { ...prev[parcelaId], contaPagamento },
    }))
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

      if (campo === 'pago' && valor === false) {
        parcelasLista[index] = {
          ...parcelasLista[index],
          pagadorTipo: 'proprio',
          contaOrigem: emptyContaPagamento(),
        }
      }

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

    setSetupPagamento((prev) => {
      const formaPadrao =
        prev.parcelas[0]?.formaPagamento ||
        editar?.forma_pagamento ||
        'Pix'
      let parcelasLista = [...prev.parcelas]

      if (qtd > parcelasLista.length) {
        while (parcelasLista.length < qtd) {
          parcelasLista.push({
            valor: '',
            data: dataBase,
            pago: false,
            formaPagamento: formaPadrao,
            pagadorTipo: 'proprio',
            contaOrigem: emptyContaPagamento(),
          })
        }
      } else if (qtd > 0 && qtd < parcelasLista.length) {
        parcelasLista = parcelasLista.slice(0, qtd)
      }

      return {
        ...prev,
        qtdParcelas,
        parcelas: parcelasLista,
      }
    })
  }

  function adicionarParcelaSetup() {
    const dataBase = editar?.data || new Date().toISOString().slice(0, 10)

    setSetupPagamento((prev) => {
      const formaPadrao =
        prev.parcelas[prev.parcelas.length - 1]?.formaPagamento || 'Pix'

      return {
        ...prev,
        qtdParcelas: String(prev.parcelas.length + 1),
        parcelas: [
          ...prev.parcelas,
          {
            valor: '',
            data: dataBase,
            pago: false,
            formaPagamento: formaPadrao,
          },
        ],
      }
    })
  }

  async function handleRomaneioSalvo(compraRef?: CompraRomaneioRef) {
    if (editar?.id) {
      try {
        const romaneio = await romaneiosService.getByCompraId(editar.id)
        if (romaneio) {
          setEditar((prev) =>
            prev
              ? {
                  ...prev,
                  romaneio: {
                    id: romaneio.id,
                    data_romaneio: romaneio.data_romaneio,
                  },
                }
              : prev,
          )
        }
      } catch {
        // mantém fluxo mesmo se não recarregar o vínculo
      }
    }
    onUpdated?.()
    if (compraRef) {
      setRomaneioOpen(false)
      setEntradaEstoqueCompra(compraRef)
    }
  }

  const romaneioCompraRef = useMemo(
    () =>
      editar
        ? compraToRomaneioRef({
            id: editar.id,
            data: editar.data,
            quantidade_animais: editar.quantidade_animais,
            tipo_gado: editar.tipo_gado,
            fornecedor_id: editar.fornecedor_id,
            fornecedor: editar.fornecedor,
            observacoes: editar.observacoes,
            peso_bruto_dianteiro_kg: editar.peso_bruto_dianteiro_kg,
            peso_bruto_traseiro_kg: editar.peso_bruto_traseiro_kg,
          })
        : null,
    [
      editar?.id,
      editar?.data,
      editar?.quantidade_animais,
      editar?.tipo_gado,
      editar?.fornecedor_id,
      editar?.fornecedor?.nome,
      editar?.observacoes,
    ],
  )

  if (!compra || !editar) return null

  const fornecedorNome =
    editar.fornecedor?.nome ||
    fornecedores.find((f) => f.id === editar.fornecedor_id)?.nome ||
    'Fornecedor'

  return (
    <Modal
      open={!!compra}
      onClose={onClose}
      title={
        editar.adiantamento
          ? completandoCompra
            ? `Completar compra — ${fornecedorNome}`
            : `Adiantamento — ${fornecedorNome}`
          : `Compra — ${fornecedorNome}`
      }
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
          Dados{' '}
          {editar.adiantamento && !completandoCompra
            ? 'do adiantamento'
            : 'da compra'}
        </button>
      </nav>

      {!editar.adiantamento && (
      <div className={styles.modalToolbar}>
        <Button variant="outline" onClick={() => setRomaneioOpen(true)}>
          <ClipboardList size={16} aria-hidden />
          {editar?.romaneio &&
          (Array.isArray(editar.romaneio) ? editar.romaneio[0] : editar.romaneio)
            ? 'Ver romaneio salvo'
            : 'Romaneio de pesagem'}
        </Button>
        <Button
          variant="ghost"
          onClick={() =>
            romaneioCompraRef && setEntradaEstoqueCompra(romaneioCompraRef)
          }
        >
          <Beef size={16} aria-hidden />
          Entrada estoque
        </Button>
      </div>
      )}

      {tab === 'pagamento' && (
        <div className={styles.pagamentoPainel}>
          {editar.adiantamento && (
            <p className={styles.completarIntro}>
              Este registro ainda é um adiantamento. Quando souber quantidade,
              peso e valor final, vá em <strong>Dados da compra</strong> e use{' '}
              <strong>Completar com dados do gado</strong>.
            </p>
          )}

          <div className={styles.pagamentoToolbar}>
            <p className={styles.pagamentoToolbarHint}>
              Exporte o resumo de pagamento para enviar ao fornecedor.
            </p>
            <Button
              variant="outline"
              loading={downloadingPdf}
              disabled={downloadingPdf || loadingParcelas}
              onClick={exportarPdfPagamento}
            >
              <Download size={16} aria-hidden />
              Baixar PDF
            </Button>
          </div>

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
              <strong>{formatCurrency(resumo.saldoAberto)}</strong>
              <small>
                {resumo.saldoNaoPlanejado > 0.02
                  ? `${formatCurrency(resumo.saldoNaoPlanejado)} sem parcela definida`
                  : `${resumo.qtdPendentes} parcela(s) planejada(s)`}
              </small>
            </div>
          </div>

          {!loadingParcelas && contaPagamentoTemDados(fornecedorConta) && (
            <ContaPagamentoResumo
              className={styles.contaFornecedorResumo}
              titulo="Dados bancários do fornecedor"
              hint={
                parcelas.length > 0
                  ? 'Referência para pagamento. Nas parcelas pendentes você pode alterar a conta se o pagamento for para outra pessoa.'
                  : 'Preenchidos automaticamente do cadastro do fornecedor.'
              }
              value={fornecedorConta}
            />
          )}

          {loadingParcelas ? (
            <p className={styles.loadingText}>Carregando parcelas...</p>
          ) : mostrarSetupParcelas ? (
            <div className={styles.setupBox}>
              <h3 className={styles.setupTitle}>
                {reconfigurando
                  ? 'Reconfigurar pagamento'
                  : 'Configurar pagamento'}
              </h3>
              <p className={styles.setupHint}>
                {reconfigurando
                  ? 'Ajuste quantidade, valores e datas. Parcelas já pagas impedem esta ação.'
                  : 'Registre o que vai pagar agora — não precisa fechar o total de uma vez. Salve e volte depois para adicionar mais parcelas.'}
              </p>

              <div className={styles.setupFields}>
                <Input
                  label="Quantidade de parcelas"
                  mask="integer"
                  value={setupPagamento.qtdParcelas}
                  onChange={(e) => atualizarQtdSetup(e.target.value)}
                />
              </div>

              <ContaPagamentoFields
                className={styles.contaPagamentoParcela}
                value={setupContaPagamento}
                onChange={setSetupContaPagamento}
                onRestaurarFornecedor={() =>
                  setSetupContaPagamento({ ...fornecedorConta })
                }
              />

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
                        label="Forma de pagamento"
                        options={[...FORMAS_PAGAMENTO]}
                        value={parcela.formaPagamento || 'Pix'}
                        onChange={(e) =>
                          atualizarSetupParcela(
                            index,
                            'formaPagamento',
                            e.target.value,
                          )
                        }
                      />
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
                    {parcela.pago && (
                      <div className={styles.parcelaPagadorSetup}>
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
                            const pagadorTipo = opcao?.value || 'proprio'
                            setSetupPagamento((prev) => {
                              const parcelasLista = [...prev.parcelas]
                              parcelasLista[index] = {
                                ...parcelasLista[index],
                                pagadorTipo,
                                contaOrigem:
                                  pagadorTipo === 'terceiro'
                                    ? parcelasLista[index].contaOrigem ||
                                      emptyContaPagamento()
                                    : emptyContaPagamento(),
                              }
                              return { ...prev, parcelas: parcelasLista }
                            })
                          }}
                        />
                        {parcela.pagadorTipo === 'terceiro' && (
                          <ContaPagamentoFields
                            className={styles.contaPagamentoParcela}
                            titulo="Conta de origem do pagamento"
                            hint="Informe o banco/conta de onde saiu o valor (quem pagou)."
                            value={
                              parcela.contaOrigem || emptyContaPagamento()
                            }
                            onChange={(contaOrigem) =>
                              setSetupPagamento((prev) => {
                                const parcelasLista = [...prev.parcelas]
                                parcelasLista[index] = {
                                  ...parcelasLista[index],
                                  contaOrigem,
                                }
                                return { ...prev, parcelas: parcelasLista }
                              })
                            }
                          />
                        )}
                      </div>
                    )}
                  </article>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={adicionarParcelaSetup}
              >
                + Adicionar parcela
              </Button>

              <div
                className={[
                  styles.somaBox,
                  setupExcedeTotal && styles.somaBoxErro,
                  !setupExcedeTotal &&
                    !setupCompleto &&
                    saldoSetupNaoPlanejado > 0.02 &&
                    styles.somaBoxAviso,
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                Soma: <strong>{formatCurrency(somaSetup)}</strong> · Total:{' '}
                <strong>{formatCurrency(valorTotalCompra)}</strong>
                {setupExcedeTotal && (
                  <p className={styles.setupErroHint}>
                    A soma das parcelas ultrapassa o total da compra. Reduza os
                    valores.
                  </p>
                )}
                {!setupExcedeTotal && saldoSetupNaoPlanejado > 0.02 && (
                  <p className={styles.setupAvisoHint}>
                    Falta planejar {formatCurrency(saldoSetupNaoPlanejado)} — você
                    pode salvar assim e adicionar mais parcelas depois.
                  </p>
                )}
              </div>

              <div className={styles.setupActions}>
                {reconfigurando && (
                  <Button
                    variant="outline"
                    onClick={() => setReconfigurando(false)}
                    disabled={salvando}
                  >
                    Cancelar
                  </Button>
                )}
                <Button
                  onClick={salvarConfiguracaoParcelas}
                  disabled={!setupPodeSalvar || salvando}
                >
                  {reconfigurando ? 'Salvar nova configuração' : 'Salvar parcelas'}
                </Button>
              </div>
            </div>
          ) : (
            <>
              {podeReconfigurarParcelas && (
                <div className={styles.reconfigurarBar}>
                  <p>
                    Para substituir todas as parcelas pendentes de uma vez, use a
                    reconfiguração.
                  </p>
                  <Button variant="outline" onClick={iniciarReconfiguracaoParcelas}>
                    Reconfigurar parcelas
                  </Button>
                </div>
              )}
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
                        {pago && parcela.data_pagamento && (
                          <span className={styles.vencimentoLabel}>
                            Pago em {formatDateBr(parcela.data_pagamento)}
                            {' · '}
                            {pagadorTipoLabel(parcela.pagador_tipo)}
                          </span>
                        )}
                        {pago &&
                          parcela.pagador_tipo === 'terceiro' &&
                          contaPagamentoTemDados(
                            contaOrigemFromParcela(parcela),
                          ) && (
                            <span className={styles.pagadorOrigemResumo}>
                              Origem:{' '}
                              {formatContaPagamentoResumo(
                                contaOrigemFromParcela(parcela),
                              )}
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

                    {draft && (
                      <>
                        <div className={styles.parcelaCardGrid}>
                          <Input
                            label="Valor (R$)"
                            mask="currency"
                            value={draft.valor}
                            onChange={(e) =>
                              atualizarDraft(parcela.id, 'valor', e.target.value)
                            }
                          />
                          {!pago && (
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
                          )}
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
                        <Select
                          label="Quem está pagando?"
                          options={PAGADOR_TIPO_OPCOES.map((o) => o.label)}
                          value={
                            PAGADOR_TIPO_OPCOES.find(
                              (o) => o.value === draft.pagadorTipo,
                            )?.label || PAGADOR_TIPO_OPCOES[0].label
                          }
                          onChange={(e) => {
                            const opcao = PAGADOR_TIPO_OPCOES.find(
                              (o) => o.label === e.target.value,
                            )
                            atualizarPagadorDraft(
                              parcela.id,
                              opcao?.value || 'proprio',
                            )
                          }}
                        />
                        {draft.pagadorTipo === 'terceiro' && (
                          <ContaPagamentoFields
                            className={styles.contaPagamentoParcela}
                            titulo="Conta de origem do pagamento"
                            hint="Informe o banco/conta de onde saiu o valor (quem pagou)."
                            value={draft.contaOrigem}
                            onChange={(conta) =>
                              atualizarContaOrigemDraft(parcela.id, conta)
                            }
                          />
                        )}
                        <ContaPagamentoFields
                          className={styles.contaPagamentoParcela}
                          titulo="Conta para pagamento (fornecedor)"
                          hint="Conta de destino — dados do fornecedor ou outra conta indicada."
                          value={draft.contaPagamento}
                          onChange={(conta) =>
                            atualizarContaDraft(parcela.id, conta)
                          }
                          onRestaurarFornecedor={() =>
                            atualizarContaDraft(parcela.id, {
                              ...fornecedorConta,
                            })
                          }
                        />
                        <div className={styles.parcelaCardActions}>
                          <Button
                            variant="outline"
                            onClick={() => salvarParcela(parcela)}
                            disabled={salvando}
                          >
                            Salvar alterações
                          </Button>
                          {!pago && (
                            <Button
                              onClick={() => registrarPagamento(parcela)}
                              disabled={salvando}
                            >
                              Registrar pagamento
                            </Button>
                          )}
                          {pago && (
                            <Button
                              variant="ghost"
                              onClick={() => reverterParcelaParaPendente(parcela)}
                              disabled={salvando}
                            >
                              Marcar como pendente
                            </Button>
                          )}
                          <Button
                            variant="destructive"
                            onClick={() => excluirParcela(parcela)}
                            disabled={salvando}
                          >
                            Excluir parcela
                          </Button>
                        </div>
                      </>
                    )}
                  </article>
                )
              })}
            </div>

            {resumo.saldoAberto > 0.02 && (
              <div className={styles.adicionarParcelaBox}>
                {!adicionandoParcela ? (
                  <>
                    <p>
                      Ainda falta {formatCurrency(resumo.saldoAberto)} nesta compra.
                      {resumo.saldoNaoPlanejado > 0.02 &&
                        ` ${formatCurrency(resumo.saldoNaoPlanejado)} ainda não tem parcela.`}
                    </p>
                    <Button variant="outline" onClick={iniciarAdicaoParcela}>
                      + Adicionar parcela
                    </Button>
                  </>
                ) : (
                  novaParcelaDraft && (
                    <article className={styles.parcelaCard}>
                      <header className={styles.parcelaCardHead}>
                        <strong>Nova parcela</strong>
                      </header>
                      <div className={styles.parcelaCardGrid}>
                        <Input
                          label="Valor (R$)"
                          mask="currency"
                          value={novaParcelaDraft.valor}
                          onChange={(e) =>
                            setNovaParcelaDraft({
                              ...novaParcelaDraft,
                              valor: e.target.value,
                            })
                          }
                        />
                        <Input
                          label="Vencimento"
                          type="date"
                          value={novaParcelaDraft.data}
                          onChange={(e) =>
                            setNovaParcelaDraft({
                              ...novaParcelaDraft,
                              data: e.target.value,
                            })
                          }
                        />
                        <Select
                          label="Forma de pagamento"
                          options={[...FORMAS_PAGAMENTO]}
                          value={novaParcelaDraft.formaPagamento}
                          onChange={(e) =>
                            setNovaParcelaDraft({
                              ...novaParcelaDraft,
                              formaPagamento: e.target.value,
                            })
                          }
                        />
                      </div>
                      <ContaPagamentoFields
                        className={styles.contaPagamentoParcela}
                        value={novaParcelaDraft.contaPagamento}
                        onChange={(conta) =>
                          setNovaParcelaDraft({
                            ...novaParcelaDraft,
                            contaPagamento: conta,
                          })
                        }
                        onRestaurarFornecedor={() =>
                          setNovaParcelaDraft({
                            ...novaParcelaDraft,
                            contaPagamento: { ...fornecedorConta },
                          })
                        }
                      />
                      <div className={styles.parcelaCardActions}>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setAdicionandoParcela(false)
                            setNovaParcelaDraft(null)
                          }}
                          disabled={salvando}
                        >
                          Cancelar
                        </Button>
                        <Button onClick={salvarNovaParcela} disabled={salvando}>
                          Salvar parcela
                        </Button>
                      </div>
                    </article>
                  )
                )}
              </div>
            )}
            </>
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
            label={
              editar.adiantamento && !completandoCompra
                ? 'Data'
                : 'Data da compra'
            }
            type="date"
            value={editar.data}
            onChange={(e) => setEditar({ ...editar, data: e.target.value })}
          />

          {editar.adiantamento && !completandoCompra ? (
            <>
              <p className={styles.completarIntro}>
                Registre aqui o pagamento antecipado. Quando souber quantidade,
                peso e valor final do gado, use o botão abaixo para completar a
                compra — os pagamentos já lançados serão mantidos.
              </p>

              <Input
                label="Valor do adiantamento"
                mask="currency"
                value={editarCampos.valor_adiantamento}
                onChange={(e) =>
                  setEditarCampos({
                    ...editarCampos,
                    valor_adiantamento: e.target.value,
                  })
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

              <div className={styles.completarAction}>
                <Button variant="secondary" onClick={iniciarCompletarCompra}>
                  <Beef size={16} aria-hidden />
                  Completar com dados do gado
                </Button>
              </div>
            </>
          ) : (
            <>
          {completandoCompra && (
            <div className={styles.completarBanner}>
              <strong>Adiantamento já registrado</strong>
              <p>
                Valor do adiantamento:{' '}
                <strong>
                  {formatCurrency(
                    parseCurrencyInput(editarCampos.valor_adiantamento) ||
                      Number(editar.valor_total || 0),
                  )}
                </strong>
                {' · '}
                Valor pago: <strong>{formatCurrency(resumo.valorPago)}</strong>
                {' · '}
                Total informado:{' '}
                <strong>{formatCurrency(valorTotalCompra)}</strong>
                {' · '}
                Saldo a pagar:{' '}
                <strong>{formatCurrency(resumo.saldoAberto)}</strong>
              </p>
              {resumo.saldoNaoPlanejado > 0.02 && (
                <p className={styles.completarBannerHint}>
                  Após salvar, confira a aba Pagamento para planejar o saldo
                  restante em parcelas.
                </p>
              )}
            </div>
          )}

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

          <PecasPrevistasPesosFields
            className={styles.pesoMedioResumo}
            quantidadeAnimais={editarCampos.quantidade_animais}
            pesoBrutoDianteiro={editarCampos.peso_bruto_dianteiro_kg}
            pesoBrutoTraseiro={editarCampos.peso_bruto_traseiro_kg}
            onChangePesoDianteiro={(value) =>
              setEditarCampos({
                ...editarCampos,
                peso_bruto_dianteiro_kg: value,
              })
            }
            onChangePesoTraseiro={(value) =>
              setEditarCampos({
                ...editarCampos,
                peso_bruto_traseiro_kg: value,
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

          <PesoMedioResumo
            className={styles.pesoMedioResumo}
            pesoTotal={editarCampos.peso_total}
            quantidadeAnimais={editarCampos.quantidade_animais}
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
            value={calcularTotal(
              dadosParaCalculo(editar, editarCampos),
            ).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
            </>
          )}

          <div className={styles.dadosActions}>
            {completandoCompra && (
              <Button
                variant="outline"
                onClick={() => setCompletandoCompra(false)}
                disabled={salvando}
              >
                Voltar ao adiantamento
              </Button>
            )}
            <Button onClick={salvarDadosCompra} disabled={salvando}>
              {editar.adiantamento && !completandoCompra
                ? 'Salvar adiantamento'
                : completandoCompra
                  ? 'Salvar compra'
                  : 'Salvar dados'}
            </Button>
            <Button variant="danger" onClick={excluirCompra}>
              Excluir{' '}
              {editar.adiantamento && !completandoCompra
                ? 'adiantamento'
                : 'compra'}
            </Button>
          </div>
        </div>
      )}

      <RomaneioModal
        key={romaneioCompraRef ? `compra-${romaneioCompraRef.id}` : 'compra-fechada'}
        open={romaneioOpen}
        compra={romaneioCompraRef}
        onClose={() => setRomaneioOpen(false)}
        onSaved={handleRomaneioSalvo}
      />

      <CompraEntradaEstoqueModal
        open={!!entradaEstoqueCompra}
        compra={entradaEstoqueCompra}
        onClose={() => setEntradaEstoqueCompra(null)}
        onSaved={onUpdated}
      />
    </Modal>
  )
}
