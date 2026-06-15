import { useEffect, useState } from 'react'
import { Copy, Trash2 } from 'lucide-react'
import {
  Autocomplete,
  Button,
  Card,
  Input,
  Modal,
  ModalDetails,
  Table,
  TouchTooltip,
  touchTooltipStyles,
  AddNewButton,
} from '@/components/ui'

import toast from 'react-hot-toast'
import styles from './Vendas.module.scss'
import { TIPOS_CORTE, REGRA_CASADO } from '@/constants/cortes'
import {
  buildComposicoesBandaVazia,
  buildComposicoesCasadoVazia,
  formatResumoCasado,
  isCorteBanda,
  isCorteCasado,
  isVisceraCorte,
  labelQuantidadeCorte,
  labelValorUnitarioCorte,
  normalizeCorteEstoque,
  pesoTotalComposicao,
  syncComposicoesCasado,
} from '@/utils/corteComposicao'
import {
  parseCurrencyInput,
  parseDecimalInput,
  parseIntegerInput,
} from '@/utils/masks'
import { ClienteExtratoModal } from '../Clientes/ClienteExtratoModal'
import {
  clientesService,
  formatClienteOptionLabel,
  type ClienteOption,
} from '@/services/cliente.service'
import { movimentacoesClientesService } from '@/services/movimentacoesClientes.service'
import { estoqueService } from '@/services/estoque.service'
import { viscerasService } from '@/services/visceras.service';

const emptyItem = {
  tipo_corte: '',
  peso_total_kg: '',
  valor_kg: '',
  composicoes: [],
}

const emptyForm = () => ({
  cliente_id: '',
  observacao: '',
  data_movimentacao: new Date().toISOString().split('T')[0],
  itens: [{ ...emptyItem }],
  movimentacao_status: 'pendente',
})

export function Vendas() {
  const [clientes, setClientes] = useState<ClienteOption[]>([])
  const [historico, setHistorico] = useState<any[]>([])
  const [clienteBusca, setClienteBusca] = useState('')
  const [loadingClientes, setLoadingClientes] = useState(false)
  const [totalGeral, setTotalGeral] = useState(0)
  const [pesoTotalGeral, setPesoTotalGeral] = useState(0)
  const [editando, setEditando] = useState<any>(null)
  const [detalhe, setDetalhe] = useState<any>(null)
  const [clienteExtrato, setClienteExtrato] = useState<any>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<any>(emptyForm())

  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [loadingSave, setLoadingSave] = useState(false)

  function closeCreate() {
    setShowCreate(false)
    setForm(emptyForm())
    setClienteBusca('')
    setTotalGeral(0)
    setPesoTotalGeral(0)
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      carregarClientes(clienteBusca)
    }, 300)

    return () => clearTimeout(timer)
  }, [clienteBusca])

  useEffect(() => {
    carregarMovimentacoes(page)
  }, [page])

  useEffect(() => {
    setTotalGeral(calcularTotal(form.itens))
    setPesoTotalGeral(calcularPesoTotal(form.itens))
  }, [form.itens])

  const isBanda = isCorteBanda
  const isCasado = isCorteCasado
  const isViscera = isVisceraCorte

  function parseValorUnitario(value: unknown) {
    if (value === null || value === undefined || value === '') return 0
    if (typeof value === 'number') return value
    return parseCurrencyInput(String(value))
  }

  function parseQuantidadeCasados(value: unknown) {
    if (value === null || value === undefined || value === '') return 0
    if (typeof value === 'number') return value
    return parseIntegerInput(String(value))
  }

  function recalcItemValores(item: any) {
    if (isCasado(item.tipo_corte)) {
      const qty = parseQuantidadeCasados(item.peso_total_kg)
      item.composicoes = syncComposicoesCasado(qty, item.composicoes)
      const pesoTotal = pesoTotalComposicao(item.composicoes)
      const valorKg = parseValorUnitario(item.valor_kg)
      item.valor_total = pesoTotal * valorKg
      return
    }

    const peso = Number(item.peso_total_kg || 0)
    const valorKg = Number(item.valor_kg || 0)
    item.valor_total = Number.isNaN(peso * valorKg) ? 0 : peso * valorKg
  }

  async function carregarClientes(search = '') {
    setLoadingClientes(true)
    try {
      const data = await clientesService.getOptions(search)
      setClientes(data || [])
    } finally {
      setLoadingClientes(false)
    }
  }

  function selecionarClientePorLabel(label: string) {
    setClienteBusca(label)
    const cli = clientes.find((c) => formatClienteOptionLabel(c) === label)
    setForm((prev: typeof form) => ({
      ...prev,
      cliente_id: cli?.id || '',
    }))
  }

  async function carregarMovimentacoes(currentPage = 1) {
    try {
      setLoading(true)

      const data = await movimentacoesClientesService.getAll(currentPage, 10)

      setHistorico(data.data || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 1)
    } finally {
      setLoading(false)
    }
  }

  // ─── form (criar) ───────────────────────────────────────────

  function addItem() {
    setForm((prev: any) => ({
      ...prev,
      itens: [...prev.itens, { ...emptyItem }],
    }))
  }

  function removeItem(index: number) {
    setForm((prev: any) => ({
      ...prev,
      itens: prev.itens.filter((_: any, i: number) => i !== index),
    }))
  }

  function cloneItem(item: any) {
    return {
      tipo_corte: item.tipo_corte || '',
      peso_total_kg: item.peso_total_kg ?? '',
      valor_kg: item.valor_kg ?? '',
      valor_total: item.valor_total ?? '',
      composicoes: (item.composicoes || []).map((c: any) => ({
        tipo_corte: c.tipo_corte,
        peso_kg: c.peso_kg ?? '',
      })),
    }
  }

  function updateItem(index: number, field: string, value: any) {
    const itens = [...form.itens]
    itens[index][field] = value

    if (field === 'valor_total' && !isCasado(itens[index].tipo_corte)) {
      itens[index].valor_total = Number(value) || 0
    } else {
      recalcItemValores(itens[index])
    }

    setForm({ ...form, itens })
  }

  function copyItem(index: number) {
    setForm((prev: any) => {
      const copia = cloneItem(prev.itens[index])
      const itens = [...prev.itens]
      itens.splice(index + 1, 0, copia)
      return { ...prev, itens }
    })
    toast.success('Peça copiada — ajuste o valor total se necessário')
  }

  function changeTipo(index: number, tipo: string) {
    const itens = [...form.itens]
    itens[index].tipo_corte = tipo
    if (isCasado(tipo)) {
      itens[index].peso_total_kg = ''
      itens[index].composicoes = buildComposicoesCasadoVazia()
    } else if (isBanda(tipo)) {
      itens[index].composicoes = buildComposicoesBandaVazia()
    } else {
      itens[index].composicoes = []
    }
    setForm({ ...form, itens })
  }

  function updateComposicao(itemIndex: number, compIndex: number, value: any) {
    const itens = [...form.itens]
    itens[itemIndex].composicoes[compIndex].peso_kg = value

    if (isCasado(itens[itemIndex].tipo_corte)) {
      recalcItemValores(itens[itemIndex])
      setForm({ ...form, itens })
      return
    }

    const total = itens[itemIndex].composicoes.reduce(
      (acc: number, c: any) => acc + Number(c.peso_kg || 0),
      0
    )
    itens[itemIndex].peso_total_kg = String(total)
    const valorKg = Number(itens[itemIndex].valor_kg || 0)
    itens[itemIndex].valor_total = total * valorKg
    setForm({ ...form, itens })
  }

  function calcularTotal(itens: any[]) {
    return itens.reduce(
      (acc: number, i: any) => acc + Number(i.valor_total || 0),
      0
    )
  }

  function calcularPesoTotal(itens: any[]) {
    return itens.reduce((acc: number, item: any) => {
      if (isCasado(item.tipo_corte)) {
        const pesoCasado = (item.composicoes || []).reduce(
          (soma: number, c: any) => soma + Number(c.peso_kg || 0),
          0,
        )
        return acc + pesoCasado
      }
      if (isBanda(item.tipo_corte)) {
        const pesoBanda = (item.composicoes || []).reduce(
          (soma: number, c: any) => soma + Number(c.peso_kg || 0),
          0,
        )
        return acc + pesoBanda
      }
      return acc + Number(item.peso_total_kg || 0)
    }, 0)
  }

  const formatKg = (value: number) =>
    `${Number(value || 0).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} kg`

  async function handleCreate() {
    const temViscera = hasViscera(form.itens)
    const temNormal = hasNormal(form.itens)

    if (temViscera && temNormal) {
      toast.error('Não é permitido misturar vísceras com outros cortes')
      setLoadingSave(false)
      return
    }
    try {
      setLoadingSave(true)
      if (!form.cliente_id) {
        toast.error('Selecione cliente')
        return
      }

      const payload = {
        cliente_id: form.cliente_id,
        observacao: form.observacao,
        data_movimentacao: form.data_movimentacao,
        movimentacao_status: form.movimentacao_status,
        itens: form.itens.map((i: any) => ({
          tipo_corte: i.tipo_corte,
          peso_total_kg: isCasado(i.tipo_corte)
            ? parseQuantidadeCasados(i.peso_total_kg)
            : Number(i.peso_total_kg || 0),
          valor_kg: parseValorUnitario(i.valor_kg),
          valor_total: Number(i.valor_total || 0),
          composicoes: (i.composicoes || []).map((c: any) => ({
            tipo_corte: c.tipo_corte,
            peso_kg: parseDecimalInput(String(c.peso_kg || '')),
          })),
        })),
        valor_total: totalGeral,
      }

      toast.success('Movimentação criada')
      const venda = await movimentacoesClientesService.create(payload)

      const itensVisceras = form.itens.filter(
        (item: any) => isViscera(item.tipo_corte)
      )

      if (hasViscera(form.itens)) {
        for (const item of itensVisceras) {
          await viscerasService.create({
            tipo: '0',
            quantidade: Number(item.peso_total_kg || 0),
            referencia_venda_id: venda.id
          })
        }
      } else {
        await gerarMovimentacaoEstoqueAutomatica(venda, form)
      }

      setForm(emptyForm())
      setClienteBusca('')
      setTotalGeral(0)
      setPesoTotalGeral(0)
      setShowCreate(false)
      carregarMovimentacoes()
      setLoadingSave(false)
    } catch {
      setLoadingSave(false)

      toast.error('Erro ao salvar')
    }
  }

  function agruparItens(itens: any[]) {
    const mapa: Record<string, any> = {}

    for (const item of itens) {
      const key = (item.corte || '').trim().toLowerCase()

      if (!key) continue

      if (!mapa[key]) {
        mapa[key] = {
          corte: item.corte,
          peso_bruto_kg: 0,
          peso_liquido_kg: 0,
          quantidade_pecas: 0,
          agrupamento_id: item.agrupamento_id || null,
        }
      }

      mapa[key].peso_bruto_kg += Number(item.peso_bruto_kg || 0)
      mapa[key].peso_liquido_kg += Number(item.peso_liquido_kg || 0)
      mapa[key].quantidade_pecas += Number(item.quantidade_pecas || 1)
    }

    return Object.values(mapa)
  }

  async function gerarMovimentacaoEstoqueAutomatica(venda: any, form: any) {
    const itensNormais = form.itens.filter(
      (item: any) => !isViscera(item.tipo_corte)
    )

    let totalPeso = 0

    const itensSaida = itensNormais.flatMap((item: any) => {
      const banda = isBanda(item.tipo_corte)
      const casado = isCasado(item.tipo_corte)

      if (casado) {
        const agrupamentoId = item.agrupamento_id || crypto.randomUUID()

        return (item.composicoes || []).map((c: any) => {
          const peso = parseDecimalInput(String(c.peso_kg || ''))
          totalPeso += peso

          return {
            corte: normalizeCorteEstoque(c.tipo_corte),
            peso_bruto_kg: peso,
            peso_liquido_kg: peso,
            quantidade_pecas: 1,
            agrupamento_id: agrupamentoId,
          }
        })
      }

      if (banda) {
          const agrupamentoId = item.agrupamento_id || crypto.randomUUID()

        return (item.composicoes || []).map((c: any) => {
          const peso = Number(c.peso_kg || 0)

          totalPeso += peso

          return {
            corte: c.tipo_corte,
            peso_bruto_kg: peso,
            peso_liquido_kg: peso,
            agrupamento_id: agrupamentoId,
          }
        })
      }

      const peso = Number(item.peso_total_kg || 0)

      totalPeso += peso

      return [
        {
          corte: item.tipo_corte,
          peso_bruto_kg: peso,
          peso_liquido_kg: peso,
          agrupamento_id: null,
        },
      ]
    })

    if (!itensSaida.length) return

    const itensAgrupados = agruparItens(itensSaida)
    const mov = await estoqueService.createMovimentacao({
      lote: `venda-${venda.id}`,
      tipo_movimentacao: 0,
      data_movimentacao: form.data_movimentacao,
      observacoes: `Saída automática venda ${venda.id}`,
      peso_bruto_kg: totalPeso,
      peso_liquido_kg: totalPeso,
      venda_id: venda.id,
    })

    await estoqueService.createMovimentacaoItem(
      itensAgrupados.map((i: any) => ({
        ...i,
        movimentacao_id: mov.id,
      }))
    )
          setLoadingSave(false)

  }
  function calcularTotalEdit(itens: any[]) {
    return itens.reduce(
      (acc: number, i: any) => acc + Number(i.valor_total || 0),
      0
    )
  }

  function addEditItem() {
    setEditando((prev: any) => ({
      ...prev,
      itens: [...prev.itens, { ...emptyItem }],
    }))
  }

  function removeEditItem(index: number) {
    setEditando((prev: any) => ({
      ...prev,
      itens: prev.itens.filter((_: any, i: number) => i !== index),
    }))
  }

  function updateEditItem(index: number, field: string, value: any) {
    const itens = [...editando.itens]
    itens[index][field] = value

    if (field === 'valor_total' && !isCasado(itens[index].tipo_corte)) {
      itens[index].valor_total = Number(value) || 0
    } else {
      recalcItemValores(itens[index])
    }

    setEditando({ ...editando, itens })
  }

  function copyEditItem(index: number) {
    setEditando((prev: any) => {
      const copia = cloneItem(prev.itens[index])
      const itens = [...prev.itens]
      itens.splice(index + 1, 0, copia)
      return { ...prev, itens }
    })
    toast.success('Peça copiada — ajuste o valor total se necessário')
  }

  function changeEditTipo(index: number, tipo: string) {
    const itens = [...editando.itens]
    itens[index].tipo_corte = tipo
    if (isCasado(tipo)) {
      itens[index].peso_total_kg = ''
      itens[index].composicoes = buildComposicoesCasadoVazia()
    } else if (isBanda(tipo)) {
      itens[index].composicoes = buildComposicoesBandaVazia()
    } else {
      itens[index].composicoes = []
    }
    setEditando({ ...editando, itens })
  }

  function updateEditComposicao(
    itemIndex: number,
    compIndex: number,
    value: any
  ) {
    const itens = [...editando.itens]
    itens[itemIndex].composicoes[compIndex].peso_kg = value

    if (isCasado(itens[itemIndex].tipo_corte)) {
      recalcItemValores(itens[itemIndex])
      setEditando({ ...editando, itens })
      return
    }

    const total = itens[itemIndex].composicoes.reduce(
      (acc: number, c: any) => acc + Number(c.peso_kg || 0),
      0
    )
    itens[itemIndex].peso_total_kg = String(total)
    itens[itemIndex].valor_total =
      total * Number(itens[itemIndex].valor_kg || 0)
    setEditando({ ...editando, itens })
  }

  const [movimentacaoOriginal, setMovimentacaoOriginal] = useState<any>(null)

  function hasViscera(itens: any[]) {
    return itens.some((i: any) => isViscera(i.corte || i.tipo_corte))
  }

  function hasNormal(itens: any[]) {
    return itens.some((i: any) => !isViscera(i.corte || i.tipo_corte))
  }

  function renderItemFields(
    item: any,
    index: number,
    onChangeTipo: (index: number, tipo: string) => void,
    onUpdate: (index: number, field: string, value: any) => void,
    onUpdateComposicao: (itemIndex: number, compIndex: number, value: any) => void,
    onCopy: (index: number) => void,
    onRemove: (index: number) => void,
  ) {
    const qtyCasados = parseQuantidadeCasados(item.peso_total_kg)
    const qtyLabel = labelQuantidadeCorte(item.tipo_corte)
    const valorLabel = labelValorUnitarioCorte(item.tipo_corte)

    return (
      <Card className={styles.form} key={index}>
        <div className={styles.selectWrap}>
          <label>Corte</label>
          <select
            className={styles.select}
            value={item.tipo_corte}
            onChange={(e) => onChangeTipo(index, e.target.value)}
          >
            <option value="">Selecione</option>
            {TIPOS_CORTE.map((corte) => (
              <option key={corte} value={corte}>
                {corte}
              </option>
            ))}
          </select>
        </div>

        {isCasado(item.tipo_corte) ? (
          <>
            <Input
              label={qtyLabel ?? 'Quantidade'}
              mask="integer"
              value={item.peso_total_kg ?? ''}
              onChange={(e) => onUpdate(index, 'peso_total_kg', e.target.value)}
            />
            {qtyCasados > 0 && (
              <div className={styles.casadoPecas}>
                <span className={styles.casadoPecasTitulo}>
                  Peso de cada peça (kg)
                </span>
                {(item.composicoes || []).map((c: any, i: number) => (
                  <Input
                    key={`${c.tipo_corte}-${i}`}
                    label={c.tipo_corte}
                    mask="decimal"
                    value={c.peso_kg ?? ''}
                    onChange={(e) =>
                      onUpdateComposicao(index, i, e.target.value)
                    }
                  />
                ))}
              </div>
            )}
            <Input
              label={valorLabel}
              type="number"
              value={item.valor_kg ?? ''}
              onChange={(e) => onUpdate(index, 'valor_kg', e.target.value)}
            />
            {qtyCasados > 0 && (
              <p className={styles.casadoHint}>
                {formatResumoCasado(qtyCasados, item.composicoes)}
              </p>
            )}
            <p className={styles.casadoRegra}>{REGRA_CASADO}</p>
          </>
        ) : (
          <Input
            label={valorLabel}
            type="number"
            value={item.valor_kg ?? ''}
            onChange={(e) => onUpdate(index, 'valor_kg', e.target.value)}
          />
        )}

        {!isBanda(item.tipo_corte) && !isCasado(item.tipo_corte) && (
          <Input
            label={qtyLabel ?? 'Peso total KG'}
            type="number"
            value={item.peso_total_kg ?? ''}
            onChange={(e) => onUpdate(index, 'peso_total_kg', e.target.value)}
          />
        )}

        {isBanda(item.tipo_corte) &&
          item.composicoes.map((c: any, i: number) => (
            <Input
              key={i}
              label={c.tipo_corte}
              type="number"
              value={c.peso_kg ?? ''}
              onChange={(e) => onUpdateComposicao(index, i, e.target.value)}
            />
          ))}

        <Input
          label="Valor total da peça (R$)"
          type="number"
          min="0"
          step="0.01"
          value={item.valor_total ?? ''}
          onChange={(e) => onUpdate(index, 'valor_total', e.target.value)}
        />

        <div className={styles.itemActions}>
          <Button
            size={48}
            variant="outline"
            onClick={() => onCopy(index)}
            title="Copiar peça"
          >
            <Copy className="w-4 h-4" />
          </Button>
          <Button
            size={48}
            variant="destructive"
            onClick={() => onRemove(index)}
            title="Remover peça"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    )
  }

  async function handleEdit() {
    const temViscera = hasViscera(editando.itens)
    const temNormal = hasNormal(editando.itens)

    if (temViscera && temNormal) {
      toast.error('Não é permitido misturar vísceras com outros cortes')
      setLoadingSave(false)
      return
    }
    try {
      setLoadingSave(true)

      const payload = {
        cliente_id: editando.cliente_id,
        observacao: editando.observacao,
        data_movimentacao: editando.data_movimentacao,
        movimentacao_status: editando.movimentacao_status,
        itens: editando.itens.map((i: any) => ({
          tipo_corte: i.tipo_corte,
          peso_total_kg: isCasado(i.tipo_corte)
            ? parseQuantidadeCasados(i.peso_total_kg)
            : Number(i.peso_total_kg || 0),
          valor_kg: parseValorUnitario(i.valor_kg),
          valor_total: Number(i.valor_total || 0),
          composicoes: (i.composicoes || []).map((c: any) => ({
            tipo_corte: c.tipo_corte,
            peso_kg: parseDecimalInput(String(c.peso_kg || '')),
          })),
        })),
        valor_total: calcularTotalEdit(editando.itens),
      }

      await movimentacoesClientesService.update(
        editando.id,
        payload
      )

      const houveMudancaItens =
        JSON.stringify(editando.itens) !==
        JSON.stringify(movimentacaoOriginal.itens)

      if (houveMudancaItens) {
        const itensVisceras = editando.itens.filter(
          (item: any) => isViscera(item.tipo_corte)
        )

        if (hasViscera(editando.itens)) {
          console.log('deletando estoque de visceras')
          await viscerasService.deleteByReferencia(editando.id)
        }
        else {
          console.log('deletando estoque normal')
          await estoqueService.deleteByReferencia(editando.id)
        }


        if (hasViscera(editando.itens)) {
          for (const item of itensVisceras) {
            await viscerasService.create({
              tipo: '0',
              quantidade: Number(item.peso_total_kg || 0),
              referencia_venda_id: `${editando.id}`
            })
          }
        } else {
          await gerarMovimentacaoEstoqueAutomatica(editando, editando)
        }

      }

      toast.success('Movimentação atualizada')

      setEditando(null)
      setMovimentacaoOriginal(null)

      carregarMovimentacoes()
    } catch {
      toast.error('Erro ao editar')
    } finally {
      setLoadingSave(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Excluir esta movimentação?')) return
    try {
      await movimentacoesClientesService.delete(id)
      await estoqueService.deleteByReferencia(id)
      toast.success('Movimentação excluída')
      setEditando(null)
      carregarMovimentacoes()
    } catch {
      toast.error('Erro ao excluir')
    }
  }

  // ─── tabela ──────────────────────────────────────────────────

  const columns = [
    {
      key: 'cliente',
      header: 'Cliente',
      render: (r: any) => (
        <a
          onClick={() =>
            setClienteExtrato({
              cliente: r.cliente ?? {
                id: r.cliente_id,
                nome: r.cliente?.nome ?? 'Cliente',
              },
            })
          }
          style={{ cursor: 'pointer', textDecoration: 'underline' }}
        >
          {r.cliente?.nome}
        </a>
      ),
    },
    {
      key: 'data',
      header: 'Data',
      render: (r: any) => r.data_movimentacao,
    },
    {
      key: 'detalhes',
      header: 'Itens',
      render: (r: any) => (
        <TouchTooltip label={`Ver itens (${r.itens?.length || 0})`}>
          {r.itens?.map((item: any, index: number) => (
            <div key={index} className={touchTooltipStyles.item}>
              <strong>{item.tipo_corte}</strong>
              <span>
                {isCasado(item.tipo_corte)
                  ? `${pesoTotalComposicao(item.composicoes || []).toFixed(2)} kg × R$ ${Number(item.valor_kg || 0).toFixed(2)}`
                  : isViscera(item.tipo_corte)
                    ? `${Number(item.peso_total_kg || 0)} un × R$ ${Number(item.valor_kg || 0).toFixed(2)}`
                    : `${Number(item.peso_total_kg || 0).toFixed(2)} kg × R$ ${Number(item.valor_kg || 0).toFixed(2)}`}
              </span>
              <span>Total: R$ {Number(item.valor_total).toFixed(2)}</span>
              {item.composicoes?.length > 0 && (
                <div className={touchTooltipStyles.subitems}>
                  {item.composicoes.map((c: any, i: number) => (
                    <small key={i}>
                      {c.tipo_corte}: {Number(c.peso_kg || 0).toFixed(2)} kg
                    </small>
                  ))}
                </div>
              )}
            </div>
          ))}
        </TouchTooltip>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      render: (r: any) => `R$ ${Number(r.valor_total).toFixed(2)}`,
    },
    {
      key: 'status',
      header: 'Status',
      render: (r: any) => (
        <span
          className={
            r.movimentacao_status === 'finalizado'
              ? styles.badgeFinalizado
              : styles.badgePendente
          }
        >
          {r.movimentacao_status === 'finalizado' ? 'Finalizado' : 'Pendente'}
        </span>
      ),
    },
    {
      key: 'acao',
      header: 'Ação',
      render: (r: any) => (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button
            variant="ghost"
            onClick={() =>
              setClienteExtrato({
                cliente: r.cliente ?? {
                  id: r.cliente_id,
                  nome: r.cliente?.nome ?? 'Cliente',
                },
              })
            }
          >
            Extrato
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setMovimentacaoOriginal(structuredClone(r))
              setEditando(structuredClone(r))
            }}
          >
            Editar
          </Button>
          <Button variant="destructive" onClick={() => handleDelete(r.id)}>
            Excluir
          </Button>
        </div>
      ),
    },
  ]
  // ─── render ──────────────────────────────────────────────────

  return (
    <div className={styles.page}>
      <h1 className="page-title">Movimentações</h1>

      {showCreate && (
      <Card className={styles.card} title="Nova movimentação">
        <div className={styles.formSimples}>
          <Autocomplete
            label="Cliente"
            placeholder="Nome ou nome da empresa..."
            loading={loadingClientes}
            options={clientes.map(formatClienteOptionLabel)}
            value={clienteBusca}
            onChange={selecionarClientePorLabel}
          />

          <Input
            label="Data movimentação"
            type="date"
            value={form.data_movimentacao}
            onChange={(e) =>
              setForm({ ...form, data_movimentacao: e.target.value })
            }
          />

          <div className={styles.selectWrap}>
            <label>Status</label>
            <select
              className={styles.select}
              value={form.movimentacao_status ?? 'pendente'}
              onChange={(e) =>
                setForm({ ...form, movimentacao_status: e.target.value })
              }
            >
              <option value="pendente">Pendente</option>
              <option value="finalizado">Finalizado</option>
            </select>
          </div>
        </div>

        {form.itens.map((item: any, index: number) =>
          renderItemFields(
            item,
            index,
            changeTipo,
            updateItem,
            updateComposicao,
            copyItem,
            removeItem,
          ),
        )}

        <div className={styles.form}>
          <Button variant='outline' onClick={addItem}>+ Peça</Button>
        </div>
        <Input
          label="Observação"
          value={form.observacao}
          onChange={(e) => setForm({ ...form, observacao: e.target.value })}
        />

        <div className={styles.resumoSalvar}>
          <div className={styles.resumoItem}>
            <span className={styles.resumoLabel}>Peso total</span>
            <strong className={styles.resumoValor}>
              {formatKg(pesoTotalGeral)}
            </strong>
          </div>
          <div className={styles.resumoItem}>
            <span className={styles.resumoLabel}>Total geral</span>
            <strong className={styles.resumoValorHighlight}>
              R$ {totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </strong>
          </div>
        </div>

        <div className={styles.createActions}>
          <Button
            loading={loadingSave}
            disabled={loadingSave || !form.cliente_id || form.itens.length === 0}
            onClick={handleCreate}
          >
            Salvar movimentação
          </Button>
          <Button variant="ghost" onClick={closeCreate}>
            Cancelar
          </Button>
        </div>
      </Card>
      )}

      <Card
        title="Movimentações cadastradas"
        action={
          <AddNewButton
            open={showCreate}
            onClick={() => (showCreate ? closeCreate() : setShowCreate(true))}
            label="Nova movimentação"
          />
        }
      >
        <Table
          columns={columns}
          data={historico}
          keyExtractor={(r) => String(r.id)}
          loading={loading}
          page={page}
          total={total}
          totalPages={totalPages}
          onPageChange={setPage}
          emptyMessage="Nenhuma movimentação encontrada."
        />
      </Card>

      <Modal
        open={!!detalhe}
        onClose={() => setDetalhe(null)}
        title="Detalhes da movimentação"
      >
        {detalhe && (
          <div className={styles.modalContent}>
            <ModalDetails
              items={[
                {
                  label: 'Cliente',
                  value: detalhe.cliente?.nome || '-',
                },
                {
                  label: 'Data',
                  value: detalhe.data_movimentacao,
                },
                {
                  label: 'Total',
                  value: `R$ ${Number(detalhe.valor_total).toFixed(2)}`,
                },
                {
                  label: 'Observação',
                  value: detalhe.observacao || '-',
                },
              ]}
            />

            <div className={styles.items}>
              {detalhe.itens?.map((item: any, idx: number) => (
                <div key={idx} className={styles.itemCard}>
                  <strong>{item.tipo_corte}</strong>
                  {isCasado(item.tipo_corte) ? (
                    <>
                      <p>
                        {formatResumoCasado(
                          Number(item.peso_total_kg || 0),
                          item.composicoes,
                        )}
                      </p>
                      <p>
                        {pesoTotalComposicao(item.composicoes || []).toFixed(2)}{' '}
                        kg × R$ {Number(item.valor_kg).toFixed(2)}/kg
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        {isViscera(item.tipo_corte) ? 'Unidades' : 'Peso'}:{' '}
                        {item.peso_total_kg}
                        {isViscera(item.tipo_corte) ? '' : ' kg'}
                      </p>
                      <p>
                        Valor/{isViscera(item.tipo_corte) ? 'un' : 'kg'}: R${' '}
                        {Number(item.valor_kg).toFixed(2)}
                      </p>
                    </>
                  )}
                  <p>Total: R$ {Number(item.valor_total).toFixed(2)}</p>

                  {item.composicoes?.length > 0 && (
                    <div className={styles.composicoes}>
                      {item.composicoes.map((c: any, i: number) => (
                        <span key={i}>
                          {c.tipo_corte}: {Number(c.peso_kg || 0).toFixed(2)} kg
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className={styles.modalActions}>
              <Button
                onClick={() => {
                  setEditando(detalhe)
                  setDetalhe(null)
                }}
              >
                Editar
              </Button>
            </div>
          </div>
        )}
      </Modal>
      {/* ── Modal de edição ── */}
      <Modal
        open={!!editando}
        onClose={() => setEditando(null)}
        title="Editar movimentação"
      >
        {editando && (
          <div className={styles.modalContent}>
            <Input
              label="Data movimentação"
              type="date"
              value={editando.data_movimentacao ?? ''}
              onChange={(e) =>
                setEditando({ ...editando, data_movimentacao: e.target.value })
              }
            />
            <div className={styles.selectWrap}>
              <label>Status</label>
              <select
                className={styles.select}
                value={editando.movimentacao_status ?? 'pendente'}
                onChange={(e) =>
                  setEditando({
                    ...editando,
                    movimentacao_status: e.target.value,
                  })
                }
              >
                <option value="pendente">Pendente</option>
                <option value="finalizado">Finalizado</option>
              </select>
            </div>

            <Input
              label="Observação"
              value={editando.observacao ?? ''}
              onChange={(e) =>
                setEditando({ ...editando, observacao: e.target.value })
              }
            />

            <div className={styles.items}>
              {editando.itens?.map((item: any, index: number) =>
                renderItemFields(
                  item,
                  index,
                  changeEditTipo,
                  updateEditItem,
                  updateEditComposicao,
                  copyEditItem,
                  removeEditItem,
                ),
              )}
            </div>

            <Button variant='outline' onClick={addEditItem}>+ Item</Button>

            <div className={styles.resumoSalvar}>
              <div className={styles.resumoItem}>
                <span className={styles.resumoLabel}>Peso total</span>
                <strong className={styles.resumoValor}>
                  {formatKg(calcularPesoTotal(editando.itens))}
                </strong>
              </div>
              <div className={styles.resumoItem}>
                <span className={styles.resumoLabel}>Total geral</span>
                <strong className={styles.resumoValorHighlight}>
                  R${' '}
                  {calcularTotalEdit(editando.itens).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                  })}
                </strong>
              </div>
            </div>

            <div className={styles.modalActions}>
              <Button variant="ghost" onClick={() => setEditando(null)}>
                Cancelar
              </Button>
              <div style={{ flex: 1 }} />

              {/* {editando.movimentacao_status !== 'finalizado' && (
                <Button
                  variant="outline"
                  onClick={() => setEditando({ ...editando, movimentacao_status: 'finalizado' })}
                >
                  ✓ Finalizar
                </Button>
              )} */}
              <Button loading={loadingSave} disabled={loadingSave} onClick={handleEdit}>
                Salvar
              </Button>
            </div>
          </div>
        )}
      </Modal>
      <ClienteExtratoModal
        open={!!clienteExtrato?.cliente?.id}
        cliente={clienteExtrato?.cliente}
        onClose={() => setClienteExtrato(null)}
      />
    </div>
  )
}
