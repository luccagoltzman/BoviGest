import { useEffect, useState } from 'react'
import { Modal, Input, Button, Select } from '@/components/ui'
import toast from 'react-hot-toast'
import styles from './ViscerasModal.module.scss'
import { viscerasService } from '@/services/visceras.service'

interface ModalVisceraProps {
  open: boolean
  onClose: () => void
  onSaved?: () => void | Promise<void>
  initialData?: any
  defaultValues?: any
  title?: string
  successMessage?: string
}

export function ViscerasModal({
  open,
  onClose,
  onSaved,
  initialData,
  defaultValues,
  title,
  successMessage = 'Movimentação cadastrada',
}: ModalVisceraProps) {
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    tipo: '1',
    quantidade: '',
    observacao: '',
  })

  useEffect(() => {
    if (initialData) {
      setForm({
        tipo: String(initialData.tipo),
        quantidade: String(initialData.quantidade),
        observacao: initialData.observacao || '',
      })
      return
    }

    setForm({
      tipo: String(defaultValues?.tipo ?? '1'),
      quantidade: String(defaultValues?.quantidade ?? ''),
      observacao: defaultValues?.observacao ?? '',
    })
  }, [initialData, defaultValues, open])

  const isValid = form.quantidade

  async function handleSubmit() {
    if (!isValid) {
      toast.error('Preencha a quantidade')
      return
    }

    try {
      setLoading(true)

      const payload = {
        tipo: Number(form.tipo),
        quantidade: Number(form.quantidade),
        observacao: form.observacao,
      }

      if (initialData?.id) {
        await viscerasService.update(initialData.id, payload)
        toast.success('Movimentação atualizada')
      } else {
        await viscerasService.create(payload)
        toast.success(successMessage)
      }

      await onSaved?.()
      onClose()
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao salvar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="500px"
      title={
        title ??
        (initialData ? 'Editar movimentação' : 'Nova movimentação')
      }
    >
      <div className={styles.form}>
        <Select
          label="Movimentaçao"
          options={['Entrada', 'Saida']}
          value={form.tipo ==="1" ? 'Entrada' : 'Saida'}
          onChange={(e) =>
            setForm({
              ...form,
              tipo: e.target.value === 'Saida' ? '0' : '1',
            })
          }
        />

      <Input
        label="Quantidade"
        type="number"
        value={form.quantidade}
        onChange={(e) =>
          setForm({
            ...form,
            quantidade: e.target.value,
          })
        }
      />

      <Input
        label="Observação"
        multiline
        rows={4}
        value={form.observacao}
        onChange={(e) =>
          setForm({
            ...form,
            observacao: e.target.value,
          })
        }
      />

      <div className={styles.modalActions}>
        <Button
          onClick={handleSubmit}
          disabled={!isValid || loading}
        >
          {loading
            ? 'Salvando...'
            : initialData
              ? 'Salvar alterações'
              : 'Cadastrar'}
        </Button>
      </div>
    </div>
    </Modal >
  )
}