import { useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Button, Input, Select } from '@/components/ui'
import {
  buscarEnderecoPorCep,
  cepSomenteDigitos,
  formatCepInput,
} from '@/services/cep.service'
import styles from './Fornecedores.module.scss'

export type FornecedorFormData = {
  nome: string
  doc: string
  telefone: string
  data_nascimento: string
  cep: string
  endereco: string
  numero: string
  bairro: string
  cidade: string
  uf: string
  complemento: string
  banco: string
  agencia: string
  conta: string
  tipo_conta: string
  titular_conta: string
  pix_tipo: string
  pix_chave: string
}

const TIPOS_CONTA = ['Corrente', 'Poupança']
const TIPOS_PIX = ['CPF', 'CNPJ', 'E-mail', 'Telefone', 'Chave aleatória']

export const emptyFornecedorForm = (): FornecedorFormData => ({
  nome: '',
  doc: '',
  telefone: '',
  data_nascimento: '',
  cep: '',
  endereco: '',
  numero: '',
  bairro: '',
  cidade: '',
  uf: '',
  complemento: '',
  banco: '',
  agencia: '',
  conta: '',
  tipo_conta: '',
  titular_conta: '',
  pix_tipo: '',
  pix_chave: '',
})

function buildDadosBancariosResumo(form: FornecedorFormData) {
  const partes: string[] = []

  if (form.banco.trim()) partes.push(`Banco: ${form.banco.trim()}`)
  if (form.agencia.trim()) partes.push(`Agência: ${form.agencia.trim()}`)
  if (form.conta.trim()) {
    const conta = form.tipo_conta
      ? `${form.conta.trim()} (${form.tipo_conta})`
      : form.conta.trim()
    partes.push(`Conta: ${conta}`)
  }
  if (form.titular_conta.trim()) {
    partes.push(`Titular: ${form.titular_conta.trim()}`)
  }
  if (form.pix_chave.trim()) {
    const tipoPix = form.pix_tipo || 'PIX'
    partes.push(`${tipoPix}: ${form.pix_chave.trim()}`)
  }

  return partes.length > 0 ? partes.join(' | ') : null
}

export function fornecedorFormFromRow(
  row: Partial<FornecedorFormData> & { dados_bancarios?: string | null },
): FornecedorFormData {
  return {
    nome: row.nome || '',
    doc: row.doc || '',
    telefone: row.telefone || '',
    data_nascimento: row.data_nascimento?.slice(0, 10) || '',
    cep: row.cep ? formatCepInput(row.cep) : '',
    endereco: row.endereco || '',
    numero: row.numero || '',
    bairro: row.bairro || '',
    cidade: row.cidade || '',
    uf: row.uf || '',
    complemento: row.complemento || '',
    banco: row.banco || '',
    agencia: row.agencia || '',
    conta: row.conta || '',
    tipo_conta: row.tipo_conta || '',
    titular_conta: row.titular_conta || '',
    pix_tipo: row.pix_tipo || '',
    pix_chave: row.pix_chave || '',
  }
}

export function fornecedorFormToPayload(form: FornecedorFormData) {
  return {
    nome: form.nome.trim(),
    doc: form.doc.trim(),
    telefone: form.telefone.trim(),
    data_nascimento: form.data_nascimento || null,
    cep: cepSomenteDigitos(form.cep) || null,
    endereco: form.endereco.trim() || null,
    numero: form.numero.trim() || null,
    bairro: form.bairro.trim() || null,
    cidade: form.cidade.trim(),
    uf: form.uf.trim().toUpperCase() || null,
    complemento: form.complemento.trim() || null,
    banco: form.banco.trim() || null,
    agencia: form.agencia.trim() || null,
    conta: form.conta.trim() || null,
    tipo_conta: form.tipo_conta || null,
    titular_conta: form.titular_conta.trim() || null,
    pix_tipo: form.pix_tipo || null,
    pix_chave: form.pix_chave.trim() || null,
    dados_bancarios: buildDadosBancariosResumo(form),
  }
}

type FornecedorFormFieldsProps = {
  value: FornecedorFormData
  onChange: (patch: Partial<FornecedorFormData>) => void
}

export function FornecedorFormFields({
  value,
  onChange,
}: FornecedorFormFieldsProps) {
  const [loadingCep, setLoadingCep] = useState(false)
  const lastCepRef = useRef('')

  async function handleBuscarCep(cepValue = value.cep) {
    const digits = cepSomenteDigitos(cepValue)

    if (digits.length !== 8) {
      toast.error('Informe um CEP válido com 8 dígitos')
      return
    }

    if (lastCepRef.current === digits && value.cidade) return

    try {
      setLoadingCep(true)
      const endereco = await buscarEnderecoPorCep(digits)
      lastCepRef.current = digits

      onChange({
        cep: formatCepInput(digits),
        endereco: endereco.logradouro || value.endereco,
        bairro: endereco.bairro || value.bairro,
        cidade: endereco.cidade || value.cidade,
        uf: endereco.uf || value.uf,
        complemento: value.complemento || endereco.complemento || '',
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao buscar CEP'
      toast.error(message)
    } finally {
      setLoadingCep(false)
    }
  }

  function handleCepBlur() {
    const digits = cepSomenteDigitos(value.cep)
    if (digits.length === 8) {
      handleBuscarCep(value.cep)
    }
  }

  return (
    <>
      <p className={styles.formSectionTitle}>Dados do fornecedor</p>

      <Input
        label="Nome / Razão social"
        value={value.nome}
        onChange={(e) => onChange({ nome: e.target.value })}
      />
      <Input
        label="CPF / CNPJ"
        value={value.doc}
        onChange={(e) => onChange({ doc: e.target.value })}
      />
      <Input
        label="Telefone"
        value={value.telefone}
        onChange={(e) => onChange({ telefone: e.target.value })}
      />
      <Input
        label="Data de nascimento"
        type="date"
        value={value.data_nascimento}
        onChange={(e) => onChange({ data_nascimento: e.target.value })}
      />

      <p className={styles.formSectionTitle}>Endereço</p>

      <div className={styles.cepRow}>
        <Input
          label="CEP"
          placeholder="00000-000"
          inputMode="numeric"
          maxLength={9}
          value={value.cep}
          onChange={(e) => onChange({ cep: formatCepInput(e.target.value) })}
          onBlur={handleCepBlur}
        />
        <Button
          type="button"
          variant="outline"
          loading={loadingCep}
          disabled={loadingCep || cepSomenteDigitos(value.cep).length !== 8}
          onClick={() => handleBuscarCep()}
        >
          Buscar CEP
        </Button>
      </div>

      <Input
        label="Logradouro"
        value={value.endereco}
        onChange={(e) => onChange({ endereco: e.target.value })}
      />
      <Input
        label="Número"
        value={value.numero}
        onChange={(e) => onChange({ numero: e.target.value })}
      />
      <Input
        label="Bairro"
        value={value.bairro}
        onChange={(e) => onChange({ bairro: e.target.value })}
      />
      <Input
        label="Cidade"
        value={value.cidade}
        onChange={(e) => onChange({ cidade: e.target.value })}
      />
      <Input
        label="UF"
        value={value.uf}
        maxLength={2}
        onChange={(e) =>
          onChange({ uf: e.target.value.toUpperCase().slice(0, 2) })
        }
      />
      <Input
        label="Complemento"
        multiline
        rows={3}
        value={value.complemento}
        onChange={(e) => onChange({ complemento: e.target.value })}
      />

      <p className={styles.formSectionTitle}>Dados bancários</p>

      <Input
        label="Banco"
        placeholder="Ex.: Banco do Brasil"
        value={value.banco}
        onChange={(e) => onChange({ banco: e.target.value })}
      />
      <Input
        label="Agência"
        value={value.agencia}
        onChange={(e) => onChange({ agencia: e.target.value })}
      />
      <Input
        label="Conta"
        value={value.conta}
        onChange={(e) => onChange({ conta: e.target.value })}
      />
      <Select
        label="Tipo de conta"
        options={TIPOS_CONTA}
        value={value.tipo_conta}
        onChange={(e) => onChange({ tipo_conta: e.target.value })}
      />
      <Input
        label="Titular da conta"
        value={value.titular_conta}
        onChange={(e) => onChange({ titular_conta: e.target.value })}
      />

      <p className={styles.formSectionTitle}>PIX</p>

      <Select
        label="Tipo de chave PIX"
        options={TIPOS_PIX}
        value={value.pix_tipo}
        onChange={(e) => onChange({ pix_tipo: e.target.value })}
      />
      <Input
        label="Chave PIX"
        placeholder="Informe a chave conforme o tipo selecionado"
        value={value.pix_chave}
        onChange={(e) => onChange({ pix_chave: e.target.value })}
      />
    </>
  )
}
