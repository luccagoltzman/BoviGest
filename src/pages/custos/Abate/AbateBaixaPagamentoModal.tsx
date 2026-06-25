import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Autocomplete, Button, Input, Modal, Select } from '@/components/ui'
import { FORMAS_PAGAMENTO } from '@/constants/formasPagamentos'
import {
  pagamentosAbatesService,
  type AbatePendentePagamento,
} from '@/services/pagamentosAbates.service'
import { prestadoresServicoService } from '@/services/prestadoresServico.service'
import { getLogoUrl } from '@/services/theme.service'
import {
  contaPagamentoFromFornecedor,
  emptyContaPagamento,
  type ContaPagamentoData,
} from '@/utils/contaPagamento'
import { formatCurrency } from '@/utils/compraParcelas'
import {
  formatSemanaLabel,
  semanaRangePorData,
} from '@/utils/abatePagamento'
import { ContaPagamentoFields } from '@/pages/Compras/ContaPagamentoFields'
import styles from './AbateBaixaPagamentoModal.module.scss'

type PrestadorOption = { id: string; nome: string }

type Props = {
  open: boolean
  onClose: () => void
  onSaved?: () => void
  semanaInicioPadrao?: string
  semanaFimPadrao?: string
}

function formatDateBr(value: string) {
  if (!value) return '—'
  return new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR')
}

export function AbateBaixaPagamentoModal({
  open,
  onClose,
  onSaved,
  semanaInicioPadrao,
  semanaFimPadrao,
}: Props) {
  const hoje = new Date().toISOString().slice(0, 10)
  const semanaDefault = semanaRangePorData(hoje)

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [prestadores, setPrestadores] = useState<PrestadorOption[]>([])
  const [prestadorId, setPrestadorId] = useState('')
  const [prestadorBusca, setPrestadorBusca] = useState('')
  const [semanaInicio, setSemanaInicio] = useState(
    semanaInicioPadrao || semanaDefault.inicio,
  )
  const [semanaFim, setSemanaFim] = useState(
    semanaFimPadrao || semanaDefault.fim,
  )
  const [dataPagamento, setDataPagamento] = useState(hoje)
  const [formaPagamento, setFormaPagamento] = useState('Pix')
  const [observacao, setObservacao] = useState('')
  const [contaPagamento, setContaPagamento] =
    useState<ContaPagamentoData>(emptyContaPagamento())
  const [pendentes, setPendentes] = useState<AbatePendentePagamento[]>([])
  const [selecionados, setSelecionados] = useState<Record<number, boolean>>({})

  useEffect(() => {
    if (!open) return
    if (semanaInicioPadrao) setSemanaInicio(semanaInicioPadrao)
    if (semanaFimPadrao) setSemanaFim(semanaFimPadrao)
  }, [open, semanaInicioPadrao, semanaFimPadrao])

  useEffect(() => {
    if (!open) return

    let cancelled = false

    async function init() {
      try {
        const lista = await prestadoresServicoService.getSelectOptions()

        if (cancelled) return

        setPrestadores(lista || [])

        if (lista?.length === 1) {
          setPrestadorId(lista[0].id)
          setPrestadorBusca(lista[0].nome)
        }
      } catch {
        if (!cancelled) toast.error('Erro ao carregar prestadores')
      }
    }

    init()
    return () => {
      cancelled = true
    }
  }, [open])

  useEffect(() => {
    if (!open || !semanaInicio || !semanaFim) return

    let cancelled = false

    async function loadPendentes() {
      try {
        setLoading(true)
        const data = await pagamentosAbatesService.listarPendentes({
          prestadorId: prestadorId || undefined,
          semanaInicio,
          semanaFim,
        })

        if (cancelled) return

        setPendentes(data)
        setSelecionados(
          Object.fromEntries(data.map((item) => [item.id, true])),
        )
      } catch {
        if (!cancelled) toast.error('Erro ao carregar abates pendentes')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadPendentes()
    return () => {
      cancelled = true
    }
  }, [open, prestadorId, semanaInicio, semanaFim])

  useEffect(() => {
    if (!prestadorId) {
      setContaPagamento(emptyContaPagamento())
      return
    }

    let cancelled = false

    prestadoresServicoService.getById(prestadorId).then((prestador) => {
      if (!cancelled && prestador) {
        setContaPagamento(contaPagamentoFromFornecedor(prestador))
      }
    })

    return () => {
      cancelled = true
    }
  }, [prestadorId])

  const abatesSelecionados = useMemo(
    () => pendentes.filter((item) => selecionados[item.id]),
    [pendentes, selecionados],
  )

  const totalSelecionado = useMemo(
    () =>
      abatesSelecionados.reduce(
        (acc, item) => acc + Number(item.valor_total || 0),
        0,
      ),
    [abatesSelecionados],
  )

  function aplicarSemanaPorData(ref: string) {
    const range = semanaRangePorData(ref)
    setSemanaInicio(range.inicio)
    setSemanaFim(range.fim)
  }

  function toggleTodos(marcar: boolean) {
    setSelecionados(
      Object.fromEntries(pendentes.map((item) => [item.id, marcar])),
    )
  }

  async function handleConfirmarBaixa() {
    if (!prestadorId) {
      toast.error('Selecione o prestador de serviço (abatedouro)')
      return
    }

    const ids = abatesSelecionados.map((item) => item.id)
    if (!ids.length) {
      toast.error('Selecione ao menos um abate')
      return
    }

    if (!dataPagamento) {
      toast.error('Informe a data do pagamento')
      return
    }

    try {
      setSaving(true)
      const baixa = await pagamentosAbatesService.criarBaixaSemanal({
        prestadorId,
        dataPagamento,
        semanaInicio,
        semanaFim,
        abateIds: ids,
        formaPagamento,
        observacao,
        contaPagamento,
      })

      const { gerarAbateBaixaPdf } = await import('@/utils/abateBaixaPdf')
      await gerarAbateBaixaPdf({ baixa, logoUrl: getLogoUrl() })

      toast.success('Baixa registrada e comprovante gerado')
      onSaved?.()
      onClose()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao registrar baixa'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Baixa de pagamentos — abate"
      width="960px"
    >
      <div className={styles.wrapper}>
        <p className={styles.hint}>
          Selecione o prestador (dono do abatedouro), o período semanal e os
          abates quitados neste pagamento. A baixa registra para quem foi pago e
          atualiza o status de cada abate.
        </p>

        <div className={styles.metaGrid}>
          <Autocomplete
            label="Prestador de serviço"
            options={prestadores.map((p) => p.nome)}
            value={prestadorBusca}
            onChange={(value) => {
              setPrestadorBusca(value)
              const prestador = prestadores.find((p) => p.nome === value)
              setPrestadorId(prestador?.id || '')
            }}
          />
          <Input
            label="Semana — início"
            type="date"
            value={semanaInicio}
            onChange={(e) => setSemanaInicio(e.target.value)}
          />
          <Input
            label="Semana — fim"
            type="date"
            value={semanaFim}
            onChange={(e) => setSemanaFim(e.target.value)}
          />
          <div>
            <Button
              type="button"
              variant="ghost"
              onClick={() => aplicarSemanaPorData(hoje)}
            >
              Semana atual
            </Button>
          </div>
          <Input
            label="Data do pagamento"
            type="date"
            value={dataPagamento}
            onChange={(e) => setDataPagamento(e.target.value)}
          />
          <Select
            label="Forma de pagamento"
            options={[...FORMAS_PAGAMENTO]}
            value={formaPagamento}
            onChange={(e) => setFormaPagamento(e.target.value)}
          />
          <Input
            label="Observação"
            placeholder="Opcional"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
          />
        </div>

        <ContaPagamentoFields
          value={contaPagamento}
          onChange={setContaPagamento}
          onRestaurarFornecedor={
            prestadorId
              ? () => {
                  prestadoresServicoService
                    .getById(prestadorId)
                    .then((prestador) =>
                      setContaPagamento(
                        contaPagamentoFromFornecedor(prestador),
                      ),
                    )
                    .catch(() => undefined)
                }
              : undefined
          }
        />

        <div className={styles.resumo}>
          <div>
            <span>Período</span>
            <strong>{formatSemanaLabel(semanaInicio, semanaFim)}</strong>
          </div>
          <div>
            <span>Abates selecionados</span>
            <strong>{abatesSelecionados.length}</strong>
          </div>
          <div>
            <span>Total a pagar</span>
            <strong>{formatCurrency(totalSelecionado)}</strong>
          </div>
        </div>

        <div className={styles.tableWrap}>
          {loading ? (
            <p className={styles.loading}>Carregando abates pendentes…</p>
          ) : pendentes.length === 0 ? (
            <p className={styles.empty}>
              Nenhum abate pendente neste período
              {prestadorBusca ? ` para ${prestadorBusca}` : ''}.
            </p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.checkCol}>
                    <input
                      type="checkbox"
                      checked={
                        pendentes.length > 0 &&
                        pendentes.every((item) => selecionados[item.id])
                      }
                      onChange={(e) => toggleTodos(e.target.checked)}
                      aria-label="Selecionar todos"
                    />
                  </th>
                  <th>Data</th>
                  <th>Lote</th>
                  <th>Qtd.</th>
                  <th className={styles.valorCol}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {pendentes.map((item) => (
                  <tr key={item.id}>
                    <td className={styles.checkCol}>
                      <input
                        type="checkbox"
                        checked={!!selecionados[item.id]}
                        onChange={(e) =>
                          setSelecionados((prev) => ({
                            ...prev,
                            [item.id]: e.target.checked,
                          }))
                        }
                        aria-label={`Selecionar abate ${item.lote || item.id}`}
                      />
                    </td>
                    <td>{formatDateBr(item.data_abate)}</td>
                    <td>{item.lote || '—'}</td>
                    <td>{item.qtd_animais}</td>
                    <td className={styles.valorCol}>
                      {formatCurrency(Number(item.valor_total))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className={styles.actions}>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            loading={saving}
            disabled={saving || !abatesSelecionados.length}
            onClick={handleConfirmarBaixa}
          >
            Confirmar baixa e baixar PDF
          </Button>
        </div>
      </div>
    </Modal>
  )
}
