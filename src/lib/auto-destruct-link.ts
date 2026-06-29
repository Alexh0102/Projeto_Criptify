import {
  decodeBase64ToBytes,
  decryptText,
  decryptTextArgon2,
  encodeBytesToBase64,
  encryptTextArgon2,
  validateArgon2Parameters,
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

export const AUTO_DESTRUCT_APP_URL = 'https://www.criptoveu.com'
const AUTO_DESTRUCT_APP_PATH = '/link-secreto'
const AUTO_DESTRUCT_HASH_PREFIX = '#msg='
const AUTO_DESTRUCT_STORAGE_PREFIX = 'criptify:auto-destruct:'
const MAX_AUTO_DESTRUCT_PAYLOAD_CHARS = 200_000
export const AUTO_DESTRUCT_V2_PREFIX = 'CVL2.'

export type AutoDestructExpiration = '24h' | '7d' | 'never'

export type AutoDestructPayloadV1 = {
  version: 1
  ciphertext: string
  iv: string
  salt: string
  createdAt: number
  expiresIn: AutoDestructExpiration
  maxViews: number | null
}

export type AutoDestructPayloadV2 = {
  version: 2
  type: 'LINK2'
  kdf: typeof ARGON2_V2_KDF
  memoryMb: number
  iterations: number
  parallelism: typeof ARGON2_V2_PARALLELISM
  ciphertext: string
  iv: string
  salt: string
  createdAt: number
  expiresIn: AutoDestructExpiration
  maxViews: number | null
}

export type AutoDestructPayload =
  | AutoDestructPayloadV1
  | AutoDestructPayloadV2

export type AutoDestructReadResult = {
  encodedPayload: string
  payload: AutoDestructPayload
}

export type AutoDestructViewState = {
  views: number
  lastOpenedAt: number | null
}

export class AutoDestructLinkError extends Error {
  code:
    | 'INVALID_LINK'
    | 'INVALID_PAYLOAD'
    | 'EXPIRED'
    | 'STORAGE_UNAVAILABLE'

  constructor(
    code:
      | 'INVALID_LINK'
      | 'INVALID_PAYLOAD'
      | 'EXPIRED'
      | 'STORAGE_UNAVAILABLE',
    message: string,
  ) {
    super(message)
    this.name = 'AutoDestructLinkError'
    this.code = code
  }
}

function encodeJsonToBase64(value: unknown) {
  const json = JSON.stringify(value)
  return encodeBytesToBase64(new TextEncoder().encode(json))
}

function decodeJsonFromBase64(value: string) {
  if (value.length > MAX_AUTO_DESTRUCT_PAYLOAD_CHARS) {
    throw new AutoDestructLinkError(
      'INVALID_PAYLOAD',
      'O link da mensagem excede o tamanho máximo suportado.',
    )
  }

  try {
    const bytes = decodeBase64ToBytes(value)
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown
  } catch {
    throw new AutoDestructLinkError(
      'INVALID_PAYLOAD',
      'O link da mensagem está corrompido ou incompleto.',
    )
  }
}

function isExpirationValue(value: unknown): value is AutoDestructExpiration {
  return value === '24h' || value === '7d' || value === 'never'
}

function getStorageKey(encodedPayload: string) {
  // Hash simples para não guardar o payload completo na chave do localStorage.
  let hash = 5381

  for (let index = 0; index < encodedPayload.length; index += 1) {
    hash = (hash * 33) ^ encodedPayload.charCodeAt(index)
  }

  const normalized = (hash >>> 0).toString(16).padStart(8, '0')
  return `${AUTO_DESTRUCT_STORAGE_PREFIX}${normalized}`
}

function getExpirationInMs(expiration: AutoDestructExpiration) {
  if (expiration === '24h') {
    return 24 * 60 * 60 * 1000
  }

  if (expiration === '7d') {
    return 7 * 24 * 60 * 60 * 1000
  }

  return null
}

export function getExpirationLabel(expiration: AutoDestructExpiration) {
  if (expiration === '24h') {
    return '24 horas'
  }

  if (expiration === '7d') {
    return '7 dias'
  }

  return 'Nunca'
}

export function serializeAutoDestructPayload(
  encrypted: TextEncryptionResult,
  options: {
    createdAt?: number
    expiresIn: AutoDestructExpiration
    maxViews: number | null
  },
) {
  const payload = createAllowlistedPayload<
    AutoDestructPayloadV1,
    keyof AutoDestructPayloadV1
  >(
    {
      version: 1,
      ciphertext: encrypted.ciphertext,
      iv: encodeBytesToBase64(encrypted.iv),
      salt: encodeBytesToBase64(encrypted.salt),
      createdAt: options.createdAt ?? Date.now(),
      expiresIn: options.expiresIn,
      maxViews: options.maxViews,
    },
    SHARE_PAYLOAD_FIELD_ALLOWLISTS.autoDestructV1,
  )

  return encodeJsonToBase64(payload)
}

export function buildAutoDestructV2Aad(
  metadata: Pick<
    AutoDestructPayloadV2,
    | 'version'
    | 'type'
    | 'kdf'
    | 'memoryMb'
    | 'iterations'
    | 'parallelism'
    | 'createdAt'
    | 'expiresIn'
    | 'maxViews'
  >,
) {
  return buildPayloadV2Aad([
    metadata.type,
    metadata.version,
    metadata.kdf,
    metadata.memoryMb,
    metadata.iterations,
    metadata.parallelism,
    metadata.createdAt,
    metadata.expiresIn,
    metadata.maxViews,
  ])
}

export async function encryptAutoDestructPayload(
  plainText: string,
  password: string,
  options: {
    createdAt?: number
    expiresIn: AutoDestructExpiration
    maxViews: number | null
  },
) {
  const metadata = {
    version: 2 as const,
    type: 'LINK2' as const,
    kdf: ARGON2_V2_KDF,
    memoryMb: ARGON2_V2_DEFAULT_MEMORY_MB,
    iterations: ARGON2_V2_DEFAULT_ITERATIONS,
    parallelism: ARGON2_V2_PARALLELISM,
    createdAt: options.createdAt ?? Date.now(),
    expiresIn: options.expiresIn,
    maxViews: options.maxViews,
  } satisfies Pick<
    AutoDestructPayloadV2,
    | 'version'
    | 'type'
    | 'kdf'
    | 'memoryMb'
    | 'iterations'
    | 'parallelism'
    | 'createdAt'
    | 'expiresIn'
    | 'maxViews'
  >
  const encrypted = await encryptTextArgon2(
    plainText,
    password,
    buildAutoDestructV2Aad(metadata),
    {
      memoryMb: metadata.memoryMb,
      iterations: metadata.iterations,
    },
  )
  const payload = createAllowlistedPayload<
    AutoDestructPayloadV2,
    keyof AutoDestructPayloadV2
  >(
    {
      ...metadata,
      ciphertext: encrypted.ciphertext,
      iv: encodeBytesToBase64(encrypted.iv),
      salt: encodeBytesToBase64(encrypted.salt),
    },
    SHARE_PAYLOAD_FIELD_ALLOWLISTS.autoDestructV2,
  )

  return `${AUTO_DESTRUCT_V2_PREFIX}${encodePayloadV2Json(payload)}`
}

function parseAutoDestructPayloadV1(
  encodedPayload: string,
): AutoDestructPayloadV1 {
  const parsed = decodeJsonFromBase64(
    encodedPayload,
  ) as Partial<AutoDestructPayloadV1>

  assertAllowedPayloadFields(
    parsed,
    SHARE_PAYLOAD_FIELD_ALLOWLISTS.autoDestructV1,
  )
  assertNoSecretFields(parsed)

  if (
    parsed.version !== 1 ||
    typeof parsed.ciphertext !== 'string' ||
    typeof parsed.iv !== 'string' ||
    typeof parsed.salt !== 'string' ||
    typeof parsed.createdAt !== 'number' ||
    !isExpirationValue(parsed.expiresIn) ||
    !(parsed.maxViews === null || (typeof parsed.maxViews === 'number' && parsed.maxViews >= 1))
  ) {
    throw new AutoDestructLinkError(
      'INVALID_PAYLOAD',
      'Os dados da mensagem não estão no formato LINK1 esperado.',
    )
  }

  return {
    version: 1,
    ciphertext: parsed.ciphertext,
    iv: parsed.iv,
    salt: parsed.salt,
    createdAt: parsed.createdAt,
    expiresIn: parsed.expiresIn,
    maxViews: parsed.maxViews,
  }
}

function parseAutoDestructPayloadV2(
  encodedPayload: string,
): AutoDestructPayloadV2 {
  let parsed: Partial<AutoDestructPayloadV2>

  try {
    parsed = decodePayloadV2Json(
      encodedPayload.slice(AUTO_DESTRUCT_V2_PREFIX.length),
      MAX_AUTO_DESTRUCT_PAYLOAD_CHARS,
    ) as Partial<AutoDestructPayloadV2>
  } catch (error) {
    if (error instanceof PayloadV2EncodingError) {
      throw new AutoDestructLinkError('INVALID_PAYLOAD', error.message)
    }

    throw error
  }

  assertAllowedPayloadFields(
    parsed,
    SHARE_PAYLOAD_FIELD_ALLOWLISTS.autoDestructV2,
  )
  assertNoSecretFields(parsed)

  if (
    parsed.version !== 2 ||
    parsed.type !== 'LINK2' ||
    parsed.kdf !== ARGON2_V2_KDF ||
    parsed.parallelism !== ARGON2_V2_PARALLELISM ||
    typeof parsed.memoryMb !== 'number' ||
    typeof parsed.iterations !== 'number' ||
    typeof parsed.ciphertext !== 'string' ||
    !parsed.ciphertext ||
    typeof parsed.iv !== 'string' ||
    typeof parsed.salt !== 'string' ||
    !Number.isSafeInteger(parsed.createdAt) ||
    (parsed.createdAt ?? -1) < 0 ||
    !isExpirationValue(parsed.expiresIn) ||
    !(
      parsed.maxViews === null ||
      (Number.isSafeInteger(parsed.maxViews) && (parsed.maxViews ?? 0) >= 1)
    )
  ) {
    throw new AutoDestructLinkError(
      'INVALID_PAYLOAD',
      'Os dados da mensagem não estão no formato LINK2 esperado.',
    )
  }

  try {
    validateArgon2Parameters({
      memoryMb: parsed.memoryMb,
      iterations: parsed.iterations,
    })

    if (
      decodeBase64ToBytes(parsed.iv).byteLength !== 12 ||
      decodeBase64ToBytes(parsed.salt).byteLength !== 16
    ) {
      throw new Error('Invalid LINK2 binary parameters')
    }
  } catch {
    throw new AutoDestructLinkError(
      'INVALID_PAYLOAD',
      'O LINK2 contém parâmetros criptográficos inválidos.',
    )
  }

  return parsed as AutoDestructPayloadV2
}

export function parseAutoDestructPayload(
  encodedPayload: string,
): AutoDestructPayload {
  if (encodedPayload.startsWith(AUTO_DESTRUCT_V2_PREFIX)) {
    return parseAutoDestructPayloadV2(encodedPayload)
  }

  return parseAutoDestructPayloadV1(encodedPayload)
}

export function payloadToDecryptInput(
  payload: AutoDestructPayloadV1,
): TextDecryptionInput {
  return {
    ciphertext: payload.ciphertext,
    iv: decodeBase64ToBytes(payload.iv),
    salt: decodeBase64ToBytes(payload.salt),
  }
}

export async function decryptAutoDestructPayload(
  payload: AutoDestructPayload,
  password: string,
) {
  if (payload.version === 1) {
    return decryptText(payloadToDecryptInput(payload), password)
  }

  return decryptTextArgon2(
    {
      ciphertext: payload.ciphertext,
      iv: decodeBase64ToBytes(payload.iv),
      salt: decodeBase64ToBytes(payload.salt),
      memoryMb: payload.memoryMb,
      iterations: payload.iterations,
      parallelism: payload.parallelism,
    },
    password,
    buildAutoDestructV2Aad(payload),
  )
}

export function buildAutoDestructLink(encodedPayload: string) {
  const baseUrl =
    typeof window !== 'undefined' && window.location?.origin
      ? new URL(AUTO_DESTRUCT_APP_PATH, window.location.origin).toString()
      : `${AUTO_DESTRUCT_APP_URL}${AUTO_DESTRUCT_APP_PATH}`

  return `${baseUrl}${AUTO_DESTRUCT_HASH_PREFIX}${encodeURIComponent(encodedPayload)}`
}

export function readAutoDestructPayloadFromHash(hash: string) {
  if (!hash || !hash.startsWith(AUTO_DESTRUCT_HASH_PREFIX)) {
    return null
  }

  const rawValue = hash.slice(AUTO_DESTRUCT_HASH_PREFIX.length)

  if (!rawValue) {
    throw new AutoDestructLinkError(
      'INVALID_LINK',
      'O hash da URL não contém uma mensagem válida.',
    )
  }

  const encodedPayload = decodeURIComponent(rawValue)
  const payload = parseAutoDestructPayload(encodedPayload)

  return {
    encodedPayload,
    payload,
  }
}

export function readAutoDestructPayloadFromInput(value: string): AutoDestructReadResult {
  const normalizedValue = value.trim()

  if (!normalizedValue) {
    throw new AutoDestructLinkError(
      'INVALID_LINK',
      'Cole um link ou o trecho da mensagem antes de continuar.',
    )
  }

  if (normalizedValue.startsWith('#msg=')) {
    const fromHash = readAutoDestructPayloadFromHash(normalizedValue)

    if (!fromHash) {
      throw new AutoDestructLinkError(
        'INVALID_LINK',
        'Não foi possível encontrar uma mensagem válida nesse trecho.',
      )
    }

    return fromHash
  }

  if (normalizedValue.startsWith('http://') || normalizedValue.startsWith('https://')) {
    try {
      const parsedUrl = new URL(normalizedValue)
      const fromHash = readAutoDestructPayloadFromHash(parsedUrl.hash)

      if (!fromHash) {
        throw new AutoDestructLinkError(
          'INVALID_LINK',
          'Esse link não contém uma mensagem válida do CriptoVéu.',
        )
      }

      return fromHash
    } catch (error) {
      if (error instanceof AutoDestructLinkError) {
        throw error
      }

      throw new AutoDestructLinkError(
        'INVALID_LINK',
        'O link informado não é válido.',
      )
    }
  }

  return {
    encodedPayload: normalizedValue,
    payload: parseAutoDestructPayload(normalizedValue),
  }
}

export function getAutoDestructViewState(encodedPayload: string): AutoDestructViewState {
  try {
    const rawValue = window.localStorage.getItem(getStorageKey(encodedPayload))

    if (!rawValue) {
      return {
        views: 0,
        lastOpenedAt: null,
      }
    }

    const parsed = JSON.parse(rawValue) as Partial<AutoDestructViewState>

    return {
      views: typeof parsed.views === 'number' ? parsed.views : 0,
      lastOpenedAt:
        typeof parsed.lastOpenedAt === 'number' ? parsed.lastOpenedAt : null,
    }
  } catch {
    return {
      views: 0,
      lastOpenedAt: null,
    }
  }
}

export function incrementAutoDestructViews(encodedPayload: string) {
  const currentState = getAutoDestructViewState(encodedPayload)
  const nextState: AutoDestructViewState = {
    views: currentState.views + 1,
    lastOpenedAt: Date.now(),
  }

  try {
    window.localStorage.setItem(getStorageKey(encodedPayload), JSON.stringify(nextState))
  } catch {
    throw new AutoDestructLinkError(
      'STORAGE_UNAVAILABLE',
      'Não foi possível registrar a visualização desta mensagem no navegador.',
    )
  }

  return nextState
}

export function hasAutoDestructExpired(
  payload: AutoDestructPayload,
  viewState: AutoDestructViewState,
  now = Date.now(),
) {
  const expirationInMs = getExpirationInMs(payload.expiresIn)

  if (expirationInMs !== null && payload.createdAt + expirationInMs < now) {
    return true
  }

  if (payload.maxViews !== null && viewState.views >= payload.maxViews) {
    return true
  }

  return false
}

export function assertAutoDestructAvailability(
  payload: AutoDestructPayload,
  encodedPayload: string,
) {
  const viewState = getAutoDestructViewState(encodedPayload)

  if (hasAutoDestructExpired(payload, viewState)) {
    throw new AutoDestructLinkError('EXPIRED', 'Esta mensagem expirou.')
  }

  return viewState
}






