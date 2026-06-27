import { createHash, webcrypto } from 'node:crypto'

import { argon2id } from 'hash-wasm'

const encoder = new TextEncoder()
const signature = encoder.encode('CRIPTOVEU4')
const password = 'vetor-arquivo-v4-2026'
const plaintext = 'Vetor CRIPTOVEU4 - integridade local.\n'
const plaintextBytes = encoder.encode(plaintext)
const saltHex = '808182838485868788898a8b8c8d8e8f'
const ivHex = '909192939495969798999a9b'
const memoryMb = 8
const iterations = 1
const chunkSize = 2 * 1024 * 1024
const chunkCount = 1

function bytesFromHex(value) {
  return Uint8Array.from(
    value.match(/.{2}/g),
    (byte) => Number.parseInt(byte, 16),
  )
}

function sha256Hex(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

function createAsciiParameter(value) {
  return encoder.encode(value.toString().padStart(4, '0'))
}

function buildHeader(salt, firstIv) {
  const header = new Uint8Array(54)
  let offset = 0
  header.set(signature, offset)
  offset += signature.length
  header.set(createAsciiParameter(memoryMb), offset)
  offset += 4
  header.set(createAsciiParameter(iterations), offset)
  offset += 4
  header.set(salt, offset)
  offset += 16
  header.set(firstIv, offset)
  offset += 12
  const view = new DataView(header.buffer)
  view.setUint32(offset, chunkSize, false)
  view.setUint32(offset + 4, chunkCount, false)
  return header
}

function deriveRecordIv(firstIv, index) {
  const iv = firstIv.slice()
  const view = new DataView(iv.buffer, iv.byteOffset, iv.byteLength)
  const offset = iv.byteLength - 4
  view.setUint32(offset, view.getUint32(offset, false) ^ index, false)
  return iv
}

function buildAad(header, recordType, index, ciphertextLength) {
  const aad = new Uint8Array(header.byteLength + 9)
  aad.set(header)
  aad[header.byteLength] = recordType
  const view = new DataView(aad.buffer)
  view.setUint32(header.byteLength + 1, index, false)
  view.setUint32(header.byteLength + 5, ciphertextLength, false)
  return aad
}

function createRecord(recordType, ciphertext) {
  const record = new Uint8Array(5 + ciphertext.byteLength)
  record[0] = recordType
  new DataView(record.buffer).setUint32(1, ciphertext.byteLength, false)
  record.set(ciphertext, 5)
  return record
}

async function encryptRecord(key, header, firstIv, type, index, plaintextValue) {
  const ciphertextLength = plaintextValue.byteLength + 16
  const aad = buildAad(header, type, index, ciphertextLength)
  const encrypted = await webcrypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: deriveRecordIv(firstIv, index),
      additionalData: aad,
    },
    key,
    plaintextValue,
  )
  const ciphertext = new Uint8Array(encrypted)

  return {
    aad,
    ciphertext,
    record: createRecord(type, ciphertext),
  }
}

const salt = bytesFromHex(saltHex)
const firstIv = bytesFromHex(ivHex)
const header = buildHeader(salt, firstIv)
const fileHashSha256 = sha256Hex(plaintextBytes)
const manifest = {
  version: 1,
  format: 'CRIPTOVEU4',
  manifestId: '00112233445566778899aabbccddeeff',
  createdAt: 1780272000000,
  originalName: 'vetor-v4.txt',
  originalSize: plaintextBytes.byteLength,
  mimeType: 'text/plain',
  chunkSize,
  chunkCount,
  fileHashSha256,
  chunkHashesSha256: [fileHashSha256],
  encryption: 'AES-256-GCM',
  kdf: 'Argon2id',
  hash: 'SHA-256',
  argon2: {
    memoryMb,
    iterations,
    parallelism: 1,
  },
}
const keyBytes = await argon2id({
  password,
  salt,
  iterations,
  parallelism: 1,
  memorySize: memoryMb * 1024,
  hashLength: 32,
  outputType: 'binary',
})
const key = await webcrypto.subtle.importKey(
  'raw',
  keyBytes,
  'AES-GCM',
  false,
  ['encrypt'],
)
const data = await encryptRecord(
  key,
  header,
  firstIv,
  1,
  0,
  plaintextBytes,
)
const manifestRecord = await encryptRecord(
  key,
  header,
  firstIv,
  2,
  1,
  encoder.encode(JSON.stringify(manifest)),
)
const packageBytes = Buffer.concat([
  header,
  data.record,
  manifestRecord.record,
])

console.log(
  JSON.stringify(
    {
      name: 'Arquivo CRIPTOVEU4 básico',
      format: 'CRIPTOVEU4',
      warning:
        'Parâmetros reduzidos e valores fixos exclusivamente para interoperabilidade em testes.',
      password,
      plaintextUtf8: plaintext,
      expectedFileName: manifest.originalName,
      expectedMimeType: manifest.mimeType,
      saltHex,
      ivHex,
      kdf: {
        algorithm: 'argon2id',
        version: '1.3',
        memoryMb,
        iterations,
        parallelism: 1,
        hashLength: 32,
      },
      chunkSize,
      headerHex: Buffer.from(header).toString('hex'),
      manifest,
      records: [
        {
          type: 'data',
          index: 0,
          aadHex: Buffer.from(data.aad).toString('hex'),
          ciphertextBase64: Buffer.from(data.ciphertext).toString('base64'),
        },
        {
          type: 'manifest',
          index: 1,
          aadHex: Buffer.from(manifestRecord.aad).toString('hex'),
          ciphertextBase64: Buffer.from(
            manifestRecord.ciphertext,
          ).toString('base64'),
        },
      ],
      packageBase64: packageBytes.toString('base64'),
      tamperingExpectedResult: 'rejected',
    },
    null,
    2,
  ),
)
