import assert from 'node:assert/strict'
import { webcrypto } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { after, before, test } from 'node:test'

import { argon2id } from 'hash-wasm'
import { createServer } from 'vite'

if (!globalThis.crypto) {
  globalThis.crypto = webcrypto
}

if (!globalThis.atob) {
  globalThis.atob = (value) => Buffer.from(value, 'base64').toString('binary')
}

if (!globalThis.btoa) {
  globalThis.btoa = (value) => Buffer.from(value, 'binary').toString('base64')
}

class Argon2TestWorker {
  onmessage = null
  onerror = null

  postMessage(request) {
    Promise.resolve()
      .then(async () => {
        const derivedBytes = await argon2id({
          password: request.password,
          salt: new Uint8Array(request.salt),
          iterations: request.iterations,
          parallelism: 1,
          memorySize: request.memorySizeKiB,
          hashLength: 32,
          outputType: 'binary',
        })
        const keyBytes = derivedBytes.slice().buffer
        this.onmessage?.({
          data: {
            id: request.id,
            keyBytes,
          },
        })
      })
      .catch((error) => this.onerror?.(error))
  }

  terminate() {}
}

globalThis.Worker = Argon2TestWorker

let vite
let autoDestruct
let criptoveu
let payloadV2
let qrSecret
let secretText
let veuNotes

before(async () => {
  vite = await createServer({
    configFile: false,
    appType: 'custom',
    logLevel: 'silent',
    server: { middlewareMode: true },
  })

  ;[autoDestruct, criptoveu, payloadV2, qrSecret, secretText, veuNotes] =
    await Promise.all([
      vite.ssrLoadModule('/src/lib/auto-destruct-link.ts'),
      vite.ssrLoadModule('/src/lib/criptoveu.ts'),
      vite.ssrLoadModule('/src/lib/payload-v2.ts'),
      vite.ssrLoadModule('/src/lib/qr-secret.ts'),
      vite.ssrLoadModule('/src/lib/secret-text-payload.ts'),
      vite.ssrLoadModule('/src/lib/veunotes-crypto.ts'),
    ])
})

after(async () => {
  await vite?.close()
})

async function loadVector(relativePath) {
  return JSON.parse(
    await readFile(new URL(`../test-vectors/${relativePath}`, import.meta.url), 'utf8'),
  )
}

function mutateEncodedPayload(payload, prefix, mutate) {
  const decoded = payloadV2.decodePayloadV2Json(
    payload.slice(prefix.length),
    200_000,
  )
  mutate(decoded)
  return `${prefix}${payloadV2.encodePayloadV2Json(decoded)}`
}

function flipBase64Byte(value) {
  return `${value.startsWith('A') ? 'B' : 'A'}${value.slice(1)}`
}

async function createLegacyNote(plaintext, password) {
  const salt = Uint8Array.from({ length: 16 }, (_, index) => index)
  const iv = Uint8Array.from({ length: 12 }, (_, index) => index + 16)
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  const aesKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100_000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt'],
  )
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    new TextEncoder().encode(plaintext),
  )

  return {
    version: 1,
    salt: Buffer.from(salt).toString('base64'),
    iterations: 100_000,
    iv: Buffer.from(iv).toString('base64'),
    ciphertext: Buffer.from(encrypted).toString('base64'),
  }
}

test('vetores públicos MSG2, QR2, LINK2 e NOTE2 são reproduzíveis', async () => {
  const messageVector = await loadVector('message-v2/vector-001-basic.json')
  const qrVector = await loadVector('qr-v2/vector-001-basic.json')
  const linkVector = await loadVector('link-v2/vector-001-expiring.json')
  const noteVector = await loadVector('note-v2/vector-001-basic.json')

  assert.equal(
    await secretText.decryptSecretTextPayload(
      messageVector.payload,
      messageVector.password,
    ),
    messageVector.plaintext,
  )
  assert.equal(
    await secretText.decryptSecretTextPayload(qrVector.payload, qrVector.password),
    qrVector.plaintext,
  )
  const qrUrl = qrSecret.buildSecretQrUrl(
    qrVector.payload,
    'https://example.test',
  )
  assert.equal(qrSecret.readSecretPayloadFromQrInput(qrUrl), qrVector.payload)

  const parsedLink = autoDestruct.parseAutoDestructPayload(linkVector.payload)
  assert.equal(
    await autoDestruct.decryptAutoDestructPayload(
      parsedLink,
      linkVector.password,
    ),
    linkVector.plaintext,
  )
  const linkUrl = autoDestruct.buildAutoDestructLink(linkVector.payload)
  assert.equal(
    autoDestruct.readAutoDestructPayloadFromInput(linkUrl).encodedPayload,
    linkVector.payload,
  )
  assert.equal(
    await veuNotes.decryptNote(noteVector.payload, noteVector.password),
    noteVector.plaintext,
  )
})

test('novas criações usam V2 e leitores continuam aceitando V1', async () => {
  const qrV2 = await secretText.encryptSecretTextPayload(
    'Mensagem nova',
    'senha-forte-de-teste',
    'QR2',
  )
  assert.match(qrV2, /^CVQ2\./)
  assert.equal(
    await secretText.decryptSecretTextPayload(
      qrV2,
      'senha-forte-de-teste',
      'QR2',
    ),
    'Mensagem nova',
  )
  assert.doesNotMatch(qrV2, /senha-forte-de-teste/)

  const legacyEncrypted = await criptoveu.encryptText(
    'Mensagem legada',
    'senha-legada-de-teste',
  )
  const legacyMessage =
    secretText.serializeEncryptedTextPayload(legacyEncrypted)
  assert.equal(
    await secretText.decryptSecretTextPayload(
      legacyMessage,
      'senha-legada-de-teste',
    ),
    'Mensagem legada',
  )

  const legacyLink = autoDestruct.serializeAutoDestructPayload(
    legacyEncrypted,
    {
      createdAt: 1_700_000_000_000,
      expiresIn: 'never',
      maxViews: null,
    },
  )
  assert.equal(
    await autoDestruct.decryptAutoDestructPayload(
      autoDestruct.parseAutoDestructPayload(legacyLink),
      'senha-legada-de-teste',
    ),
    'Mensagem legada',
  )
})

test('QR2 rejeita adulteração criptográfica, de parâmetros e estrutura', async () => {
  const vector = await loadVector('qr-v2/vector-001-basic.json')
  const encryptedTamperingCases = [
    ['ciphertext', (payload) => {
      payload.ciphertext = flipBase64Byte(payload.ciphertext)
    }],
    ['iv', (payload) => {
      payload.iv = Buffer.alloc(12, 1).toString('base64')
    }],
    ['salt', (payload) => {
      payload.salt = Buffer.alloc(16, 2).toString('base64')
    }],
    ['iterations', (payload) => {
      payload.iterations = 1
    }],
    ['memoryMb', (payload) => {
      payload.memoryMb = 8
    }],
  ]

  for (const [fieldName, mutate] of encryptedTamperingCases) {
    const tampered = mutateEncodedPayload(vector.payload, 'CVQ2.', mutate)
    await assert.rejects(
      () => secretText.decryptSecretTextPayload(tampered, vector.password),
      undefined,
      `A adulteração de ${fieldName} deveria falhar.`,
    )
  }

  const wrongType = mutateEncodedPayload(vector.payload, 'CVQ2.', (payload) => {
    payload.type = 'MSG2'
  })
  const wrongVersion = mutateEncodedPayload(
    vector.payload,
    'CVQ2.',
    (payload) => {
      payload.version = 3
    },
  )
  const wrongKdf = mutateEncodedPayload(vector.payload, 'CVQ2.', (payload) => {
    payload.kdf = 'pbkdf2'
  })
  const wrongParallelism = mutateEncodedPayload(
    vector.payload,
    'CVQ2.',
    (payload) => {
      payload.parallelism = 2
    },
  )
  const unexpectedSecretField = mutateEncodedPayload(
    vector.payload,
    'CVQ2.',
    (payload) => {
      payload.password = 'nao-pode-vazar'
    },
  )

  for (const invalidPayload of [
    wrongType,
    wrongVersion,
    wrongKdf,
    wrongParallelism,
    unexpectedSecretField,
    `${vector.payload}truncated`,
    'CVQ2.***',
    `CVQ2.${Buffer.from('{', 'utf8').toString('base64url')}`,
  ]) {
    assert.throws(() => secretText.parseSecretTextPayload(invalidPayload))
  }

  await assert.rejects(() =>
    secretText.decryptSecretTextPayload(vector.payload, 'senha-incorreta'),
  )

  const messageVector = await loadVector('message-v2/vector-001-basic.json')
  await assert.rejects(() =>
    secretText.decryptSecretTextPayload(
      messageVector.payload,
      messageVector.password,
      'QR2',
    ),
  )
})

test('LINK2 autentica expiração, limite e data de criação', async () => {
  const vector = await loadVector('link-v2/vector-001-expiring.json')
  const cases = [
    (payload) => {
      payload.expiresIn = 'never'
    },
    (payload) => {
      payload.maxViews = 4
    },
    (payload) => {
      payload.createdAt += 1
    },
  ]

  for (const mutate of cases) {
    const tampered = mutateEncodedPayload(vector.payload, 'CVL2.', mutate)
    const parsed = autoDestruct.parseAutoDestructPayload(tampered)
    await assert.rejects(() =>
      autoDestruct.decryptAutoDestructPayload(parsed, vector.password),
    )
  }
})

test('NOTE1 é lido e migrado para NOTE2 somente após senha correta', async () => {
  const password = 'senha-de-migracao-note1'
  const legacy = await createLegacyNote('Nota legada', password)
  const originalSerialized = JSON.stringify(legacy)

  await assert.rejects(() =>
    veuNotes.unlockVeuNotesBlob(legacy, 'senha-incorreta'),
  )
  assert.equal(JSON.stringify(legacy), originalSerialized)

  const unlocked = await veuNotes.unlockVeuNotesBlob(legacy, password)
  assert.equal(unlocked.plaintext, 'Nota legada')
  assert.equal(unlocked.migratedBlob.version, 2)
  assert.equal(unlocked.migratedBlob.type, 'NOTE2')
  assert.equal(
    await veuNotes.decryptNote(unlocked.migratedBlob, password),
    'Nota legada',
  )
})

test('NOTE2 rejeita alteração do ciphertext e dos parâmetros', async () => {
  const vector = await loadVector('note-v2/vector-001-basic.json')
  const changedCiphertext = structuredClone(vector.payload)
  changedCiphertext.ciphertext = flipBase64Byte(changedCiphertext.ciphertext)
  const changedParameters = structuredClone(vector.payload)
  changedParameters.memoryMb = 8

  await assert.rejects(() =>
    veuNotes.decryptNote(changedCiphertext, vector.password),
  )
  await assert.rejects(() =>
    veuNotes.decryptNote(changedParameters, vector.password),
  )
})
