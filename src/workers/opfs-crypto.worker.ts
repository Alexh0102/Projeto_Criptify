/// <reference lib="webworker" />

import { argon2id, createSHA256, sha256 } from 'hash-wasm'

import {
  assertIntegrityHashes,
  parseFileIntegrityManifest,
  serializeFileIntegrityManifest,
  type FileIntegrityFormat,
  type FileIntegrityManifest,
} from '../lib/file-integrity'

const INTEGRITY_HEADER_SIGNATURE_LENGTH_BYTES = 10
const SALT_LENGTH_BYTES = 16
const IV_LENGTH_BYTES = 12
const ARGON2_PARAMETER_LENGTH_BYTES = 4
const CHUNK_RECORD_LENGTH_BYTES = 4
const INTEGRITY_RECORD_TYPE_BYTES = 1
const INTEGRITY_RECORD_HEADER_BYTES =
  INTEGRITY_RECORD_TYPE_BYTES + CHUNK_RECORD_LENGTH_BYTES
const INTEGRITY_DATA_RECORD_TYPE = 1
const INTEGRITY_MANIFEST_RECORD_TYPE = 2
const RECOVERABLE_PARITY_RECORD_TYPE = 3
const RECOVERABLE_PARITY_GROUP_SIZE = 4
const AES_GCM_TAG_LENGTH_BYTES = 16
const MAX_FILE_INTEGRITY_MANIFEST_BYTES = 1024 * 1024
const CHUNK_SIZE_BYTES = 2 * 1024 * 1024
const ARGON2_MIN_MEMORY_MB = 8
const ARGON2_MAX_MEMORY_MB = 512
const ARGON2_MIN_ITERATIONS = 1
const ARGON2_MAX_ITERATIONS = 10
const KEY_FILE_MAX_SIZE_BYTES = 32 * 1024 * 1024
const DOMAIN_SEPARATOR = new TextEncoder().encode(
  'CriptoVeu:password-key-file:v1',
)

type WorkerMode = 'encrypt' | 'decrypt'

type WorkerOptions = {
  argon2MemoryMb?: number
  argon2Iterations?: number
  keyFile?: File | null
  recoverable?: boolean
}

type WorkerRequest = {
  id: number
  mode: WorkerMode
  file: File
  password: string
  options: WorkerOptions
}

type CleanupRequest = {
  id: number
  type: 'CLEANUP'
  tempFileName: string
}

type WorkerErrorCode =
  | 'OPFS_UNSUPPORTED'
  | 'FILE_TOO_LARGE'
  | 'INVALID_FILE'
  | 'INVALID_PASSWORD_OR_FILE'
  | 'KEY_DERIVATION_FAILED'
  | 'INTEGRITY_FAILED'
  | 'KEY_FILE_REQUIRED'
  | 'INVALID_KEY_FILE'

type WorkerResponse =
  | {
      id: number
      type: 'PROGRESS'
      value: number
      label: string
    }
  | {
      id: number
      type: 'SUCCESS'
      resultFile: File
      downloadName: string
      securityReport: FileSecurityReport
      tempFileName: string
    }
  | {
      id: number
      type: 'CLEANUP_DONE'
    }
  | {
      id: number
      type: 'ERROR'
      code: WorkerErrorCode
      message: string
    }

type FileSecurityReport = {
  operation: WorkerMode
  format: FileIntegrityFormat
  encryption: 'AES-256-GCM'
  kdf: 'Argon2id'
  memoryMb: number
  iterations: number
  parallelism: 1
  chunkSize: number
  chunkCount: number
  integrity: {
    aesGcmAuthenticated: true
    manifestVerified: true
    sha256Verified: true
    status: 'prepared' | 'verified'
  }
  fileHashSha256: string
  manifestId: string
  createdAt: number
  originalName: string
  originalSize: number
  keyFileProtection: {
    required: boolean
    digest: 'SHA-256' | null
    embedded: false
  }
  recoverableParity: {
    enabled: boolean
    groupSize: number | null
    recoveredBlocks: number
  }
  uploadToServer: false
  note: string
}

type SyncAccessHandle = {
  write(
    buffer: ArrayBufferView,
    options?: { at?: number },
  ): number
  flush(): void
  close(): void
}

type OpfsFileHandle = {
  createSyncAccessHandle(): Promise<SyncAccessHandle>
  getFile(): Promise<File>
}

type OpfsFileSystemFileHandleConstructor = {
  prototype?: {
    createSyncAccessHandle?: unknown
  }
}

type OpfsDirectoryHandle = {
  getFileHandle(name: string, options: { create: true }): Promise<OpfsFileHandle>
  removeEntry(name: string): Promise<void>
}

type WorkerWithOpfs = DedicatedWorkerGlobalScope & {
  navigator: DedicatedWorkerGlobalScope['navigator'] & {
    storage?: StorageManager & {
      getDirectory?: () => Promise<OpfsDirectoryHandle>
    }
  }
}

class WorkerCryptoError extends Error {
  readonly code: WorkerErrorCode

  constructor(
    code: WorkerErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'WorkerCryptoError'
    this.code = code
  }
}

const workerScope = self as WorkerWithOpfs
const completedOpfsFiles = new Map<
  number,
  { root: OpfsDirectoryHandle; tempFileName: string }
>()

function postResponse(response: WorkerResponse) {
  workerScope.postMessage(response)
}

function postProgress(id: number, value: number, label: string) {
  postResponse({ id, type: 'PROGRESS', value, label })
}

function cloneBytes(source: Uint8Array) {
  const cloned = new Uint8Array(new ArrayBuffer(source.byteLength))
  cloned.set(source)
  return cloned
}

function randomBytes(length: number) {
  return crypto.getRandomValues(new Uint8Array(length))
}

function randomTempName() {
  const suffix = Array.from(randomBytes(16), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
  return `criptoveu_${suffix}.tmp`
}

function getErrorCode(error: unknown): WorkerErrorCode {
  if (error instanceof WorkerCryptoError) {
    return error.code
  }

  if (error instanceof DOMException && error.name === 'OperationError') {
    return 'INVALID_PASSWORD_OR_FILE'
  }

  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: string }).code

    if (code === 'MANIFEST_TOO_LARGE' || code === 'INTEGRITY_MISMATCH') {
      return 'INTEGRITY_FAILED'
    }

    if (code === 'INVALID_MANIFEST') {
      return 'INVALID_FILE'
    }
  }

  return 'INVALID_FILE'
}

function getErrorMessage(error: unknown) {
  return error instanceof Error && error.message
    ? error.message
    : 'Falha no processamento local do arquivo.'
}

async function getOpfsRoot() {
  const storage = workerScope.navigator.storage
  const fileHandleConstructor = (
    globalThis as typeof globalThis & {
      FileSystemFileHandle?: OpfsFileSystemFileHandleConstructor
    }
  ).FileSystemFileHandle

  if (
    !storage?.getDirectory ||
    typeof fileHandleConstructor?.prototype?.createSyncAccessHandle !== 'function'
  ) {
    throw new WorkerCryptoError(
      'OPFS_UNSUPPORTED',
      'Este navegador nao oferece o armazenamento OPFS necessario.',
    )
  }

  return storage.getDirectory()
}

function writeBytes(
  accessHandle: SyncAccessHandle,
  bytes: Uint8Array,
  offset: number,
) {
  const written = accessHandle.write(bytes, { at: offset })

  if (written !== bytes.byteLength) {
    throw new WorkerCryptoError(
      'INVALID_FILE',
      'O armazenamento local nao gravou o bloco completo.',
    )
  }

  return offset + bytes.byteLength
}

function createAsciiParameter(value: number) {
  const bytes = new TextEncoder().encode(value.toString().padStart(4, '0'))

  if (bytes.byteLength !== ARGON2_PARAMETER_LENGTH_BYTES) {
    throw new WorkerCryptoError(
      'INVALID_FILE',
      'Parametros Argon2id fora do intervalo suportado.',
    )
  }

  return bytes
}

function validateArgon2Parameters(memoryMb: number, iterations: number) {
  if (
    !Number.isInteger(memoryMb) ||
    memoryMb < ARGON2_MIN_MEMORY_MB ||
    memoryMb > ARGON2_MAX_MEMORY_MB ||
    !Number.isInteger(iterations) ||
    iterations < ARGON2_MIN_ITERATIONS ||
    iterations > ARGON2_MAX_ITERATIONS
  ) {
    throw new WorkerCryptoError(
      'INVALID_FILE',
      'Parametros Argon2id fora do intervalo suportado.',
    )
  }
}

function readAsciiParameter(bytes: Uint8Array) {
  const value = new TextDecoder().decode(bytes)

  if (!/^\d{4}$/.test(value)) {
    throw new WorkerCryptoError('INVALID_FILE', 'Cabecalho Argon2id invalido.')
  }

  return Number(value)
}

function getSignature(format: FileIntegrityFormat) {
  return new TextEncoder().encode(format)
}

function createIntegrityHeader(
  format: FileIntegrityFormat,
  memoryMb: number,
  iterations: number,
  salt: Uint8Array,
  firstIv: Uint8Array,
  chunkCount: number,
) {
  validateArgon2Parameters(memoryMb, iterations)

  const header = new Uint8Array(54)
  let offset = 0
  header.set(getSignature(format), offset)
  offset += INTEGRITY_HEADER_SIGNATURE_LENGTH_BYTES
  header.set(createAsciiParameter(memoryMb), offset)
  offset += ARGON2_PARAMETER_LENGTH_BYTES
  header.set(createAsciiParameter(iterations), offset)
  offset += ARGON2_PARAMETER_LENGTH_BYTES
  header.set(salt, offset)
  offset += SALT_LENGTH_BYTES
  header.set(firstIv, offset)
  offset += IV_LENGTH_BYTES

  const view = new DataView(header.buffer)
  view.setUint32(offset, CHUNK_SIZE_BYTES, false)
  view.setUint32(offset + CHUNK_RECORD_LENGTH_BYTES, chunkCount, false)
  return header
}

function readIntegrityHeader(header: Uint8Array) {
  if (header.byteLength !== 54) {
    throw new WorkerCryptoError('INVALID_FILE', 'Cabecalho incompleto.')
  }

  const parametersStart = INTEGRITY_HEADER_SIGNATURE_LENGTH_BYTES
  const iterationsStart = parametersStart + ARGON2_PARAMETER_LENGTH_BYTES
  const saltStart = iterationsStart + ARGON2_PARAMETER_LENGTH_BYTES
  const ivStart = saltStart + SALT_LENGTH_BYTES
  const chunkSizeStart = ivStart + IV_LENGTH_BYTES
  const view = new DataView(header.buffer, header.byteOffset, header.byteLength)
  const memoryMb = readAsciiParameter(
    header.slice(parametersStart, iterationsStart),
  )
  const iterations = readAsciiParameter(header.slice(iterationsStart, saltStart))
  const chunkSize = view.getUint32(chunkSizeStart, false)
  const chunkCount = view.getUint32(
    chunkSizeStart + CHUNK_RECORD_LENGTH_BYTES,
    false,
  )

  validateArgon2Parameters(memoryMb, iterations)

  if (chunkSize !== CHUNK_SIZE_BYTES || chunkCount < 1 || chunkCount > 0xfffffffe) {
    throw new WorkerCryptoError(
      'INVALID_FILE',
      'Cabecalho usa tamanho ou quantidade de blocos invalidos.',
    )
  }

  return {
    memoryMb,
    iterations,
    salt: header.slice(saltStart, ivStart),
    firstIv: header.slice(ivStart, chunkSizeStart),
    chunkSize,
    chunkCount,
  }
}

function deriveChunkIv(firstIv: Uint8Array, chunkIndex: number) {
  if (!Number.isSafeInteger(chunkIndex) || chunkIndex < 0 || chunkIndex > 0xffffffff) {
    throw new WorkerCryptoError('INVALID_FILE', 'Numero de blocos invalido.')
  }

  const iv = cloneBytes(firstIv)
  const view = new DataView(iv.buffer)
  const counterOffset = IV_LENGTH_BYTES - CHUNK_RECORD_LENGTH_BYTES
  view.setUint32(
    counterOffset,
    view.getUint32(counterOffset, false) ^ chunkIndex,
    false,
  )
  return iv
}

function createRecordHeader(recordType: number, ciphertextLength: number) {
  const header = new Uint8Array(INTEGRITY_RECORD_HEADER_BYTES)
  header[0] = recordType
  new DataView(header.buffer).setUint32(
    INTEGRITY_RECORD_TYPE_BYTES,
    ciphertextLength,
    false,
  )
  return header
}

function readRecordHeader(bytes: Uint8Array) {
  if (bytes.byteLength !== INTEGRITY_RECORD_HEADER_BYTES) {
    throw new WorkerCryptoError('INVALID_FILE', 'Cabecalho de registro incompleto.')
  }

  return {
    recordType: bytes[0],
    ciphertextLength: new DataView(
      bytes.buffer,
      bytes.byteOffset,
      bytes.byteLength,
    ).getUint32(INTEGRITY_RECORD_TYPE_BYTES, false),
  }
}

function assertCiphertextLength(ciphertextLength: number, maximumLength: number) {
  if (
    ciphertextLength < AES_GCM_TAG_LENGTH_BYTES ||
    ciphertextLength > maximumLength
  ) {
    throw new WorkerCryptoError('INVALID_FILE', 'Arquivo invalido ou incompleto.')
  }
}

function buildRecordAdditionalData(
  fixedHeader: Uint8Array,
  recordType: number,
  recordIndex: number,
  ciphertextLength: number,
) {
  const additionalData = new Uint8Array(
    fixedHeader.byteLength + INTEGRITY_RECORD_TYPE_BYTES + 8,
  )
  additionalData.set(fixedHeader)
  const offset = fixedHeader.byteLength
  additionalData[offset] = recordType
  const view = new DataView(additionalData.buffer)
  view.setUint32(offset + INTEGRITY_RECORD_TYPE_BYTES, recordIndex, false)
  view.setUint32(
    offset + INTEGRITY_RECORD_TYPE_BYTES + CHUNK_RECORD_LENGTH_BYTES,
    ciphertextLength,
    false,
  )
  return additionalData
}

function createXorParity(chunks: readonly Uint8Array[]) {
  const length = Math.max(...chunks.map((chunk) => chunk.byteLength))
  const parity = new Uint8Array(length)

  for (const chunk of chunks) {
    for (let index = 0; index < chunk.byteLength; index += 1) {
      parity[index] ^= chunk[index]
    }
  }

  return parity
}

function recoverXorParityChunk(
  parity: Uint8Array,
  chunks: readonly Uint8Array[],
  recoveredLength: number,
) {
  const recovered = parity.slice(0, recoveredLength)

  for (const chunk of chunks) {
    for (let index = 0; index < chunk.byteLength; index += 1) {
      recovered[index] ^= chunk[index]
    }
  }

  return recovered
}

async function calculateFileHashes(
  file: File,
  id: number,
): Promise<{
  fileHashSha256: string
  chunkHashesSha256: string[]
}> {
  const fullHasher = await createSHA256()
  const chunkHashesSha256: string[] = []
  const chunkCount = Math.max(1, Math.ceil(file.size / CHUNK_SIZE_BYTES))

  for (let chunkIndex = 0; chunkIndex < chunkCount; chunkIndex += 1) {
    const start = chunkIndex * CHUNK_SIZE_BYTES
    const end = Math.min(file.size, start + CHUNK_SIZE_BYTES)
    const chunk = new Uint8Array(
      await file.slice(start, end).arrayBuffer(),
    )
    fullHasher.update(chunk)
    chunkHashesSha256.push(await sha256(chunk))
    chunk.fill(0)
    postProgress(
      id,
      5 + Math.round(((chunkIndex + 1) / chunkCount) * 12),
      `Calculando manifesto SHA-256 (${Math.round(((chunkIndex + 1) / chunkCount) * 100)}%)`,
    )
  }

  return {
    fileHashSha256: fullHasher.digest('hex'),
    chunkHashesSha256,
  }
}

async function derivePasswordKeyFileMaterial(password: string, keyFile: File) {
  if (keyFile.size === 0 || keyFile.size > KEY_FILE_MAX_SIZE_BYTES) {
    throw new WorkerCryptoError(
      'INVALID_KEY_FILE',
      keyFile.size === 0
        ? 'O arquivo-chave nao pode estar vazio.'
        : 'O arquivo-chave excede o limite de 32 MB.',
    )
  }

  const keyFileHasher = await createSHA256()
  const chunkCount = Math.max(1, Math.ceil(keyFile.size / 1024 / 1024))

  for (let chunkIndex = 0; chunkIndex < chunkCount; chunkIndex += 1) {
    const start = chunkIndex * 1024 * 1024
    const end = Math.min(keyFile.size, start + 1024 * 1024)
    keyFileHasher.update(
      new Uint8Array(await keyFile.slice(start, end).arrayBuffer()),
    )
  }

  const keyFileHash = new Uint8Array(
    keyFileHasher.digest('binary'),
  )
  const passwordBytes = new TextEncoder().encode(password)
  const combined = new Uint8Array(
    DOMAIN_SEPARATOR.byteLength + 1 + 4 + passwordBytes.byteLength + keyFileHash.byteLength,
  )
  let offset = 0
  combined.set(DOMAIN_SEPARATOR, offset)
  offset += DOMAIN_SEPARATOR.byteLength
  combined[offset] = 0
  offset += 1
  new DataView(combined.buffer).setUint32(offset, passwordBytes.byteLength, false)
  offset += 4
  combined.set(passwordBytes, offset)
  offset += passwordBytes.byteLength
  combined.set(keyFileHash, offset)

  try {
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', combined))
    return Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('')
  } finally {
    keyFileHash.fill(0)
    passwordBytes.fill(0)
    combined.fill(0)
  }
}

async function deriveAesKey(
  password: string,
  salt: Uint8Array,
  memoryMb: number,
  iterations: number,
  usage: KeyUsage,
) {
  validateArgon2Parameters(memoryMb, iterations)

  let derivedBytes: Uint8Array<ArrayBuffer> | null = null

  try {
    const result = await argon2id({
      password,
      salt: cloneBytes(salt),
      iterations,
      parallelism: 1,
      memorySize: memoryMb * 1024,
      hashLength: 32,
      outputType: 'binary',
    })
    derivedBytes = cloneBytes(result)
    return await crypto.subtle.importKey(
      'raw',
      derivedBytes,
      'AES-GCM',
      false,
      [usage],
    )
  } catch {
    throw new WorkerCryptoError(
      'KEY_DERIVATION_FAILED',
      'Este dispositivo nao conseguiu executar o nivel Argon2id exigido pelo arquivo.',
    )
  } finally {
    derivedBytes?.fill(0)
  }
}

async function writeRecord(
  accessHandle: SyncAccessHandle,
  offset: number,
  recordType: number,
  ciphertext: Uint8Array,
) {
  const nextOffset = writeBytes(
    accessHandle,
    createRecordHeader(recordType, ciphertext.byteLength),
    offset,
  )
  return writeBytes(accessHandle, ciphertext, nextOffset)
}

function buildSecurityReport(
  operation: WorkerMode,
  format: FileIntegrityFormat,
  manifest: FileIntegrityManifest,
  recoveredBlocks: number,
): FileSecurityReport {
  const recoverable = format === 'CRIPTOVEU6'
  const keyFileRequired = format === 'CRIPTOVEU5'

  return {
    operation,
    format,
    encryption: 'AES-256-GCM',
    kdf: 'Argon2id',
    memoryMb: manifest.argon2.memoryMb,
    iterations: manifest.argon2.iterations,
    parallelism: 1,
    chunkSize: manifest.chunkSize,
    chunkCount: manifest.chunkCount,
    integrity: {
      aesGcmAuthenticated: true,
      manifestVerified: true,
      sha256Verified: true,
      status: operation === 'encrypt' ? 'prepared' : 'verified',
    },
    fileHashSha256: manifest.fileHashSha256,
    manifestId: manifest.manifestId,
    createdAt: manifest.createdAt,
    originalName: manifest.originalName,
    originalSize: manifest.originalSize,
    keyFileProtection: {
      required: keyFileRequired,
      digest: keyFileRequired ? 'SHA-256' : null,
      embedded: false,
    },
    recoverableParity: {
      enabled: recoverable,
      groupSize: recoverable ? RECOVERABLE_PARITY_GROUP_SIZE : null,
      recoveredBlocks,
    },
    uploadToServer: false,
    note:
      operation === 'encrypt'
        ? recoverable
          ? `Pacote recuperavel com paridade local gerado. Cada grupo de ${RECOVERABLE_PARITY_GROUP_SIZE} blocos pode recuperar um bloco com conteudo danificado.`
          : keyFileRequired
            ? 'Pacote com protecao dupla gerado localmente. O arquivo-chave nao foi incorporado ao pacote.'
            : 'Pacote gerado localmente e verificado estruturalmente.'
        : recoverable
          ? recoveredBlocks > 0
            ? `Paridade recuperou ${recoveredBlocks} bloco(s) e o manifesto SHA-256 foi confirmado localmente.`
            : 'Paridade recuperavel, AES-GCM, manifesto e SHA-256 verificados localmente.'
          : keyFileRequired
            ? 'Protecao dupla, manifesto e SHA-256 verificados localmente. O arquivo-chave nao estava incorporado ao pacote.'
            : 'Escudo de Integridade verificado apos a recuperacao local do conteudo.',
  }
}

async function encryptFileToOpfs(
  request: WorkerRequest,
  accessHandle: SyncAccessHandle,
) {
  const keyFile = request.options.keyFile ?? null
  const useRecoverableParity = request.options.recoverable === true

  if (useRecoverableParity && keyFile) {
    throw new WorkerCryptoError(
      'INVALID_FILE',
      'O modo recuperavel com paridade nao pode ser combinado com arquivo-chave.',
    )
  }

  const packageFormat: FileIntegrityFormat = useRecoverableParity
    ? 'CRIPTOVEU6'
    : keyFile
      ? 'CRIPTOVEU5'
      : 'CRIPTOVEU4'
  const memoryMb = request.options.argon2MemoryMb ?? 256
  const iterations = request.options.argon2Iterations ?? 2
  validateArgon2Parameters(memoryMb, iterations)
  const hashes = await calculateFileHashes(request.file, request.id)
  const salt = randomBytes(SALT_LENGTH_BYTES)
  const firstIv = randomBytes(IV_LENGTH_BYTES)
  const manifest: FileIntegrityManifest = {
    version: 1,
    format: packageFormat,
    manifestId: Array.from(randomBytes(16), (byte) =>
      byte.toString(16).padStart(2, '0'),
    ).join(''),
    createdAt: Date.now(),
    originalName: request.file.name,
    originalSize: request.file.size,
    mimeType: request.file.type || 'application/octet-stream',
    chunkSize: CHUNK_SIZE_BYTES,
    chunkCount: hashes.chunkHashesSha256.length,
    fileHashSha256: hashes.fileHashSha256,
    chunkHashesSha256: hashes.chunkHashesSha256,
    encryption: 'AES-256-GCM',
    kdf: 'Argon2id',
    hash: 'SHA-256',
    argon2: {
      memoryMb,
      iterations,
      parallelism: 1,
    },
    ...(keyFile
      ? {
          keyFileProtection: {
            required: true as const,
            digest: 'SHA-256' as const,
            embedded: false as const,
          },
        }
      : {}),
  }
  const fixedHeader = createIntegrityHeader(
    packageFormat,
    memoryMb,
    iterations,
    salt,
    firstIv,
    manifest.chunkCount,
  )
  let passwordMaterial = request.password

  if (keyFile) {
    passwordMaterial = await derivePasswordKeyFileMaterial(
      request.password,
      keyFile,
    )
  }

  postProgress(
    request.id,
    22,
    `Derivando chave Argon2id (${memoryMb} MB)`,
  )
  const key = await deriveAesKey(
    passwordMaterial,
    salt,
    memoryMb,
    iterations,
    'encrypt',
  )
  const manifestBytes = serializeFileIntegrityManifest(manifest)
  let writeOffset = writeBytes(accessHandle, fixedHeader, 0)
  const parityGroup: Uint8Array[] = []
  let processedBytes = 0

  postProgress(request.id, 26, 'Chave AES-GCM preparada')

  for (let chunkIndex = 0; chunkIndex < manifest.chunkCount; chunkIndex += 1) {
    const start = chunkIndex * CHUNK_SIZE_BYTES
    const end = Math.min(request.file.size, start + CHUNK_SIZE_BYTES)
    const plainChunk = new Uint8Array(
      await request.file.slice(start, end).arrayBuffer(),
    )
    const ciphertextLength = plainChunk.byteLength + AES_GCM_TAG_LENGTH_BYTES
    const encrypted = new Uint8Array(
      await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: deriveChunkIv(firstIv, chunkIndex),
          additionalData: buildRecordAdditionalData(
            fixedHeader,
            INTEGRITY_DATA_RECORD_TYPE,
            chunkIndex,
            ciphertextLength,
          ),
        },
        key,
        plainChunk,
      ),
    )
    plainChunk.fill(0)
    writeOffset = await writeRecord(
      accessHandle,
      writeOffset,
      INTEGRITY_DATA_RECORD_TYPE,
      encrypted,
    )

    if (useRecoverableParity) {
      parityGroup.push(encrypted)

      if (
        parityGroup.length === RECOVERABLE_PARITY_GROUP_SIZE ||
        chunkIndex + 1 === manifest.chunkCount
      ) {
        const parity = createXorParity(parityGroup)
        writeOffset = await writeRecord(
          accessHandle,
          writeOffset,
          RECOVERABLE_PARITY_RECORD_TYPE,
          parity,
        )
        parity.fill(0)
        for (const groupChunk of parityGroup) {
          groupChunk.fill(0)
        }
        parityGroup.length = 0
      }
    } else {
      encrypted.fill(0)
    }

    processedBytes += end - start
    postProgress(
      request.id,
      Math.min(
        88,
        26 +
          Math.round((processedBytes / Math.max(request.file.size, 1)) * 62),
      ),
      `Protegendo bloco ${chunkIndex + 1}`,
    )
  }

  const manifestCiphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: deriveChunkIv(firstIv, manifest.chunkCount),
        additionalData: buildRecordAdditionalData(
          fixedHeader,
          INTEGRITY_MANIFEST_RECORD_TYPE,
          manifest.chunkCount,
          manifestBytes.byteLength + AES_GCM_TAG_LENGTH_BYTES,
        ),
      },
      key,
      manifestBytes,
    ),
  )
  manifestBytes.fill(0)
  writeOffset = await writeRecord(
    accessHandle,
    writeOffset,
    INTEGRITY_MANIFEST_RECORD_TYPE,
    manifestCiphertext,
  )
  manifestCiphertext.fill(0)
  void writeOffset

  postProgress(request.id, 98, 'Escudo de Integridade preparado')

  return {
    downloadName: `${request.file.name}.criptoveu`,
    mimeType: 'application/octet-stream',
    securityReport: buildSecurityReport('encrypt', packageFormat, manifest, 0),
  }
}

async function readRecord(file: File, offset: number) {
  if (file.size - offset < INTEGRITY_RECORD_HEADER_BYTES) {
    throw new WorkerCryptoError('INVALID_FILE', 'Registro incompleto.')
  }

  const recordHeader = readRecordHeader(
    new Uint8Array(
      await file
        .slice(offset, offset + INTEGRITY_RECORD_HEADER_BYTES)
        .arrayBuffer(),
    ),
  )
  const ciphertextStart = offset + INTEGRITY_RECORD_HEADER_BYTES
  const recordEnd = ciphertextStart + recordHeader.ciphertextLength

  if (recordEnd > file.size) {
    throw new WorkerCryptoError(
      'INVALID_FILE',
      'O pacote termina antes do fim de um registro declarado.',
    )
  }

  return {
    ...recordHeader,
    ciphertext: new Uint8Array(
      await file.slice(ciphertextStart, recordEnd).arrayBuffer(),
    ),
    end: recordEnd,
  }
}

async function decryptFileToOpfs(
  request: WorkerRequest,
  accessHandle: SyncAccessHandle,
) {
  const header = new Uint8Array(
    await request.file.slice(0, 54).arrayBuffer(),
  )

  if (header.byteLength !== 54) {
    throw new WorkerCryptoError('INVALID_FILE', 'Pacote sem cabecalho completo.')
  }

  const format = new TextDecoder().decode(
    header.slice(0, INTEGRITY_HEADER_SIGNATURE_LENGTH_BYTES),
  ) as FileIntegrityFormat

  if (format !== 'CRIPTOVEU4' && format !== 'CRIPTOVEU5' && format !== 'CRIPTOVEU6') {
    throw new WorkerCryptoError('INVALID_FILE', 'Formato OPFS nao reconhecido.')
  }

  const parsedHeader = readIntegrityHeader(header)
  const keyFile = request.options.keyFile ?? null

  if (format === 'CRIPTOVEU5' && !keyFile) {
    throw new WorkerCryptoError(
      'KEY_FILE_REQUIRED',
      'Este pacote exige o arquivo-chave original alem da senha.',
    )
  }

  let passwordMaterial = request.password
  if (format === 'CRIPTOVEU5' && keyFile) {
    passwordMaterial = await derivePasswordKeyFileMaterial(
      request.password,
      keyFile,
    )
  }

  postProgress(
    request.id,
    format === 'CRIPTOVEU5' ? 17 : 10,
    `Derivando chave Argon2id (${parsedHeader.memoryMb} MB)`,
  )
  const key = await deriveAesKey(
    passwordMaterial,
    parsedHeader.salt,
    parsedHeader.memoryMb,
    parsedHeader.iterations,
    'decrypt',
  )
  postProgress(request.id, format === 'CRIPTOVEU5' ? 22 : 16, 'Chave AES-GCM preparada')

  const fullHasher = await createSHA256()
  const chunkHashesSha256: string[] = []
  let offset = 54
  let dataChunkIndex = 0
  let decryptedSize = 0
  let writeOffset = 0
  let recoveredBlocks = 0
  const recoverableGroup: Array<{
    ciphertext: Uint8Array
    ciphertextLength: number
    recordIndex: number
  }> = []

  async function decryptRecord(
    recordType: number,
    ciphertext: Uint8Array,
    ciphertextLength: number,
    recordIndex: number,
  ) {
    try {
      return new Uint8Array(
        await crypto.subtle.decrypt(
          {
            name: 'AES-GCM',
            iv: deriveChunkIv(parsedHeader.firstIv, recordIndex),
            additionalData: buildRecordAdditionalData(
              header,
              recordType,
              recordIndex,
              ciphertextLength,
            ),
          },
          key,
          cloneBytes(ciphertext),
        ),
      )
    } catch (error) {
      if (error instanceof DOMException && error.name === 'OperationError') {
        throw new WorkerCryptoError(
          'INVALID_PASSWORD_OR_FILE',
          format === 'CRIPTOVEU5'
            ? 'Senha ou arquivo-chave incorreto, ou pacote adulterado.'
            : format === 'CRIPTOVEU6'
              ? 'Senha incorreta ou pacote recuperavel adulterado alem da capacidade de paridade.'
              : 'Senha incorreta ou pacote CRIPTOVEU4 adulterado.',
        )
      }

      throw error
    }
  }

  async function writeDecryptedChunk(chunk: Uint8Array) {
    fullHasher.update(chunk)
    chunkHashesSha256.push(await sha256(chunk))
    writeOffset = writeBytes(accessHandle, chunk, writeOffset)
    decryptedSize += chunk.byteLength
    chunk.fill(0)
  }

  async function decryptRecoverableGroup(parity: Uint8Array) {
    const decryptedGroup: Uint8Array[] = []
    let failedIndex = -1
    let failedError: unknown = null

    for (const [index, record] of recoverableGroup.entries()) {
      try {
        decryptedGroup[index] = await decryptRecord(
          INTEGRITY_DATA_RECORD_TYPE,
          record.ciphertext,
          record.ciphertextLength,
          record.recordIndex,
        )
      } catch (error) {
        if (failedIndex !== -1) {
          throw failedError ?? error
        }

        failedIndex = index
        failedError = error
      }
    }

    if (failedIndex !== -1) {
      const failedRecord = recoverableGroup[failedIndex]
      const recoveredCiphertext = recoverXorParityChunk(
        parity,
        recoverableGroup
          .filter((_, index) => index !== failedIndex)
          .map((record) => record.ciphertext),
        failedRecord.ciphertextLength,
      )
      decryptedGroup[failedIndex] = await decryptRecord(
        INTEGRITY_DATA_RECORD_TYPE,
        recoveredCiphertext,
        failedRecord.ciphertextLength,
        failedRecord.recordIndex,
      )
      recoveredBlocks += 1
      recoveredCiphertext.fill(0)
    }

    for (const decrypted of decryptedGroup) {
      await writeDecryptedChunk(decrypted)
    }

    for (const record of recoverableGroup) {
      record.ciphertext.fill(0)
    }
    recoverableGroup.length = 0
  }

  while (dataChunkIndex < parsedHeader.chunkCount) {
    const record = await readRecord(request.file, offset)
    const maximumLength = parsedHeader.chunkSize + AES_GCM_TAG_LENGTH_BYTES
    assertCiphertextLength(record.ciphertextLength, maximumLength)

    if (
      record.recordType !== INTEGRITY_DATA_RECORD_TYPE ||
      (format === 'CRIPTOVEU6' && recoverableGroup.length > 0 &&
        recoverableGroup.length === RECOVERABLE_PARITY_GROUP_SIZE)
    ) {
      throw new WorkerCryptoError('INVALID_FILE', 'A ordem dos registros de dados e invalida.')
    }

    if (format === 'CRIPTOVEU6') {
      recoverableGroup.push({
        ciphertext: record.ciphertext,
        ciphertextLength: record.ciphertextLength,
        recordIndex: dataChunkIndex,
      })
    } else {
      const decrypted = await decryptRecord(
        record.recordType,
        record.ciphertext,
        record.ciphertextLength,
        dataChunkIndex,
      )
      await writeDecryptedChunk(decrypted)
      record.ciphertext.fill(0)
    }

    dataChunkIndex += 1
    offset = record.end

    if (
      format === 'CRIPTOVEU6' &&
      (recoverableGroup.length === RECOVERABLE_PARITY_GROUP_SIZE ||
        dataChunkIndex === parsedHeader.chunkCount)
    ) {
      const parityRecord = await readRecord(request.file, offset)
      assertCiphertextLength(
        parityRecord.ciphertextLength,
        parsedHeader.chunkSize + AES_GCM_TAG_LENGTH_BYTES,
      )
      if (parityRecord.recordType !== RECOVERABLE_PARITY_RECORD_TYPE) {
        throw new WorkerCryptoError(
          'INVALID_FILE',
          'O registro de paridade recuperavel esta ausente ou fora de posicao.',
        )
      }
      await decryptRecoverableGroup(parityRecord.ciphertext)
      parityRecord.ciphertext.fill(0)
      offset = parityRecord.end
    }

    postProgress(
      request.id,
      Math.min(88, 16 + Math.round((offset / request.file.size) * 72)),
      `Abrindo bloco ${dataChunkIndex}`,
    )
  }

  if (recoverableGroup.length > 0) {
    throw new WorkerCryptoError('INVALID_FILE', 'Grupo de paridade incompleto.')
  }

  const manifestRecord = await readRecord(request.file, offset)
  if (
    manifestRecord.recordType !== INTEGRITY_MANIFEST_RECORD_TYPE ||
    manifestRecord.end !== request.file.size
  ) {
    throw new WorkerCryptoError(
      'INVALID_FILE',
      'O registro final do manifesto esta ausente ou fora de posicao.',
    )
  }
  assertCiphertextLength(
    manifestRecord.ciphertextLength,
    MAX_FILE_INTEGRITY_MANIFEST_BYTES + AES_GCM_TAG_LENGTH_BYTES,
  )
  const decryptedManifest = await decryptRecord(
    manifestRecord.recordType,
    manifestRecord.ciphertext,
    manifestRecord.ciphertextLength,
    parsedHeader.chunkCount,
  )
  const manifest = parseFileIntegrityManifest(decryptedManifest)
  decryptedManifest.fill(0)
  manifestRecord.ciphertext.fill(0)

  if (
    manifest.format !== format ||
    manifest.chunkSize !== parsedHeader.chunkSize ||
    manifest.chunkCount !== parsedHeader.chunkCount ||
    manifest.originalSize !== decryptedSize ||
    manifest.argon2.memoryMb !== parsedHeader.memoryMb ||
    manifest.argon2.iterations !== parsedHeader.iterations
  ) {
    throw new WorkerCryptoError(
      'INTEGRITY_FAILED',
      'O manifesto nao confere com o cabecalho ou o conteudo recuperado.',
    )
  }

  const hashes = {
    fileHashSha256: fullHasher.digest('hex'),
    chunkHashesSha256,
  }
  assertIntegrityHashes(manifest, hashes)
  postProgress(request.id, 99, 'Manifesto e SHA-256 verificados')

  return {
    downloadName: manifest.originalName,
    mimeType: manifest.mimeType,
    securityReport: buildSecurityReport(
      'decrypt',
      format,
      manifest,
      recoveredBlocks,
    ),
  }
}

async function handleRequest(request: WorkerRequest) {
  const root = await getOpfsRoot()
  const tempFileName = randomTempName()
  const tempFileHandle = await root.getFileHandle(tempFileName, { create: true })
  let accessHandle: SyncAccessHandle | null = null
  let keepTemporaryFile = false

  try {
    accessHandle = await tempFileHandle.createSyncAccessHandle()
    const result =
      request.mode === 'encrypt'
        ? await encryptFileToOpfs(request, accessHandle)
        : await decryptFileToOpfs(request, accessHandle)
    accessHandle.flush()
    accessHandle.close()
    accessHandle = null
    const storedFile = await tempFileHandle.getFile()
    const resultFile = new File([storedFile], result.downloadName, {
      type: result.mimeType,
    })

    completedOpfsFiles.set(request.id, { root, tempFileName })
    keepTemporaryFile = true
    postResponse({
      id: request.id,
      type: 'SUCCESS',
      resultFile,
      downloadName: result.downloadName,
      securityReport: result.securityReport,
      tempFileName,
    })
  } finally {
    if (accessHandle) {
      accessHandle.close()
    }
    if (!keepTemporaryFile) {
      await root.removeEntry(tempFileName).catch(() => undefined)
    }
  }
}

async function cleanupTemporaryFile(request: CleanupRequest) {
  const completedFile = completedOpfsFiles.get(request.id)

  if (completedFile?.tempFileName === request.tempFileName) {
    await completedFile.root
      .removeEntry(completedFile.tempFileName)
      .catch(() => undefined)
    completedOpfsFiles.delete(request.id)
  }

  postResponse({ id: request.id, type: 'CLEANUP_DONE' })
}

workerScope.onmessage = (event: MessageEvent<WorkerRequest | CleanupRequest>) => {
  if ('type' in event.data) {
    void cleanupTemporaryFile(event.data)
    return
  }

  void handleRequest(event.data).catch((error: unknown) => {
    postResponse({
      id: event.data.id,
      type: 'ERROR',
      code: getErrorCode(error),
      message: getErrorMessage(error),
    })
  })
}

export {}