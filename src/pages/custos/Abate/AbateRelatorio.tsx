import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import {
  Download,
  FileBarChart2,
  RefreshCw,
  Undo2,
  Wallet,
} from 'lucide-react'
import { Button, Card, Input, Modal, ModalDetails, Table, tableListStyles } from '@/components/ui'
import type { DetailItem } from '@/components/ui'
import { abatesService } from '@/services/abates.service'
import {
  pagamentosAbatesService,
  type AbateBaixa,
} from '@/services/pagamentosAbates.service'
import { getLogoUrl } from '@/services/theme.service'
import { formatSemanaLabel } from '@/utils/abatePagamento'
import {
  formatCurrencyBr,
  formatDateBr,
  formatKgBr,
  formatPercentBr,
  montarLinhasRelatorioAbate,
  resumirRelatorioAbate,
  type AbateRelatorioLinha,
} from '@/utils/abateRelatorio'
import { AbateBaixaPagamentoModal } from './AbateBaixaPagamentoModal'
import styles from './Abate.module.scss'

function periodoPadrao() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  }
}

type Props = {
  onHistoricoUpdated?: () => void
}

export function AbateRelatorio({ onHistoricoUpdated }: Props) {
  const defaultPeriod = useMemo(() => periodoPadrao(), [])
  const [startDate, setStartDate] = useState(defaultPeriod.startDate)
  const [endDate, setEndDate] = useState(defaultPeriod.endDate)
  const [loading, setLoading] = useState(false)
  const [loadingBaixas, setLoadingBaixas] = useState(false)
  const [exportando, setExportando] = useState(false)
  const [exportandoBaixaId, setExportandoBaixaId] = useState<number | null>(
    null,
  )
  const [desfazendoBaixaId, setDesfazendoBaixaId] = useState<number | null>(
    null,
  )
  const [linhas, setLinhas] = useState<AbateRelatorioLinha[]>([])
  const [baixas, setBaixas] = useState<AbateBaixa[]>([])
  const [detalhe, setDetalhe] = useState<AbateRelatorioLinha | null>(null)
  const [baixaModalOpen, setBaixaModalOpen] = useState(false)

  const resumo = useMemo(() => resumirRelatorioAbate(linhas), [linhas])

  const resumoBaixas = useMemo(() => {
    const valorTotal = baixas.reduce(
      (acc, item) => acc + Number(item.valor_total || 0),
      0,
    )
    const qtdAbates = baixas.reduce(
      (acc, item) => acc + (item.itens?.length || 0),
      0,
    )
    return {
      qtdBaixas: baixas.length,
      qtdAbates,
      valorTotal,
    }
  }, [baixas])

  const carregarBaixas = useCallback(async () => {
    if (!startDate || !endDate) return

    try {
      setLoadingBaixas(true)
      const data = await pagamentosAbatesService.listarBaixasPorPeriodo(
        startDate,
        endDate,
      )
      setBaixas(data)
    } catch {
      toast.error('Erro ao carregar baixas de pagamento')
      setBaixas([])
    } finally {
      setLoadingBaixas(false)
    }
  }, [startDate, endDate])

  async function carregarRelatorio() {
    if (startDate && endDate && startDate > endDate) {
      toast.error('A data inicial não pode ser maior que a final')
      return
    }

    try {
      setLoading(true)
      const [registros] = await Promise.all([
        abatesService.listarRelatorio(startDate, endDate),
        carregarBaixas(),
      ])
      setLinhas(montarLinhasRelatorioAbate(registros))
    } catch {
      toast.error('Erro ao carregar relatório de abates')
      setLinhas([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarRelatorio()
  }, [startDate, endDate])

  async function exportarPdf() {
    if (!linhas.length) {
      toast.error('Não há abates no período para exportar')
      return
    }

    try {
      setExportando(true)
      const { gerarAbateRelatorioPdf } = await import('@/utils/abateRelatorioPdf')
      await gerarAbateRelatorioPdf({
        startDate,
        endDate,
        linhas,
        resumo,
        logoUrl: getLogoUrl(),
      })
      toast.success('PDF baixado')
    } catch {
      toast.error('Erro ao gerar PDF')
    } finally {
      setExportando(false)
    }
  }

  async function exportarComprovanteBaixa(baixaId: number) {
    try {
      setExportandoBaixaId(baixaId)
      const baixa = await pagamentosAbatesService.getById(baixaId)
      const { gerarAbateBaixaPdf } = await import('@/utils/abateBaixaPdf')
      await gerarAbateBaixaPdf({ baixa, logoUrl: getLogoUrl() })
      toast.success('Comprovante baixado')
    } catch {
      toast.error('Erro ao gerar comprovante')
    } finally {
      setExportandoBaixaId(null)
    }
  }

  function handleBaixaSalva() {
    carregarRelatorio()
    onHistoricoUpdated?.()
  }

  async function desfazerBaixa(baixa: AbateBaixa) {
    const qtdAbates = baixa.itens?.length || 0
    const mensagem =
      qtdAbates > 1
        ? `Desfazer este pagamento? Os ${qtdAbates} abates voltarão a ficar pendentes e a baixa será removida.`
        : 'Desfazer este pagamento? O abate voltará a ficar pendente e a baixa será removida.'

    if (!confirm(mensagem)) return

    try {
      setDesfazendoBaixaId(baixa.id)
      await pagamentosAbatesService.desfazerBaixa(baixa.id)
      toast.success('Pagamento desfeito')
      handleBaixaSalva()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Erro ao desfazer pagamento',
      )
    } finally {
      setDesfazendoBaixaId(null)
    }
  }

  const columns = [
    {
      key: 'dataAbate',
      header: 'Data do abate',
      render: (r: AbateRelatorioLinha) => formatDateBr(r.dataAbate),
    },
    { key: 'lote', header: 'Lote' },
    { key: 'fornecedor', header: 'Fornecedor' },
    { key: 'qtdAnimais', header: 'Animais' },
    {
      key: 'couroDeixadoKg',
      header: 'Couro deixado',
      render: (r: AbateRelatorioLinha) =>
        r.couroDeixadoKg > 0 ? formatKgBr(r.couroDeixadoKg) : '—',
    },
    {
      key: 'descontoTotal',
      header: 'Desconto',
      render: (r: AbateRelatorioLinha) => formatCurrencyBr(r.descontoTotal),
    },
    {
      key: 'valorTotalPago',
      header: 'Total pago',
      render: (r: AbateRelatorioLinha) => (
        <strong>{formatCurrencyBr(r.valorTotalPago)}</strong>
      ),
    },
    {
      key: 'acoes',
      header: 'Ações',
      render: (r: AbateRelatorioLinha) => (
        <Button variant="ghost" onClick={() => setDetalhe(r)}>
          Detalhes
        </Button>
      ),
    },
  ]

  const baixaColumns = [
    {
      key: 'data_pagamento',
      header: 'Pagamento',
      render: (r: AbateBaixa) => formatDateBr(r.data_pagamento),
    },
    {
      key: 'prestador',
      header: 'Prestador',
      render: (r: AbateBaixa) => r.prestador?.nome || '—',
    },
    {
      key: 'periodo',
      header: 'Período dos abates',
      render: (r: AbateBaixa) =>
        formatSemanaLabel(r.semana_inicio, r.semana_fim),
    },
    {
      key: 'itens',
      header: 'Abates',
      render: (r: AbateBaixa) => r.itens?.length || 0,
    },
    {
      key: 'forma',
      header: 'Forma',
      render: (r: AbateBaixa) => r.forma_pagamento || '—',
    },
    {
      key: 'valor_total',
      header: 'Valor pago',
      render: (r: AbateBaixa) => (
        <strong>{formatCurrencyBr(Number(r.valor_total))}</strong>
      ),
    },
    {
      key: 'acoes',
      header: 'Ações',
      render: (r: AbateBaixa) => (
        <div className={tableListStyles.acoesRow}>
          <Button
            variant="outline"
            className={tableListStyles.acaoBtn}
            loading={exportandoBaixaId === r.id}
            disabled={
              exportandoBaixaId === r.id || desfazendoBaixaId === r.id
            }
            onClick={() => exportarComprovanteBaixa(r.id)}
          >
            <Download size={14} aria-hidden />
            Comprovante
          </Button>
          <Button
            variant="ghost"
            className={tableListStyles.acaoBtn}
            loading={desfazendoBaixaId === r.id}
            disabled={
              exportandoBaixaId === r.id || desfazendoBaixaId === r.id
            }
            onClick={() => desfazerBaixa(r)}
          >
            <Undo2 size={14} aria-hidden />
            Desfazer
          </Button>
        </div>
      ),
    },
  ]

  const detalheItems = (r: AbateRelatorioLinha): DetailItem[] => [
    { label: 'Data do abate', value: formatDateBr(r.dataAbate) },
    ...(r.dataRomaneio
      ? [{ label: 'Data do romaneio', value: formatDateBr(r.dataRomaneio) }]
      : []),
    { label: 'Lote', value: r.lote },
    { label: 'Fornecedor', value: r.fornecedor },
    { label: 'Tipo de gado', value: r.tipoAnimal },
    { label: 'Quantidade de animais', value: r.qtdAnimais },
    { label: 'Peso vivo', value: formatKgBr(r.pesoVivoKg) },
    { label: 'Peso carcaça', value: formatKgBr(r.pesoCarcacaKg) },
    { label: 'Rendimento', value: formatPercentBr(r.rendimento) },
    {
      label: 'Valor por animal',
      value: formatCurrencyBr(r.valorUnitario),
    },
    { label: 'Valor base (animais × unitário)', value: formatCurrencyBr(r.valorBase) },
    { label: 'Taxas extras', value: formatCurrencyBr(r.taxas) },
    {
      label: 'Couro deixado',
      value: r.couroDeixadoKg > 0 ? formatKgBr(r.couroDeixadoKg) : 'Nenhum',
    },
    {
      label: 'Desconto por kg de couro',
      value: formatCurrencyBr(r.descontoPorCouro),
    },
    { label: 'Desconto total (couro)', value: formatCurrencyBr(r.descontoTotal) },
    {
      label: 'Valor total pago',
      value: formatCurrencyBr(r.valorTotalPago),
    },
    {
      label: 'Fórmula',
      value: `${formatCurrencyBr(r.valorBase)} + taxas ${formatCurrencyBr(r.taxas)} − desconto ${formatCurrencyBr(r.descontoTotal)} = ${formatCurrencyBr(r.valorTotalPago)}`,
    },
    {
      label: 'Retalho',
      value: r.pesoRetalhoKg > 0 ? formatKgBr(r.pesoRetalhoKg) : '—',
    },
  ]

  return (
    <>
      <Card
        title="Relatório de abates"
        action={
          <FileBarChart2 size={18} aria-hidden className={styles.cardIcon} />
        }
      >
        <p className={styles.relatorioIntro}>
          Custos por abate, baixa de pagamentos ao abatedouro e comprovantes em
          PDF. Use o mesmo período para o relatório e para as baixas registradas.
        </p>

        <div className={styles.relatorioToolbar}>
          <Input
            label="Data inicial"
            type="date"
            value={startDate}
            max={endDate || undefined}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            label="Data final"
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <div className={styles.relatorioActions}>
            <Button variant="outline" onClick={carregarRelatorio} disabled={loading}>
              <RefreshCw size={16} aria-hidden />
              {loading ? 'Carregando...' : 'Atualizar'}
            </Button>
            <Button onClick={exportarPdf} disabled={exportando || !linhas.length}>
              <Download size={16} aria-hidden />
              {exportando ? 'Gerando PDF...' : 'Relatório PDF'}
            </Button>
            <Button variant="outline" onClick={() => setBaixaModalOpen(true)}>
              <Wallet size={16} aria-hidden />
              Registrar baixa
            </Button>
          </div>
        </div>

        <div className={styles.relatorioKpis}>
          <article className={styles.relatorioKpi}>
            <span>Abates</span>
            <strong>{resumo.qtdAbates}</strong>
          </article>
          <article className={styles.relatorioKpi}>
            <span>Animais</span>
            <strong>{resumo.qtdAnimais}</strong>
          </article>
          <article className={styles.relatorioKpi}>
            <span>Couro deixado</span>
            <strong>{formatKgBr(resumo.couroDeixadoKg)}</strong>
          </article>
          <article className={styles.relatorioKpi}>
            <span>Desconto total</span>
            <strong>{formatCurrencyBr(resumo.descontoTotal)}</strong>
          </article>
          <article className={[styles.relatorioKpi, styles.relatorioKpiDestaque].join(' ')}>
            <span>Custo total no período</span>
            <strong>{formatCurrencyBr(resumo.valorTotalPago)}</strong>
          </article>
        </div>

        <div className={styles.relatorioTableWrap}>
          <Table
            columns={columns}
            data={linhas}
            keyExtractor={(r) => String(r.id)}
            loading={loading}
          />
        </div>

        {linhas.length > 0 && (
          <p className={styles.relatorioRodape}>
            Valor base: <strong>{formatCurrencyBr(resumo.valorBase)}</strong>
            {' · '}
            Taxas: <strong>{formatCurrencyBr(resumo.taxas)}</strong>
            {' · '}
            Descontos: <strong>{formatCurrencyBr(resumo.descontoTotal)}</strong>
            {' · '}
            Total: <strong>{formatCurrencyBr(resumo.valorTotalPago)}</strong>
          </p>
        )}

        {!loading && linhas.length === 0 && (
          <p className={styles.relatorioVazio}>
            Nenhum abate encontrado no período selecionado.
          </p>
        )}

        <div className={styles.relatorioSecaoDivider} />

        <h3 className={styles.relatorioSecaoTitulo}>Baixas de pagamento</h3>
        <p className={styles.relatorioSecaoIntro}>
          Pagamentos realizados ao prestador de serviço (abatedouro) no período.
          Baixe o comprovante em PDF ou desfaça a baixa para voltar os abates
          ao status pendente.
        </p>

        <div className={styles.relatorioKpis}>
          <article className={styles.relatorioKpi}>
            <span>Baixas registradas</span>
            <strong>{resumoBaixas.qtdBaixas}</strong>
          </article>
          <article className={styles.relatorioKpi}>
            <span>Abates quitados</span>
            <strong>{resumoBaixas.qtdAbates}</strong>
          </article>
          <article className={[styles.relatorioKpi, styles.relatorioKpiDestaque].join(' ')}>
            <span>Total pago no período</span>
            <strong>{formatCurrencyBr(resumoBaixas.valorTotal)}</strong>
          </article>
        </div>

        <div className={styles.relatorioTableWrap}>
          <Table
            columns={baixaColumns}
            data={baixas}
            keyExtractor={(r) => String(r.id)}
            loading={loadingBaixas}
            emptyMessage="Nenhuma baixa de pagamento neste período."
          />
        </div>
      </Card>

      <AbateBaixaPagamentoModal
        open={baixaModalOpen}
        onClose={() => setBaixaModalOpen(false)}
        onSaved={handleBaixaSalva}
        semanaInicioPadrao={startDate}
        semanaFimPadrao={endDate}
      />

      <Modal
        open={!!detalhe}
        onClose={() => setDetalhe(null)}
        title="Detalhes do abate"
        width="640px"
      >
        {detalhe && <ModalDetails items={detalheItems(detalhe)} />}
      </Modal>
    </>
  )
}
