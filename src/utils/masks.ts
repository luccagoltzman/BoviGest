export type InputMask =
  | 'cpfCnpj'
  | 'phone'
  | 'cep'
  | 'currency'
  | 'decimal'
  | 'integer'

function onlyDigits(value: string, max?: number) {
  const digits = value.replace(/\D/g, '')
  return max !== undefined ? digits.slice(0, max) : digits
}

export function formatCnpjInput(value: string) {
  const digits = onlyDigits(value, 14)
  if (digits.length <= 2) return digits
  if (digits.length <= 5) {
    return `${digits.slice(0, 2)}.${digits.slice(2)}`
  }
  if (digits.length <= 8) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`
  }
  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
}

export function formatCpfCnpjInput(value: string) {
  const digits = onlyDigits(value, 14)
  if (digits.length <= 11) {
    if (digits.length <= 3) return digits
    if (digits.length <= 6) {
      return `${digits.slice(0, 3)}.${digits.slice(3)}`
    }
    if (digits.length <= 9) {
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
    }
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
  }
  return formatCnpjInput(digits)
}

export function formatPhoneInput(value: string) {
  const digits = onlyDigits(value, 11)
  if (!digits) return ''
  if (digits.length <= 2) return `(${digits}`
  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  }
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

export function formatCepInput(value: string) {
  const digits = onlyDigits(value, 8)
  if (digits.length <= 5) return digits
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

export function formatIntegerInput(value: string) {
  return onlyDigits(value)
}

export function formatDecimalInput(value: string, maxDecimals = 3) {
  const raw = value.replace(/[^\d,]/g, '')
  if (!raw) return ''

  const commaIndex = raw.indexOf(',')
  const intPart =
    commaIndex >= 0 ? raw.slice(0, commaIndex) : raw.replace(/,/g, '')
  const decPart =
    commaIndex >= 0 ? raw.slice(commaIndex + 1).replace(/,/g, '') : ''

  const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const limitedDec = decPart.slice(0, maxDecimals)

  if (commaIndex >= 0) {
    return `${intFormatted || '0'},${limitedDec}`
  }

  return intFormatted
}

/** Máscara monetária BR: digitação da direita para a esquerda (centavos) */
export function formatCurrencyInput(value: string) {
  const digits = onlyDigits(value)
  if (!digits) return ''

  const num = Number(digits) / 100
  return num.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatCurrencyFromNumber(value: number) {
  if (value === null || value === undefined || Number.isNaN(value)) return ''
  return formatCurrencyInput(String(Math.round(value * 100)))
}

export function parseIntegerInput(value: string) {
  return Number(onlyDigits(value)) || 0
}

export function parseDecimalInput(value: string) {
  if (!value) return 0

  const trimmed = String(value).trim()
  if (!trimmed) return 0

  // Formato BR: 23,50 ou 1.234,56
  if (trimmed.includes(',')) {
    const normalized = trimmed.replace(/\./g, '').replace(',', '.')
    const num = Number(normalized)
    return Number.isFinite(num) ? num : 0
  }

  // Sem vírgula: 4.000 ou 1.234.567 usam ponto como milhar (máscara decimal BR)
  if (/^\d{1,3}(\.\d{3})+$/.test(trimmed)) {
    const num = Number(trimmed.replace(/\./g, ''))
    return Number.isFinite(num) ? num : 0
  }

  const num = Number(trimmed)
  return Number.isFinite(num) ? num : 0
}

export function parseCurrencyInput(value: string) {
  return parseDecimalInput(value)
}

export function applyInputMask(mask: InputMask, value: string) {
  switch (mask) {
    case 'cpfCnpj':
      return formatCpfCnpjInput(value)
    case 'phone':
      return formatPhoneInput(value)
    case 'cep':
      return formatCepInput(value)
    case 'currency':
      return formatCurrencyInput(value)
    case 'decimal':
      return formatDecimalInput(value)
    case 'integer':
      return formatIntegerInput(value)
    default:
      return value
  }
}

export function maskInputMode(
  mask: InputMask,
): 'numeric' | 'tel' | 'decimal' | undefined {
  switch (mask) {
    case 'cpfCnpj':
    case 'cep':
    case 'integer':
      return 'numeric'
    case 'phone':
      return 'tel'
    case 'currency':
    case 'decimal':
      return 'decimal'
    default:
      return undefined
  }
}

export function maskPlaceholder(mask: InputMask): string | undefined {
  switch (mask) {
    case 'cpfCnpj':
      return '000.000.000-00'
    case 'phone':
      return '(00) 00000-0000'
    case 'cep':
      return '00000-000'
    case 'currency':
      return '0,00'
    case 'decimal':
      return '0,00'
    case 'integer':
      return '0'
    default:
      return undefined
  }
}

/** Aplica máscara conforme o tipo de chave PIX */
export function formatPixChaveInput(tipo: string, value: string) {
  switch (tipo) {
    case 'CPF':
      return formatCpfCnpjInput(value).slice(0, 14)
    case 'CNPJ':
      return formatCnpjInput(value)
    case 'Telefone':
      return formatPhoneInput(value)
    default:
      return value
  }
}
