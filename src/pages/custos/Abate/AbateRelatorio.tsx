import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Download, FileBarChart2, RefreshCw } from 'lucide-react'
import { Button, Card, Input, Modal, ModalDetails, Table } from '@/components/ui'
import type { DetailItem } from '@/components/ui'
import { abatesService } from '@/services/abates.service'
import { getLogoUrl } from '@/services/theme.service'
import {
  formatCurrencyBr,
  formatDateBr,
  formatKgBr,
  formatPercentBr,
  montarLinhasRelatorioAbate,
  resumirRelatorioAbate,
  type AbateRelatorioLinha,
} from '@/utils/abateRelatorio'
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

export function AbateRelatorio() {
  const defaultPeriod = useMemo(() => periodoPadrao(), [])
  const [startDate, setStartDate] = useState(defaultPeriod.startDate)
  const [endDate, setEndDate] = useState(defaultPeriod.endDate)
  const [loading, setLoading] = useState(false)
  const [exportando, setExportando] = useState(false)
  const [linhas, setLinhas] = useState<AbateRelatorioLinha[]>([])
  const [detalhe, setDetalhe] = useState<AbateRelatorioLinha | null>(null)

  const resumo = useMemo(() => resumirRelatorioAbate(linhas), [linhas])

  async function carregarRelatorio() {
    if (startDate && endDate && startDate > endDate) {
      toast.error('A data inicial não pode ser maior que a final')
      return
    }

    try {
      setLoading(true)
      const registros = await abatesService.listarRelatorio(startDate, endDate)
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

  const detalheItems = (r: AbateRelatorioLinha): DetailItem[] => [
    { label: 'Data do abate (pagamento no abatedouro)', value: formatDateBr(r.dataAbate) },
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
          Pagamentos no abatedouro, couro deixado, descontos e valor total pago por
          abate. Use o filtro de período e exporte em PDF quando precisar.
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
              {exportando ? 'Gerando PDF...' : 'Baixar PDF'}
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
            <span>Total pago no período</span>
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
            Total pago: <strong>{formatCurrencyBr(resumo.valorTotalPago)}</strong>
          </p>
        )}

        {!loading && linhas.length === 0 && (
          <p className={styles.relatorioVazio}>
            Nenhum abate encontrado no período selecionado.
          </p>
        )}
      </Card>

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
