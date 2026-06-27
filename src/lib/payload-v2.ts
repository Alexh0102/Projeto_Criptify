const BASE64_CHUNK_SIZE_BYTES = 0x8000

export const ARGON2_V2_KDF = 'argon2id'
export const ARGON2_V2_PARALLELISM = 1
export const ARGON2_V2_DEFAULT_MEMORY_MB = 64
export const ARGON2_V2_NOTE_MEMORY_MB = 128
export const ARGON2_V2_DEFAULT_ITERATIONS = 2

export class PayloadV2EncodingError extends Error {
  code: 'INVALID_BASE64URL' | 'INVALID_JSON' | 'PAYLOAD_TOO_LARGE'

  constructor(
    code: 'INVALID_BASE64URL' | 'INVALID_JSON' | 'PAYLOAD_TOO_LARGE',
    message: string,
  ) {
    super(message)
    this.name = 'PayloadV2EncodingError'
    this.code = code
  }
}

function encodeBytesToBase64Url(bytes: Uint8Array) {
  let binary = ''

  for (let index = 0; index < bytes.length; index += BASE64_CHUNK_SIZE_BYTES) {
    binary += String.fromCharCode(
      ...bytes.subarray(index, index + BASE64_CHUNK_SIZE_BYTES),
    )
  }

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function decodeBase64UrlToBytes(value: string) {
  if (
    !value ||
    !/^[A-Za-z0-9_-]+$/.test(value) ||
    value.length % 4 === 1
  ) {
    throw new PayloadV2EncodingError(
      'INVALID_BASE64URL',
      'O payload V2 não usa uma codificação Base64URL válida.',
    )
  }

  const standardBase64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const paddedBase64 = standardBase64.padEnd(
    standardBase64.length + ((4 - (standardBase64.length % 4)) % 4),
    '=',
  )

  try {
    const binary = atob(paddedBase64)
    const bytes = new Uint8Array(new ArrayBuffer(binary.length))

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index)
    }

    return bytes
  } catch {
    throw new PayloadV2EncodingError(
      'INVALID_BASE64URL',
      'O payload V2 não usa uma codificação Base64URL válida.',
    )
  }
}

export function encodePayloadV2Json(value: unknown) {
  const serialized = JSON.stringify(value)
  return encodeBytesToBase64Url(new TextEncoder().encode(serialized))
}

export function decodePayloadV2Json(value: string, maxChars: number) {
  if (value.length > maxChars) {
    throw new PayloadV2EncodingError(
      'PAYLOAD_TOO_LARGE',
      'O payload V2 excede o tamanho máximo suportado.',
    )
  }

  try {
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(
      decodeBase64UrlToBytes(value),
    )
    return JSON.parse(decoded) as unknown
  } catch (error) {
    if (error instanceof PayloadV2EncodingError) {
      throw error
    }

    throw new PayloadV2EncodingError(
      'INVALID_JSON',
      'O payload V2 está corrompido ou não contém JSON válido.',
    )
  }
}

export function buildPayloadV2Aad(values: readonly unknown[]) {
  return new TextEncoder().encode(JSON.stringify(['CriptoVéu', ...values]))
}
