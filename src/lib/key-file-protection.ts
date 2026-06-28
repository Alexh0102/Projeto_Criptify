import { hashBlobIntegrity } from './file-integrity'

export const MAX_KEY_FILE_SIZE_BYTES = 32 * 1024 * 1024

const KEY_FILE_HASH_CHUNK_SIZE_BYTES = 1024 * 1024
const DOMAIN_SEPARATOR = new TextEncoder().encode(
  'CriptoVeu:password-key-file:v1',
)
const SHA256_HEX_PATTERN = /^[a-f0-9]{64}$/

export class KeyFileProtectionError extends Error {
  code: 'KEY_FILE_EMPTY' | 'KEY_FILE_TOO_LARGE' | 'KEY_FILE_HASH_FAILED'

  constructor(
    code: 'KEY_FILE_EMPTY' | 'KEY_FILE_TOO_LARGE' | 'KEY_FILE_HASH_FAILED',
    message: string,
  ) {
    super(message)
    this.name = 'KeyFileProtectionError'
    this.code = code
  }
}

function decodeHex(value: string) {
  if (!SHA256_HEX_PATTERN.test(value)) {
    throw new KeyFileProtectionError(
      'KEY_FILE_HASH_FAILED',
      'Não foi possível calcular a impressão do arquivo-chave.',
    )
  }

  return Uint8Array.from(
    value.match(/.{2}/g) ?? [],
    (byte) => Number.parseInt(byte, 16),
  )
}

function encodeHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function assertValidKeyFile(keyFile: File) {
  if (keyFile.size === 0) {
    throw new KeyFileProtectionError(
      'KEY_FILE_EMPTY',
      'O arquivo-chave não pode estar vazio.',
    )
  }

  if (keyFile.size > MAX_KEY_FILE_SIZE_BYTES) {
    throw new KeyFileProtectionError(
      'KEY_FILE_TOO_LARGE',
      'O arquivo-chave excede o limite de 32 MB.',
    )
  }
}

export async function derivePasswordKeyFileMaterial(
  password: string,
  keyFile: File,
  onProgress?: (progress: number) => void,
) {
  assertValidKeyFile(keyFile)

  let keyFileHashBytes: Uint8Array<ArrayBuffer> | null = null
  let combined: Uint8Array<ArrayBuffer> | null = null
  const passwordBytes = new TextEncoder().encode(password)

  try {
    const hashes = await hashBlobIntegrity(
      keyFile,
      KEY_FILE_HASH_CHUNK_SIZE_BYTES,
      onProgress,
    )
    keyFileHashBytes = decodeHex(hashes.fileHashSha256)
    combined = new Uint8Array(
      new ArrayBuffer(
        DOMAIN_SEPARATOR.byteLength +
          1 +
          Uint32Array.BYTES_PER_ELEMENT +
          passwordBytes.byteLength +
          keyFileHashBytes.byteLength,
      ),
    )
    let offset = 0

    combined.set(DOMAIN_SEPARATOR, offset)
    offset += DOMAIN_SEPARATOR.byteLength
    combined[offset] = 0
    offset += 1
    new DataView(combined.buffer).setUint32(
      offset,
      passwordBytes.byteLength,
      false,
    )
    offset += Uint32Array.BYTES_PER_ELEMENT
    combined.set(passwordBytes, offset)
    offset += passwordBytes.byteLength
    combined.set(keyFileHashBytes, offset)

    const digest = new Uint8Array(
      await crypto.subtle.digest('SHA-256', combined),
    )

    try {
      return encodeHex(digest)
    } finally {
      digest.fill(0)
    }
  } catch (error) {
    if (error instanceof KeyFileProtectionError) {
      throw error
    }

    throw new KeyFileProtectionError(
      'KEY_FILE_HASH_FAILED',
      'Não foi possível processar o arquivo-chave neste dispositivo.',
    )
  } finally {
    passwordBytes.fill(0)
    keyFileHashBytes?.fill(0)
    combined?.fill(0)
  }
}
