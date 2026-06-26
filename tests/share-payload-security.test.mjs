import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'

import { createServer } from 'vite'

const PASSWORD_CANARY = 'PASSWORD_CANARY_MUST_NOT_LEAK'
const KEY_CANARY = 'KEY_CANARY_MUST_NOT_LEAK'
const PLAINTEXT_CANARY = 'PLAINTEXT_CANARY_MUST_NOT_LEAK'

let vite
let autoDestruct
let qrSecret
let secretText
let security

before(async () => {
  vite = await createServer({
    configFile: false,
    appType: 'custom',
    logLevel: 'silent',
    server: { middlewareMode: true },
  })

  ;[autoDestruct, qrSecret, secretText, security] = await Promise.all([
    vite.ssrLoadModule('/src/lib/auto-destruct-link.ts'),
    vite.ssrLoadModule('/src/lib/qr-secret.ts'),
    vite.ssrLoadModule('/src/lib/secret-text-payload.ts'),
    vite.ssrLoadModule('/src/lib/share-payload-security.ts'),
  ])
})

after(async () => {
  await vite?.close()
})

function createEncryptedResultWithSecretExtras() {
  return {
    ciphertext: 'encrypted-content',
    iv: new Uint8Array(12).fill(1),
    salt: new Uint8Array(16).fill(2),
    password: PASSWORD_CANARY,
    pwd: PASSWORD_CANARY,
    key: KEY_CANARY,
    aesKey: KEY_CANARY,
    derivedKey: KEY_CANARY,
    chaveDerivada: KEY_CANARY,
    plaintext: PLAINTEXT_CANARY,
  }
}

function assertCanariesAreAbsent(value) {
  assert.doesNotMatch(value, new RegExp(PASSWORD_CANARY))
  assert.doesNotMatch(value, new RegExp(KEY_CANARY))
  assert.doesNotMatch(value, new RegExp(PLAINTEXT_CANARY))
}

test('assertNoSecretFields rejeita segredos diretos e aninhados', () => {
  const forbiddenAliases = [
    'password',
    'senha',
    'pwd',
    'passphrase',
    'secret',
    'key',
    'aesKey',
    'derivedKey',
    'privateKey',
    'chave',
    'chaveDerivada',
  ]

  for (const fieldName of forbiddenAliases) {
    assert.throws(
      () => security.assertNoSecretFields({ [fieldName]: PASSWORD_CANARY }),
      { code: 'SECRET_FIELD' },
      `O campo ${fieldName} deveria ser rejeitado.`,
    )
  }

  assert.throws(
    () => security.assertNoSecretFields({ metadata: { masterKey: KEY_CANARY } }),
    { code: 'SECRET_FIELD' },
  )
  assert.doesNotThrow(() =>
    security.assertNoSecretFields({
      version: 1,
      ciphertext: 'encrypted-content',
      iv: 'iv',
      salt: 'salt',
    }),
  )
})

test('payload de texto e URL do QR usam somente a allowlist', () => {
  const serialized = secretText.serializeEncryptedTextPayload(
    createEncryptedResultWithSecretExtras(),
  )
  const qrUrl = qrSecret.buildSecretQrUrl(serialized, 'https://example.test')
  const parsedJson = JSON.parse(
    serialized.slice(secretText.SECRET_TEXT_PAYLOAD_PREFIX.length),
  )

  assert.deepEqual(
    Object.keys(parsedJson).sort(),
    [...security.SHARE_PAYLOAD_FIELD_ALLOWLISTS.encryptedTextV1].sort(),
  )
  assertCanariesAreAbsent(serialized)
  assertCanariesAreAbsent(qrUrl)
})

test('link protegido não serializa senha, chave ou texto puro', () => {
  const encoded = autoDestruct.serializeAutoDestructPayload(
    createEncryptedResultWithSecretExtras(),
    {
      createdAt: 1_700_000_000_000,
      expiresIn: '24h',
      maxViews: 1,
      password: PASSWORD_CANARY,
    },
  )
  const link = autoDestruct.buildAutoDestructLink(encoded)
  const parsedJson = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'))

  assert.deepEqual(
    Object.keys(parsedJson).sort(),
    [...security.SHARE_PAYLOAD_FIELD_ALLOWLISTS.autoDestructV1].sort(),
  )
  assertCanariesAreAbsent(encoded)
  assertCanariesAreAbsent(link)
})

test('leitores rejeitam campos fora da allowlist', () => {
  const unsafeTextPayload =
    secretText.SECRET_TEXT_PAYLOAD_PREFIX +
    JSON.stringify({
      version: 1,
      ciphertext: 'encrypted-content',
      iv: 'AQ==',
      salt: 'Ag==',
      password: PASSWORD_CANARY,
    })
  const unsafeLinkPayload = Buffer.from(
    JSON.stringify({
      version: 1,
      ciphertext: 'encrypted-content',
      iv: 'AQ==',
      salt: 'Ag==',
      createdAt: 1_700_000_000_000,
      expiresIn: '24h',
      maxViews: 1,
      key: KEY_CANARY,
    }),
  ).toString('base64')

  assert.throws(
    () => secretText.parseEncryptedTextPayload(unsafeTextPayload),
    { code: 'UNEXPECTED_FIELD' },
  )
  assert.throws(
    () => autoDestruct.parseAutoDestructPayload(unsafeLinkPayload),
    { code: 'UNEXPECTED_FIELD' },
  )
})
