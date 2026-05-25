const LEGACY_FILE_HEADER_TEXT = 'CRIPTIFY1'
import argon2WorkerUrl from '../workers/argon2.worker.ts?worker&url'

const LEGACY_CHUNKED_FILE_HEADER_TEXT = 'CRIPTIFY2'
const PBKDF2_CHUNKED_FILE_HEADER_TEXT = 'CRIPTOVEU2'
const ARGON2_CHUNKED_FILE_HEADER_TEXT = 'CRIPTOVEU3'
const LEGACY_FILE_HEADER_BYTES = new TextEncoder().encode(LEGACY_FILE_HEADER_TEXT)
const LEGACY_CHUNKED_FILE_HEADER_BYTES = new TextEncoder().encode(
  LEGACY_CHUNKED_FILE_HEADER_TEXT,
)
const PBKDF2_CHUNKED_FILE_HEADER_BYTES = new TextEncoder().encode(
  PBKDF2_CHUNKED_FILE_HEADER_TEXT,
)
const ARGON2_CHUNKED_FILE_HEADER_BYTES = new TextEncoder().encode(
  ARGON2_CHUNKED_FILE_HEADER_TEXT,
)
const SALT_LENGTH_BYTES = 16
const IV_LENGTH_BYTES = 12
const PBKDF2_ITERATIONS = 600_000
const BASE64_CHUNK_SIZE_BYTES = 0x8000
const CHUNK_RECORD_LENGTH_BYTES = 4
const ARGON2_PARAMETER_LENGTH_BYTES = 4
const ARGON2_MIN_MEMORY_MB = 8
const ARGON2_MAX_MEMORY_MB = 512
const ARGON2_MIN_ITERATIONS = 1
const ARGON2_MAX_ITERATIONS = 10
const AES_GCM_TAG_LENGTH_BYTES = 16
const ARGON2_HEADER_LENGTH_BYTES =
  ARGON2_CHUNKED_FILE_HEADER_BYTES.length +
  ARGON2_PARAMETER_LENGTH_BYTES * 2 +
  SALT_LENGTH_BYTES +
  IV_LENGTH_BYTES
export const ARGON2_FILE_ITERATIONS = 2
export const STREAMING_CHUNK_SIZE_BYTES = 2 * 1024 * 1024
export const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024 * 1024

type ProgressCallback = (value: number, label: string) => void

export type FileSizeGuardOptions = {
  maxFileSizeBytes?: number | null
}

export const FILE_SECURITY_PROFILES = [
  {
    id: 'seguranca_basica',
    memoryMb: 64,
    label: 'Nível de Segurança Básica',
    description:
      'Ideal para celulares básicos. Processamento muito rápido. Oferece excelente proteção para o dia a dia, mas possui menor resistência contra ataques físicos de força bruta focados em hardware.',
  },
  {
    id: 'seguranca_media',
    memoryMb: 256,
    label: 'Nível de Segurança Média (Recomendado)',
    description:
      'O ponto de equilíbrio. Roda na maioria dos smartphones modernos e computadores e aumenta bastante o custo de tentativas paralelas.',
  },
  {
    id: 'seguranca_alta',
    memoryMb: 512,
    label: 'Nível de Segurança Alta',
    description:
      'Exige muita memória e é recomendado para computadores. Pode falhar ou causar lentidão em celulares.',
  },
] as const

export type FileSecurityProfileId = (typeof FILE_SECURITY_PROFILES)[number]['id']

export const DEFAULT_FILE_SECURITY_PROFILE_ID: FileSecurityProfileId =
  'seguranca_media'

export type FileEncryptionOptions = FileSizeGuardOptions & {
  argon2MemoryMb?: number
  argon2Iterations?: number
}

type Argon2Parameters = {
  memoryMb: number
  iterations: number
}

type PasswordStrength = {
  level: number
  label: string
  barClass: string
  textClass: string
}

export type ProcessResult = {
  blob: Blob
  downloadName: string
}

export type TextEncryptionResult = {
  ciphertext: string
  iv: Uint8Array<ArrayBuffer>
  salt: Uint8Array<ArrayBuffer>
}

export type TextDecryptionInput = {
  ciphertext: string
  iv: Uint8Array<ArrayBuffer>
  salt: Uint8Array<ArrayBuffer>
}

export class CriptoveuError extends Error {
  code:
    | 'FILE_TOO_LARGE'
    | 'INVALID_FILE'
    | 'INVALID_PASSWORD_OR_FILE'
    | 'KEY_DERIVATION_FAILED'

  constructor(
    code:
      | 'FILE_TOO_LARGE'
      | 'INVALID_FILE'
      | 'INVALID_PASSWORD_OR_FILE'
      | 'KEY_DERIVATION_FAILED',
    message: string,
  ) {
    super(message)
    this.name = 'CriptoveuError'
    this.code = code
  }
}

function waitForPaint() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve())
  })
}

function cloneBytes(source: Uint8Array): Uint8Array<ArrayBuffer> {
  const cloned = new Uint8Array(new ArrayBuffer(source.length))
  cloned.set(source)
  return cloned
}

function randomBytes(length: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(length))
}

function buildChunkAdditionalData(
  chunkIndex: number,
  headerText = PBKDF2_CHUNKED_FILE_HEADER_TEXT,
) {
  return new TextEncoder().encode(`${headerText}:${chunkIndex}`)
}

function buildArgon2ChunkAdditionalData(
  fixedHeader: Uint8Array,
  chunkIndex: number,
  ciphertextLength: number,
  isFinalChunk: boolean,
) {
  const additionalData = new Uint8Array(
    fixedHeader.length + CHUNK_RECORD_LENGTH_BYTES * 2 + 1,
  )
  additionalData.set(fixedHeader)
  const view = new DataView(additionalData.buffer)
  view.setUint32(fixedHeader.length, chunkIndex, false)
  view.setUint32(
    fixedHeader.length + CHUNK_RECORD_LENGTH_BYTES,
    ciphertextLength,
    false,
  )
  additionalData[additionalData.length - 1] = isFinalChunk ? 1 : 0
  return additionalData
}

function createLengthPrefix(value: number) {
  const bytes = new Uint8Array(CHUNK_RECORD_LENGTH_BYTES)
  new DataView(bytes.buffer).setUint32(0, value, false)
  return bytes
}

function readLengthPrefix(bytes: Uint8Array) {
  return new DataView(bytes.buffer, bytes.byteOffset, CHUNK_RECORD_LENGTH_BYTES)
    .getUint32(0, false)
}

function assertChunkCiphertextLength(
  ciphertextLength: number,
  maximumLength: number | null = STREAMING_CHUNK_SIZE_BYTES + AES_GCM_TAG_LENGTH_BYTES,
) {
  if (
    ciphertextLength < AES_GCM_TAG_LENGTH_BYTES ||
    (maximumLength !== null && ciphertextLength > maximumLength)
  ) {
    throw new CriptoveuError('INVALID_FILE', 'Arquivo inválido ou incompleto.')
  }
}

function createAsciiParameter(value: number) {
  const encoded = new TextEncoder().encode(
    value.toString().padStart(ARGON2_PARAMETER_LENGTH_BYTES, '0'),
  )

  if (encoded.length !== ARGON2_PARAMETER_LENGTH_BYTES) {
    throw new CriptoveuError(
      'INVALID_FILE',
      'Parâmetros Argon2id fora do intervalo suportado.',
    )
  }

  return encoded
}

function readAsciiParameter(bytes: Uint8Array) {
  const text = new TextDecoder().decode(bytes)

  if (!/^\d{4}$/.test(text)) {
    throw new CriptoveuError('INVALID_FILE', 'Cabeçalho Argon2id inválido.')
  }

  return Number(text)
}

function validateArgon2Parameters(parameters: Argon2Parameters) {
  if (
    !Number.isInteger(parameters.memoryMb) ||
    parameters.memoryMb < ARGON2_MIN_MEMORY_MB ||
    parameters.memoryMb > ARGON2_MAX_MEMORY_MB ||
    !Number.isInteger(parameters.iterations) ||
    parameters.iterations < ARGON2_MIN_ITERATIONS ||
    parameters.iterations > ARGON2_MAX_ITERATIONS
  ) {
    throw new CriptoveuError(
      'INVALID_FILE',
      'Parâmetros Argon2id fora do intervalo suportado.',
    )
  }

  return parameters
}

function buildArgon2Header(
  parameters: Argon2Parameters,
  salt: Uint8Array,
  firstIv: Uint8Array,
) {
  validateArgon2Parameters(parameters)
  const header = new Uint8Array(ARGON2_HEADER_LENGTH_BYTES)
  let offset = 0

  header.set(ARGON2_CHUNKED_FILE_HEADER_BYTES, offset)
  offset += ARGON2_CHUNKED_FILE_HEADER_BYTES.length
  header.set(createAsciiParameter(parameters.memoryMb), offset)
  offset += ARGON2_PARAMETER_LENGTH_BYTES
  header.set(createAsciiParameter(parameters.iterations), offset)
  offset += ARGON2_PARAMETER_LENGTH_BYTES
  header.set(salt, offset)
  offset += SALT_LENGTH_BYTES
  header.set(firstIv, offset)

  return header
}

function readArgon2Header(header: Uint8Array) {
  const parametersStart = ARGON2_CHUNKED_FILE_HEADER_BYTES.length
  const iterationsStart = parametersStart + ARGON2_PARAMETER_LENGTH_BYTES
  const saltStart = iterationsStart + ARGON2_PARAMETER_LENGTH_BYTES
  const ivStart = saltStart + SALT_LENGTH_BYTES

  const parameters = validateArgon2Parameters({
    memoryMb: readAsciiParameter(
      header.slice(parametersStart, iterationsStart),
    ),
    iterations: readAsciiParameter(header.slice(iterationsStart, saltStart)),
  })

  return {
    parameters,
    salt: header.slice(saltStart, ivStart),
    firstIv: header.slice(ivStart, ivStart + IV_LENGTH_BYTES),
  }
}

function deriveChunkIv(firstIv: Uint8Array, chunkIndex: number) {
  if (!Number.isSafeInteger(chunkIndex) || chunkIndex < 0 || chunkIndex > 0xffffffff) {
    throw new CriptoveuError('INVALID_FILE', 'Número de blocos inválido.')
  }

  const iv = cloneBytes(firstIv)
  const view = new DataView(iv.buffer)
  const counterOffset = IV_LENGTH_BYTES - CHUNK_RECORD_LENGTH_BYTES
  const initialCounter = view.getUint32(counterOffset, false)
  view.setUint32(counterOffset, initialCounter ^ chunkIndex, false)
  return iv
}

function concatBytes(
  first: Uint8Array,
  second: Uint8Array,
): Uint8Array<ArrayBuffer> {
  if (first.length === 0) {
    return cloneBytes(second)
  }

  if (second.length === 0) {
    return cloneBytes(first)
  }

  const combined = new Uint8Array(first.length + second.length)
  combined.set(first, 0)
  combined.set(second, first.length)
  return combined
}

function createFixedSizeChunkStream(chunkSize: number) {
  let pendingBytes = new Uint8Array(0)

  return new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      const combinedBytes = concatBytes(pendingBytes, chunk)
      let offset = 0

      while (combinedBytes.length - offset >= chunkSize) {
        controller.enqueue(combinedBytes.slice(offset, offset + chunkSize))
        offset += chunkSize
      }

      pendingBytes = combinedBytes.slice(offset)
    },
    flush(controller) {
      if (pendingBytes.length > 0) {
        controller.enqueue(pendingBytes)
      }
    },
  })
}

export function encodeBytesToBase64(bytes: Uint8Array) {
  let binary = ''

  for (let index = 0; index < bytes.length; index += BASE64_CHUNK_SIZE_BYTES) {
    const chunk = bytes.subarray(index, index + BASE64_CHUNK_SIZE_BYTES)
    binary += String.fromCharCode(...chunk)
  }

  return btoa(binary)
}

export function decodeBase64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const normalized = atob(value)
  const bytes = new Uint8Array(new ArrayBuffer(normalized.length))

  for (let index = 0; index < normalized.length; index += 1) {
    bytes[index] = normalized.charCodeAt(index)
  }

  return bytes
}

async function reportProgress(
  onProgress: ProgressCallback | undefined,
  value: number,
  label: string,
) {
  onProgress?.(value, label)
  await waitForPaint()
}

type Argon2WorkerResponse =
  | {
      id: number
      keyBytes: ArrayBuffer
    }
  | {
      id: number
      error: string
    }

let argon2RequestId = 0
let trustedArgon2WorkerUrl: string | null = null

type TrustedTypesFactory = {
  createPolicy: (
    policyName: string,
    rules: { createScriptURL: (url: string) => string },
  ) => {
    createScriptURL: (url: string) => string
  }
}

function createArgon2Worker() {
  const trustedTypes = (
    globalThis as typeof globalThis & { trustedTypes?: TrustedTypesFactory }
  ).trustedTypes

  if (trustedTypes && trustedArgon2WorkerUrl === null) {
    const policy = trustedTypes.createPolicy('criptoveu-argon2-worker', {
      createScriptURL: (url) => url,
    })
    trustedArgon2WorkerUrl = policy.createScriptURL(argon2WorkerUrl)
  }

  return new Worker(trustedArgon2WorkerUrl ?? argon2WorkerUrl, {
    type: 'module',
  })
}

async function deriveArgon2AesKey(
  password: string,
  salt: Uint8Array,
  parameters: Argon2Parameters,
  usage: KeyUsage,
) {
  validateArgon2Parameters(parameters)
  const requestId = (argon2RequestId += 1)
  const keyBytes = await new Promise<ArrayBuffer>((resolve, reject) => {
    const worker = createArgon2Worker()

    worker.onmessage = (event: MessageEvent<Argon2WorkerResponse>) => {
      if (event.data.id !== requestId) {
        return
      }

      worker.terminate()

      if ('error' in event.data) {
        reject(new Error(event.data.error))
        return
      }

      resolve(event.data.keyBytes)
    }

    worker.onerror = () => {
      worker.terminate()
      reject(new Error('Falha ao carregar o motor Argon2id.'))
    }

    worker.postMessage({
      id: requestId,
      password,
      salt: cloneBytes(salt).buffer,
      memorySizeKiB: parameters.memoryMb * 1024,
      iterations: parameters.iterations,
    })
  }).catch(() => {
    throw new CriptoveuError(
      'KEY_DERIVATION_FAILED',
      'Este dispositivo não conseguiu executar o nível Argon2id exigido pelo arquivo.',
    )
  })

  try {
    return await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, [usage])
  } finally {
    new Uint8Array(keyBytes).fill(0)
  }
}

async function derivePbkdf2AesKey(
  password: string,
  salt: Uint8Array,
  usage: KeyUsage,
) {
  const passwordBytes = new TextEncoder().encode(password)
  const normalizedSalt = cloneBytes(salt)
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBytes,
    'PBKDF2',
    false,
    ['deriveKey'],
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: normalizedSalt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    [usage],
  )
}

function buildDownloadName(mode: 'encrypt' | 'decrypt', fileName: string) {
  if (mode === 'encrypt') {
    return `${fileName}.criptoveu`
  }

  if (fileName.endsWith('.criptoveu')) {
    return fileName.slice(0, -'.criptoveu'.length)
  }

  if (fileName.endsWith('.cryptify')) {
    return fileName.slice(0, -'.cryptify'.length)
  }

  return `${fileName}.decrypted`
}

function inferMimeTypeFromName(fileName: string) {
  const extension = fileName.toLowerCase().split('.').pop()

  if (!extension) {
    return ''
  }

  const mimeByExtension: Record<string, string> = {
    aac: 'audio/aac',
    avi: 'video/x-msvideo',
    flac: 'audio/flac',
    gif: 'image/gif',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    json: 'application/json',
    m4a: 'audio/mp4',
    markdown: 'text/markdown',
    md: 'text/markdown',
    mov: 'video/quicktime',
    mp3: 'audio/mpeg',
    mp4: 'video/mp4',
    oga: 'audio/ogg',
    ogg: 'audio/ogg',
    ogv: 'video/ogg',
    pdf: 'application/pdf',
    png: 'image/png',
    svg: 'image/svg+xml',
    txt: 'text/plain',
    wav: 'audio/wav',
    webm: 'video/webm',
    webp: 'image/webp',
  }

  return mimeByExtension[extension] ?? ''
}

export function assertSupportedFileSize(
  file: File,
  { maxFileSizeBytes = MAX_FILE_SIZE_BYTES }: FileSizeGuardOptions = {},
) {
  if (maxFileSizeBytes === null) {
    return
  }

  if (file.size > maxFileSizeBytes) {
    throw new CriptoveuError(
      'FILE_TOO_LARGE',
      `Arquivo excede o limite suportado de ${formatFileSize(maxFileSizeBytes)}.`,
    )
  }
}

export async function encryptFile(
  file: File,
  password: string,
  onProgress?: ProgressCallback,
  options?: FileEncryptionOptions,
): Promise<ProcessResult> {
  assertSupportedFileSize(file, options)
  await reportProgress(onProgress, 8, 'Preparando leitura por blocos')
  const salt = randomBytes(SALT_LENGTH_BYTES)
  const firstIv = randomBytes(IV_LENGTH_BYTES)
  const parameters = validateArgon2Parameters({
    memoryMb: options?.argon2MemoryMb ?? 256,
    iterations: options?.argon2Iterations ?? ARGON2_FILE_ITERATIONS,
  })
  const fixedHeader = buildArgon2Header(parameters, salt, firstIv)
  await reportProgress(
    onProgress,
    12,
    `Derivando chave Argon2id (${parameters.memoryMb} MB)`,
  )
  const key = await deriveArgon2AesKey(password, salt, parameters, 'encrypt')
  const encryptedParts: BlobPart[] = [fixedHeader]
  let processedBytes = 0
  let chunkIndex = 0

  await reportProgress(onProgress, 16, 'Chave AES-GCM preparada')

  async function encryptChunk(plainChunk: Uint8Array) {
    const iv = deriveChunkIv(firstIv, chunkIndex)
    const ciphertextLength = plainChunk.byteLength + AES_GCM_TAG_LENGTH_BYTES
    const isFinalChunk = processedBytes + plainChunk.byteLength === file.size
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
        additionalData: buildArgon2ChunkAdditionalData(
          fixedHeader,
          chunkIndex,
          ciphertextLength,
          isFinalChunk,
        ),
      },
      key,
      cloneBytes(plainChunk),
    )
    const ciphertext = new Uint8Array(encrypted)

    encryptedParts.push(createLengthPrefix(ciphertext.byteLength), ciphertext)
    processedBytes += plainChunk.byteLength
    chunkIndex += 1

    const progressBase = file.size === 0 ? 1 : processedBytes / file.size
    await reportProgress(
      onProgress,
      Math.min(92, 16 + Math.round(progressBase * 76)),
      `Protegendo bloco ${chunkIndex}`,
    )
  }

  if (file.size === 0) {
    await encryptChunk(new Uint8Array(0))
  } else {
    await file
      .stream()
      .pipeThrough(createFixedSizeChunkStream(STREAMING_CHUNK_SIZE_BYTES))
      .pipeTo(
        new WritableStream<Uint8Array>({
          write: encryptChunk,
        }),
      )
  }

  await reportProgress(
    onProgress,
    96,
    `Finalizando ${chunkIndex} bloco(s) protegido(s)`,
  )

  return {
    blob: new Blob(encryptedParts, { type: 'application/octet-stream' }),
    downloadName: buildDownloadName('encrypt', file.name),
  }
}

export async function encryptText(
  plainText: string,
  password: string,
): Promise<TextEncryptionResult> {
  const normalizedText = plainText.trim()

  if (!normalizedText) {
    throw new CriptoveuError(
      'INVALID_FILE',
      'Digite um texto antes de proteger a mensagem.',
    )
  }

  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH_BYTES))
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH_BYTES))
  const key = await derivePbkdf2AesKey(password, salt, 'encrypt')
  const source = new TextEncoder().encode(normalizedText)
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, source)

  return {
    ciphertext: encodeBytesToBase64(new Uint8Array(encrypted)),
    iv,
    salt,
  }
}

export async function decryptText(
  encryptedInput: TextDecryptionInput,
  password: string,
): Promise<string> {
  try {
    const key = await derivePbkdf2AesKey(password, encryptedInput.salt, 'decrypt')
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: cloneBytes(encryptedInput.iv) },
      key,
      decodeBase64ToBytes(encryptedInput.ciphertext),
    )

    return new TextDecoder().decode(decrypted)
  } catch (error) {
    if (error instanceof DOMException && error.name === 'OperationError') {
      throw new CriptoveuError(
        'INVALID_PASSWORD_OR_FILE',
        'Senha incorreta ou mensagem inválida. Verifique a senha e tente novamente.',
      )
    }

    throw error
  }
}

async function decryptLegacyFile(
  file: File,
  password: string,
  onProgress?: ProgressCallback,
): Promise<ProcessResult> {
  await reportProgress(onProgress, 10, 'Lendo arquivo')
  const source = new Uint8Array(await file.arrayBuffer())

  if (
    source.byteLength <=
    LEGACY_FILE_HEADER_BYTES.length + SALT_LENGTH_BYTES + IV_LENGTH_BYTES
  ) {
    throw new CriptoveuError('INVALID_FILE', 'Arquivo inválido ou incompleto.')
  }

  const incomingHeader = new TextDecoder().decode(
    source.slice(0, LEGACY_FILE_HEADER_BYTES.length),
  )

  if (incomingHeader !== LEGACY_FILE_HEADER_TEXT) {
    throw new CriptoveuError(
      'INVALID_FILE',
      'Arquivo inválido. Não foi possível reconhecer este pacote protegido.',
    )
  }

  const salt = source.slice(
    LEGACY_FILE_HEADER_BYTES.length,
    LEGACY_FILE_HEADER_BYTES.length + SALT_LENGTH_BYTES,
  )
  const iv = source.slice(
    LEGACY_FILE_HEADER_BYTES.length + SALT_LENGTH_BYTES,
    LEGACY_FILE_HEADER_BYTES.length + SALT_LENGTH_BYTES + IV_LENGTH_BYTES,
  )
  const encrypted = source.slice(
    LEGACY_FILE_HEADER_BYTES.length + SALT_LENGTH_BYTES + IV_LENGTH_BYTES,
  )

  await reportProgress(onProgress, 36, 'Preparando recuperação')
  const key = await derivePbkdf2AesKey(password, new Uint8Array(salt), 'decrypt')

  await reportProgress(onProgress, 76, 'Abrindo conteúdo protegido')

  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv) },
      key,
      encrypted,
    )

    const downloadName = buildDownloadName('decrypt', file.name)

    return {
      blob: new Blob([decrypted], { type: inferMimeTypeFromName(downloadName) }),
      downloadName,
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'OperationError') {
      throw new CriptoveuError(
        'INVALID_PASSWORD_OR_FILE',
        'Senha incorreta ou arquivo inválido. Verifique a chave e tente novamente.',
      )
    }

    throw error
  }
}

async function decryptPbkdf2ChunkedFile(
  file: File,
  password: string,
  headerText: string,
  headerBytes: Uint8Array,
  onProgress?: ProgressCallback,
): Promise<ProcessResult> {
  await reportProgress(onProgress, 8, 'Lendo cabeçalho protegido')
  const reader = file.stream().getReader()
  let pendingBytes = new Uint8Array(0)
  let key: CryptoKey | null = null
  let chunkIndex = 0
  let consumedBytes = 0
  const decryptedParts: BlobPart[] = []
  const minimumHeaderLength = headerBytes.length + SALT_LENGTH_BYTES

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        break
      }

      pendingBytes = concatBytes(pendingBytes, value)

      if (!key && pendingBytes.length >= minimumHeaderLength) {
        const incomingHeader = new TextDecoder().decode(
          pendingBytes.slice(0, headerBytes.length),
        )

        if (incomingHeader !== headerText) {
          throw new CriptoveuError(
            'INVALID_FILE',
            'Arquivo inválido. Não foi possível reconhecer este pacote protegido.',
          )
        }

        const salt = pendingBytes.slice(headerBytes.length, minimumHeaderLength)
        key = await derivePbkdf2AesKey(password, salt, 'decrypt')
        pendingBytes = pendingBytes.slice(minimumHeaderLength)
        consumedBytes = minimumHeaderLength
        await reportProgress(onProgress, 18, 'Chave AES-GCM preparada')
      }

      while (key && pendingBytes.length >= IV_LENGTH_BYTES + CHUNK_RECORD_LENGTH_BYTES) {
        const lengthStart = IV_LENGTH_BYTES
        const lengthEnd = lengthStart + CHUNK_RECORD_LENGTH_BYTES
        const ciphertextLength = readLengthPrefix(
          pendingBytes.slice(lengthStart, lengthEnd),
        )
        assertChunkCiphertextLength(ciphertextLength, null)
        const recordLength =
          IV_LENGTH_BYTES + CHUNK_RECORD_LENGTH_BYTES + ciphertextLength

        if (pendingBytes.length < recordLength) {
          break
        }

        const iv = cloneBytes(pendingBytes.slice(0, IV_LENGTH_BYTES))
        const ciphertext = pendingBytes.slice(lengthEnd, recordLength)

        try {
          const decrypted = await crypto.subtle.decrypt(
            {
              name: 'AES-GCM',
              iv,
              additionalData: buildChunkAdditionalData(chunkIndex, headerText),
            },
            key,
            ciphertext,
          )
          decryptedParts.push(new Uint8Array(decrypted))
        } catch (error) {
          if (error instanceof DOMException && error.name === 'OperationError') {
            throw new CriptoveuError(
              'INVALID_PASSWORD_OR_FILE',
              'Senha incorreta ou arquivo inválido. Verifique a chave e tente novamente.',
            )
          }

          throw error
        }

        pendingBytes = pendingBytes.slice(recordLength)
        consumedBytes += recordLength
        chunkIndex += 1
        await reportProgress(
          onProgress,
          Math.min(96, 18 + Math.round((consumedBytes / file.size) * 78)),
          `Abrindo bloco ${chunkIndex}`,
        )
      }
    }
  } finally {
    reader.releaseLock()
  }

  if (!key || pendingBytes.length > 0 || chunkIndex === 0) {
    throw new CriptoveuError('INVALID_FILE', 'Arquivo inválido ou incompleto.')
  }

  const downloadName = buildDownloadName('decrypt', file.name)

  return {
    blob: new Blob(decryptedParts, { type: inferMimeTypeFromName(downloadName) }),
    downloadName,
  }
}

async function decryptArgon2ChunkedFile(
  file: File,
  password: string,
  onProgress?: ProgressCallback,
): Promise<ProcessResult> {
  await reportProgress(onProgress, 8, 'Lendo cabeçalho Argon2id')
  const reader = file.stream().getReader()
  let pendingBytes = new Uint8Array(0)
  let fixedHeader: Uint8Array<ArrayBuffer> | null = null
  let firstIv: Uint8Array<ArrayBuffer> | null = null
  let key: CryptoKey | null = null
  let chunkIndex = 0
  let consumedBytes = 0
  let bufferedCiphertext: Uint8Array<ArrayBuffer> | null = null
  let bufferedCiphertextLength = 0
  const decryptedParts: BlobPart[] = []

  async function decryptChunk(
    ciphertext: Uint8Array<ArrayBuffer>,
    ciphertextLength: number,
    isFinalChunk: boolean,
  ) {
    if (!key || !fixedHeader || !firstIv) {
      throw new CriptoveuError('INVALID_FILE', 'Arquivo inválido ou incompleto.')
    }

    try {
      const decrypted = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: deriveChunkIv(firstIv, chunkIndex),
          additionalData: buildArgon2ChunkAdditionalData(
            fixedHeader,
            chunkIndex,
            ciphertextLength,
            isFinalChunk,
          ),
        },
        key,
        ciphertext,
      )
      decryptedParts.push(new Uint8Array(decrypted))
    } catch (error) {
      if (error instanceof DOMException && error.name === 'OperationError') {
        throw new CriptoveuError(
          'INVALID_PASSWORD_OR_FILE',
          'Senha incorreta ou arquivo inválido. Verifique a chave e tente novamente.',
        )
      }

      throw error
    }

    chunkIndex += 1
    await reportProgress(
      onProgress,
      Math.min(96, 18 + Math.round((consumedBytes / file.size) * 78)),
      `Abrindo bloco ${chunkIndex}`,
    )
  }

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        break
      }

      pendingBytes = concatBytes(pendingBytes, value)

      if (!key && pendingBytes.length >= ARGON2_HEADER_LENGTH_BYTES) {
        fixedHeader = cloneBytes(pendingBytes.slice(0, ARGON2_HEADER_LENGTH_BYTES))
        const incomingHeader = new TextDecoder().decode(
          fixedHeader.slice(0, ARGON2_CHUNKED_FILE_HEADER_BYTES.length),
        )

        if (incomingHeader !== ARGON2_CHUNKED_FILE_HEADER_TEXT) {
          throw new CriptoveuError(
            'INVALID_FILE',
            'Arquivo inválido. Não foi possível reconhecer este pacote protegido.',
          )
        }

        const parsedHeader = readArgon2Header(fixedHeader)
        firstIv = cloneBytes(parsedHeader.firstIv)
        await reportProgress(
          onProgress,
          12,
          `Derivando chave Argon2id (${parsedHeader.parameters.memoryMb} MB)`,
        )
        key = await deriveArgon2AesKey(
          password,
          parsedHeader.salt,
          parsedHeader.parameters,
          'decrypt',
        )
        pendingBytes = pendingBytes.slice(ARGON2_HEADER_LENGTH_BYTES)
        consumedBytes = ARGON2_HEADER_LENGTH_BYTES
        await reportProgress(onProgress, 18, 'Chave AES-GCM preparada')
      }

      while (key && fixedHeader && firstIv && pendingBytes.length >= CHUNK_RECORD_LENGTH_BYTES) {
        const ciphertextLength = readLengthPrefix(
          pendingBytes.slice(0, CHUNK_RECORD_LENGTH_BYTES),
        )
        assertChunkCiphertextLength(ciphertextLength)
        const recordLength = CHUNK_RECORD_LENGTH_BYTES + ciphertextLength

        if (pendingBytes.length < recordLength) {
          break
        }

        if (bufferedCiphertext) {
          await decryptChunk(bufferedCiphertext, bufferedCiphertextLength, false)
        }

        bufferedCiphertext = cloneBytes(
          pendingBytes.slice(CHUNK_RECORD_LENGTH_BYTES, recordLength),
        )
        bufferedCiphertextLength = ciphertextLength
        pendingBytes = pendingBytes.slice(recordLength)
        consumedBytes += recordLength
      }
    }
  } finally {
    reader.releaseLock()
  }

  if (!key || pendingBytes.length > 0 || !bufferedCiphertext) {
    throw new CriptoveuError('INVALID_FILE', 'Arquivo inválido ou incompleto.')
  }

  await decryptChunk(bufferedCiphertext, bufferedCiphertextLength, true)

  const downloadName = buildDownloadName('decrypt', file.name)

  return {
    blob: new Blob(decryptedParts, { type: inferMimeTypeFromName(downloadName) }),
    downloadName,
  }
}

export async function decryptFile(
  file: File,
  password: string,
  onProgress?: ProgressCallback,
  options?: FileSizeGuardOptions,
): Promise<ProcessResult> {
  assertSupportedFileSize(file, options)
  const modernHeader = await file
    .slice(0, ARGON2_CHUNKED_FILE_HEADER_BYTES.length)
    .text()

  if (modernHeader === ARGON2_CHUNKED_FILE_HEADER_TEXT) {
    return decryptArgon2ChunkedFile(file, password, onProgress)
  }

  if (modernHeader === PBKDF2_CHUNKED_FILE_HEADER_TEXT) {
    return decryptPbkdf2ChunkedFile(
      file,
      password,
      PBKDF2_CHUNKED_FILE_HEADER_TEXT,
      PBKDF2_CHUNKED_FILE_HEADER_BYTES,
      onProgress,
    )
  }

  const legacyChunkedHeader = await file
    .slice(0, LEGACY_CHUNKED_FILE_HEADER_BYTES.length)
    .text()

  if (legacyChunkedHeader === LEGACY_CHUNKED_FILE_HEADER_TEXT) {
    return decryptPbkdf2ChunkedFile(
      file,
      password,
      LEGACY_CHUNKED_FILE_HEADER_TEXT,
      LEGACY_CHUNKED_FILE_HEADER_BYTES,
      onProgress,
    )
  }

  return decryptLegacyFile(file, password, onProgress)
}

export function generateWhatsappStyleKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
}

export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return {
      level: 0,
      label: 'Digite uma senha',
      barClass: 'bg-zinc-700',
      textClass: 'font-medium text-zinc-400',
    }
  }

  let score = 0

  if (password.length >= 8) {
    score += 1
  }

  if (password.length >= 12) {
    score += 1
  }

  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) {
    score += 1
  }

  if (/\d/.test(password)) {
    score += 1
  }

  if (/[^A-Za-z0-9]/.test(password)) {
    score += 1
  }

  const level = Math.min(Math.max(score, 1), 5)

  const levels: Record<number, PasswordStrength> = {
    1: {
      level,
      label: 'Muito fraca',
      barClass: 'bg-rose-500',
      textClass: 'font-medium text-rose-300',
    },
    2: {
      level,
      label: 'Fraca',
      barClass: 'bg-orange-500',
      textClass: 'font-medium text-orange-300',
    },
    3: {
      level,
      label: 'Média',
      barClass: 'bg-yellow-500',
      textClass: 'font-medium text-yellow-300',
    },
    4: {
      level,
      label: 'Forte',
      barClass: 'bg-sky-500',
      textClass: 'font-medium text-sky-300',
    },
    5: {
      level,
      label: 'Muito forte',
      barClass: 'bg-emerald-500',
      textClass: 'font-medium text-emerald-300',
    },
  }

  return levels[level]
}

export function formatFileSize(bytes: number) {
  if (bytes === 0) {
    return '0 B'
  }

  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }

  const decimals = size >= 100 || unitIndex === 0 ? 0 : size >= 10 ? 1 : 2
  return `${size.toFixed(decimals)} ${units[unitIndex]}`
}





