export { formatCepInput } from '@/utils/masks'

export type EnderecoPorCep = {
  logradouro: string
  bairro: string
  cidade: string
  uf: string
  complemento?: string
}

export function cepSomenteDigitos(value: string) {
  return value.replace(/\D/g, '').slice(0, 8)
}

export async function buscarEnderecoPorCep(cep: string): Promise<EnderecoPorCep> {
  const digits = cepSomenteDigitos(cep)

  if (digits.length !== 8) {
    throw new Error('Informe um CEP com 8 dígitos')
  }

  const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`)

  if (!response.ok) {
    throw new Error('Não foi possível consultar o CEP')
  }

  const data = await response.json()

  if (data.erro) {
    throw new Error('CEP não encontrado')
  }

  return {
    logradouro: data.logradouro || '',
    bairro: data.bairro || '',
    cidade: data.localidade || '',
    uf: data.uf || '',
    complemento: data.complemento || '',
  }
}
