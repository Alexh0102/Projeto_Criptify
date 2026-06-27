import {
  CriptoveuError,
  deriveArgon2AesKey,
  validateArgon2Parameters,
} from './criptoveu'
import {
  ARGON2_V2_DEFAULT_ITERATIONS,
  ARGON2_V2_KDF,
  ARGON2_V2_NOTE_MEMORY_MB,
  ARGON2_V2_PARALLELISM,
  buildPayloadV2Aad,
} from './payload-v2'
import {
  assertAllowedPayloadFields,
  assertNoSecretFields,
} from './share-payload-security'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

const SALT_LENGTH_BYTES = 16
const IV_LENGTH_BYTES = 12
const BASE64_CHUNK_SIZE_BYTES = 0x8000
const VEU_NOTES_V1_FIELDS = [
  'version',
  'salt',
  'iterations',
  'iv',
  'ciphertext',
] as const
const VEU_NOTES_V2_FIELDS = [
  'version',
  'type',
  'kdf',
  'memoryMb',
  'iterations',
  'parallelism',
  'salt',
  'iv',
  'ciphertext',
] as const

export const VEU_NOTES_VERSION = 2
export const VEU_NOTES_MIN_PASSWORD_LENGTH = 12
export const VEU_NOTES_PBKDF2_ITERATIONS = 210_000
export const VEU_NOTES_MAX_PBKDF2_ITERATIONS = 1_200_000

export type VeuNotesBlobV1 = {
  version: 1
  salt: string
  iterations: number
  iv: string
  ciphertext: string
}

export type VeuNotesBlobV2 = {
  version: 2
  type: 'NOTE2'
  kdf: typeof ARGON2_V2_KDF
  memoryMb: number
  iterations: number
  parallelism: typeof ARGON2_V2_PARALLELISM
  salt: string
  iv: string
  ciphertext: string
}

export type VeuNotesBlobJson = VeuNotesBlobV1 | VeuNotesBlobV2

export type VeuNotesSession = {
  aesKey: CryptoKey
  salt: Uint8Array<ArrayBuffer>
  memoryMb: number
  iterations: number
  parallelism: typeof ARGON2_V2_PARALLELISM
}

export type VeuNotesUnlockResult = {
  plaintext: string
  session: VeuNotesSession
  migratedBlob: VeuNotesBlobV2 | null
}

export class VeuNotesCryptoError extends Error {
  code:
    | 'INVALID_PASSWORD'
    | 'INVALID_BLOB'
    | 'UNSUPPORTED_VERSION'
    | 'KEY_DERIVATION_FAILED'

  constructor(
    code:
      | 'INVALID_PASSWORD'
      | 'INVALID_BLOB'
      | 'UNSUPPORTED_VERSION'
      | 'KEY_DERIVATION_FAILED',
    message: string,
  ) {
    super(message)
    this.name = 'VeuNotesCryptoError'
    this.code = code
  }
}

export function encodeBytesToBase64(bytes: Uint8Array) {
  let binary = ''

  for (let index = 0; index < bytes.length; index += BASE64_CHUNK_SIZE_BYTES) {
    binary += String.fromCharCode(
      ...bytes.subarray(index, index + BASE64_CHUNK_SIZE_BYTES),
    )
  }

  return btoa(binary)
}

export function decodeBase64ToBytes(value: string) {
  const binary = atob(value)
  const bytes = new Uint8Array(new ArrayBuffer(binary.length))

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes
}

function randomBytes(length: number) {
  const bytes = new Uint8Array(new ArrayBuffer(length))
  crypto.getRandomValues(bytes)
  return bytes
}

function cloneBytes(source: Uint8Array) {
  const bytes = new Uint8Array(new ArrayBuffer(source.length))
  bytes.set(source)
  return bytes
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function validateBinaryFields(
  saltValue: string,
  ivValue: string,
  ciphertext: string,
) {
  try {
    return (
      decodeBase64ToBytes(saltValue).byteLength === SALT_LENGTH_BYTES &&
      decodeBase64ToBytes(ivValue).byteLength === IV_LENGTH_BYTES &&
      decodeBase64ToBytes(ciphertext).byteLength >= 16
    )
  } catch {
    return false
  }
}

export function buildVeuNotesV2Aad(
  metadata: Pick<
    VeuNotesBlobV2,
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

export function assertVeuNotesBlobJson(value: unknown): VeuNotesBlobJson {
  if (!isObject(value)) {
    throw new VeuNotesCryptoError(
      'INVALID_BLOB',
      'O cofre não está no formato esperado.',
    )
  }

  try {
    assertNoSecretFields(value)

    if (value.version === 1) {
      assertAllowedPayloadFields(value, VEU_NOTES_V1_FIELDS)

      if (
        typeof value.salt !== 'string' ||
        typeof value.iterations !== 'number' ||
        typeof value.iv !== 'string' ||
        typeof value.ciphertext !== 'string' ||
        !Number.isSafeInteger(value.iterations) ||
        value.iterations < 100_000 ||
        value.iterations > VEU_NOTES_MAX_PBKDF2_ITERATIONS ||
        !validateBinaryFields(value.salt, value.iv, value.ciphertext)
      ) {
        throw new Error('Invalid NOTE1 fields')
      }

      return value as VeuNotesBlobV1
    }

    if (value.version === 2) {
      assertAllowedPayloadFields(value, VEU_NOTES_V2_FIELDS)

      if (
        value.type !== 'NOTE2' ||
        value.kdf !== ARGON2_V2_KDF ||
        value.parallelism !== ARGON2_V2_PARALLELISM ||
        typeof value.memoryMb !== 'number' ||
        typeof value.iterations !== 'number' ||
        typeof value.salt !== 'string' ||
        typeof value.iv !== 'string' ||
        typeof value.ciphertext !== 'string' ||
        !validateBinaryFields(value.salt, value.iv, value.ciphertext)
      ) {
        throw new Error('Invalid NOTE2 fields')
      }

      validateArgon2Parameters({
        memoryMb: value.memoryMb,
        iterations: value.iterations,
      })
      return value as VeuNotesBlobV2
    }
  } catch {
    throw new VeuNotesCryptoError(
      'INVALID_BLOB',
      'O cofre salvo usa campos ou parâmetros criptográficos inválidos.',
    )
  }

  throw new VeuNotesCryptoError(
    'UNSUPPORTED_VERSION',
    'Esta versão do cofre não é compatível com o VéuNotes atual.',
  )
}

async function getLegacyPasswordKey(password: string) {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
}

async function deriveLegacyAesKey(
  password: string,
  salt: Uint8Array,
  iterations: number,
) {
  const passwordKey = await getLegacyPasswordKey(password)

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: cloneBytes(salt),
      iterations,
      hash: 'SHA-256',
    },
    passwordKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['decrypt'],
  )
}

async function deriveVeuNotesV2Session(
  password: string,
  salt = randomBytes(SALT_LENGTH_BYTES),
  memoryMb = ARGON2_V2_NOTE_MEMORY_MB,
  iterations = ARGON2_V2_DEFAULT_ITERATIONS,
): Promise<VeuNotesSession> {
  try {
    const aesKey = await deriveArgon2AesKey(
      password,
      salt,
      { memoryMb, iterations },
      ['encrypt', 'decrypt'],
    )

    return {
      aesKey,
      salt: cloneBytes(salt),
      memoryMb,
      iterations,
      parallelism: ARGON2_V2_PARALLELISM,
    }
  } catch (error) {
    if (
      error instanceof CriptoveuError &&
      error.code === 'KEY_DERIVATION_FAILED'
    ) {
      throw new VeuNotesCryptoError(
        'KEY_DERIVATION_FAILED',
        'Este dispositivo não conseguiu executar o Argon2id exigido pelo cofre.',
      )
    }

    throw error
  }
}

export async function encryptNoteWithSession(
  plaintext: string,
  session: VeuNotesSession,
): Promise<VeuNotesBlobV2> {
  const iv = randomBytes(IV_LENGTH_BYTES)
  const metadata = {
    version: 2 as const,
    type: 'NOTE2' as const,
    kdf: ARGON2_V2_KDF,
    memoryMb: session.memoryMb,
    iterations: session.iterations,
    parallelism: session.parallelism,
  } satisfies Pick<
    VeuNotesBlobV2,
    'version' | 'type' | 'kdf' | 'memoryMb' | 'iterations' | 'parallelism'
  >
  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
      additionalData: buildVeuNotesV2Aad(metadata),
    },
    session.aesKey,
    encoder.encode(plaintext),
  )

  return {
    ...metadata,
    salt: encodeBytesToBase64(session.salt),
    iv: encodeBytesToBase64(iv),
    ciphertext: encodeBytesToBase64(new Uint8Array(encrypted)),
  }
}

async function decryptNoteV2WithSession(
  blob: VeuNotesBlobV2,
  session: VeuNotesSession,
) {
  try {
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: cloneBytes(decodeBase64ToBytes(blob.iv)),
        additionalData: buildVeuNotesV2Aad(blob),
      },
      session.aesKey,
      decodeBase64ToBytes(blob.ciphertext),
    )

    return decoder.decode(decrypted)
  } catch {
    throw new VeuNotesCryptoError(
      'INVALID_PASSWORD',
      'Senha incorreta ou cofre inválido. Verifique a senha e tente novamente.',
    )
  }
}

async function decryptLegacyNote(blob: VeuNotesBlobV1, password: string) {
  try {
    const key = await deriveLegacyAesKey(
      password,
      decodeBase64ToBytes(blob.salt),
      blob.iterations,
    )
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: cloneBytes(decodeBase64ToBytes(blob.iv)),
      },
      key,
      decodeBase64ToBytes(blob.ciphertext),
    )

    return decoder.decode(decrypted)
  } catch {
    throw new VeuNotesCryptoError(
      'INVALID_PASSWORD',
      'Senha incorreta ou cofre inválido. Verifique a senha e tente novamente.',
    )
  }
}

export async function createVeuNotesVault(
  plaintext: string,
  password: string,
) {
  const session = await deriveVeuNotesV2Session(password)
  const blob = await encryptNoteWithSession(plaintext, session)
  return { blob, session }
}

export async function unlockVeuNotesBlob(
  blobJson: VeuNotesBlobJson,
  password: string,
): Promise<VeuNotesUnlockResult> {
  const safeBlob = assertVeuNotesBlobJson(blobJson)

  if (safeBlob.version === 2) {
    const session = await deriveVeuNotesV2Session(
      password,
      decodeBase64ToBytes(safeBlob.salt),
      safeBlob.memoryMb,
      safeBlob.iterations,
    )
    const plaintext = await decryptNoteV2WithSession(safeBlob, session)

    return {
      plaintext,
      session,
      migratedBlob: null,
    }
  }

  const plaintext = await decryptLegacyNote(safeBlob, password)
  const { blob, session } = await createVeuNotesVault(plaintext, password)

  return {
    plaintext,
    session,
    migratedBlob: blob,
  }
}

export async function encryptNote(
  plaintext: string,
  password: string,
): Promise<VeuNotesBlobV2> {
  return (await createVeuNotesVault(plaintext, password)).blob
}

export async function decryptNote(
  blobJson: VeuNotesBlobJson,
  password: string,
): Promise<string> {
  return (await unlockVeuNotesBlob(blobJson, password)).plaintext
}
