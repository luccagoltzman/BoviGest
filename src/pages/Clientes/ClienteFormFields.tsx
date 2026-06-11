import { useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Button, Input } from '@/components/ui'
import {
  buscarEnderecoPorCep,
  cepSomenteDigitos,
  formatCepInput,
} from '@/services/cep.service'
import {
  avisoSituacaoCadastral,
  buscarDadosPorCnpj,
  cnpjSomenteDigitos,
  formatCpfCnpjInput,
  isCnpj,
  mapDadosCnpjParaCliente,
} from '@/services/cnpj.service'
import styles from './Clientes.module.scss'

export type ClienteFormData = {
  nome: string
  nome_empresa: string
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
  limite_credito: string
}

export const emptyClienteForm = (): ClienteFormData => ({
  nome: '',
  nome_empresa: '',
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
  limite_credito: '',
})

export function clienteFormFromRow(row: Partial<ClienteFormData>): ClienteFormData {
  return {
    nome: row.nome || '',
    nome_empresa: row.nome_empresa || '',
    doc: row.doc ? formatCpfCnpjInput(row.doc) : '',
    telefone: row.telefone || '',
    data_nascimento: row.data_nascimento?.slice(0, 10) || '',
    cep: row.cep ? formatCepInput(row.cep) : '',
    endereco: row.endereco || '',
    numero: row.numero || '',
    bairro: row.bairro || '',
    cidade: row.cidade || '',
    uf: row.uf || '',
    complemento: row.complemento || '',
    limite_credito:
      row.limite_credito !== undefined && row.limite_credito !== null
        ? String(row.limite_credito)
        : '',
  }
}

export function clienteFormToPayload(form: ClienteFormData) {
  return {
    nome: form.nome.trim(),
    nome_empresa: form.nome_empresa.trim() || null,
    doc: form.doc.trim(),
    telefone: form.telefone.trim(),
    data_nascimento: form.data_nascimento || null,
    cep: cepSomenteDigitos(form.cep) || null,
    endereco: form.endereco.trim() || null,
    numero: form.numero.trim() || null,
    bairro: form.bairro.trim() || null,
    cidade: form.cidade.trim() || null,
    uf: form.uf.trim().toUpperCase() || null,
    complemento: form.complemento.trim() || null,
    limite_credito: form.limite_credito ? Number(form.limite_credito) : null,
  }
}

type ClienteFormFieldsProps = {
  value: ClienteFormData
  onChange: (patch: Partial<ClienteFormData>) => void
}

export function ClienteFormFields({ value, onChange }: ClienteFormFieldsProps) {
  const [loadingCep, setLoadingCep] = useState(false)
  const [loadingCnpj, setLoadingCnpj] = useState(false)
  const lastCepRef = useRef('')
  const lastCnpjRef = useRef('')

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

  async function handleBuscarCnpj(docValue = value.doc) {
    const digits = cnpjSomenteDigitos(docValue)

    if (!isCnpj(docValue)) {
      toast.error('Informe um CNPJ válido com 14 dígitos')
      return
    }

    if (lastCnpjRef.current === digits && value.nome.trim()) return

    try {
      setLoadingCnpj(true)
      const dados = await buscarDadosPorCnpj(digits)
      lastCnpjRef.current = digits

      onChange(mapDadosCnpjParaCliente(dados))

      const aviso = avisoSituacaoCadastral(dados.situacao_cadastral)
      if (aviso) {
        toast.error(aviso)
      } else {
        toast.success('Dados do CNPJ carregados da Receita Federal')
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao consultar CNPJ'
      toast.error(message)
    } finally {
      setLoadingCnpj(false)
    }
  }

  function handleDocBlur() {
    if (isCnpj(value.doc)) {
      handleBuscarCnpj(value.doc)
    }
  }

  const docEhCnpj = isCnpj(value.doc)

  return (
    <>
      <p className={styles.formSectionTitle}>Dados pessoais</p>

      <Input
        label="Nome"
        value={value.nome}
        onChange={(e) => onChange({ nome: e.target.value })}
      />
      <Input
        label="Nome da empresa"
        value={value.nome_empresa}
        onChange={(e) => onChange({ nome_empresa: e.target.value })}
      />
      <div className={styles.cepRow}>
        <Input
          label="CPF / CNPJ"
          placeholder="00.000.000/0000-00"
          inputMode="numeric"
          value={value.doc}
          onChange={(e) =>
            onChange({ doc: formatCpfCnpjInput(e.target.value) })
          }
          onBlur={handleDocBlur}
        />
        <Button
          type="button"
          variant="outline"
          loading={loadingCnpj}
          disabled={loadingCnpj || !docEhCnpj}
          onClick={() => handleBuscarCnpj()}
        >
          Consultar CNPJ
        </Button>
      </div>
      {docEhCnpj && (
        <p className={styles.formHint}>
          Consulta pública na Receita Federal (BrasilAPI).
        </p>
      )}
      <Input
        label="Telefone / WhatsApp"
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
          onChange={(e) =>
            onChange({ cep: formatCepInput(e.target.value) })
          }
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

      <p className={styles.formSectionTitle}>Crédito</p>

      <Input
        label="Limite de crédito"
        type="number"
        value={value.limite_credito}
        onChange={(e) => onChange({ limite_credito: e.target.value })}
      />
    </>
  )
}
