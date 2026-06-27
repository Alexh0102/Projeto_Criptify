import {
  decodeBase64ToBytes,
  decryptText,
  decryptTextArgon2,
  encodeBytesToBase64,
  encryptTextArgon2,
  validateArgon2Parameters,
  type Argon2TextDecryptionInput,
  type TextDecryptionInput,
  type TextEncryptionResult,
} from './criptoveu'
import {
  ARGON2_V2_DEFAULT_ITERATIONS,
  ARGON2_V2_DEFAULT_MEMORY_MB,
  ARGON2_V2_KDF,
  ARGON2_V2_PARALLELISM,
  PayloadV2EncodingError,
  buildPayloadV2Aad,
  decodePayloadV2Json,
  encodePayloadV2Json,
} from './payload-v2'
import {
  SHARE_PAYLOAD_FIELD_ALLOWLISTS,
  assertAllowedPayloadFields,
  assertNoSecretFields,
  createAllowlistedPayload,
} from './share-payload-security'

export const SECRET_TEXT_PAYLOAD_PREFIX = 'CRIPTOVEU_SECRET_V1:'
export const MESSAGE_V2_PAYLOAD_PREFIX = 'CVM2.'
export const QR_V2_PAYLOAD_PREFIX = 'CVQ2.'
export const MAX_SECRET_TEXT_PAYLOAD_CHARS = 200_000

const LEGACY_SECRET_TEXT_PAYLOAD_PREFIXES = [
  'CRIPTIFY_SECRET_V1:',
  'CRIPTIFY_STEG_V1:',
]

export type SecretTextV2Type = 'MSG2' | 'QR2'

type SerializedSecretTextPayloadV1 = {
  version: 1
  ciphertext: string
  iv: string
  salt: string
}

export type SerializedSecretTextPayloadV2 = {
  version: 2
  type: SecretTextV2Type
  kdf: typeof ARGON2_V2_KDF
  memoryMb: number
  iterations: number
  parallelism: typeof ARGON2_V2_PARALLELISM
  ciphertext: string
  iv: string
  salt: string
}

export type ParsedSecretTextPayload =
  | {
      format: 'V1'
      input: TextDecryptionInput
    }
  | {
      format: 'V2'
      payload: SerializedSecretTextPayloadV2
      input: Argon2TextDecryptionInput
    }

export class SecretTextPayloadError extends Error {
  code: 'INVALID_PAYLOAD'

  constructor(message: string) {
    super(message)
    this.name = 'SecretTextPayloadError'
    this.code = 'INVALID_PAYLOAD'
  }
}

function resolveLegacyPayloadPrefix(payload: string) {
  const allPrefixes = [
    SECRET_TEXT_PAYLOAD_PREFIX,
    ...LEGACY_SECRET_TEXT_PAYLOAD_PREFIXES,
  ]

  return allPrefixes.find((prefix) => payload.startsWith(prefix)) ?? null
}

function getV2Prefix(type: SecretTextV2Type) {
  return type === 'QR2' ? QR_V2_PAYLOAD_PREFIX : MESSAGE_V2_PAYLOAD_PREFIX
}

export function buildSecretTextV2Aad(
  metadata: Pick<
    SerializedSecretTextPayloadV2,
    'version' | 'type' | 'kdf' | 'memoryMb' | 'iterations' | 'parallelism'
  >,
) {
  return buildPayloadV2Aad([
    metadata.type,
    metadata.version,
    metadata.kdf,
    metadata.memoryMb,
    metadata.iterations,
    metadata.parallelism,
  ])
}

export function serializeEncryptedTextPayload(payload: TextEncryptionResult) {
  const serialized = createAllowlistedPayload<
    SerializedSecretTextPayloadV1,
    keyof SerializedSecretTextPayloadV1
  >(
    {
      version: 1,
      ciphertext: payload.ciphertext,
      iv: encodeBytesToBase64(payload.iv),
      salt: encodeBytesToBase64(payload.salt),
    },
    SHARE_PAYLOAD_FIELD_ALLOWLISTS.encryptedTextV1,
  )

  return `${SECRET_TEXT_PAYLOAD_PREFIX}${JSON.stringify(serialized)}`
}

export function parseEncryptedTextPayload(payload: string): TextDecryptionInput {
  if (payload.length > MAX_SECRET_TEXT_PAYLOAD_CHARS) {
    throw new SecretTextPayloadError(
      'A mensagem protegida excede o tamanho máximo suportado.',
    )
  }

  const prefix = resolveLegacyPayloadPrefix(payload)

  if (!prefix) {
    throw new SecretTextPayloadError(
      'Os dados lidos não pertencem a uma mensagem V1 reconhecida pelo CriptoVéu.',
    )
  }

  let parsed: Partial<SerializedSecretTextPayloadV1>

  try {
    parsed = JSON.parse(
      payload.slice(prefix.length),
    ) as Partial<SerializedSecretTextPayloadV1>
  } catch {
    throw new SecretTextPayloadError(
      'Os dados da mensagem estão corrompidos ou incompletos.',
    )
  }

  assertAllowedPayloadFields(
    parsed,
    SHARE_PAYLOAD_FIELD_ALLOWLISTS.encryptedTextV1,
  )
  assertNoSecretFields(parsed)

  if (
    parsed.version !== 1 ||
    typeof parsed.ciphertext !== 'string' ||
    typeof parsed.iv !== 'string' ||
    typeof parsed.salt !== 'string'
  ) {
    throw new SecretTextPayloadError(
      'Os dados da mensagem não estão no formato V1 esperado.',
    )
  }

  try {
    return {
      ciphertext: parsed.ciphertext,
      iv: decodeBase64ToBytes(parsed.iv),
      salt: decodeBase64ToBytes(parsed.salt),
    }
  } catch {
    throw new SecretTextPayloadError(
      'A mensagem V1 contém parâmetros binários inválidos.',
    )
  }
}

function parseSecretTextPayloadV2(
  payload: string,
  expectedType: SecretTextV2Type,
): ParsedSecretTextPayload {
  const prefix = getV2Prefix(expectedType)
  let parsed: Partial<SerializedSecretTextPayloadV2>

  try {
    parsed = decodePayloadV2Json(
      payload.slice(prefix.length),
      MAX_SECRET_TEXT_PAYLOAD_CHARS,
    ) as Partial<SerializedSecretTextPayloadV2>
  } catch (error) {
    if (error instanceof PayloadV2EncodingError) {
      throw new SecretTextPayloadError(error.message)
    }

    throw error
  }

  assertAllowedPayloadFields(
    parsed,
    SHARE_PAYLOAD_FIELD_ALLOWLISTS.encryptedTextV2,
  )
  assertNoSecretFields(parsed)

  if (
    parsed.version !== 2 ||
    parsed.type !== expectedType ||
    parsed.kdf !== ARGON2_V2_KDF ||
    parsed.parallelism !== ARGON2_V2_PARALLELISM ||
    typeof parsed.memoryMb !== 'number' ||
    typeof parsed.iterations !== 'number' ||
    typeof parsed.ciphertext !== 'string' ||
    !parsed.ciphertext ||
    typeof parsed.iv !== 'string' ||
    typeof parsed.salt !== 'string'
  ) {
    throw new SecretTextPayloadError(
      'Os dados da mensagem não estão no formato V2 esperado.',
    )
  }

  try {
    validateArgon2Parameters({
      memoryMb: parsed.memoryMb,
      iterations: parsed.iterations,
    })
    const iv = decodeBase64ToBytes(parsed.iv)
    const salt = decodeBase64ToBytes(parsed.salt)

    if (iv.byteLength !== 12 || salt.byteLength !== 16) {
      throw new Error('Invalid V2 binary parameters')
    }

    const safePayload = parsed as SerializedSecretTextPayloadV2

    return {
      format: 'V2',
      payload: safePayload,
      input: {
        ciphertext: safePayload.ciphertext,
        iv,
        salt,
        memoryMb: safePayload.memoryMb,
        iterations: safePayload.iterations,
        parallelism: safePayload.parallelism,
      },
    }
  } catch {
    throw new SecretTextPayloadError(
      'A mensagem V2 contém parâmetros criptográficos inválidos.',
    )
  }
}

export function parseSecretTextPayload(payload: string): ParsedSecretTextPayload {
  if (payload.length > MAX_SECRET_TEXT_PAYLOAD_CHARS) {
    throw new SecretTextPayloadError(
      'A mensagem protegida excede o tamanho máximo suportado.',
    )
  }

  if (payload.startsWith(MESSAGE_V2_PAYLOAD_PREFIX)) {
    return parseSecretTextPayloadV2(payload, 'MSG2')
  }

  if (payload.startsWith(QR_V2_PAYLOAD_PREFIX)) {
    return parseSecretTextPayloadV2(payload, 'QR2')
  }

  return {
    format: 'V1',
    input: parseEncryptedTextPayload(payload),
  }
}

export async function encryptSecretTextPayload(
  plainText: string,
  password: string,
  type: SecretTextV2Type,
) {
  const metadata = {
    version: 2 as const,
    type,
    kdf: ARGON2_V2_KDF,
    memoryMb: ARGON2_V2_DEFAULT_MEMORY_MB,
    iterations: ARGON2_V2_DEFAULT_ITERATIONS,
    parallelism: ARGON2_V2_PARALLELISM,
  } satisfies Pick<
    SerializedSecretTextPayloadV2,
    'version' | 'type' | 'kdf' | 'memoryMb' | 'iterations' | 'parallelism'
  >
  const encrypted = await encryptTextArgon2(
    plainText,
    password,
    buildSecretTextV2Aad(metadata),
    {
      memoryMb: metadata.memoryMb,
      iterations: metadata.iterations,
    },
  )
  const serialized = createAllowlistedPayload<
    SerializedSecretTextPayloadV2,
    keyof SerializedSecretTextPayloadV2
  >(
    {
      ...metadata,
      ciphertext: encrypted.ciphertext,
      iv: encodeBytesToBase64(encrypted.iv),
      salt: encodeBytesToBase64(encrypted.salt),
    },
    SHARE_PAYLOAD_FIELD_ALLOWLISTS.encryptedTextV2,
  )

  return `${getV2Prefix(type)}${encodePayloadV2Json(serialized)}`
}

export async function decryptSecretTextPayload(
  payload: string,
  password: string,
  expectedType?: SecretTextV2Type,
) {
  const parsed = parseSecretTextPayload(payload)

  if (parsed.format === 'V1') {
    return decryptText(parsed.input, password)
  }

  if (expectedType && parsed.payload.type !== expectedType) {
    throw new SecretTextPayloadError(
      `O payload ${parsed.payload.type} não pertence a este fluxo ${expectedType}.`,
    )
  }

  return decryptTextArgon2(
    parsed.input,
    password,
    buildSecretTextV2Aad(parsed.payload),
  )
}
