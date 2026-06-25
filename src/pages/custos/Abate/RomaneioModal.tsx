import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import toast from 'react-hot-toast'
import { Autocomplete, Button, Input, Modal } from '@/components/ui'
import { fornecedoresService } from '@/services/fornecedores.service'
import { getLogoUrl } from '@/services/theme.service'
import {
  buildItensVazios,
  formatPesoKgInput,
  mergeItensRomaneio,
  renumberItens,
  romaneiosService,
  totaisRomaneio,
  totalItemRomaneio,
  type FornecedorOption,
  type RomaneioItem,
} from '@/services/romaneios.service'
import { gerarRomaneioPdf } from '@/utils/romaneioPdf'
import { formatKg } from '@/utils/abateCalc'
import styles from './RomaneioModal.module.scss'

export type AbateRomaneioRef = {
  id: number
  data_abate: string
  lote: string
  tipo_animal: string
  qtd_animais: number
}

export type CompraRomaneioRef = {
  id: number
  data: string
  quantidade_animais: number
  tipo_gado?: string
  fornecedor_id?: string
  fornecedor?: { id: string; nome: string }
  observacoes?: string
}

type RomaneioSource = {
  kind: 'abate' | 'compra'
  id: number
  dataRef: string
  qtdAnimais: number
  tipoAnimal: string
  referenciaLabel: string
  fornecedorId?: string
  fornecedorNome?: string
}

type RomaneioModalProps = {
  open: boolean
  abate?: AbateRomaneioRef | null
  compra?: CompraRomaneioRef | null
  onClose: () => void
}

type PesoField =
  | 'dianteiro_1'
  | 'dianteiro_2'
  | 'traseiro_1'
  | 'traseiro_2'

const PESO_FIELDS: PesoField[] = [
  'dianteiro_1',
  'dianteiro_2',
  'traseiro_1',
  'traseiro_2',
]

function tipoPadrao(tipoAnimal?: string) {
  const t = (tipoAnimal || '').trim().toUpperCase()
  if (!t) return 'VACA'
  if (t.includes('BOI') || t.includes('TOURO')) return 'BOI'
  if (t.includes('VACA') || t.includes('NOVILHA')) return 'VACA'
  return t
}

function cellId(ordem: number, field: PesoField | 'tipo') {
  return `romaneio-${ordem}-${field}`
}

function resolverSource(
  abate?: AbateRomaneioRef | null,
  compra?: CompraRomaneioRef | null,
): RomaneioSource | null {
  if (abate) {
    return {
      kind: 'abate',
      id: abate.id,
      dataRef: abate.data_abate,
      qtdAnimais: abate.qtd_animais,
      tipoAnimal: abate.tipo_animal,
      referenciaLabel: abate.lote || '—',
    }
  }

  if (compra) {
    const obs = compra.observacoes?.trim()
    return {
      kind: 'compra',
      id: compra.id,
      dataRef: compra.data,
      qtdAnimais: compra.quantidade_animais,
      tipoAnimal: compra.tipo_gado || '',
      referenciaLabel: obs || `Compra #${compra.id}`,
      fornecedorId: compra.fornecedor_id,
      fornecedorNome: compra.fornecedor?.nome,
    }
  }

  return null
}

export function compraToRomaneioRef(compra: CompraRomaneioRef): CompraRomaneioRef {
  return compra
}

function resolverFornecedor(
  busca: string,
  fornecedorId: string,
  fornecedores: FornecedorOption[],
) {
  if (fornecedorId) {
    const cadastrado = fornecedores.find((f) => f.id === fornecedorId)
    return {
      fornecedor_id: fornecedorId,
      fornecedor_nome: cadastrado?.nome || busca.trim(),
    }
  }

  const nome = busca.trim()
  const exato = fornecedores.find(
    (f) => f.nome.toLowerCase() === nome.toLowerCase(),
  )

  if (exato) {
    return { fornecedor_id: exato.id, fornecedor_nome: exato.nome }
  }

  return { fornecedor_id: null, fornecedor_nome: nome || null }
}

function aplicarFornecedor(
  fornecedores: FornecedorOption[],
  fornecedor?: FornecedorOption | null,
  fornecedorId?: string | null,
  fornecedorNome?: string | null,
) {
  if (fornecedor?.id) {
    return { id: fornecedor.id, nome: fornecedor.nome }
  }

  if (fornecedorId) {
    const cadastrado = fornecedores.find((f) => f.id === fornecedorId)
    if (cadastrado) return { id: cadastrado.id, nome: cadastrado.nome }
  }

  if (fornecedorNome) {
    const exato = fornecedores.find(
      (f) => f.nome.toLowerCase() === fornecedorNome.toLowerCase(),
    )
    return {
      id: exato?.id || '',
      nome: exato?.nome || fornecedorNome,
    }
  }

  return { id: '', nome: '' }
}

export function RomaneioModal({
  open,
  abate = null,
  compra = null,
  onClose,
}: RomaneioModalProps) {
  const source = useMemo(() => resolverSource(abate, compra), [abate, compra])
  const tableRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadingFornecedores, setLoadingFornecedores] = useState(false)
  const [fornecedores, setFornecedores] = useState<FornecedorOption[]>([])
  const [fornecedorId, setFornecedorId] = useState('')
  const [fornecedorBusca, setFornecedorBusca] = useState('')
  const [observacao, setObservacao] = useState('')
  const [dataRomaneio, setDataRomaneio] = useState('')
  const [itens, setItens] = useState<RomaneioItem[]>([])

  useEffect(() => {
    if (!open || !source) return

    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        setLoadingFornecedores(true)

        const romaneioPromise =
          source!.kind === 'compra'
            ? romaneiosService.getByCompraId(source!.id)
            : romaneiosService.getByAbateId(source!.id)

        const [fornecedoresLista, romaneio] = await Promise.all([
          fornecedoresService.getSelectOptions(),
          romaneioPromise,
        ])

        if (cancelled) return

        setFornecedores(fornecedoresLista || [])
        setLoadingFornecedores(false)

        const tipoDefault = tipoPadrao(source!.tipoAnimal)

        if (romaneio) {
          const fornecedor = aplicarFornecedor(
            fornecedoresLista || [],
            romaneio.fornecedor,
            romaneio.fornecedor_id,
            romaneio.fornecedor_nome,
          )
          setFornecedorId(fornecedor.id)
          setFornecedorBusca(fornecedor.nome)
          setObservacao(romaneio.observacao || '')
          setDataRomaneio(
            romaneio.data_romaneio?.slice(0, 10) || source!.dataRef.slice(0, 10),
          )
          setItens(
            mergeItensRomaneio(
              romaneio.itens || [],
              source!.qtdAnimais,
              tipoDefault,
            ),
          )
          return
        }

        if (source!.kind === 'abate') {
          const sugerido = await romaneiosService.suggestFornecedorParaAbate({
            lote: abate!.lote,
            dataAbate: abate!.data_abate,
            qtdAnimais: abate!.qtd_animais,
          })

          if (cancelled) return

          setFornecedorId(sugerido?.id || '')
          setFornecedorBusca(sugerido?.nome || '')
        } else {
          const fornecedor = aplicarFornecedor(
            fornecedoresLista || [],
            null,
            source!.fornecedorId,
            source!.fornecedorNome,
          )

          if (cancelled) return

          setFornecedorId(fornecedor.id)
          setFornecedorBusca(fornecedor.nome)
        }

        setObservacao('')
        setDataRomaneio(source!.dataRef.slice(0, 10))
        setItens(mergeItensRomaneio([], source!.qtdAnimais, tipoDefault))
      } catch {
        if (!cancelled) toast.error('Erro ao carregar romaneio')
      } finally {
        if (!cancelled) {
          setLoading(false)
          setLoadingFornecedores(false)
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [open, source, abate])

  const totais = useMemo(() => totaisRomaneio(itens), [itens])

  function updateItem(
    ordem: number,
    field: keyof Pick<
      RomaneioItem,
      'dianteiro_1' | 'dianteiro_2' | 'traseiro_1' | 'traseiro_2' | 'tipo'
    >,
    value: string,
  ) {
    setItens((prev) =>
      prev.map((item) =>
        item.ordem === ordem ? { ...item, [field]: value } : item,
      ),
    )
  }

  function updatePeso(ordem: number, field: PesoField, raw: string) {
    updateItem(ordem, field, formatPesoKgInput(raw))
  }

  function focusNextCell(ordem: number, field: PesoField | 'tipo') {
    const rowIndex = itens.findIndex((item) => item.ordem === ordem)
    if (rowIndex < 0) return

    if (field === 'tipo') {
      const nextRow = itens[rowIndex + 1]
      if (!nextRow) return
      document
        .getElementById(cellId(nextRow.ordem, 'dianteiro_1'))
        ?.focus()
      return
    }

    const fieldIndex = PESO_FIELDS.indexOf(field)
    if (fieldIndex < PESO_FIELDS.length - 1) {
      document
        .getElementById(cellId(ordem, PESO_FIELDS[fieldIndex + 1]))
        ?.focus()
      return
    }

    document.getElementById(cellId(ordem, 'tipo'))?.focus()
  }

  function handlePesoKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
    ordem: number,
    field: PesoField,
  ) {
    if (event.key === 'Enter') {
      event.preventDefault()
      focusNextCell(ordem, field)
    }
  }

  function handleTipoKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
    ordem: number,
  ) {
    if (event.key === 'Enter') {
      event.preventDefault()
      focusNextCell(ordem, 'tipo')
    }
  }

  function adicionarLinha() {
    const tipoDefault =
      itens[itens.length - 1]?.tipo || tipoPadrao(source?.tipoAnimal)
    setItens((prev) =>
      renumberItens([
        ...prev,
        ...buildItensVazios(1, tipoDefault),
      ]),
    )
    requestAnimationFrame(() => {
      const nextOrdem = itens.length + 1
      document.getElementById(cellId(nextOrdem, 'dianteiro_1'))?.focus()
    })
  }

  function adicionarLinhas(quantidade: number) {
    const tipoDefault = tipoPadrao(source?.tipoAnimal)
    setItens((prev) =>
      renumberItens([...prev, ...buildItensVazios(quantidade, tipoDefault)]),
    )
  }

  function removerUltimaLinha() {
    if (itens.length <= 1) return
    setItens((prev) => renumberItens(prev.slice(0, -1)))
  }

  async function persistirRomaneio() {
    if (!source) return

    const fornecedor = resolverFornecedor(
      fornecedorBusca,
      fornecedorId,
      fornecedores,
    )

    const payloadBase = {
      data_romaneio: dataRomaneio,
      fornecedor_id: fornecedor.fornecedor_id,
      fornecedor_nome: fornecedor.fornecedor_nome,
      observacao,
      itens,
    }

    if (source.kind === 'compra') {
      await romaneiosService.save({
        ...payloadBase,
        compra_id: source.id,
      })
      return
    }

    await romaneiosService.save({
      ...payloadBase,
      abate_id: source.id,
    })
  }

  async function gerarPdf() {
    if (!source) return

    const fornecedor = resolverFornecedor(
      fornecedorBusca,
      fornecedorId,
      fornecedores,
    )

    if (!dataRomaneio) {
      toast.error('Informe a data do romaneio')
      return
    }

    await gerarRomaneioPdf({
      logoUrl: getLogoUrl(),
      dataRomaneio,
      lote: source.referenciaLabel,
      fornecedorNome: fornecedor.fornecedor_nome,
      observacao: observacao.trim() || null,
      itens,
    })
  }

  async function handleSave() {
    if (!source) return

    try {
      setSaving(true)
      await persistirRomaneio()
      toast.success('Romaneio salvo')
    } catch {
      toast.error('Erro ao salvar romaneio')
    } finally {
      setSaving(false)
    }
  }

  async function handlePdf() {
    if (!source) return

    try {
      await gerarPdf()
      toast.success('PDF gerado')
    } catch {
      toast.error('Erro ao gerar PDF')
    }
  }

  async function handleSaveAndPdf() {
    if (!source) return

    try {
      setSaving(true)
      await persistirRomaneio()
      await gerarPdf()
      toast.success('Romaneio salvo e PDF gerado')
    } catch {
      toast.error('Erro ao salvar ou gerar PDF')
    } finally {
      setSaving(false)
    }
  }

  const referenciaHint =
    source?.kind === 'compra' ? (
      <>
        Compra <strong>{source.referenciaLabel}</strong>
      </>
    ) : (
      <>
        Lote <strong>{source?.referenciaLabel || '—'}</strong>
      </>
    )

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Romaneio de pesagem"
      width="1020px"
    >
      {!source ? null : loading ? (
        <p className={styles.loading}>Carregando romaneio…</p>
      ) : (
        <div className={styles.wrapper}>
          <p className={styles.hint}>
            Informe o peso de cada peça (kg) por animal: dois dianteiros (DT) e
            dois traseiros (TZ). Use <kbd>Enter</kbd> para ir ao próximo campo.{' '}
            {referenciaHint} — {itens.length}{' '}
            {itens.length === 1 ? 'linha' : 'linhas'}.
          </p>

          <div className={styles.metaGrid}>
            <Input
              label="Data do romaneio"
              type="date"
              value={dataRomaneio}
              onChange={(e) => setDataRomaneio(e.target.value)}
            />
            <Autocomplete
              label="Fornecedor"
              options={fornecedores.map((f) => f.nome)}
              value={fornecedorBusca}
              loading={loadingFornecedores}
              onChange={(value) => {
                setFornecedorBusca(value)
                const fornecedor = fornecedores.find((f) => f.nome === value)
                setFornecedorId(fornecedor?.id || '')
              }}
            />
            <Input
              label="Observação"
              placeholder="Opcional"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
            />
          </div>

          <div className={styles.tableToolbar}>
            <Button variant="outline" onClick={adicionarLinha}>
              + Adicionar animal
            </Button>
            {itens.length < 25 && (
              <Button
                variant="ghost"
                onClick={() => adicionarLinhas(25 - itens.length)}
              >
                Completar até 25 linhas
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={removerUltimaLinha}
              disabled={itens.length <= 1}
            >
              Remover última linha
            </Button>
          </div>

          <div className={styles.tableWrap} ref={tableRef}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.qtdCol}>QTD</th>
                  <th>DT (kg)</th>
                  <th>DT (kg)</th>
                  <th>TZ (kg)</th>
                  <th>TZ (kg)</th>
                  <th>Total</th>
                  <th>Tipo</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((item) => (
                  <tr key={item.ordem}>
                    <td className={styles.qtdCol}>{item.ordem}</td>
                    {PESO_FIELDS.map((field) => (
                      <td key={field}>
                        <input
                          id={cellId(item.ordem, field)}
                          className={styles.cellInput}
                          type="text"
                          inputMode="decimal"
                          autoComplete="off"
                          placeholder="0"
                          value={String(item[field] ?? '')}
                          onChange={(e) =>
                            updatePeso(item.ordem, field, e.target.value)
                          }
                          onKeyDown={(e) =>
                            handlePesoKeyDown(e, item.ordem, field)
                          }
                        />
                      </td>
                    ))}
                    <td className={styles.totalCell}>
                      {formatKg(totalItemRomaneio(item))}
                    </td>
                    <td>
                      <input
                        id={cellId(item.ordem, 'tipo')}
                        className={styles.cellInputTipo}
                        type="text"
                        autoComplete="off"
                        value={item.tipo}
                        onChange={(e) =>
                          updateItem(
                            item.ordem,
                            'tipo',
                            e.target.value.toUpperCase(),
                          )
                        }
                        onKeyDown={(e) => handleTipoKeyDown(e, item.ordem)}
                      />
                    </td>
                  </tr>
                ))}
                <tr className={styles.totalsRow}>
                  <td className={styles.totalsLabel}>Totais</td>
                  <td>{formatKg(totais.dianteiro_1)}</td>
                  <td>{formatKg(totais.dianteiro_2)}</td>
                  <td>{formatKg(totais.traseiro_1)}</td>
                  <td>{formatKg(totais.traseiro_2)}</td>
                  <td>{formatKg(totais.total)}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>

          <div className={styles.actions}>
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Fechar
            </Button>
            <Button variant="ghost" onClick={handlePdf} disabled={saving}>
              Baixar PDF
            </Button>
            <Button loading={saving} onClick={handleSave} disabled={saving}>
              Salvar
            </Button>
            <Button loading={saving} onClick={handleSaveAndPdf} disabled={saving}>
              Salvar e baixar PDF
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
