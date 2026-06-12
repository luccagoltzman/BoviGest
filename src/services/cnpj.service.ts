import { formatCepInput, formatCnpjInput } from '@/utils/masks'

export type DadosCnpj = {
  cnpj: string
  razao_social: string
  nome_fantasia: string
  situacao_cadastral: string
  cep: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  uf: string
  telefone: string
  email: string
}

type BrasilApiCnpjResponse = {
  cnpj?: string
  razao_social?: string
  nome_fantasia?: string
  descricao_situacao_cadastral?: string
  descricao_tipo_de_logradouro?: string
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  cep?: string
  municipio?: string
  uf?: string
  ddd_telefone_1?: string
  ddd_telefone_2?: string
  email?: string | null
  message?: string
}

export function cnpjSomenteDigitos(value: string) {
  return value.replace(/\D/g, '').slice(0, 14)
}

export function isCnpj(value: string) {
  return cnpjSomenteDigitos(value).length === 14
}

export {
  formatCnpjInput,
  formatCpfCnpjInput,
} from '@/utils/masks'

function formatTelefoneApi(raw?: string) {
  if (!raw) return ''
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  }
  return raw
}

function montarLogradouro(data: BrasilApiCnpjResponse) {
  const tipo = data.descricao_tipo_de_logradouro?.trim() || ''
  const rua = data.logradouro?.trim() || ''
  return [tipo, rua].filter(Boolean).join(' ')
}

function normalizarResposta(data: BrasilApiCnpjResponse): DadosCnpj {
  const telefone =
    formatTelefoneApi(data.ddd_telefone_1) ||
    formatTelefoneApi(data.ddd_telefone_2)

  return {
    cnpj: cnpjSomenteDigitos(data.cnpj || ''),
    razao_social: data.razao_social?.trim() || '',
    nome_fantasia: data.nome_fantasia?.trim() || '',
    situacao_cadastral: data.descricao_situacao_cadastral?.trim() || '',
    cep: (data.cep || '').replace(/\D/g, ''),
    logradouro: montarLogradouro(data),
    numero: data.numero?.trim() || '',
    complemento: data.complemento?.trim() || '',
    bairro: data.bairro?.trim() || '',
    cidade: data.municipio?.trim() || '',
    uf: data.uf?.trim().toUpperCase() || '',
    telefone,
    email: data.email?.trim() || '',
  }
}

export async function buscarDadosPorCnpj(cnpj: string): Promise<DadosCnpj> {
  const digits = cnpjSomenteDigitos(cnpj)

  if (digits.length !== 14) {
    throw new Error('Informe um CNPJ com 14 dígitos')
  }

  const response = await fetch(
    `https://brasilapi.com.br/api/cnpj/v1/${digits}`,
  )

  if (response.status === 404) {
    throw new Error('CNPJ não encontrado na Receita Federal')
  }

  if (response.status === 429) {
    throw new Error('Limite de consultas atingido. Tente novamente em instantes')
  }

  if (!response.ok) {
    throw new Error('Não foi possível consultar o CNPJ')
  }

  const data = (await response.json()) as BrasilApiCnpjResponse

  if (!data.cnpj && data.message) {
    throw new Error(data.message)
  }

  return normalizarResposta(data)
}

export function mapDadosCnpjParaFornecedor(dados: DadosCnpj) {
  const nome = dados.razao_social || dados.nome_fantasia
  const doc = formatCnpjInput(dados.cnpj)

  return {
    nome,
    doc,
    telefone: dados.telefone,
    cep: dados.cep ? formatCepInput(dados.cep) : '',
    endereco: dados.logradouro,
    numero: dados.numero,
    bairro: dados.bairro,
    cidade: dados.cidade,
    uf: dados.uf,
    complemento: dados.complemento,
    titular_conta: dados.razao_social || nome,
    pix_tipo: 'CNPJ',
    pix_chave: doc,
  }
}

export function mapDadosCnpjParaCliente(dados: DadosCnpj) {
  const nome = dados.razao_social || dados.nome_fantasia
  const doc = formatCnpjInput(dados.cnpj)
  const nomeFantasia = dados.nome_fantasia

  return {
    nome,
    nome_empresa:
      nomeFantasia && nomeFantasia.toLowerCase() !== nome.toLowerCase()
        ? nomeFantasia
        : '',
    doc,
    telefone: dados.telefone,
    cep: dados.cep ? formatCepInput(dados.cep) : '',
    endereco: dados.logradouro,
    numero: dados.numero,
    bairro: dados.bairro,
    cidade: dados.cidade,
    uf: dados.uf,
    complemento: dados.complemento,
  }
}

export function avisoSituacaoCadastral(situacao: string) {
  if (!situacao) return null
  const normalizada = situacao.toUpperCase()
  if (normalizada.includes('ATIVA')) return null
  return `Situação cadastral: ${situacao}`
}
