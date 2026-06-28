import integrityWorkerUrl from '../workers/integrity.worker.ts?worker&url'

export const FILE_INTEGRITY_MANIFEST_VERSION = 1
export const MAX_FILE_INTEGRITY_MANIFEST_BYTES = 1024 * 1024

const SHA256_HEX_PATTERN = /^[a-f0-9]{64}$/
const MANIFEST_FIELDS = [
  'version',
  'format',
  'manifestId',
  'createdAt',
  'originalName',
  'originalSize',
  'mimeType',
  'chunkSize',
  'chunkCount',
  'fileHashSha256',
  'chunkHashesSha256',
  'encryption',
  'kdf',
  'hash',
  'argon2',
  'keyFileProtection',
] as const
const ARGON2_FIELDS = ['memoryMb', 'iterations', 'parallelism'] as const
const KEY_FILE_PROTECTION_FIELDS = [
  'required',
  'digest',
  'embedded',
] as const

export type FileIntegrityFormat = 'CRIPTOVEU4' | 'CRIPTOVEU5'

export type FileIntegrityHashes = {
  fileHashSha256: string
  chunkHashesSha256: string[]
}

export type FileIntegrityManifest = FileIntegrityHashes & {
  version: typeof FILE_INTEGRITY_MANIFEST_VERSION
  format: FileIntegrityFormat
  manifestId: string
  createdAt: number
  originalName: string
  originalSize: number
  mimeType: string
  chunkSize: number
  chunkCount: number
  encryption: 'AES-256-GCM'
  kdf: 'Argon2id'
  hash: 'SHA-256'
  argon2: {
    memoryMb: number
    iterations: number
    parallelism: 1
  }
  keyFileProtection?: {
    required: true
    digest: 'SHA-256'
    embedded: false
  }
}

export class FileIntegrityError extends Error {
  code:
    | 'HASH_FAILED'
    | 'INVALID_MANIFEST'
    | 'MANIFEST_TOO_LARGE'
    | 'INTEGRITY_MISMATCH'

  constructor(
    code:
      | 'HASH_FAILED'
      | 'INVALID_MANIFEST'
      | 'MANIFEST_TOO_LARGE'
      | 'INTEGRITY_MISMATCH',
    message: string,
  ) {
    super(message)
    this.name = 'FileIntegrityError'
    this.code = code
  }
}

type IntegrityWorkerResponse =
  | {
      id: number
      progress: number
    }
  | {
      id: number
      fileHashSha256: string
      chunkHashesSha256: string[]
    }
  | {
      id: number
      error: string
    }

type TrustedTypesFactory = {
  createPolicy: (
    policyName: string,
    rules: { createScriptURL: (url: string) => string },
  ) => {
    createScriptURL: (url: string) => string
  }
}

let integrityRequestId = 0
let trustedIntegrityWorkerUrl: string | null = null

function createIntegrityWorker() {
  const trustedTypes = (
    globalThis as typeof globalThis & { trustedTypes?: TrustedTypesFactory }
  ).trustedTypes

  if (trustedTypes && trustedIntegrityWorkerUrl === null) {
    const policy = trustedTypes.createPolicy('criptoveu-integrity-worker', {
      createScriptURL: (url) => url,
    })
    trustedIntegrityWorkerUrl = policy.createScriptURL(integrityWorkerUrl)
  }

  return new Worker(trustedIntegrityWorkerUrl ?? integrityWorkerUrl, {
    type: 'module',
  })
}

export async function hashBlobIntegrity(
  blob: Blob,
  chunkSize: number,
  onProgress?: (progress: number) => void,
): Promise<FileIntegrityHashes> {
  const requestId = (integrityRequestId += 1)

  return new Promise<FileIntegrityHashes>((resolve, reject) => {
    const worker = createIntegrityWorker()

    worker.onmessage = (event: MessageEvent<IntegrityWorkerResponse>) => {
      if (event.data.id !== requestId) {
        return
      }

      if ('progress' in event.data) {
        onProgress?.(event.data.progress)
        return
      }

      worker.terminate()

      if ('error' in event.data) {
        reject(
          new FileIntegrityError(
            'HASH_FAILED',
            event.data.error,
          ),
        )
        return
      }

      resolve({
        fileHashSha256: event.data.fileHashSha256,
        chunkHashesSha256: event.data.chunkHashesSha256,
      })
    }

    worker.onerror = () => {
      worker.terminate()
      reject(
        new FileIntegrityError(
          'HASH_FAILED',
          'Falha ao carregar o Worker de integridade SHA-256.',
        ),
      )
    }

    worker.postMessage({
      id: requestId,
      blob,
      chunkSize,
    })
  })
}

function randomManifestId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function createFileIntegrityManifest(
  file: File,
  chunkSize: number,
  argon2: FileIntegrityManifest['argon2'],
  onProgress?: (progress: number) => void,
  format: FileIntegrityFormat = 'CRIPTOVEU4',
): Promise<FileIntegrityManifest> {
  const hashes = await hashBlobIntegrity(file, chunkSize, onProgress)

  return {
    version: FILE_INTEGRITY_MANIFEST_VERSION,
    format,
    manifestId: randomManifestId(),
    createdAt: Date.now(),
    originalName: file.name,
    originalSize: file.size,
    mimeType: file.type || 'application/octet-stream',
    chunkSize,
    chunkCount: hashes.chunkHashesSha256.length,
    fileHashSha256: hashes.fileHashSha256,
    chunkHashesSha256: hashes.chunkHashesSha256,
    encryption: 'AES-256-GCM',
    kdf: 'Argon2id',
    hash: 'SHA-256',
    argon2,
    ...(format === 'CRIPTOVEU5'
      ? {
          keyFileProtection: {
            required: true as const,
            digest: 'SHA-256' as const,
            embedded: false as const,
          },
        }
      : {}),
  }
}

function hasOnlyFields(
  value: Record<string, unknown>,
  fields: readonly string[],
) {
  const allowed = new Set(fields)
  return Object.keys(value).every((field) => allowed.has(field))
}

function hasUnsafeFileNameCharacter(value: string) {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0
    return character === '/' || character === '\\' || codePoint <= 0x1f
  })
}

export function assertFileIntegrityManifest(
  value: unknown,
): FileIntegrityManifest {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    !hasOnlyFields(value as Record<string, unknown>, MANIFEST_FIELDS)
  ) {
    throw new FileIntegrityError(
      'INVALID_MANIFEST',
      'O manifesto criptográfico não está no formato esperado.',
    )
  }

  const manifest = value as Partial<FileIntegrityManifest>
  const argon2 = manifest.argon2
  const keyFileProtection = manifest.keyFileProtection
  const hasValidKeyFileProtection =
    manifest.format === 'CRIPTOVEU4'
      ? keyFileProtection === undefined
      : manifest.format === 'CRIPTOVEU5' &&
        keyFileProtection !== undefined &&
        typeof keyFileProtection === 'object' &&
        !Array.isArray(keyFileProtection) &&
        hasOnlyFields(
          keyFileProtection as unknown as Record<string, unknown>,
          KEY_FILE_PROTECTION_FIELDS,
        ) &&
        keyFileProtection.required === true &&
        keyFileProtection.digest === 'SHA-256' &&
        keyFileProtection.embedded === false

  if (
    manifest.version !== FILE_INTEGRITY_MANIFEST_VERSION ||
    (manifest.format !== 'CRIPTOVEU4' &&
      manifest.format !== 'CRIPTOVEU5') ||
    !hasValidKeyFileProtection ||
    typeof manifest.manifestId !== 'string' ||
    !/^[a-f0-9]{32}$/.test(manifest.manifestId) ||
    !Number.isSafeInteger(manifest.createdAt) ||
    (manifest.createdAt ?? -1) < 0 ||
    typeof manifest.originalName !== 'string' ||
    !manifest.originalName ||
    manifest.originalName.length > 1024 ||
    hasUnsafeFileNameCharacter(manifest.originalName) ||
    !Number.isSafeInteger(manifest.originalSize) ||
    (manifest.originalSize ?? -1) < 0 ||
    typeof manifest.mimeType !== 'string' ||
    manifest.mimeType.length > 255 ||
    !Number.isSafeInteger(manifest.chunkSize) ||
    (manifest.chunkSize ?? 0) < 64 * 1024 ||
    (manifest.chunkSize ?? 0) > 16 * 1024 * 1024 ||
    !Number.isSafeInteger(manifest.chunkCount) ||
    (manifest.chunkCount ?? 0) < 1 ||
    typeof manifest.fileHashSha256 !== 'string' ||
    !SHA256_HEX_PATTERN.test(manifest.fileHashSha256) ||
    !Array.isArray(manifest.chunkHashesSha256) ||
    manifest.chunkHashesSha256.length !== manifest.chunkCount ||
    !manifest.chunkHashesSha256.every(
      (hash) => typeof hash === 'string' && SHA256_HEX_PATTERN.test(hash),
    ) ||
    manifest.encryption !== 'AES-256-GCM' ||
    manifest.kdf !== 'Argon2id' ||
    manifest.hash !== 'SHA-256' ||
    !argon2 ||
    typeof argon2 !== 'object' ||
    Array.isArray(argon2) ||
    !hasOnlyFields(argon2 as unknown as Record<string, unknown>, ARGON2_FIELDS) ||
    !Number.isSafeInteger(argon2.memoryMb) ||
    !Number.isSafeInteger(argon2.iterations) ||
    argon2.parallelism !== 1
  ) {
    throw new FileIntegrityError(
      'INVALID_MANIFEST',
      'O manifesto criptográfico contém campos ou parâmetros inválidos.',
    )
  }

  return manifest as FileIntegrityManifest
}

export function serializeFileIntegrityManifest(
  manifest: FileIntegrityManifest,
) {
  const validated = assertFileIntegrityManifest(manifest)
  const bytes = new TextEncoder().encode(JSON.stringify(validated))

  if (bytes.byteLength > MAX_FILE_INTEGRITY_MANIFEST_BYTES) {
    throw new FileIntegrityError(
      'MANIFEST_TOO_LARGE',
      'O manifesto criptográfico excede o tamanho máximo suportado.',
    )
  }

  return bytes
}

export function parseFileIntegrityManifest(bytes: Uint8Array) {
  if (bytes.byteLength > MAX_FILE_INTEGRITY_MANIFEST_BYTES) {
    throw new FileIntegrityError(
      'MANIFEST_TOO_LARGE',
      'O manifesto criptográfico excede o tamanho máximo suportado.',
    )
  }

  try {
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    return assertFileIntegrityManifest(JSON.parse(decoded))
  } catch (error) {
    if (error instanceof FileIntegrityError) {
      throw error
    }

    throw new FileIntegrityError(
      'INVALID_MANIFEST',
      'O manifesto criptográfico está corrompido ou incompleto.',
    )
  }
}

export function assertIntegrityHashes(
  manifest: FileIntegrityManifest,
  hashes: FileIntegrityHashes,
) {
  if (
    hashes.fileHashSha256 !== manifest.fileHashSha256 ||
    hashes.chunkHashesSha256.length !== manifest.chunkHashesSha256.length ||
    hashes.chunkHashesSha256.some(
      (hash, index) => hash !== manifest.chunkHashesSha256[index],
    )
  ) {
    throw new FileIntegrityError(
      'INTEGRITY_MISMATCH',
      'O Escudo de Integridade detectou divergência no conteúdo recuperado.',
    )
  }
}
