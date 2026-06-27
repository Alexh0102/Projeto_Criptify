import { webcrypto } from 'node:crypto'

import { argon2id } from 'hash-wasm'

const encoder = new TextEncoder()

function bytesFromHex(value) {
  return Uint8Array.from(value.match(/.{2}/g), (byte) => Number.parseInt(byte, 16))
}

function toBase64(bytes) {
  return Buffer.from(bytes).toString('base64')
}

function toBase64Url(value) {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url')
}

function buildAad(values) {
  return encoder.encode(JSON.stringify(['CriptoVéu', ...values]))
}

async function deriveKey(password, salt, memoryMb, iterations) {
  const keyBytes = await argon2id({
    password,
    salt,
    iterations,
    parallelism: 1,
    memorySize: memoryMb * 1024,
    hashLength: 32,
    outputType: 'binary',
  })

  return webcrypto.subtle.importKey(
    'raw',
    keyBytes,
    'AES-GCM',
    false,
    ['encrypt'],
  )
}

async function encryptVector({
  name,
  format,
  prefix,
  password,
  plaintext,
  saltHex,
  ivHex,
  memoryMb,
  iterations,
  extraMetadata = {},
  aadValues,
}) {
  const salt = bytesFromHex(saltHex)
  const iv = bytesFromHex(ivHex)
  const key = await deriveKey(password, salt, memoryMb, iterations)
  const aad = buildAad(aadValues)
  const encrypted = await webcrypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: aad },
    key,
    encoder.encode(plaintext),
  )
  const payload = {
    version: 2,
    type: format,
    kdf: 'argon2id',
    memoryMb,
    iterations,
    parallelism: 1,
    ciphertext: toBase64(new Uint8Array(encrypted)),
    iv: toBase64(iv),
    salt: toBase64(salt),
    ...extraMetadata,
  }

  return {
    name,
    format,
    password,
    plaintext,
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
    aadUtf8: new TextDecoder().decode(aad),
    ciphertextBase64: payload.ciphertext,
    payload: prefix ? `${prefix}${toBase64Url(payload)}` : payload,
    tamperingExpectedResult: 'rejected',
  }
}

const vectors = [
  await encryptVector({
    name: 'Mensagem V2 básica',
    format: 'MSG2',
    prefix: 'CVM2.',
    password: 'vetor-msg2-2026',
    plaintext: 'Mensagem de teste do CriptoVéu.',
    saltHex: '000102030405060708090a0b0c0d0e0f',
    ivHex: '101112131415161718191a1b',
    memoryMb: 64,
    iterations: 2,
    aadValues: ['MSG2', 2, 'argon2id', 64, 2, 1],
  }),
  await encryptVector({
    name: 'QR V2 básico',
    format: 'QR2',
    prefix: 'CVQ2.',
    password: 'vetor-qr2-2026',
    plaintext: 'QR protegido de teste.',
    saltHex: '202122232425262728292a2b2c2d2e2f',
    ivHex: '303132333435363738393a3b',
    memoryMb: 64,
    iterations: 2,
    aadValues: ['QR2', 2, 'argon2id', 64, 2, 1],
  }),
  await encryptVector({
    name: 'Link V2 com expiração',
    format: 'LINK2',
    prefix: 'CVL2.',
    password: 'vetor-link2-2026',
    plaintext: 'Link protegido de teste.',
    saltHex: '404142434445464748494a4b4c4d4e4f',
    ivHex: '505152535455565758595a5b',
    memoryMb: 64,
    iterations: 2,
    extraMetadata: {
      createdAt: 1767225600000,
      expiresIn: '24h',
      maxViews: 3,
    },
    aadValues: [
      'LINK2',
      2,
      'argon2id',
      64,
      2,
      1,
      1767225600000,
      '24h',
      3,
    ],
  }),
  await encryptVector({
    name: 'VéuNotes V2 básico',
    format: 'NOTE2',
    password: 'vetor-note2-2026',
    plaintext: 'Nota local de teste.',
    saltHex: '606162636465666768696a6b6c6d6e6f',
    ivHex: '707172737475767778797a7b',
    memoryMb: 128,
    iterations: 2,
    aadValues: ['NOTE2', 2, 'argon2id', 128, 2, 1],
  }),
]

for (const vector of vectors) {
  console.log(JSON.stringify(vector, null, 2))
}
