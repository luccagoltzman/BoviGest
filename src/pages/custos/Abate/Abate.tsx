import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import {
  Button,
  Card,
  Input,
  Table,
  Modal,
  ModalDetails,
} from '@/components/ui'
import type { DetailItem } from '@/components/ui'
import { abatesService } from '@/services/abates.service'
import { estoqueService } from '@/services/estoque.service'
import { ProcessamentoModal } from '@/pages/Processamento/ProcessamentoModal'
import { ViscerasModal } from '@/pages/Visceras/ViscerasModal'
import {
  calcularAbate,
  formatCurrency,
  formatKg,
  formatPercent,
  type TipoCobrancaAbate,
} from '@/utils/abateCalc'
import {
  gerarPecasBandaPorAbate,
  pecasParaModalProcessamento,
  viscerasDefaultValuesPorAbate,
} from '@/utils/abateEstoque'
import styles from './Abate.module.scss'

interface AbateRow {
  id: number
  data_abate: string
  lote: string
  tipo_animal: string
  qtd_animais: number
  peso_bruto_kg: number
  peso_liquido_kg: number
  valor_unitario: number
  valor_total: number
  couro_deixado: number
  desconto_por_couro: number
  desconto_total: number
  taxas: number
  tipo_cobranca: TipoCobrancaAbate
  salvar_couro?: boolean
}

const emptyForm = () => ({
  data_abate: new Date().toISOString().slice(0, 10),
  lote: '',
  tipo_animal: '',
  qtd_animais: '',
  peso_bruto_kg: '',
  peso_liquido_kg: '',
  valor_unitario: '',
  couro_deixado: '',
  desconto_por_couro: '',
  taxas: '',
})

function parseForm(form: ReturnType<typeof emptyForm>) {
  return {
    data_abate: form.data_abate,
    lote: form.lote.trim(),
    tipo_animal: form.tipo_animal.trim(),
    qtd_animais: Number(form.qtd_animais) || 0,
    peso_bruto_kg: Number(form.peso_bruto_kg) || 0,
    peso_liquido_kg: Number(form.peso_liquido_kg) || 0,
    valor_unitario: Number(form.valor_unitario) || 0,
    couro_deixado: Number(form.couro_deixado) || 0,
    desconto_por_couro: Number(form.desconto_por_couro) || 0,
    taxas: Number(form.taxas) || 0,
    tipo_cobranca: 0 as TipoCobrancaAbate,
  }
}

function rowToForm(row: AbateRow): ReturnType<typeof emptyForm> {
  return {
    data_abate: row.data_abate?.slice(0, 10) || '',
    lote: row.lote || '',
    tipo_animal: row.tipo_animal || '',
    qtd_animais: String(row.qtd_animais ?? ''),
    peso_bruto_kg: String(row.peso_bruto_kg ?? ''),
    peso_liquido_kg: String(row.peso_liquido_kg ?? ''),
    valor_unitario: String(row.valor_unitario ?? ''),
    couro_deixado: String(row.couro_deixado ?? ''),
    desconto_por_couro: String(row.desconto_por_couro ?? ''),
    taxas: String(row.taxas ?? ''),
  }
}

function buildPayload(form: ReturnType<typeof emptyForm>) {
  const parsed = parseForm(form)
  const calc = calcularAbate(parsed)

  return {
    ...parsed,
    desconto_total: calc.desconto_total,
    valor_total: calc.valor_total,
    salvar_couro: parsed.couro_deixado > 0,
  }
}

function ResumoCalculo({
  form,
}: {
  form: ReturnType<typeof emptyForm>
}) {
  const parsed = parseForm(form)
  const calc = calcularAbate(parsed)

  const formula = `${(parsed.qtd_animais)} Animais × ${formatCurrency(parsed.valor_unitario)}`

  const rendimentoClass =
    calc.rendimento >= 48 && calc.rendimento <= 58
      ? styles.rendimentoOk
      : calc.rendimento > 0
        ? styles.rendimentoAlerta
        : undefined

  return (
    <>
      <div className={styles.summaryGrid}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Rendimento</span>
          <strong className={[styles.summaryValue, rendimentoClass].filter(Boolean).join(' ')}>
            {formatPercent(calc.rendimento)}
          </strong>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Valor base</span>
          <strong className={styles.summaryValue}>
            {formatCurrency(calc.valor_base)}
          </strong>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Desconto couro</span>
          <strong className={styles.summaryValue}>
            {formatCurrency(calc.desconto_total)}
          </strong>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Taxas</span>
          <strong className={styles.summaryValue}>
            {formatCurrency(parsed.taxas)}
          </strong>
        </div>
      </div>

      <div className={styles.valorFinal}>
        <span className={styles.valorFinalLabel}>Valor final do abate</span>
        <span className={styles.valorFinalFormula}>
          ({formula} + taxas {formatCurrency(parsed.taxas)} − desconto couro{' '}
          {formatCurrency(calc.desconto_total)})
        </span>
        <strong className={styles.valorFinalTotal}>
          {formatCurrency(calc.valor_total)}
        </strong>
      </div>
    </>
  )
}

function AbateFormFields({
  form,
  onChange,
}: {
  form: ReturnType<typeof emptyForm>
  onChange: (next: ReturnType<typeof emptyForm>) => void
}) {
  return (
    <>
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Identificação</h3>
        <div className={styles.formGrid}>
          <Input
            label="Data do abate"
            type="date"
            value={form.data_abate}
            onChange={(e) => onChange({ ...form, data_abate: e.target.value })}
          />
          <Input
            label="Lote"
            placeholder="Ex.: LT-001"
            value={form.lote}
            onChange={(e) => onChange({ ...form, lote: e.target.value })}
          />
          <Input
            label="Tipo animal"
            value={form.tipo_animal}
            onChange={(e) => onChange({ ...form, tipo_animal: e.target.value })}
          />
          <Input
            label="Quantidade de animais"
            type="number"
            min="1"
            value={form.qtd_animais}
            onChange={(e) => onChange({ ...form, qtd_animais: e.target.value })}
          />
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Pesos</h3>
        <p className={styles.sectionHint}>
          Peso vivo na chegada ao abatedouro e peso de carcaça quente após o abate.
        </p>
        <div className={styles.formGrid}>
          <Input
            label="Peso vivo (kg)"
            type="number"
            min="0"
            step="0.01"
            value={form.peso_bruto_kg}
            onChange={(e) => onChange({ ...form, peso_bruto_kg: e.target.value })}
          />
          <Input
            label="Peso carcaça (kg)"
            type="number"
            min="0"
            step="0.01"
            value={form.peso_liquido_kg}
            onChange={(e) =>
              onChange({ ...form, peso_liquido_kg: e.target.value })
            }
          />
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Cobrança</h3>
        <div className={styles.formGrid}>
          <Input
            label="Valor por QTD de animal (R$)"
            type="number"
            min="0"
            step="0.01"
            value={form.valor_unitario}
            onChange={(e) =>
              onChange({ ...form, valor_unitario: e.target.value })
            }
          />
          <Input
            label="Taxas extras (R$)"
            type="number"
            min="0"
            step="0.01"
            value={form.taxas}
            onChange={(e) => onChange({ ...form, taxas: e.target.value })}
          />
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Desconto por couro</h3>
        <p className={styles.sectionHint}>
          Informe quantos couros ficaram no abatedouro e o valor de desconto unitário
          aplicado na nota.
        </p>
        <div className={styles.formGrid}>
          <Input
            label="Couros deixados (Kg)"
            type="number"
            min="0"
            value={form.couro_deixado}
            onChange={(e) =>
              onChange({ ...form, couro_deixado: e.target.value })
            }
          />
          <Input
            label="Desconto por (Kg) de couro"
            type="number"
            min="0"
            step="0.01"
            value={form.desconto_por_couro}
            onChange={(e) =>
              onChange({ ...form, desconto_por_couro: e.target.value })
            }
          />
        </div>
      </section>

      <ResumoCalculo form={form} />
    </>
  )
}

export function Abate() {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [abates, setAbates] = useState<AbateRow[]>([])
  const [detalhe, setDetalhe] = useState<AbateRow | null>(null)
  const [editarId, setEditarId] = useState<number | null>(null)

  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  const [form, setForm] = useState(emptyForm)
  const [editForm, setEditForm] = useState(emptyForm)
  const [showEstoqueModal, setShowEstoqueModal] = useState(false)
  const [estoqueInitialData, setEstoqueInitialData] = useState<any>(null)
  const [showViscerasModal, setShowViscerasModal] = useState(false)
  const [viscerasDefaultValues, setViscerasDefaultValues] = useState<any>(null)

  const parsedForm = useMemo(() => parseForm(form), [form])

  const isFormValid =
    parsedForm.data_abate &&
    parsedForm.qtd_animais > 0 &&
    parsedForm.peso_bruto_kg > 0 &&
    parsedForm.valor_unitario > 0

  async function loadAbates() {
    try {
      setLoading(true)
      const response = await abatesService.getAll(page, 10)
      setAbates(response.data || [])
      setTotal(response.total)
      setTotalPages(response.totalPages)
    } catch {
      toast.error('Erro ao carregar abates')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAbates()
  }, [page])

  function abrirConfirmacaoEstoque() {
    if (!isFormValid) {
      toast.error('Preencha os campos obrigatórios corretamente')
      return
    }

    const parsed = parseForm(form)
    const pecas = gerarPecasBandaPorAbate(
      parsed.qtd_animais,
      parsed.peso_liquido_kg,
    )

    if (pecas.length === 0) {
      toast.error('Informe a quantidade de animais para gerar as peças')
      return
    }

    setEstoqueInitialData({
      lote: parsed.lote.trim() || `abate-${parsed.data_abate}`,
      tipo_movimentacao: 1,
      data_movimentacao: parsed.data_abate,
      observacoes: 'Entrada automática — abate',
      itens: pecasParaModalProcessamento(pecas),
    })
    setShowEstoqueModal(true)
  }

  async function handleEstoqueConfirmado() {
    const parsed = parseForm(form)
    const lote = parsed.lote.trim() || `abate-${parsed.data_abate}`

    setShowEstoqueModal(false)
    setEstoqueInitialData(null)
    setViscerasDefaultValues(
      viscerasDefaultValuesPorAbate(parsed.qtd_animais, lote),
    )
    setShowViscerasModal(true)
  }

  async function handleViscerasConfirmado() {
    try {
      setSaving(true)
      await abatesService.create(buildPayload(form))
      setForm(emptyForm())
      setViscerasDefaultValues(null)
      await loadAbates()
    } catch {
      toast.error('Vísceras salvas, mas falhou ao registrar o abate')
    } finally {
      setSaving(false)
    }
  }

  function handleCreate() {
    abrirConfirmacaoEstoque()
  }

  async function handleSaveEdit() {
    if (!editarId) return

    const parsed = parseForm(editForm)
    if (
      !parsed.data_abate ||
      parsed.qtd_animais <= 0 ||
      parsed.peso_bruto_kg <= 0 ||
      parsed.peso_liquido_kg <= 0 ||
      parsed.valor_unitario <= 0 ||
      parsed.peso_liquido_kg > parsed.peso_bruto_kg
    ) {
      toast.error('Preencha os campos obrigatórios corretamente')
      return
    }

    try {
      setSaving(true)
      await abatesService.update(editarId, buildPayload(editForm))
      toast.success('Abate atualizado')
      setEditarId(null)
      await loadAbates()
    } catch {
      toast.error('Erro ao atualizar abate')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm('Deseja excluir este abate?')) return

    try {
      setSaving(true)
      await estoqueService.deleteByReferenciaAbate(id).catch(() => undefined)
      await abatesService.delete(id)
      toast.success('Abate excluído')
      setEditarId(null)
      await loadAbates()
    } catch {
      toast.error('Erro ao excluir abate')
    } finally {
      setSaving(false)
    }
  }

  function openEdit(row: AbateRow) {
    setEditarId(row.id)
    setEditForm(rowToForm(row))
  }

  const columns = [
    {
      key: 'data_abate',
      header: 'Data',
      render: (r: AbateRow) =>
        r.data_abate
          ? new Date(`${r.data_abate.slice(0, 10)}T12:00:00`).toLocaleDateString(
              'pt-BR',
            )
          : '—',
    },
    { key: 'lote', header: 'Lote' },
    { key: 'tipo_animal', header: 'Animal' },
    { key: 'qtd_animais', header: 'Qtd.' },
    {
      key: 'peso_bruto_kg',
      header: 'Peso vivo',
      render: (r: AbateRow) => formatKg(Number(r.peso_bruto_kg)),
    },
    {
      key: 'peso_liquido_kg',
      header: 'Peso carcaça',
      render: (r: AbateRow) => formatKg(Number(r.peso_liquido_kg)),
    },
    {
      key: 'valor_total',
      header: 'Valor total',
      render: (r: AbateRow) => formatCurrency(Number(r.valor_total)),
    },
    {
      key: 'acoes',
      header: 'Ações',
      render: (r: AbateRow) => (
        <div className={styles.tableActions}>
          <Button variant="outline" onClick={() => setDetalhe(r)}>
            Ver
          </Button>
          <Button variant="ghost" onClick={() => openEdit(r)}>
            Editar
          </Button>
        </div>
      ),
    },
  ]

  const detalheItems = (r: AbateRow): DetailItem[] => {
    const calc = calcularAbate({
      tipo_cobranca: r.tipo_cobranca,
      qtd_animais: r.qtd_animais,
      peso_bruto_kg: r.peso_bruto_kg,
      peso_liquido_kg: r.peso_liquido_kg,
      valor_unitario: r.valor_unitario,
      couro_deixado: r.couro_deixado,
      desconto_por_couro: r.desconto_por_couro,
      taxas: r.taxas,
    })

    return [
      { label: 'Data', value: r.data_abate?.slice(0, 10) || '—' },
      { label: 'Lote', value: r.lote || '—' },
      { label: 'Tipo animal', value: r.tipo_animal || '—' },
      { label: 'Qtd. animais', value: r.qtd_animais },
      { label: 'Peso vivo', value: formatKg(Number(r.peso_bruto_kg)) },
      { label: 'Peso carcaça', value: formatKg(Number(r.peso_liquido_kg)) },
      { label: 'Rendimento', value: formatPercent(calc.rendimento) },
      { label: 'Couros deixados em (Kg)', value: r.couro_deixado },
      {
        label: 'Desconto total (couro)',
        value: formatCurrency(Number(r.desconto_total)),
      },
      { label: 'Taxas', value: formatCurrency(Number(r.taxas)) },
      { label: 'Valor base', value: formatCurrency(calc.valor_base) },
      { label: 'Valor total', value: formatCurrency(Number(r.valor_total)) },
    ]
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className="page-title">Custos de abate</h1>
          <p className={styles.subtitle}>
            Registre o abate com peso vivo, peso de carcaça e desconto por couro.
            Ao registrar, as peças entram automaticamente em estoque (animais × 2
            bandas) e as vísceras (1 por animal).
          </p>
        </div>
      </header>

      <Card title="Registrar abate">
        <div className={styles.formCard}>
          <AbateFormFields form={form} onChange={setForm} />
          <div className={styles.actions}>
            <Button
              loading={saving}
              onClick={handleCreate}
              disabled={!isFormValid || saving}
            >
              Registrar abate
            </Button>
          </div>
        </div>
      </Card>

      <Card title="Histórico de abates">
        <Table
          columns={columns}
          data={abates}
          keyExtractor={(r) => String(r.id)}
          loading={loading}
          page={page}
          total={total}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </Card>

      <ProcessamentoModal
        open={showEstoqueModal}
        initialData={estoqueInitialData}
        title="Confirmar entrada em estoque"
        successMessage="Peças entraram em estoque"
        onClose={() => {
          setShowEstoqueModal(false)
          setEstoqueInitialData(null)
        }}
        onSuccess={handleEstoqueConfirmado}
      />

      <ViscerasModal
        open={showViscerasModal}
        defaultValues={viscerasDefaultValues}
        title="Confirmar entrada de vísceras"
        successMessage="Abate registrado — peças e vísceras entraram em estoque"
        onClose={() => {
          setShowViscerasModal(false)
          setViscerasDefaultValues(null)
        }}
        onSaved={handleViscerasConfirmado}
      />

      <Modal
        open={!!detalhe}
        onClose={() => setDetalhe(null)}
        title="Detalhes do abate"
      >
        {detalhe && <ModalDetails items={detalheItems(detalhe)} />}
      </Modal>

      <Modal
        width="900px"
        open={editarId !== null}
        onClose={() => setEditarId(null)}
        title="Editar abate"
      >
        <div className={styles.formCard}>
          <AbateFormFields form={editForm} onChange={setEditForm} />
          <div className={styles.actions}>
            <Button loading={saving} onClick={handleSaveEdit} disabled={saving}>
              Salvar alterações
            </Button>
            <Button
              variant="danger"
              loading={saving}
              onClick={() => editarId && handleDelete(editarId)}
              disabled={saving}
            >
              Excluir
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
