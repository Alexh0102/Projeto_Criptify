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
const VEU_NOTES_V3_FIELDS = [
  'version',
  'type',
  'kdf',
  'memoryMb',
  'iterations',
  'parallelism',
  'salt',
  'iv',
  'ciphertext',
  'recoveryIv',
  'parity',
] as const

export const VEU_NOTES_VERSION = 3
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

export type VeuNotesBlobV3 = {
  version: 3
  type: 'NOTE3'
  kdf: typeof ARGON2_V2_KDF
  memoryMb: number
  iterations: number
  parallelism: typeof ARGON2_V2_PARALLELISM
  salt: string
  iv: string
  ciphertext: string
  recoveryIv: string
  parity: string
}

export type VeuNotesBlobJson = VeuNotesBlobV1 | VeuNotesBlobV2 | VeuNotesBlobV3
export type VeuNotesRecoveryMode = 'standard' | 'recoverable'

export type VeuNotesSession = {
  aesKey: CryptoKey
  salt: Uint8Array<ArrayBuffer>
  memoryMb: number
  iterations: number
  parallelism: typeof ARGON2_V2_PARALLELISM
  recoveryMode: VeuNotesRecoveryMode
}

export type VeuNotesUnlockResult = {
  plaintext: string
  session: VeuNotesSession
  migratedBlob: VeuNotesBlobV2 | VeuNotesBlobV3 | null
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

function xorBytes(first: Uint8Array, second: Uint8Array) {
  if (first.byteLength !== second.byteLength) {
    throw new VeuNotesCryptoError(
      'INVALID_BLOB',
      'A paridade do cofre não possui o tamanho esperado.',
    )
  }

  const result = new Uint8Array(new ArrayBuffer(first.byteLength))

  for (let index = 0; index < result.byteLength; index += 1) {
    result[index] = first[index] ^ second[index]
  }

  return result
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

export function buildVeuNotesV3Aad(
  metadata: Pick<
    VeuNotesBlobV3,
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
    'xor-parity-1',
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

    if (value.version === 3) {
      assertAllowedPayloadFields(value, VEU_NOTES_V3_FIELDS)

      if (
        value.type !== 'NOTE3' ||
        value.kdf !== ARGON2_V2_KDF ||
        value.parallelism !== ARGON2_V2_PARALLELISM ||
        typeof value.memoryMb !== 'number' ||
        typeof value.iterations !== 'number' ||
        typeof value.salt !== 'string' ||
        typeof value.iv !== 'string' ||
        typeof value.ciphertext !== 'string' ||
        typeof value.recoveryIv !== 'string' ||
        typeof value.parity !== 'string' ||
        !validateBinaryFields(value.salt, value.iv, value.ciphertext) ||
        decodeBase64ToBytes(value.recoveryIv).byteLength !== IV_LENGTH_BYTES ||
        decodeBase64ToBytes(value.parity).byteLength !==
          decodeBase64ToBytes(value.ciphertext).byteLength
      ) {
        throw new Error('Invalid NOTE3 fields')
      }

      validateArgon2Parameters({
        memoryMb: value.memoryMb,
        iterations: value.iterations,
      })
      return value as VeuNotesBlobV3
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
  recoveryMode: VeuNotesRecoveryMode = 'standard',
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
      recoveryMode,
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
): Promise<VeuNotesBlobV2 | VeuNotesBlobV3> {
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
  if (session.recoveryMode === 'standard') {
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

  const recoveryMetadata = {
    version: 3 as const,
    type: 'NOTE3' as const,
    kdf: ARGON2_V2_KDF,
    memoryMb: session.memoryMb,
    iterations: session.iterations,
    parallelism: session.parallelism,
  } satisfies Pick<
    VeuNotesBlobV3,
    'version' | 'type' | 'kdf' | 'memoryMb' | 'iterations' | 'parallelism'
  >
  const recoveryIv = randomBytes(IV_LENGTH_BYTES)
  const primaryCiphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
        additionalData: buildVeuNotesV3Aad(recoveryMetadata),
      },
      session.aesKey,
      encoder.encode(plaintext),
    ),
  )
  const recoveryCiphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: recoveryIv,
        additionalData: buildVeuNotesV3Aad(recoveryMetadata),
      },
      session.aesKey,
      encoder.encode(plaintext),
    ),
  )

  return {
    ...recoveryMetadata,
    salt: encodeBytesToBase64(session.salt),
    iv: encodeBytesToBase64(iv),
    ciphertext: encodeBytesToBase64(primaryCiphertext),
    recoveryIv: encodeBytesToBase64(recoveryIv),
    parity: encodeBytesToBase64(xorBytes(primaryCiphertext, recoveryCiphertext)),
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

async function decryptNoteV3WithSession(
  blob: VeuNotesBlobV3,
  session: VeuNotesSession,
) {
  const decryptCiphertext = async (iv: Uint8Array, ciphertext: Uint8Array) =>
    decoder.decode(
      await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: cloneBytes(iv),
          additionalData: buildVeuNotesV3Aad(blob),
        },
        session.aesKey,
        cloneBytes(ciphertext),
      ),
    )

  try {
    return await decryptCiphertext(
      decodeBase64ToBytes(blob.iv),
      decodeBase64ToBytes(blob.ciphertext),
    )
  } catch {
    try {
      const recoveredCiphertext = xorBytes(
        decodeBase64ToBytes(blob.ciphertext),
        decodeBase64ToBytes(blob.parity),
      )
      return await decryptCiphertext(
        decodeBase64ToBytes(blob.recoveryIv),
        recoveredCiphertext,
      )
    } catch {
      throw new VeuNotesCryptoError(
        'INVALID_PASSWORD',
        'Senha incorreta ou cofre inválido. A paridade não conseguiu recuperar este backup.',
      )
    }
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
  recoveryMode: VeuNotesRecoveryMode = 'standard',
) {
  const session = await deriveVeuNotesV2Session(
    password,
    undefined,
    undefined,
    undefined,
    recoveryMode,
  )
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
      'standard',
    )
    const plaintext = await decryptNoteV2WithSession(safeBlob, session)

    return {
      plaintext,
      session,
      migratedBlob: null,
    }
  }

  if (safeBlob.version === 3) {
    const session = await deriveVeuNotesV2Session(
      password,
      decodeBase64ToBytes(safeBlob.salt),
      safeBlob.memoryMb,
      safeBlob.iterations,
      'recoverable',
    )
    const plaintext = await decryptNoteV3WithSession(safeBlob, session)

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
  recoveryMode: VeuNotesRecoveryMode = 'standard',
): Promise<VeuNotesBlobV2 | VeuNotesBlobV3> {
  return (await createVeuNotesVault(plaintext, password, recoveryMode)).blob
}

export async function decryptNote(
  blobJson: VeuNotesBlobJson,
  password: string,
): Promise<string> {
  return (await unlockVeuNotesBlob(blobJson, password)).plaintext
}
