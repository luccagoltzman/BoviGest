import { useEffect, useState } from 'react'
import { Modal, Input, Button } from '@/components/ui'
import toast from 'react-hot-toast'
import styles from './ViagemModal.module.scss'

interface ViagemModalProps {
  open: boolean
  onClose: () => void
  onSaved?: () => void
  initialData?: any
  referenciaTipo?: string
  referenciaId?: number | null
  viagensService: {
    create: (payload: any) => Promise<any>
    update: (id: number, payload: any) => Promise<any>
  }
}

export function ModalViagem({
  open,
  onClose,
  onSaved,
  initialData,
  referenciaTipo = 'manual',
  referenciaId = null,
  viagensService,
}: ViagemModalProps) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    data: '',
    veiculo: '',
    motorista: '',
    origem: '',
    destino: '',
    cidade_origem: '',
    cidade_destino: '',
    finalidade: '',
    km: '',
    carga_kg: '',
    custo_total: '',
    observacoes: '',
  })

  useEffect(() => {
    if (initialData) {
      setForm({
        data: initialData.data || '',
        veiculo: initialData.veiculo || '',
        motorista: initialData.motorista || '',
        origem: initialData.origem || '',
        destino: initialData.destino || '',
        cidade_origem: initialData.cidade_origem || '',
        cidade_destino: initialData.cidade_destino || '',
        finalidade: initialData.finalidade || '',
        km: String(initialData.km || ''),
        carga_kg: String(initialData.carga_kg || ''),
        custo_total: String(initialData.custo_total || ''),
        observacoes: initialData.observacoes || '',
      })
      return
    }

    setForm({
      data: '',
      veiculo: '',
      motorista: '',
      origem: '',
      destino: '',
      cidade_origem: '',
      cidade_destino: '',
      finalidade: '',
      km: '',
      carga_kg: '',
      custo_total: '',
      observacoes: '',
    })
  }, [initialData, open])

  const isValid =
    form.data &&
    form.origem &&
    form.destino &&
    form.km &&
    form.carga_kg &&
    form.custo_total

  async function handleSubmit() {
    if (!isValid) {
      toast.error('Preencha os campos obrigatórios')
      return
    }

    try {
      setLoading(true)

      const payload = {
        ...form,
        referencia_tipo: referenciaTipo,
        referencia_id: referenciaId,
        km: Number(form.km || 0),
        carga_kg: Number(form.carga_kg || 0),
        custo_total: Number(form.custo_total || 0),
      }

      if (initialData?.id) {
        await viagensService.update(initialData.id, payload)
        toast.success('Viagem atualizada com sucesso')
      } else {
        await viagensService.create(payload)
        toast.success('Viagem cadastrada com sucesso')
      }

      onSaved?.()
      onClose()
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao salvar viagem')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="900px"
      title={initialData?.custo_total ? 'Editar viagem' : 'Nova viagem'}
    >
      <div className={styles.form}>
        <Input
          label="Data"
          type="date"
          value={form.data}
          onChange={(e) => setForm({ ...form, data: e.target.value })}
        />

        <Input
          label="Veículo"
          value={form.veiculo}
          onChange={(e) => setForm({ ...form, veiculo: e.target.value })}
        />

        <Input
          label="Motorista"
          value={form.motorista}
          onChange={(e) => setForm({ ...form, motorista: e.target.value })}
        />

        <Input
          label="Origem"
          value={form.origem}
          onChange={(e) => setForm({ ...form, origem: e.target.value })}
        />

        <Input
          label="Destino"
          value={form.destino}
          onChange={(e) => setForm({ ...form, destino: e.target.value })}
        />

        <Input
          label="Finalidade"
          value={form.finalidade}
          onChange={(e) => setForm({ ...form, finalidade: e.target.value })}
        />

        <Input
          label="KM"
          type="number"
          value={form.km}
          onChange={(e) => setForm({ ...form, km: e.target.value })}
        />

        <Input
          label="Carga KG"
          type="number"
          value={form.carga_kg}
          onChange={(e) => setForm({ ...form, carga_kg: e.target.value })}
        />

        <Input
          label="Custo total"
          type="number"
          value={form.custo_total}
          onChange={(e) =>
            setForm({
              ...form,
              custo_total: e.target.value,
            })
          }
        />

        <Input
          label="Observações"
          value={form.observacoes}
          onChange={(e) =>
            setForm({
              ...form,
              observacoes: e.target.value,
            })
          }
        />

        <div className={styles.actions}>
          <Button onClick={handleSubmit} disabled={loading || !isValid}>
            {loading
              ? 'Salvando...'
              : initialData
                ? 'Salvar alterações'
                : 'Cadastrar viagem'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
