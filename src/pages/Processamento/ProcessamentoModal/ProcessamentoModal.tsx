import { useEffect, useState } from 'react'
import { Button, Card, Input, Modal, Select } from '@/components/ui'
import { estoqueService } from '@/services/estoque.service'
import { TIPOS_CORTE, CORTE_BD, REGRA_BD } from '@/constants/cortes'
import { Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import styles from './ProcessamentoModal.module.scss'

interface Props {
  open: boolean
  data?: any
  initialData?: any
  title?: string
  successMessage?: string
  onClose: () => void
  onSuccess?: () => void | Promise<void>
}
interface ItemForm {
  corte: string
  peso_liquido_kg: string
  quantidade_pecas: string
  tipo_movimentacao: string
  composicoes: {
    tipo_corte: string
    peso_kg: string
  }[]
  agrupamento_id?: string
}

const emptyItem = (): ItemForm => ({
  corte: '',
  peso_liquido_kg: '',
  tipo_movimentacao: '1',
  composicoes: [],
  quantidade_pecas: ""
})



const isBanda = (tipo: string) => {
  const t = (tipo || '').toLowerCase()
  return t.includes('banda') || t.includes('bd')
}

export function ProcessamentoModal({
  open,
  data,
  initialData,
  title,
  successMessage = 'Salvo',
  onClose,
  onSuccess,
}: Props) {

  const [loadingSave, setLoadingSave] = useState(false)

  const [form, setForm] = useState({
    lote: '',
    tipo_movimentacao: '1',
    data_movimentacao: new Date().toISOString().split('T')[0],
    observacoes: '',
    quantidade_pecas: '',
    itens: [emptyItem()],
  })

  useEffect(() => {
    if (!open) return

    if (data) {
      const itensAgrupados: ItemForm[] = []
      const grupos: Record<string, any[]> = {}

      for (const item of data.itens) {
        if (item.agrupamento_id) {
          if (!grupos[item.agrupamento_id]) {
            grupos[item.agrupamento_id] = []
          }
          grupos[item.agrupamento_id].push(item)
        } else {
          itensAgrupados.push({
            corte: item.corte,
            peso_liquido_kg: String(item.peso_liquido_kg),
            quantidade_pecas: String(item.quantidade_pecas || ''),
            tipo_movimentacao: String(data.tipo_movimentacao),
            composicoes: [],
            agrupamento_id: undefined,
          })
        }
      }

      for (const [agrupamentoId, itensBanda] of Object.entries(grupos)) {
        itensAgrupados.push({
          corte: CORTE_BD,
          peso_liquido_kg: String(
            itensBanda.reduce((acc, i) => acc + Number(i.peso_liquido_kg), 0)
          ),
          quantidade_pecas: String(itensBanda[0]?.quantidade_pecas || ''),
          tipo_movimentacao: String(data.tipo_movimentacao),
          agrupamento_id: agrupamentoId,
          composicoes: itensBanda.map((i) => ({
            tipo_corte: i.corte,
            peso_kg: String(i.peso_liquido_kg),
          })),
        })
      }

      setForm({
        lote: data.lote,
        tipo_movimentacao: data.tipo_movimentacao,
        data_movimentacao: data.data_movimentacao,
        observacoes: data.observacoes || '',
        quantidade_pecas: data.quantidade_pecas || '',
        itens: itensAgrupados,
      })

      return
    }

    setForm({
      lote: initialData?.lote || '',
      tipo_movimentacao: initialData?.tipo_movimentacao || 1,
      data_movimentacao:
        initialData?.data_movimentacao ||
        new Date().toISOString().split('T')[0],
      quantidade_pecas: '',
      observacoes: initialData?.observacoes || '',
      itens: initialData?.itens || [emptyItem()],
    })
  }, [open, data, initialData])

  function addItem() {
    setForm((p) => ({
      ...p,
      itens: [...p.itens, emptyItem()],
    }))
  }

  function removeItem(index: number) {
    setForm((p) => ({
      ...p,
      itens: p.itens.filter((_: any, i: number) => i !== index),
    }))
  }

  function updateItem(index: number, field: string, value: string) {

    const itens = [...form.itens]

    itens[index] = {
      ...itens[index],
      [field]: value
    }

    setForm({
      ...form,
      itens
    })
  }

  function changeTipo(index: number, corte: string) {

    const itens = [...form.itens]

    itens[index].corte = corte

    if (isBanda(corte)) {
      itens[index].agrupamento_id = crypto.randomUUID()

      itens[index].composicoes = [
        {
          tipo_corte: 'Dianteiro',
          peso_kg: ''
        },
        {
          tipo_corte: 'Traseiro',
          peso_kg: ''
        }
      ]

      itens[index].peso_liquido_kg = ''
    } else {
      itens[index].composicoes = []
      itens[index].agrupamento_id = undefined
    }

    setForm({
      ...form,
      itens
    })
  }

  function updateComposicao(
    itemIndex: number,
    compIndex: number,
    value: string
  ) {

    const itens = [...form.itens]

    itens[itemIndex]
      .composicoes[compIndex]
      .peso_kg = value

    const total =
      itens[itemIndex]
        .composicoes
        .reduce(
          (acc: any, c: any) =>
            acc + Number(c.peso_kg || 0),
          0
        )

    itens[itemIndex].peso_liquido_kg =
      String(total)

    setForm({
      ...form,
      itens
    })
  }

  const totalPeso = form.itens.reduce(
    (acc: any, item: any) => {

      if (isBanda(item.corte)) {
        return acc +
          item.composicoes.reduce(
            (s: any, c: any) =>
              s + Number(c.peso_kg || 0),
            0
          )
      }

      return acc +
        Number(item.peso_liquido_kg || 0)

    }, 0
  )

  async function handleSave() {

    try {

      setLoadingSave(true)

      const itensPayload = []

      for (const item of form.itens) {

        if (isBanda(item.corte)) {

          const agrupamentoId =
            item.agrupamento_id ||
            crypto.randomUUID()

          for (const c of item.composicoes) {

            const peso = Number(c.peso_kg)

            itensPayload.push({
              corte: c.tipo_corte,
              peso_bruto_kg: peso,
              peso_liquido_kg: peso,
              agrupamento_id: agrupamentoId,
              quantidade_pecas: item.quantidade_pecas
            })
          }
        } else {

          const peso =
            Number(item.peso_liquido_kg)
          itensPayload.push({
            corte: item.corte,
            peso_bruto_kg: peso,
            peso_liquido_kg: peso,
            agrupamento_id: null,
            quantidade_pecas: item.quantidade_pecas
          })

        }
      }

      let mov: any

      if (data?.id) {

        await estoqueService.updateMovimentacao(
          data.id,
          {
            lote: form.lote,
            tipo_movimentacao: form.tipo_movimentacao,
            data_movimentacao: form.data_movimentacao,
            observacoes: form.observacoes,
          }
        )

        await estoqueService.replaceMovimentacaoItens(
          data.id,
          itensPayload.map(i => ({
            ...i,
            movimentacao_id: data.id
          }))
        )

      } else {

        mov =
          await estoqueService.createMovimentacao({
            lote: form.lote,
            tipo_movimentacao: form.tipo_movimentacao,
            data_movimentacao: form.data_movimentacao,
            observacoes: form.observacoes,
            peso_bruto_kg: totalPeso,
            peso_liquido_kg: totalPeso,
          })

        await estoqueService.createMovimentacaoItem(
          itensPayload.map(i => ({
            ...i,
            movimentacao_id: mov.id
          }))
        )
      }

      toast.success(successMessage)

      await onSuccess?.()
      onClose()

    } catch {
      toast.error('Erro ao salvar')
    } finally {
      setLoadingSave(false)
    }
  }

  return (
    <Modal
      open={open}
      width='900px'
      onClose={onClose}
      title={title ?? (data ? 'Editar movimentação' : 'Nova movimentação')}
    >

      <div className={styles.formSimples}>

        <Input
          label="Lote"
          value={form.lote ?? ''}
          onChange={(e) =>
            setForm({
              ...form,
              lote: e.target.value
            })
          }
        />

        <Select
          label="Movimentaçao"
          options={['Entrada', 'Saida']}
          value={form.tipo_movimentacao == "1" ? 'Entrada' : 'Saida'}
          onChange={(e) =>
            setForm({
              ...form,
              tipo_movimentacao: e.target.value == "Saida" ? '0' : '1',
            })
          }
        />

        <Input
          label="Data movimentação"
          type="date"
          value={form.data_movimentacao ?? ''}
          onChange={(e) =>
            setForm({
              ...form,
              data_movimentacao: e.target.value
            })
          }
        />

      </div>

      {form.itens.map((item: any, index) => (

        <Card key={index}>
          <div className={styles.itemForm}>
            <Select
              label="Corte"
              options={[...TIPOS_CORTE]}
              value={item.corte ?? ''}
              onChange={(e) =>
                changeTipo(index, e.target.value)
              }
            />

            <Input
              label="Quantidade"
              type="number"
              value={item.quantidade_pecas ?? ''}
              onChange={(e) =>
                updateItem(
                  index,
                  'quantidade_pecas',
                  e.target.value
                )
              }
            />

            {!isBanda(item.corte) && (
              <Input
                label="Peso líquido"
                type="number"
                value={item.peso_liquido_kg ?? ''}
                onChange={(e) =>
                  updateItem(
                    index,
                    'peso_liquido_kg',
                    e.target.value
                  )
                }
              />
            )}

            {isBanda(item.corte) &&
              item.composicoes.map((c: any, i: number) => (
                <Input
                  key={i}
                  label={c.tipo_corte}
                  value={c.peso_kg ?? ''}
                  onChange={(e) =>
                    updateComposicao(
                      index,
                      i,
                      e.target.value
                    )
                  }
                />
              ))}
          </div>

          {isBanda(item.corte) && (
            <div className={styles.valorFinal}>
              <span>{REGRA_BD}</span>
            </div>
          )}

          <Button
            size={48}
            variant="danger"
            onClick={() => removeItem(index)}
          >
            <Trash2 />
          </Button>
        </Card>

      ))}

      <Button
        variant='outline'
        onClick={addItem}
      >
        + Peça
      </Button>

      <Input
        label="Observações"
        value={form.observacoes ?? ''}
        onChange={(e) =>
          setForm({
            ...form,
            observacoes: e.target.value
          })
        }
      />

      <div>
        <strong>
          Total: {totalPeso.toFixed(2)}kg
        </strong>
      </div>

      <div className={styles.modalActions}>

        <Button
          disabled={
            loadingSave ||
            !form.lote ||
            form.itens.length === 0 ||
            form.itens.some((i: any) => !i.corte)
          }
          loading={loadingSave}
          onClick={handleSave}
        >
          Salvar
        </Button>
      </div>

    </Modal>
  )
}